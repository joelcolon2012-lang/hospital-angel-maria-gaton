import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Servicio Centralizado de IA Clínica con Gemini
 * Soporta modo normal y modo Web Grounding (Google Search)
 * Prioriza gemini-3.6-flash por estabilidad y velocidad
 */

const CLINICAL_SYSTEM_PROMPT = `Eres un asistente clínico para médicos. Responde con lenguaje médico profesional, conciso y estructurado. Prioriza guías clínicas, sociedades médicas reconocidas, revisiones sistemáticas, publicaciones académicas y fuentes médicas de alta calidad. Cuando la información dependa de recomendaciones recientes, utiliza búsqueda web si está disponible. Diferencia claramente datos establecidos de información incierta. No inventes datos, referencias ni dosis. Cuando una recomendación dependa de función renal, edad, peso, embarazo, interacciones o contexto clínico, indícalo. Tus respuestas son apoyo a la decisión clínica y deben ser revisadas por el profesional tratante.`;

export class GeminiAIService {
  constructor(apiKey) {
    this.apiKey = apiKey || null;
    this.defaultModel = 'gemini-3.6-flash';
    this.fallbackModels = ['gemini-3.8-flash', 'gemini-flash-latest'];
  }

  getApiKey() {
    return this.apiKey || process.env.GEMINI_API_KEY || '';
  }

  isConfigured() {
    return Boolean(this.getApiKey());
  }

  getGenAI() {
    const key = this.getApiKey();
    if (!key) return null;
    return new GoogleGenerativeAI(key);
  }

  /**
   * Extrae fuentes reales del groundingMetadata de Google
   */
  extractGroundingSources(response) {
    try {
      const candidate = response?.candidates?.[0];
      const metadata = candidate?.groundingMetadata;
      if (!metadata) return [];

      const sources = [];
      const seenUrls = new Set();

      if (Array.isArray(metadata.groundingChunks)) {
        for (const chunk of metadata.groundingChunks) {
          if (chunk.web && chunk.web.uri) {
            const url = chunk.web.uri;
            if (!seenUrls.has(url)) {
              seenUrls.add(url);
              sources.push({
                title: chunk.web.title || new URL(url).hostname.replace(/^www\./, ''),
                url: url
              });
            }
          }
        }
      }

      return sources;
    } catch {
      return [];
    }
  }

  /**
   * Ejecuta una consulta clínica con opción de búsqueda web y fallback automático
   */
  async searchClinical({ query, useWeb = false, modelName = null, onChunk = null }) {
    if (!this.isConfigured()) {
      throw new Error('API Key inválida o sin autorización.');
    }

    const cleanQuery = query.trim();
    const targetModel = modelName || this.defaultModel;

    const executeCall = async (modelToUse, isRetry = false) => {
      try {
        const modelOptions = {
          model: modelToUse,
          systemInstruction: CLINICAL_SYSTEM_PROMPT,
          generationConfig: {
            temperature: 0.2, // Rigor clínico
            topP: 0.8,
            maxOutputTokens: 2048,
          }
        };

        // Activar Google Search Grounding si useWeb es true
        if (useWeb) {
          modelOptions.tools = [{ googleSearch: {} }];
        }

        const genAI = this.getGenAI();
        const modelInstance = genAI.getGenerativeModel(modelOptions);

        if (onChunk && typeof onChunk === 'function') {
          // Streaming
          const resultStream = await modelInstance.generateContentStream(cleanQuery);
          let fullText = '';

          for await (const chunk of resultStream.stream) {
            const chunkText = chunk.text() || '';
            if (chunkText) {
              fullText += chunkText;
              onChunk(chunkText);
            }
          }

          const response = await resultStream.response;
          const sources = this.extractGroundingSources(response);

          return {
            answer: fullText,
            sources,
            modelUsed: modelToUse
          };
        } else {
          // Solicitud estándar (bloque completo)
          const result = await modelInstance.generateContent(cleanQuery);
          const response = await result.response;
          const text = response.text() || '';
          const sources = this.extractGroundingSources(response);

          return {
            answer: text,
            sources,
            modelUsed: modelToUse
          };
        }
      } catch (err) {
        const status = err.status || err.statusCode || (err.response && err.response.status);
        const msg = (err.message || '').toLowerCase();

        // Si falló por 404, 503, unavailable o alta demanda, intentar con modelo alternativo
        if (!isRetry && (status === 404 || status === 503 || msg.includes('not found') || msg.includes('high demand') || msg.includes('unavailable') || msg.includes('temporarily'))) {
          console.warn(`[GeminiAIService] Modelo ${modelToUse} falló (${msg}). Reintentando con fallback...`);
          const fallback = this.fallbackModels.find(m => m !== modelToUse) || 'gemini-3.8-flash';
          return await executeCall(fallback, true);
        }

        throw err;
      }
    };

    return await executeCall(targetModel);
  }
}
