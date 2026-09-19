import fs from 'fs';
import path from 'path';

interface GeminiModelInfo {
  name: string;
  version?: string;
  displayName?: string;
  description?: string;
  supportedGenerationMethods?: string[];
}

export class GeminiBackend {
  private static cachedModels: string[] = [];
  private static lastCacheTime: number = 0;
  private static CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos
  private static activeModel: string = '';
  private static rootDir: string = process.cwd();

  public static setRootDir(dir: string) {
    this.rootDir = dir;
  }

  /**
   * Obtiene la clave API configurada exclusivamente en el entorno del servidor
   */
  public static getApiKey(): string {
    // 1. Variable de entorno directa del proceso
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 5) {
      return process.env.GEMINI_API_KEY.trim();
    }

    // 2. Leer archivo .env del servidor si no está en process.env
    try {
      const envPath = path.join(this.rootDir, '.env');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');
        const match = content.match(/^GEMINI_API_KEY\s*=\s*(.*)$/m);
        if (match && match[1]) {
          const key = match[1].trim().replace(/^["']|["']$/g, '');
          if (key.length > 5) {
            process.env.GEMINI_API_KEY = key;
            return key;
          }
        }
      }
    } catch (e) {
      console.error('[GeminiBackend] Error leyendo .env:', e);
    }

    return '';
  }

  /**
   * Guarda de forma segura la clave en el archivo .env del servidor
   */
  public static saveApiKey(apiKey: string): { success: boolean; message: string } {
    try {
      const trimmed = apiKey.trim();
      process.env.GEMINI_API_KEY = trimmed;
      const envPath = path.join(this.rootDir, '.env');

      let content = '';
      if (fs.existsSync(envPath)) {
        content = fs.readFileSync(envPath, 'utf-8');
      }

      if (content.match(/^GEMINI_API_KEY\s*=/m)) {
        content = content.replace(/^GEMINI_API_KEY\s*=.*$/m, `GEMINI_API_KEY=${trimmed}`);
      } else {
        content = (content ? content + '\n' : '') + `GEMINI_API_KEY=${trimmed}\n`;
      }

      fs.writeFileSync(envPath, content, 'utf-8');
      this.cachedModels = []; // Forzar actualización de modelos
      this.lastCacheTime = 0;
      return { success: true, message: 'Clave API de Gemini guardada de forma segura en el servidor.' };
    } catch (err: any) {
      console.error('[GeminiBackend] Error guardando clave:', err);
      return { success: false, message: 'Error guardando clave en el servidor: ' + err.message };
    }
  }

  /**
   * Consulta GET https://generativelanguage.googleapis.com/v1beta/models
   * Filtra únicamente modelos que soporten generateContent
   */
  public static async getAvailableGeminiModels(apiKeyOverride?: string, forceRefresh = false): Promise<string[]> {
    const key = apiKeyOverride || this.getApiKey();
    if (!key) {
      return [];
    }

    const now = Date.now();
    if (!forceRefresh && this.cachedModels.length > 0 && (now - this.lastCacheTime < this.CACHE_TTL_MS)) {
      return this.cachedModels;
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const status = res.status;
        const msg = errorData.error?.message || '';

        if (status === 400 || status === 401 || status === 403 || msg.includes('API_KEY_INVALID')) {
          throw new Error('API Key de Gemini inválida o sin autorización.');
        } else if (status === 429 || msg.includes('RESOURCE_EXHAUSTED')) {
          throw new Error('Se alcanzó temporalmente el límite de uso de Gemini.');
        } else {
          throw new Error('No se pudo establecer conexión con Gemini. El sistema intentará utilizar otro modelo disponible.');
        }
      }

      const data = await res.json();
      const rawModels: GeminiModelInfo[] = data.models || [];

      // Filtrar únicamente los modelos que soporten generateContent
      const compatibleModels = rawModels
        .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
        .map(m => m.name.replace(/^models\//, ''))
        .filter(name => !/1\.5-flash/i.test(name));

      if (compatibleModels.length > 0) {
        this.cachedModels = compatibleModels;
        this.lastCacheTime = now;
      }

      return compatibleModels;
    } catch (err: any) {
      console.warn('[GeminiBackend] Fallo consultando modelos:', err.message);
      throw err;
    }
  }

  /**
   * Selecciona automáticamente el mejor modelo compatible priorizando Flash estables
   */
  public static selectBestGeminiModel(modelsList: string[]): string {
    if (!modelsList || modelsList.length === 0) {
      return 'gemini-2.5-flash';
    }

    // Algoritmo de puntuación por compatibilidad y estabilidad
    const scoreModel = (name: string): number => {
      let score = 0;
      const lower = name.toLowerCase();

      // 1. Priorizar modelos Flash
      if (lower.includes('flash')) {
        score += 1000;

        // Detectar versiones altas: 3.5, 3.0, 2.5, 2.0, etc.
        if (lower.includes('3.5')) score += 350;
        else if (lower.includes('3.0') || lower.includes('3-')) score += 300;
        else if (lower.includes('2.5')) score += 250;
        else if (lower.includes('2.0') || lower.includes('2-')) score += 200;
        else if (lower.includes('flash-latest')) score += 280;
        else score += 100;

        // Si es flash-lite
        if (lower.includes('lite')) score -= 20;
      } else if (lower.includes('pro')) {
        score += 500;
        if (lower.includes('2.5')) score += 250;
        else if (lower.includes('2.0')) score += 200;
      } else {
        score += 100;
      }

      // Penalizar experimentales o previews
      if (lower.includes('exp') || lower.includes('experimental')) score -= 80;
      if (lower.includes('preview')) score -= 30;

      return score;
    };

    const sorted = [...modelsList].sort((a, b) => scoreModel(b) - scoreModel(a));
    const best = sorted[0];
    this.activeModel = best;
    return best;
  }

  /**
   * Realiza una prueba real mínima de conexión enviando un ping a generateContent
   */
  public static async testGeminiConnection(apiKeyOverride?: string): Promise<{ success: boolean; message: string; model?: string }> {
    const key = apiKeyOverride || this.getApiKey();
    if (!key) {
      return { success: false, message: 'API Key de Gemini inválida o sin autorización.' };
    }

    try {
      let models = await this.getAvailableGeminiModels(key, true);
      if (models.length === 0) {
        return { success: false, message: 'No se pudo establecer conexión con Gemini. El sistema intentará utilizar otro modelo disponible.' };
      }

      const bestModel = this.selectBestGeminiModel(models);

      // Enviar petición mínima de generateContent
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${bestModel}:generateContent?key=${key}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Responde estrictamente "OK" si estás activo.' }] }],
          generationConfig: { maxOutputTokens: 10 }
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const status = res.status;
        const msg = errorData.error?.message || '';

        if (status === 400 || status === 401 || status === 403 || msg.includes('API_KEY_INVALID')) {
          return { success: false, message: 'API Key de Gemini inválida o sin autorización.' };
        } else if (status === 429 || msg.includes('RESOURCE_EXHAUSTED')) {
          return { success: false, message: 'Se alcanzó temporalmente el límite de uso de Gemini.' };
        } else {
          return { success: false, message: 'No se pudo establecer conexión con Gemini. El sistema intentará utilizar otro modelo disponible.' };
        }
      }

      return {
        success: true,
        message: 'Conexión con Google Gemini establecida correctamente.',
        model: bestModel
      };
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('inválida') || msg.includes('autorización')) {
        return { success: false, message: 'API Key de Gemini inválida o sin autorización.' };
      }
      if (msg.includes('límite') || msg.includes('429')) {
        return { success: false, message: 'Se alcanzó temporalmente el límite de uso de Gemini.' };
      }
      return { success: false, message: 'No se pudo establecer conexión con Gemini. El sistema intentará utilizar otro modelo disponible.' };
    }
  }

  /**
   * Ejecuta generateContent con timeout, reintentos controlados y fallback automático entre modelos
   */
  public static async generateContent(payload: {
    contents: any[];
    systemInstruction?: any;
    generationConfig?: any;
    model?: string;
  }): Promise<{ success: boolean; data?: any; error?: string; modelUsed?: string }> {
    const key = this.getApiKey();
    if (!key) {
      return {
        success: false,
        error: 'API Key de Gemini inválida o sin autorización.'
      };
    }

    let models = await this.getAvailableGeminiModels(key).catch(() => []);
    let currentModel = payload.model || this.activeModel;

    if (!currentModel || !models.includes(currentModel)) {
      currentModel = this.selectBestGeminiModel(models);
    }

    const maxModelAttempts = 3;
    let attemptedModels = new Set<string>();

    for (let attempt = 0; attempt < maxModelAttempts; attempt++) {
      attemptedModels.add(currentModel);

      // Reintentos controlados por fallos transitorios
      let networkTries = 0;
      const maxNetworkTries = 2;

      while (networkTries < maxNetworkTries) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${key}`;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 35000); // 35s timeout

          const bodyPayload: any = {
            contents: payload.contents,
            generationConfig: payload.generationConfig
          };
          if (payload.systemInstruction) {
            bodyPayload.systemInstruction = typeof payload.systemInstruction === 'string'
              ? { parts: [{ text: payload.systemInstruction }] }
              : payload.systemInstruction;
          }

          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyPayload),
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            this.activeModel = currentModel;
            return {
              success: true,
              data,
              modelUsed: currentModel
            };
          }

          const errorData = await res.json().catch(() => ({}));
          const status = res.status;
          const msg = errorData.error?.message || '';

          // 1. Clave inválida
          if (status === 400 || status === 401 || status === 403 || msg.includes('API_KEY_INVALID')) {
            return { success: false, error: 'API Key de Gemini inválida o sin autorización.' };
          }

          // 2. Cuota excedida
          if (status === 429 || msg.includes('RESOURCE_EXHAUSTED')) {
            return { success: false, error: 'Se alcanzó temporalmente el límite de uso de Gemini.' };
          }

          // 3. Modelo no encontrado o deprecado (404) -> Fallback automático
          if (status === 404 || msg.includes('not found') || msg.includes('not supported')) {
            console.warn(`[GeminiBackend] Modelo ${currentModel} no encontrado. Activando fallback automático...`);
            break; // Salir del bucle de red y buscar otro modelo
          }

          // 4. Errores transitorios de servidor 503 / 500
          if (status === 503 || status === 500) {
            networkTries++;
            if (networkTries < maxNetworkTries) {
              await new Promise(r => setTimeout(r, 1200 * networkTries));
              continue;
            }
          }

          return { success: false, error: 'No se pudo establecer conexión con Gemini. El sistema intentará utilizar otro modelo disponible.' };
        } catch (err: any) {
          if (err.name === 'AbortError') {
            return { success: false, error: 'Tiempo de espera agotado al conectar con Google Gemini.' };
          }
          networkTries++;
          if (networkTries < maxNetworkTries) {
            await new Promise(r => setTimeout(r, 1000));
            continue;
          }
          break;
        }
      }

      // Si llegamos aquí, el modelo actual falló (ej. 404 o deprecado). Actualizar lista y seleccionar otro compatible
      try {
        models = await this.getAvailableGeminiModels(key, true);
        const remainingModels = models.filter(m => !attemptedModels.has(m));
        if (remainingModels.length > 0) {
          currentModel = this.selectBestGeminiModel(remainingModels);
          console.log(`[GeminiBackend] Cambiando a modelo alternativo: ${currentModel}`);
        } else {
          break;
        }
      } catch {
        break;
      }
    }

    return {
      success: false,
      error: 'No se pudo establecer conexión con Gemini. El sistema intentará utilizar otro modelo disponible.'
    };
  }

  /**
   * Middleware para Vite dev / preview server
   */
  public static createMiddleware() {
    return (req: any, res: any, next: any) => {
      const url = req.url || '';

      if (!url.startsWith('/api/gemini')) {
        return next();
      }

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }

      // 1. Estado del servicio (sin exponer la clave)
      if (url === '/api/gemini/status' && req.method === 'GET') {
        res.setHeader('Content-Type', 'application/json');
        const key = this.getApiKey();
        res.end(JSON.stringify({
          isConfigured: key.length >= 10,
          currentModel: this.activeModel || 'gemini-flash-auto',
          hasEnvKey: Boolean(process.env.GEMINI_API_KEY)
        }));
        return;
      }

      // 2. Consulta de modelos disponibles
      if (url === '/api/gemini/models' && req.method === 'GET') {
        res.setHeader('Content-Type', 'application/json');
        this.getAvailableGeminiModels()
          .then(models => {
            const selected = this.selectBestGeminiModel(models);
            res.end(JSON.stringify({ success: true, models, selectedModel: selected }));
          })
          .catch(err => {
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, error: err.message || 'Error consultando modelos' }));
          });
        return;
      }

      // 3. Probar conexión
      if (url === '/api/gemini/test' && req.method === 'POST') {
        let body = '';
        req.on('data', (c: any) => body += c);
        req.on('end', () => {
          let parsed: any = {};
          try { if (body) parsed = JSON.parse(body); } catch {}
          this.testGeminiConnection(parsed.apiKey)
            .then(result => {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
            })
            .catch(err => {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: false,
                message: err.message || 'No se pudo establecer conexión con Gemini. El sistema intentará utilizar otro modelo disponible.'
              }));
            });
        });
        return;
      }

      // 4. Guardar configuración de clave en el servidor
      if (url === '/api/gemini/config' && req.method === 'POST') {
        let body = '';
        req.on('data', (c: any) => body += c);
        req.on('end', () => {
          let parsed: any = {};
          try { if (body) parsed = JSON.parse(body); } catch {}
          if (!parsed.apiKey || typeof parsed.apiKey !== 'string') {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: 'Clave API no proporcionada' }));
            return;
          }
          const result = this.saveApiKey(parsed.apiKey);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        });
        return;
      }

      // 5. Petición generateContent
      if (url === '/api/gemini/generate' && req.method === 'POST') {
        let body = '';
        req.on('data', (c: any) => body += c);
        req.on('end', () => {
          let parsed: any = {};
          try { if (body) parsed = JSON.parse(body); } catch {}
          this.generateContent(parsed)
            .then(result => {
              res.setHeader('Content-Type', 'application/json');
              if (!result.success) {
                res.statusCode = 400;
              }
              res.end(JSON.stringify(result));
            })
            .catch(err => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: false,
                error: err.message || 'No se pudo establecer conexión con Gemini. El sistema intentará utilizar otro modelo disponible.'
              }));
            });
        });
        return;
      }

      next();
    };
  }
}
