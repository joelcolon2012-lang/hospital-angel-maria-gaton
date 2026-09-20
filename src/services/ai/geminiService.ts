/**
 * geminiService: Servicio centralizado para Google Gemini AI
 * Hospital Regional Dr. Ángel María Gatón — Dr. Joel Colón
 *
 * Arquitectura Segura y Desacoplada:
 * Frontend (GitHub Pages) -> Backend Independiente (Render HTTPS) -> Google Gemini API
 *
 * La API Key NUNCA reside en el cliente ni se expone al navegador.
 * Las peticiones utilizan VITE_API_BASE_URL para alcanzar el backend en Render.
 */

export interface GeminiGenerateRequest {
  prompt?: string;
  contents?: Array<{
    role?: string;
    parts: Array<{
      text?: string;
      inlineData?: {
        mimeType: string;
        data: string; // base64
      };
    }>;
  }>;
  systemInstruction?: string | { parts: Array<{ text: string }> };
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
  };
  model?: string;
}

export interface GeminiGenerateResponse {
  success: boolean;
  data?: any;
  text?: string;
  modelUsed?: string;
  error?: string;
}

export interface GeminiTelemetryStatus {
  backendConnected: boolean;
  geminiConnected: boolean;
  model: string;
  latencyMs: number;
  checkedAt: string;
  message: string;
}

export class GeminiService {
  private static instance: GeminiService;
  private cachedModels: string[] = [];
  private selectedModel: string = 'gemini-3.6-flash';
  private lastModelsFetch: number = 0;
  private MODELS_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  private constructor() {}

  public static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  /**
   * Obtiene la URL base del backend seguro (Render o local)
   */
  public getBaseUrl(): string {
    // 1. Ver si el usuario configuró una URL en la UI local (override)
    try {
      const userConfigured = localStorage.getItem('hospital_backend_api_url');
      if (userConfigured && userConfigured.trim()) {
        return userConfigured.trim().replace(/\/$/, '');
      }
    } catch {}

    // 2. Variable de entorno Vite (VITE_API_BASE_URL)
    const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
    if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
      return envUrl.trim().replace(/\/$/, '');
    }

    // 3. URL de producción en Render por defecto (segura HTTPS)
    return 'https://hospital-angel-maria-gaton-backend.onrender.com';
  }

  /**
   * Permite configurar o actualizar la URL del backend en Render desde la interfaz
   */
  public setBaseUrl(url: string): void {
    try {
      if (url && url.trim()) {
        localStorage.setItem('hospital_backend_api_url', url.trim().replace(/\/$/, ''));
      } else {
        localStorage.removeItem('hospital_backend_api_url');
      }
    } catch {}
  }

  /**
   * Verifica la salud del backend (/api/health) y calcula la latencia en milisegundos
   */
  public async checkHealth(): Promise<{ ok: boolean; status: string; service: string; latencyMs: number }> {
    const baseUrl = this.getBaseUrl();
    const startTime = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(`${baseUrl}/api/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const latencyMs = Math.round(performance.now() - startTime);

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return {
          ok: true,
          status: data.status || 'ok',
          service: data.service || 'Hospital Angel Maria Gaton AI Backend',
          latencyMs
        };
      }
      return { ok: false, status: `HTTP ${res.status}`, service: '', latencyMs };
    } catch (e: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      return { ok: false, status: 'error', service: e.message || 'Sin conexión', latencyMs };
    }
  }

  /**
   * Consulta los modelos disponibles compatibles con generateContent desde el backend
   */
  public async getAvailableGeminiModels(forceRefresh = false): Promise<string[]> {
    const now = Date.now();
    if (!forceRefresh && this.cachedModels.length > 0 && (now - this.lastModelsFetch < this.MODELS_CACHE_TTL)) {
      return this.cachedModels;
    }

    const baseUrl = this.getBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/api/gemini/models`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.models)) {
          this.cachedModels = data.models;
          if (data.selectedModel) {
            this.selectedModel = data.selectedModel;
          }
          this.lastModelsFetch = now;
          return this.cachedModels;
        }
      }
    } catch (err) {
      console.warn('[geminiService] Error obteniendo modelos desde backend:', err);
    }

    return this.cachedModels.length > 0 ? this.cachedModels : ['gemini-2.5-flash'];
  }

  /**
   * Selecciona el mejor modelo compatible (priorizando gemini-3.8-flash y modelos Flash modernos)
   */
  public selectBestGeminiModel(modelsList?: string[]): string {
    const rawList = modelsList || this.cachedModels;
    if (!rawList || rawList.length === 0) {
      return 'gemini-3.8-flash';
    }

    // Filtrar modelos deprecados por Google para nuevas cuentas
    const valid = rawList.filter(m => !/1\.5-flash|2\.5-flash$/i.test(m));
    const list = valid.length > 0 ? valid : rawList;

    const scoreModel = (name: string): number => {
      let score = 0;
      const lower = name.toLowerCase();

      if (lower.includes('flash')) {
        score += 1000;
        if (lower.includes('3.6')) score += 450; // Máxima estabilidad comprobada
        else if (lower.includes('3.8')) score += 400;
        else if (lower.includes('3.7')) score += 380;
        else if (lower.includes('3.5')) score += 350;
        else if (lower.includes('flash-latest')) score += 280;
        else score += 100;
      } else if (lower.includes('pro')) {
        score += 500;
      }

      if (lower.includes('preview') || lower.includes('exp')) score -= 50;

      return score;
    };

    const sorted = [...list].sort((a, b) => scoreModel(b) - scoreModel(a));
    this.selectedModel = sorted[0] || 'gemini-3.8-flash';
    return this.selectedModel;
  }

  public getActiveModel(): string {
    return this.selectedModel || 'gemini-3.8-flash';
  }

  public setActiveModel(model: string): void {
    if (model) {
      this.selectedModel = model;
    }
  }

  /**
   * Ejecuta la comprobación completa requerida al presionar "Probar conexión con Gemini":
   * 1. Comprueba /api/health (Estado del Backend)
   * 2. Comprueba /api/gemini/test (Estado de Gemini API)
   * 3. Mide latencia en ms
   * 4. Retorna la telemetría formateada
   */
  public async testConnectionFull(): Promise<GeminiTelemetryStatus> {
    const baseUrl = this.getBaseUrl();
    const startTime = performance.now();
    const nowTimestamp = new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // PASO 1: Comprobar Backend (/api/health)
    const health = await this.checkHealth();
    if (!health.ok) {
      return {
        backendConnected: false,
        geminiConnected: false,
        model: 'Desconectado',
        latencyMs: health.latencyMs,
        checkedAt: nowTimestamp,
        message: 'No fue posible contactar el servidor de inteligencia artificial.'
      };
    }

    // PASO 2: Comprobar Gemini API (/api/gemini/test)
    const testStartTime = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(`${baseUrl}/api/gemini/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const totalLatencyMs = Math.round(performance.now() - startTime);
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        if (data.model) {
          this.selectedModel = data.model;
        }
        return {
          backendConnected: true,
          geminiConnected: true,
          model: data.model || this.selectedModel || 'gemini-2.5-flash',
          latencyMs: totalLatencyMs,
          checkedAt: nowTimestamp,
          message: 'Conexión con Google Gemini establecida correctamente.'
        };
      }

      // Mapeo específico de errores
      const errorMsg = data.message || data.error || '';
      return {
        backendConnected: true,
        geminiConnected: false,
        model: 'Error de autenticación',
        latencyMs: totalLatencyMs,
        checkedAt: nowTimestamp,
        message: errorMsg || 'Error interno del servicio de inteligencia artificial.'
      };
    } catch (err: any) {
      const totalLatencyMs = Math.round(performance.now() - startTime);
      return {
        backendConnected: true,
        geminiConnected: false,
        model: 'Sin respuesta',
        latencyMs: totalLatencyMs,
        checkedAt: nowTimestamp,
        message: 'No fue posible contactar el servidor de inteligencia artificial.'
      };
    }
  }

  /**
   * Método de compatibilidad para pruebas simples de conexión
   */
  public async testGeminiConnection(): Promise<{ success: boolean; message: string; model?: string }> {
    const full = await this.testConnectionFull();
    return {
      success: full.geminiConnected,
      message: full.message,
      model: full.model
    };
  }

  /**
   * Ejecuta generateContent a través del backend seguro en Render
   */
  public async generateContent(request: GeminiGenerateRequest): Promise<GeminiGenerateResponse> {
    const baseUrl = this.getBaseUrl();
    try {
      const payload = {
        prompt: request.prompt || (request.contents?.[0]?.parts?.[0]?.text) || '',
        contents: request.contents,
        systemInstruction: request.systemInstruction,
        generationConfig: request.generationConfig,
        model: request.model || this.selectedModel || undefined
      };

      const res = await fetch(`${baseUrl}/api/gemini/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const responseJson = await res.json().catch(() => ({}));

      if (!res.ok || !responseJson.success) {
        return {
          success: false,
          error: responseJson.error || 'Error interno del servicio de inteligencia artificial.'
        };
      }

      const text = responseJson.text || responseJson.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (responseJson.modelUsed) {
        this.selectedModel = responseJson.modelUsed;
      }

      return {
        success: true,
        data: responseJson.data,
        text,
        modelUsed: responseJson.modelUsed
      };
    } catch (err: any) {
      return {
        success: false,
        error: 'No fue posible contactar el servidor de inteligencia artificial.'
      };
    }
  }
}

export const geminiService = GeminiService.getInstance();
