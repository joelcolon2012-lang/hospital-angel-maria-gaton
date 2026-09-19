/**
 * geminiService: Servicio centralizado para Google Gemini AI
 * Hospital Regional Dr. Ángel María Gatón — Dr. Joel Colón
 *
 * Principio de Seguridad:
 * El frontend NUNCA se comunica directamente con Google Gemini ni almacena la API Key en el cliente.
 * Toda petición viaja: Frontend -> Backend Seguro (/api/gemini/...) -> Google Gemini API.
 */

export interface GeminiGenerateRequest {
  contents: Array<{
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

export interface GeminiStatus {
  isConfigured: boolean;
  currentModel: string;
  hasEnvKey: boolean;
}

export class GeminiService {
  private static instance: GeminiService;
  private cachedModels: string[] = [];
  private selectedModel: string = '';
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
   * Consulta el estado del backend y si la clave API está configurada en el servidor
   */
  public async checkStatus(): Promise<GeminiStatus> {
    try {
      const res = await fetch('/api/gemini/status');
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('[geminiService] Error verificando estado backend:', e);
    }
    return {
      isConfigured: false,
      currentModel: 'gemini-flash-auto',
      hasEnvKey: false
    };
  }

  /**
   * Consulta los modelos disponibles compatibles con generateContent desde el backend
   */
  public async getAvailableGeminiModels(forceRefresh = false): Promise<string[]> {
    const now = Date.now();
    if (!forceRefresh && this.cachedModels.length > 0 && (now - this.lastModelsFetch < this.MODELS_CACHE_TTL)) {
      return this.cachedModels;
    }

    try {
      const res = await fetch('/api/gemini/models');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.models)) {
          this.cachedModels = data.models;
          this.selectedModel = data.selectedModel || this.selectBestGeminiModel(data.models);
          this.lastModelsFetch = now;
          return this.cachedModels;
        }
      }
    } catch (err: any) {
      console.warn('[geminiService] Error obteniendo modelos:', err);
    }

    return this.cachedModels.length > 0 ? this.cachedModels : ['gemini-2.5-flash'];
  }

  /**
   * Selecciona automáticamente el mejor modelo compatible priorizando Flash estables
   * Prioridad: Flash (3.5 > 3.0 > 2.5 > 2.0 > latest > pro > otros)
   */
  public selectBestGeminiModel(modelsList?: string[]): string {
    const list = modelsList || this.cachedModels;
    if (!list || list.length === 0) {
      return 'gemini-2.5-flash';
    }

    const scoreModel = (name: string): number => {
      let score = 0;
      const lower = name.toLowerCase();

      // Priorizar variantes Flash
      if (lower.includes('flash')) {
        score += 1000;
        if (lower.includes('3.5')) score += 350;
        else if (lower.includes('3.0') || lower.includes('3-')) score += 300;
        else if (lower.includes('2.5')) score += 250;
        else if (lower.includes('2.0') || lower.includes('2-')) score += 200;
        else if (lower.includes('flash-latest')) score += 280;
        else score += 100;

        if (lower.includes('lite')) score -= 20;
      } else if (lower.includes('pro')) {
        score += 500;
        if (lower.includes('2.5')) score += 250;
        else if (lower.includes('2.0')) score += 200;
      } else {
        score += 100;
      }

      if (lower.includes('exp') || lower.includes('experimental')) score -= 80;
      if (lower.includes('preview')) score -= 30;

      return score;
    };

    const sorted = [...list].sort((a, b) => scoreModel(b) - scoreModel(a));
    this.selectedModel = sorted[0] || 'gemini-2.5-flash';
    return this.selectedModel;
  }

  /**
   * Obtiene el modelo activo actual
   */
  public getActiveModel(): string {
    return this.selectedModel || 'gemini-2.5-flash';
  }

  /**
   * Establece un modelo preferido (si está en la lista de compatibles)
   */
  public setActiveModel(model: string): void {
    if (model) {
      this.selectedModel = model;
    }
  }

  /**
   * Prueba real de conexión con Google Gemini enviando una petición mínima a generateContent
   */
  public async testGeminiConnection(apiKeyOverride?: string): Promise<{ success: boolean; message: string; model?: string }> {
    try {
      const res = await fetch('/api/gemini/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiKeyOverride ? { apiKey: apiKeyOverride } : {})
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        if (data.model) this.selectedModel = data.model;
        return {
          success: true,
          message: 'Conexión con Google Gemini establecida correctamente.',
          model: data.model
        };
      }

      // Mensajes controlados sin exponer errores técnicos
      const errorMsg = data.message || data.error || '';
      if (errorMsg.includes('inválida') || errorMsg.includes('autorización')) {
        return { success: false, message: 'API Key de Gemini inválida o sin autorización.' };
      }
      if (errorMsg.includes('límite') || errorMsg.includes('429') || errorMsg.includes('cuota')) {
        return { success: false, message: 'Se alcanzó temporalmente el límite de uso de Gemini.' };
      }

      return {
        success: false,
        message: 'No se pudo establecer conexión con Gemini. El sistema intentará utilizar otro modelo disponible.'
      };
    } catch (err: any) {
      return {
        success: false,
        message: 'No se pudo establecer conexión con Gemini. El sistema intentará utilizar otro modelo disponible.'
      };
    }
  }

  /**
   * Guarda de forma segura la clave en el archivo .env del servidor (sin guardar en localStorage)
   */
  public async saveServerApiKey(apiKey: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/gemini/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        // Limpiar cualquier residuo de localStorage previo por seguridad
        try {
          localStorage.removeItem('hospital_gemini_api_key');
        } catch {}
        return { success: true, message: 'Clave API de Gemini guardada de forma segura en el servidor.' };
      }
      return { success: false, message: data.message || 'Error guardando clave en el servidor.' };
    } catch (err: any) {
      return { success: false, message: 'Error de comunicación con el servidor backend.' };
    }
  }

  /**
   * Ejecuta generateContent a través del backend seguro
   * Maneja timeouts, reintentos y fallback automático
   */
  public async generateContent(request: GeminiGenerateRequest): Promise<GeminiGenerateResponse> {
    try {
      const payload = {
        ...request,
        model: request.model || this.selectedModel || undefined
      };

      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const responseJson = await res.json().catch(() => ({}));

      if (!res.ok || !responseJson.success) {
        const errorText = responseJson.error || '';

        // Mapeo riguroso de errores
        if (errorText.includes('inválida') || errorText.includes('autorización')) {
          return {
            success: false,
            error: 'API Key de Gemini inválida o sin autorización.'
          };
        }
        if (errorText.includes('límite') || errorText.includes('429') || errorText.includes('cuota')) {
          return {
            success: false,
            error: 'Se alcanzó temporalmente el límite de uso de Gemini.'
          };
        }

        // Si el modelo falló o fue deprecado, el backend ya intentó fallback; informar al usuario limpiamente
        return {
          success: false,
          error: 'No se pudo establecer conexión con Gemini. El sistema intentará utilizar otro modelo disponible.'
        };
      }

      // Extraer el texto generado
      const data = responseJson.data;
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (responseJson.modelUsed) {
        this.selectedModel = responseJson.modelUsed;
      }

      return {
        success: true,
        data,
        text,
        modelUsed: responseJson.modelUsed
      };
    } catch (err: any) {
      return {
        success: false,
        error: 'No se pudo establecer conexión con Gemini. El sistema intentará utilizar otro modelo disponible.'
      };
    }
  }
}

export const geminiService = GeminiService.getInstance();
