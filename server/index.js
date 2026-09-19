import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configuración estricta de CORS para producción (GitHub Pages y desarrollo local)
const defaultAllowed = [
  'https://joelcolon2012-lang.github.io',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173'
];
const extraOrigins = process.env.ALLOWED_ORIGIN
  ? process.env.ALLOWED_ORIGIN.split(',').map(o => o.trim()).filter(Boolean)
  : [];
const allowedOrigins = [...new Set([...defaultAllowed, ...extraOrigins])];

const corsOptions = {
  origin: function (origin, callback) {
    // Permitir llamadas sin origin (ej. monitoreo de salud de Render, curl, server-to-server)
    if (!origin) return callback(null, true);
    
    // Si se especifica '*' explícitamente en desarrollo, permitirlo; en producción allowedOrigins no tiene '*'
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Comparar orígenes con comodines o sufijos si aplica
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed === origin) return true;
      try {
        const originUrl = new URL(origin);
        const allowedUrl = new URL(allowed);
        return originUrl.hostname === allowedUrl.hostname;
      } catch {
        return false;
      }
    });

    if (isAllowed) {
      return callback(null, true);
    }

    return callback(new Error('Acceso denegado por política de seguridad CORS'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '25mb' }));

// Helper: traduce errores de Gemini a los mensajes oficiales requeridos
function translateGeminiError(err) {
  const status = err.status || err.statusCode || (err.response && err.response.status);
  const msg = (err.message || '').toLowerCase();

  if (status === 401 || status === 403 || msg.includes('api key') || msg.includes('api_key_invalid') || msg.includes('unauthorized')) {
    return {
      status: 401,
      message: 'API Key inválida o sin autorización.'
    };
  }

  if (status === 429 || msg.includes('quota') || msg.includes('resource_exhausted') || msg.includes('rate limit')) {
    return {
      status: 429,
      message: 'Límite de uso de Gemini alcanzado temporalmente.'
    };
  }

  if (status === 404 || msg.includes('not found') || msg.includes('not supported for generatecontent')) {
    return {
      status: 404,
      message: 'Modelo no disponible. Seleccionando otro modelo.'
    };
  }

  if (msg.includes('enotfound') || msg.includes('econnrefused') || msg.includes('fetch failed') || msg.includes('network')) {
    return {
      status: 503,
      message: 'No fue posible contactar el servidor de inteligencia artificial.'
    };
  }

  return {
    status: 500,
    message: 'Error interno del servicio de inteligencia artificial.'
  };
}

// Helper: Obtener modelos disponibles que soporten generateContent
async function fetchCompatibleModels(apiKey) {
  if (!apiKey) return [];
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const err = new Error(errJson.error?.message || `HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    const data = await res.json();
    const list = (data.models || [])
      .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
      .map(m => m.name.replace(/^models\//, ''))
      .filter(name => !/1\.5-flash/i.test(name)); // Descartar deprecados
    return list;
  } catch (err) {
    throw err;
  }
}

// Helper: Seleccionar mejor modelo disponible (prioridad: gemini-2.5-flash)
function selectBestModel(availableModels) {
  if (!availableModels || availableModels.length === 0) {
    return 'gemini-2.5-flash';
  }

  // 1. Si gemini-2.5-flash está presente, usarlo prioritariamente como solicitado
  if (availableModels.includes('gemini-2.5-flash')) {
    return 'gemini-2.5-flash';
  }

  // 2. Si no, buscar otros modelos Flash modernos
  const score = (m) => {
    const lower = m.toLowerCase();
    let pts = 0;
    if (lower.includes('flash')) {
      pts += 1000;
      if (lower.includes('3.5')) pts += 350;
      else if (lower.includes('3.0') || lower.includes('3-')) pts += 300;
      else if (lower.includes('2.5')) pts += 250;
      else if (lower.includes('2.0') || lower.includes('2-')) pts += 200;
      else if (lower.includes('flash-latest')) pts += 280;
      else pts += 100;
    } else if (lower.includes('pro')) {
      pts += 500;
      if (lower.includes('2.5')) pts += 250;
      else if (lower.includes('2.0')) pts += 200;
    }
    if (lower.includes('exp') || lower.includes('preview')) pts -= 50;
    return pts;
  };

  const sorted = [...availableModels].sort((a, b) => score(b) - score(a));
  return sorted[0] || 'gemini-2.5-flash';
}

// 1. Endpoint: GET /
app.get('/', (req, res) => {
  res.json({
    service: 'Hospital Angel Maria Gaton AI Backend',
    status: 'online',
    version: '1.0.0',
    endpoints: [
      'GET /api/health',
      'GET /api/gemini/models',
      'POST /api/gemini/test',
      'POST /api/gemini/generate'
    ]
  });
});

// 2. Endpoint: GET /api/health
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Hospital Angel Maria Gaton AI Backend'
  });
});

// 3. Endpoint: GET /api/gemini/models
app.get('/api/gemini/models', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API Key inválida o sin autorización.'
    });
  }

  try {
    const models = await fetchCompatibleModels(apiKey);
    const selected = selectBestModel(models);
    res.json({
      success: true,
      models,
      selectedModel: selected
    });
  } catch (err) {
    const translated = translateGeminiError(err);
    res.status(translated.status).json({
      success: false,
      error: translated.message
    });
  }
});

// 4. Endpoint: POST /api/gemini/test
app.post('/api/gemini/test', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API Key inválida o sin autorización.'
    });
  }

  try {
    // 1. Obtener modelos compatibles
    const models = await fetchCompatibleModels(apiKey);
    const modelToUse = selectBestModel(models);

    // 2. Inicializar SDK y enviar petición mínima real
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelToUse });

    // Prompt estricto de prueba mínima: "Responde únicamente: OK"
    const result = await model.generateContent('Responde únicamente: OK');
    const response = await result.response;
    const text = response.text() || '';

    return res.json({
      success: true,
      model: modelToUse,
      message: 'Conexión con Google Gemini establecida correctamente.',
      rawOutput: text.trim()
    });
  } catch (err) {
    const translated = translateGeminiError(err);
    return res.status(translated.status).json({
      success: false,
      message: translated.message
    });
  }
});

// 5. Endpoint: POST /api/gemini/generate
app.post('/api/gemini/generate', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API Key inválida o sin autorización.'
    });
  }

  const { prompt, model: requestedModel, contents, systemInstruction, generationConfig } = req.body;

  if (!prompt && (!contents || contents.length === 0)) {
    return res.status(400).json({
      success: false,
      error: 'El parámetro prompt o contents es requerido.'
    });
  }

  try {
    // 1. Determinar modelos disponibles
    const models = await fetchCompatibleModels(apiKey);
    let targetModel = requestedModel && models.includes(requestedModel)
      ? requestedModel
      : selectBestModel(models);

    const genAI = new GoogleGenerativeAI(apiKey);

    const callModelWithFallback = async (modelName, isRetry = false) => {
      try {
        const modelInstance = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: systemInstruction ? (typeof systemInstruction === 'string' ? systemInstruction : JSON.stringify(systemInstruction)) : undefined,
          generationConfig: generationConfig || undefined
        });

        let textOutput = '';
        let fullData = null;

        if (contents && Array.isArray(contents)) {
          // Multimodal / partes estructuradas
          const result = await modelInstance.generateContent(contents);
          const response = await result.response;
          textOutput = response.text();
          fullData = result;
        } else {
          // Texto simple
          const result = await modelInstance.generateContent(prompt);
          const response = await result.response;
          textOutput = response.text();
          fullData = result;
        }

        return {
          success: true,
          text: textOutput,
          data: fullData,
          modelUsed: modelName
        };
      } catch (err) {
        const status = err.status || err.statusCode || (err.response && err.response.status);
        const msg = (err.message || '').toLowerCase();

        // Si el modelo falló por 404 y no es reintento, seleccionar otro modelo compatible
        if (!isRetry && (status === 404 || msg.includes('not found') || msg.includes('not supported'))) {
          console.warn(`[Render Backend] Modelo ${modelName} no disponible. Seleccionando otro modelo...`);
          const remainingModels = models.filter(m => m !== modelName);
          const fallbackModel = selectBestModel(remainingModels);
          return await callModelWithFallback(fallbackModel, true);
        }

        throw err;
      }
    };

    const outcome = await callModelWithFallback(targetModel);
    return res.json(outcome);
  } catch (err) {
    const translated = translateGeminiError(err);
    return res.status(translated.status).json({
      success: false,
      error: translated.message
    });
  }
});

// Inicio del servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Hospital Angel Maria Gaton AI Backend] Activo en puerto ${PORT}`);
  console.log(`Orígenes CORS permitidos:`, allowedOrigins);
});
