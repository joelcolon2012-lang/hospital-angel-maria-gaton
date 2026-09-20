import { geminiService } from './geminiService';
import { authService } from '../authService';
import { AISearchResponse, AISearchSource } from '../../types';

export interface ClinicalSearchQueryOptions {
  query: string;
  useWeb: boolean;
  onChunk?: (text: string) => void;
  signal?: AbortSignal;
}

export class ClinicalAiSearchService {
  private static instance: ClinicalAiSearchService;

  private constructor() {}

  public static getInstance(): ClinicalAiSearchService {
    if (!ClinicalAiSearchService.instance) {
      ClinicalAiSearchService.instance = new ClinicalAiSearchService();
    }
    return ClinicalAiSearchService.instance;
  }

  /**
   * Ejecuta la consulta clínica a través del backend seguro en Render/local
   * Soporta streaming de texto progresivo con fallback automático
   */
  public async search({
    query,
    useWeb,
    onChunk,
    signal
  }: ClinicalSearchQueryOptions): Promise<AISearchResponse> {
    const baseUrl = geminiService.getBaseUrl();
    const currentUser = authService.getCurrentUser();
    const userId = currentUser?.id || 'usr-default';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-user-id': userId,
      'Authorization': `Bearer ${userId}`
    };

    const cleanQuery = query.trim();
    if (!cleanQuery) {
      throw new Error('La consulta no puede estar vacía.');
    }

    const wantsStream = Boolean(onChunk && typeof onChunk === 'function' && typeof ReadableStream !== 'undefined');

    if (wantsStream) {
      headers['Accept'] = 'text/event-stream';
    }

    try {
      const response = await fetch(`${baseUrl}/api/ai/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: cleanQuery,
          useWeb: Boolean(useWeb),
          stream: wantsStream,
          userId
        }),
        signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.error || errorData.message || (
          response.status === 429
            ? 'Se alcanzó temporalmente el límite de consultas.'
            : response.status === 401
            ? 'Acceso no autorizado. Verifique su sesión médica.'
            : 'No fue posible completar la consulta en el servidor principal.'
        );
        throw new Error(message);
      }

      // Si la respuesta es un Stream SSE
      const contentType = response.headers.get('Content-Type') || '';
      if (wantsStream && contentType.includes('text/event-stream') && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let accumulatedAnswer = '';
        let sources: AISearchSource[] = [];
        let modelUsed = 'gemini-3.6-flash';
        let latencyMs = 0;
        let timestamp = new Date().toISOString();

        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Guardar remanente incompleto

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;

            const jsonStr = trimmed.slice(5).trim();
            if (!jsonStr) continue;

            try {
              const data = JSON.parse(jsonStr);

              if (data.type === 'chunk' && data.text) {
                accumulatedAnswer += data.text;
                if (onChunk) {
                  onChunk(accumulatedAnswer);
                }
              } else if (data.type === 'done') {
                if (data.answer) accumulatedAnswer = data.answer;
                if (Array.isArray(data.sources)) sources = data.sources;
                if (data.modelUsed) modelUsed = data.modelUsed;
                if (data.latencyMs) latencyMs = data.latencyMs;
                if (data.timestamp) timestamp = data.timestamp;
              } else if (data.type === 'error') {
                throw new Error(data.error || 'Error en la respuesta de IA.');
              }
            } catch (e: any) {
              if (e.message && e.message.includes('Error en la respuesta')) {
                throw e;
              }
            }
          }
        }

        return {
          success: true,
          answer: accumulatedAnswer,
          sources,
          modelUsed,
          latencyMs,
          timestamp
        };
      } else {
        // Respuesta estándar JSON
        const data: AISearchResponse = await response.json();
        if (data.success && data.answer && onChunk) {
          onChunk(data.answer);
        }
        return data;
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Consulta cancelada por el usuario.');
      }

      // Fallback Inteligente: Si falla /api/ai/search, reintentar con /api/gemini/generate
      console.warn('[ClinicalAiSearch] Intentando fallback secundario con generateContent...', err);
      try {
        const fallbackRes = await geminiService.generateContent({
          prompt: cleanQuery,
          systemInstruction: 'Eres un asistente clínico para médicos. Responde con lenguaje médico profesional, conciso y estructurado. Prioriza guías clínicas, sociedades médicas reconocidas y evidencia médica de alta calidad.'
        });

        if (fallbackRes.success && fallbackRes.text) {
          if (onChunk) onChunk(fallbackRes.text);
          return {
            success: true,
            answer: fallbackRes.text,
            sources: [],
            modelUsed: fallbackRes.modelUsed || 'gemini-3.6-flash',
            timestamp: new Date().toISOString()
          };
        }
      } catch (fallbackErr) {
        console.error('[ClinicalAiSearch] Fallback también falló:', fallbackErr);
      }

      if (err.message && err.message.toLowerCase().includes('failed to fetch')) {
        throw new Error('Verifique su conexión e intente nuevamente.');
      }
      throw err;
    }
  }
}

export const clinicalAiSearchService = ClinicalAiSearchService.getInstance();
