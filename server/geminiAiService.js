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
    this.defaultModel = 'gemini-2.5-flash';
    this.fallbackModels = ['gemini-flash-latest', 'gemini-2.5-pro', 'gemini-3.6-flash', 'gemini-3.8-flash'];
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
    const candidateModels = [
      modelName,
      this.defaultModel,
      ...this.fallbackModels
    ].filter(Boolean);

    // Eliminar duplicados
    const modelsToTry = [...new Set(candidateModels)];

    let lastError = null;

    for (let i = 0; i < modelsToTry.length; i++) {
      const modelToUse = modelsToTry[i];
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
            let chunkText = '';
            try {
              chunkText = chunk.text() || '';
            } catch {
              chunkText = chunk?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            }

            if (chunkText) {
              fullText += chunkText;
              onChunk(chunkText);
            }
          }

          let response = null;
          try {
            response = await resultStream.response;
          } catch {}

          const sources = this.extractGroundingSources(response);

          return {
            answer: fullText,
            sources,
            modelUsed: modelToUse
          };
        } else {
          // Solicitud estándar (bloque completo)
          const result = await modelInstance.generateContent(cleanQuery);
          let response = null;
          let text = '';
          try {
            response = await result.response;
            text = response.text() || '';
          } catch {
            text = response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          }

          const sources = this.extractGroundingSources(response);

          return {
            answer: text,
            sources,
            modelUsed: modelToUse
          };
        }
      } catch (err) {
        lastError = err;
        console.warn(`[GeminiAIService] Error con modelo ${modelToUse}:`, err.message || err);
        // Continuar al siguiente modelo en el ciclo
      }
    }

    // Si fallaron todos los modelos con useWeb, reintentar una última vez con el modelo por defecto sin tools
    if (useWeb) {
      try {
        console.warn('[GeminiAIService] Reintentando sin tools de búsqueda web...');
        const genAI = this.getGenAI();
        const fallbackInstance = genAI.getGenerativeModel({
          model: this.defaultModel,
          systemInstruction: CLINICAL_SYSTEM_PROMPT
        });
        const fallbackResult = await fallbackInstance.generateContent(cleanQuery);
        const fallbackResponse = await fallbackResult.response;
        const text = fallbackResponse.text() || '';
        return {
          answer: text,
          sources: [],
          modelUsed: this.defaultModel
        };
      } catch (e) {
        lastError = e;
      }
    }

    throw lastError || new Error('No fue posible completar la consulta médica.');
  }
}
