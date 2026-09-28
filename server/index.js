import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GeminiAIService } from './geminiAiService.js';
import { centralDb, verifyPassword } from './centralDb.js';
import { authContext, issueToken, ensureAuthSecret, isAdminUser, relayEnabled } from './auth.js';
import { MongoStore } from './mongoStore.js';
import { startCloudRelay, cloudRelayStatus } from './cloudRelay.js';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, '..', 'dist');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const clinicalAiService = new GeminiAIService();

// Clientes suscritos al canal Real-Time SSE
const sseClients = new Set();

export function broadcastRealtimeEvent(type, payload) {
  const message = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.res.write(message);
    } catch (err) {
      console.warn('[SSE] Error enviando evento a cliente:', err?.message);
    }
  }
}

// Heartbeat cada 15 segundos para mantener vivos los sockets SSE y detectar clientes desconectados
setInterval(() => {
  const ping = `: ping ${Date.now()}\n\n`;
  for (const client of sseClients) {
    try {
      client.res.write(ping);
    } catch {
      sseClients.delete(client);
    }
  }
}, 15000);

// Control de Tasa (Rate Limiting)
const rateLimitMap = new Map();
function checkRateLimit(key, maxLimit = 60, windowMs = 60000) {
  const now = Date.now();
  const history = (rateLimitMap.get(key) || []).filter(ts => now - ts < windowMs);
  if (history.length >= maxLimit) return false;
  history.push(now);
  rateLimitMap.set(key, history);
  return true;
}

// Configuración CORS Universal para Aplicación Médica Multidispositivo
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir cualquier cliente (GitHub Pages, móviles, localhost, red local hospitalaria)
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-user-name', 'x-user-role', 'x-device-origin', 'x-device-id', 'Cache-Control', 'Accept']
};

app.use(cors(corsOptions));
app.use(express.json({
  limit: '50mb',
  // Se guarda el cuerpo original para verificar la firma del enlace de la PC
  verify: (req, _res, buf) => { req.rawBody = buf.toString('utf8'); }
}));

// -------------------------------------------------------------------------
// SEGURIDAD: los datos clínicos sólo se entregan con sesión iniciada
// -------------------------------------------------------------------------
const PUBLIC_API = [
  ['GET', /^\/api\/(health|status|events)\/?$/],
  ['GET', /^\/api\/users\/?$/],
  ['POST', /^\/api\/users\/login\/?$/]
];
app.use((req, res, next) => {
  if (!req.path.startsWith('/api/') || req.method === 'OPTIONS') return next();
  if (PUBLIC_API.some(([m, re]) => m === req.method && re.test(req.path))) return next();
  const ctx = authContext(req, centralDb.memoryData);
  if (!ctx) {
    return res.status(401).json({
      success: false,
      code: 'AUTH_REQUIRED',
      error: 'Sesión requerida: inicie sesión con su PIN para sincronizar.'
    });
  }
  req.auth = ctx;
  next();
});

/** Sólo el administrador (o el propio usuario, si se permite) puede tocar cuentas. */
function requireAdminOrSelf(req, res, allowSelf = true) {
  const a = req.auth;
  if (!a) return false;
  if (a.kind === 'relay' || isAdminUser(a.user)) return true;
  if (allowSelf && a.user && a.user.id === req.params.id) return true;
  res.status(403).json({ success: false, error: 'Sólo el administrador puede modificar otras cuentas.' });
  return false;
}

// Cualquier escritura exitosa en la API avisa a TODOS los dispositivos conectados
// para que descarguen los cambios de inmediato (tiempo real).
const NON_DATA_ROUTES = /^\/api\/(ai|gemini|users\/login|sync\/v2)/;
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'OPTIONS' && req.path.startsWith('/api/') && !NON_DATA_ROUTES.test(req.path)) {
    res.on('finish', () => {
      if (res.statusCode < 400) {
        broadcastRealtimeEvent('sync.changed', {
          seq: centralDb.memoryData.seq,
          deviceId: req.headers['x-device-id'] || null
        });
      }
    });
  }
  next();
});

// Helper: traduce errores de Gemini a mensajes claros
function translateGeminiError(err) {
  const status = err.status || err.statusCode || (err.response && err.response.status);
  const msg = (err.message || '').toLowerCase();

  if (status === 401 || status === 403 || msg.includes('api key') || msg.includes('api_key_invalid') || msg.includes('unauthorized')) {
    return { status: 401, message: 'API Key inválida o sin autorización.' };
  }
  if (status === 429 || msg.includes('quota') || msg.includes('resource_exhausted') || msg.includes('rate limit')) {
    return { status: 429, message: 'Límite de uso de Gemini alcanzado temporalmente.' };
  }
  if (status === 404 || msg.includes('not found') || msg.includes('not supported for generatecontent')) {
    return { status: 404, message: 'Modelo no disponible. Seleccionando otro modelo compatible.' };
  }
  if (msg.includes('enotfound') || msg.includes('econnrefused') || msg.includes('fetch failed') || msg.includes('network')) {
    return { status: 503, message: 'No fue posible contactar el servidor de inteligencia artificial.' };
  }
  return { status: 500, message: 'Error interno del servicio de inteligencia artificial.' };
}

// Helper: Obtener modelos compatibles
async function fetchCompatibleModels(apiKey) {
  if (!apiKey) return [];
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    const err = new Error(errJson.error?.message || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  return (data.models || [])
    .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
    .map(m => m.name.replace(/^models\//, ''))
    .filter(name => !/1\.5-flash/i.test(name));
}

function selectBestModel(availableModels) {
  if (!availableModels || availableModels.length === 0) return 'gemini-3.8-flash';
  const valid = availableModels.filter(m => !/1\.5-flash|2\.5-flash$/i.test(m));
  const list = valid.length > 0 ? valid : availableModels;
  const score = (m) => {
    const lower = m.toLowerCase();
    let pts = 0;
    if (lower.includes('flash')) {
      pts += 1000;
      if (lower.includes('3.6')) pts += 450;
      else if (lower.includes('3.8')) pts += 400;
      else if (lower.includes('3.7')) pts += 380;
      else if (lower.includes('3.5')) pts += 350;
      else pts += 100;
    } else if (lower.includes('pro')) pts += 500;
    return pts;
  };
  return [...list].sort((a, b) => score(b) - score(a))[0] || 'gemini-3.8-flash';
}

// =========================================================================
// 1. ENDPOINT: CANAL REAL-TIME SERVER-SENT EVENTS (SSE)
// =========================================================================
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const clientObj = { id: clientId, res, ip: req.ip, user: req.query.user || 'Anónimo' };
  sseClients.add(clientObj);

  console.log(`[SSE] Nuevo dispositivo conectado (${clientId}). Total activos: ${sseClients.size}`);

  // Enviar evento de conexión inicial con timestamp y versión del servidor
  const initData = {
    connected: true,
    clientId,
    serverTime: Date.now(),
    version: centralDb.memoryData.version,
    totalPatients: centralDb.memoryData.patients.length,
    totalUsers: centralDb.memoryData.users.length
  };
  res.write(`retry: 3000\n`);
  initData.seq = centralDb.memoryData.seq;
  initData.connectedDevices = sseClients.size;
  res.write(`event: init\ndata: ${JSON.stringify(initData)}\n\n`);
  broadcastRealtimeEvent('devices', { connectedDevices: sseClients.size });

  req.on('close', () => {
    sseClients.delete(clientObj);
    broadcastRealtimeEvent('devices', { connectedDevices: sseClients.size });
    console.log(`[SSE] Dispositivo desconectado (${clientId}). Total activos: ${sseClients.size}`);
  });
});

// =========================================================================
// 2. ENDPOINTS DE ESTADO & SALUD
// =========================================================================
app.get('/api/status', (req, res) => {
  res.json({
    service: 'Hospital Angel Maria Gaton Backend API Central',
    status: 'online',
    version: centralDb.memoryData.version,
    connectedDevices: sseClients.size,
    totalPatients: centralDb.memoryData.patients.length,
    totalUsers: centralDb.memoryData.users.length,
    lastUpdated: centralDb.memoryData.lastUpdated
  });
});

function lanUrls() {
  const port = process.env.PORT || 3001;
  const urls = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const ni of list || []) {
      if (ni.family === 'IPv4' && !ni.internal) urls.push(`http://${ni.address}:${port}`);
    }
  }
  return urls;
}

app.get('/api/health', (req, res) => {
  res.json({
    lanUrls: lanUrls(),
    seq: centralDb.memoryData.seq,
    status: 'ok',
    service: 'Hospital Angel Maria Gaton Central Database & AI API',
    database: 'active',
    storage: centralDb.storageInfo(),
    dbId: centralDb.memoryData.dbId,
    authRequired: true,
    relayKey: relayEnabled(),
    cloudRelay: cloudRelayStatus(),
    connectedDevices: sseClients.size,
    timestamp: new Date().toISOString()
  });
});

// =========================================================================
// 3. ENDPOINTS DE SINCRONIZACIÓN CENTRAL (FULL SYNC)
// =========================================================================
// ---- Sincronización delta v2 (registro por registro, con lápidas) ----
app.get('/api/sync/v2', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ success: true, ...centralDb.getChangesSince(Number(req.query.since) || 0, req.auth) });
});

app.post('/api/sync/v2', async (req, res) => {
  try {
    const deviceId = req.headers['x-device-id'] || req.body?.deviceId || null;
    const result = await centralDb.syncV2(req.body || {}, req.auth);
    if (result.accepted > 0) {
      broadcastRealtimeEvent('sync.changed', { seq: result.seq, deviceId });
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[POST /api/sync/v2 Error]', err);
    res.status(500).json({ success: false, error: err.message || 'Error de sincronización' });
  }
});

app.get('/api/backup', (req, res) => {
  const filename = `Respaldo_Emergencia_Dr_Colon_${new Date().toISOString().slice(0, 10)}.json`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.json({ version: centralDb.memoryData.version, lastUpdated: centralDb.memoryData.lastUpdated, data: centralDb.getMasterData().data });
});

app.get('/api/sync', (req, res) => {
  const master = centralDb.getMasterData();
  res.json(master);
});

app.post('/api/sync', async (req, res) => {
  try {
    const originDevice = req.headers['x-device-origin'] || req.body.deviceOrigin || 'Dispositivo Remoto';
    const payload = req.body.data || req.body.payload || req.body;
    
    const updatedMaster = await centralDb.syncMasterData(payload, originDevice, req.auth);

    // Emitir evento a todos los demás dispositivos conectados
    broadcastRealtimeEvent('sync.completed', {
      version: updatedMaster.version,
      lastUpdated: updatedMaster.lastUpdated,
      patientCount: updatedMaster.data.patients.length,
      userCount: updatedMaster.data.users.length,
      originDevice
    });

    res.json(updatedMaster);
  } catch (err) {
    console.error('[POST /api/sync Error]', err);
    res.status(500).json({ success: false, error: err.message || 'Error en sincronización central' });
  }
});

// =========================================================================
// 4. ENDPOINTS REST: PACIENTES
// =========================================================================
app.get('/api/patients', (req, res) => {
  const includeDeleted = req.query.includeDeleted === 'true';
  const list = centralDb.getAllPatients(includeDeleted);
  res.json({ success: true, count: list.length, patients: list });
});

app.get('/api/patients/:id', (req, res) => {
  const p = centralDb.getPatientById(req.params.id);
  if (!p) return res.status(404).json({ success: false, error: 'Paciente no encontrado' });
  res.json({ success: true, patient: p });
});

app.post('/api/patients', async (req, res) => {
  try {
    const user = req.headers['x-user-name'] || req.body.attendingDoctor || 'Dr. Joel Colón';
    const saved = await centralDb.savePatient(req.body, user);

    // Emitir evento en tiempo real a todas las computadoras y celulares
    broadcastRealtimeEvent('patient.created', {
      patient: saved,
      createdBy: user,
      timestamp: saved.createdAt
    });

    res.status(201).json({ success: true, patient: saved });
  } catch (err) {
    console.error('[POST /api/patients Error]', err);
    res.status(500).json({ success: false, error: err.message || 'Error guardando paciente' });
  }
});

app.put('/api/patients/:id', async (req, res) => {
  try {
    const user = req.headers['x-user-name'] || 'Dr. Joel Colón';
    const patientData = { ...req.body, id: req.params.id };
    const saved = await centralDb.savePatient(patientData, user);

    // Emitir evento en tiempo real
    broadcastRealtimeEvent('patient.updated', {
      patient: saved,
      updatedBy: user,
      timestamp: saved.updatedAt
    });

    res.json({ success: true, patient: saved });
  } catch (err) {
    console.error('[PUT /api/patients/:id Error]', err);
    res.status(500).json({ success: false, error: err.message || 'Error modificando paciente' });
  }
});

app.delete('/api/patients/:id', async (req, res) => {
  try {
    const user = req.headers['x-user-name'] || 'Dr. Joel Colón';
    const ok = await centralDb.deletePatient(req.params.id, user);
    if (!ok) return res.status(404).json({ success: false, error: 'Paciente no encontrado' });

    broadcastRealtimeEvent('patient.deleted', {
      patientId: req.params.id,
      deletedBy: user,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, message: 'Paciente archivado (soft-delete) exitosamente' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// 5. ENDPOINTS REST: USUARIOS, AUTH & GESTIÓN DE ROLES
// =========================================================================
app.get('/api/users', (req, res) => {
  const includeDeleted = req.query.includeDeleted === 'true';
  const ctx = authContext(req, centralDb.memoryData);
  let users = centralDb.getAllUsers(ctx ? includeDeleted : false);
  // Sin sesión sólo se muestra lo necesario para la pantalla de acceso
  if (!ctx) {
    users = users.map(({ id, name, role, specialty, exequatur, avatarUrl, isActive, isSuperAdmin }) => ({
      id, name, role, specialty, exequatur, avatarUrl, isActive, isSuperAdmin
    }));
  }
  res.json({ success: true, count: users.length, users });
});

app.get('/api/users/:id', (req, res) => {
  const u = centralDb.getUserById(req.params.id);
  if (!u) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
  res.json({ success: true, user: u });
});

app.post('/api/users/login', async (req, res) => {
  const { identifier, pin, password } = req.body;
  if (!identifier || (!pin && !password)) {
    return res.status(400).json({ success: false, error: 'Se requiere identificación y PIN/contraseña.' });
  }
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
  // Sólo los intentos FALLIDOS cuentan (máx. 10 cada 5 min por dispositivo y usuario)
  const failKey = `loginfail:${ip}:${String(identifier).toLowerCase()}`;
  const fails = (rateLimitMap.get(failKey) || []).filter((ts) => Date.now() - ts < 5 * 60 * 1000);
  if (fails.length >= 10) {
    return res.status(429).json({ success: false, error: 'Demasiados intentos fallidos. Espere unos minutos e intente de nuevo.' });
  }
  const result = await centralDb.authenticateUser(identifier, pin || password);
  if (!result.success) {
    fails.push(Date.now());
    rateLimitMap.set(failKey, fails);
    return res.status(401).json({ success: false, error: result.error });
  }
  const full = centralDb.memoryData.users.find((u) => u.id === result.user.id);
  const hadSecret = Boolean(centralDb.memoryData.authSecret);
  ensureAuthSecret(centralDb.memoryData);
  if (!hadSecret) centralDb.persistToDisk().catch(() => {});
  res.json({ ...result, token: full ? issueToken(centralDb.memoryData, full) : null });
});

app.post('/api/users', async (req, res) => {
  if (!requireAdminOrSelf(req, res, false)) return;
  try {
    const creator = req.headers['x-user-name'] || 'Dr. Joel Colón';
    const newUser = await centralDb.createUser(req.body, creator);

    broadcastRealtimeEvent('user.created', {
      user: newUser,
      createdBy: creator,
      timestamp: newUser.createdAt
    });

    res.status(201).json({ success: true, user: newUser });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  if (!requireAdminOrSelf(req, res)) return;
  if (req.auth.kind !== 'relay' && !isAdminUser(req.auth.user)) {
    for (const f of ['role', 'isSuperAdmin', 'isActive', 'isDeleted', 'permissions']) delete req.body[f];
  }
  try {
    const editor = req.headers['x-user-name'] || 'Dr. Joel Colón';
    const updated = await centralDb.updateUser(req.params.id, req.body, editor);

    broadcastRealtimeEvent('user.updated', {
      user: updated,
      updatedBy: editor,
      timestamp: updated.updatedAt
    });

    res.json({ success: true, user: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/users/:id/password', async (req, res) => {
  if (!requireAdminOrSelf(req, res)) return;
  try {
    const editor = req.headers['x-user-name'] || 'Dr. Joel Colón';
    const { newPassword, confirmPassword, currentPassword } = req.body;

    if (!newPassword || newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, error: 'La confirmación de contraseña no coincide.' });
    }

    // Cambiar el PIN propio exige el PIN actual (protege si alguien toma el dispositivo)
    const isSelf = req.auth.kind === 'user' && req.auth.user.id === req.params.id;
    if (isSelf) {
      const me = centralDb.memoryData.users.find((u) => u.id === req.params.id);
      if (!currentPassword || !me || !verifyPassword(String(currentPassword).trim(), me.pinHash)) {
        return res.status(400).json({ success: false, error: 'El PIN actual no es correcto.' });
      }
    }

    await centralDb.resetUserPassword(req.params.id, newPassword, editor);
    if (isSelf) {
      const me = centralDb.memoryData.users.find((u) => u.id === req.params.id);
      return res.json({ success: true, message: 'PIN actualizado.', token: issueToken(centralDb.memoryData, me) });
    }

    broadcastRealtimeEvent('user.password_reset', {
      userId: req.params.id,
      updatedBy: editor,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, message: 'Contraseña/PIN actualizado exitosamente.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/users/:id/photo', async (req, res) => {
  if (!requireAdminOrSelf(req, res)) return;
  try {
    const editor = req.headers['x-user-name'] || 'Dr. Joel Colón';
    const { avatarUrl } = req.body;
    if (!avatarUrl) return res.status(400).json({ success: false, error: 'avatarUrl es requerido' });

    const updated = await centralDb.updateUser(req.params.id, { avatarUrl }, editor);

    broadcastRealtimeEvent('user.updated', {
      user: updated,
      updatedBy: editor,
      timestamp: updated.updatedAt
    });

    res.json({ success: true, user: updated, message: 'Foto de perfil actualizada correctamente.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/users/:id/status', async (req, res) => {
  if (!requireAdminOrSelf(req, res, false)) return;
  try {
    const editor = req.headers['x-user-name'] || 'Dr. Joel Colón';
    const { active } = req.body;
    const user = await centralDb.toggleUserStatus(req.params.id, active, editor);

    broadcastRealtimeEvent('user.status_changed', {
      userId: req.params.id,
      active: user.isActive,
      updatedBy: editor,
      timestamp: user.updatedAt
    });

    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// =========================================================================
// 6. ENDPOINTS REST: HISTORIA DE PLANTA, ÓRDENES, EVOLUCIONES, AUDITORÍA
// =========================================================================
app.get('/api/history-planta/:patientId', (req, res) => {
  const h = centralDb.getHistoryPlantaByPatientId(req.params.patientId);
  res.json({ success: true, history: h });
});

app.post('/api/history-planta', async (req, res) => {
  try {
    const user = req.headers['x-user-name'] || 'Dr. Joel Colón';
    const saved = await centralDb.saveHistoryPlanta(req.body, user);

    broadcastRealtimeEvent('history_planta.updated', {
      patientId: saved.patientId,
      history: saved,
      updatedBy: user,
      timestamp: saved.updatedAt
    });

    res.json({ success: true, history: saved });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/orders/:patientId', (req, res) => {
  const orders = centralDb.getOrdersByPatientId(req.params.patientId);
  res.json({ success: true, count: orders.length, orders });
});

app.post('/api/orders', async (req, res) => {
  try {
    const user = req.headers['x-user-name'] || 'Dr. Joel Colón';
    const order = await centralDb.saveOrder(req.body, user);

    broadcastRealtimeEvent('order.created', {
      patientId: order.patientId,
      order,
      createdBy: user,
      timestamp: order.createdAt
    });

    res.status(201).json({ success: true, order });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.put('/api/orders/:id', async (req, res) => {
  try {
    const user = req.headers['x-user-name'] || 'Dr. Joel Colón';
    const order = await centralDb.saveOrder({ ...req.body, id: req.params.id }, user);

    broadcastRealtimeEvent('order.updated', {
      patientId: order.patientId,
      order,
      updatedBy: user,
      timestamp: order.updatedAt || new Date().toISOString()
    });

    res.json({ success: true, order });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete('/api/orders/:id', async (req, res) => {
  try {
    const user = req.headers['x-user-name'] || 'Dr. Joel Colón';
    const ok = await centralDb.deleteOrder(req.params.id, user);
    if (!ok) return res.status(404).json({ success: false, error: 'Orden no encontrada' });

    broadcastRealtimeEvent('order.deleted', {
      orderId: req.params.id,
      deletedBy: user,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, message: 'Orden médica eliminada exitosamente' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/evolutions/:patientId', (req, res) => {
  const evolutions = centralDb.getEvolutionsByPatientId(req.params.patientId);
  res.json({ success: true, count: evolutions.length, evolutions });
});

app.post('/api/evolutions', async (req, res) => {
  try {
    const user = req.headers['x-user-name'] || 'Dr. Joel Colón';
    const evo = await centralDb.saveEvolution(req.body, user);

    broadcastRealtimeEvent('evolution.created', {
      patientId: evo.patientId,
      evolution: evo,
      createdBy: user,
      timestamp: evo.createdAt
    });

    res.status(201).json({ success: true, evolution: evo });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete('/api/evolutions/:id', async (req, res) => {
  try {
    const user = req.headers['x-user-name'] || 'Dr. Joel Colón';
    const ok = await centralDb.deleteEvolution(req.params.id, user);
    if (!ok) return res.status(404).json({ success: false, error: 'Evolución no encontrada' });

    broadcastRealtimeEvent('evolution.deleted', {
      evolutionId: req.params.id,
      deletedBy: user,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, message: 'Evolución eliminada exitosamente' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// 6B. ENDPOINTS REST: PENDIENTES DE GUARDIA, LABORATORIOS & ESTUDIOS
// =========================================================================
app.get('/api/tasks', (req, res) => {
  const patientId = req.query.patientId || null;
  const tasks = centralDb.getPendingTasks(patientId);
  res.json({ success: true, count: tasks.length, tasks });
});

app.post('/api/tasks', async (req, res) => {
  try {
    const user = req.headers['x-user-name'] || 'Dr. Joel Colón';
    const task = await centralDb.savePendingTask(req.body, user);

    broadcastRealtimeEvent('pending.created', {
      task,
      patientId: task.patientId,
      createdBy: user,
      timestamp: task.createdAt
    });

    res.status(201).json({ success: true, task });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const user = req.headers['x-user-name'] || 'Dr. Joel Colón';
    const task = await centralDb.savePendingTask({ ...req.body, id: req.params.id }, user);

    broadcastRealtimeEvent('pending.updated', {
      task,
      patientId: task.patientId,
      updatedBy: user,
      timestamp: task.updatedAt
    });

    res.json({ success: true, task });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.patch('/api/tasks/:id/status', async (req, res) => {
  try {
    const user = req.headers['x-user-name'] || 'Dr. Joel Colón';
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, error: 'Status es requerido' });

    const task = await centralDb.updatePendingTaskStatus(req.params.id, status, user);

    const eventName = status === 'REALIZADO' ? 'pending.completed' : 'pending.updated';
    broadcastRealtimeEvent(eventName, {
      taskId: task.id,
      task,
      patientId: task.patientId,
      status,
      updatedBy: user,
      timestamp: task.updatedAt
    });

    res.json({ success: true, task });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const user = req.headers['x-user-name'] || 'Dr. Joel Colón';
    const ok = await centralDb.deletePendingTask(req.params.id, user);
    if (!ok) return res.status(404).json({ success: false, error: 'Pendiente no encontrado' });

    broadcastRealtimeEvent('pending.deleted', {
      taskId: req.params.id,
      deletedBy: user,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, message: 'Pendiente eliminado exitosamente' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/labs/:patientId', (req, res) => {
  const labs = centralDb.memoryData.labs.filter(l => l.patientId === req.params.patientId);
  res.json({ success: true, count: labs.length, labs });
});

app.post('/api/labs', async (req, res) => {
  try {
    const user = req.headers['x-user-name'] || 'Dr. Joel Colón';
    const lab = await centralDb.saveLabResult(req.body, user);

    broadcastRealtimeEvent('lab.created', {
      lab,
      patientId: lab.patientId,
      registeredBy: user,
      timestamp: lab.timestamp
    });

    res.status(201).json({ success: true, lab });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete('/api/labs/:id', async (req, res) => {
  try {
    const user = req.headers['x-user-name'] || 'Dr. Joel Colón';
    const ok = await centralDb.deleteLabResult(req.params.id, user);
    if (!ok) return res.status(404).json({ success: false, error: 'Laboratorio no encontrado' });

    broadcastRealtimeEvent('lab.deleted', {
      labId: req.params.id,
      deletedBy: user,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, message: 'Laboratorio eliminado exitosamente' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/studies/:patientId', (req, res) => {
  const studies = centralDb.getStudiesByPatientId(req.params.patientId);
  res.json({ success: true, count: studies.length, studies });
});

app.post('/api/studies', async (req, res) => {
  try {
    const user = req.headers['x-user-name'] || 'Dr. Joel Colón';
    const study = await centralDb.saveStudy(req.body, user);

    broadcastRealtimeEvent('study.created', {
      study,
      patientId: study.patientId,
      registeredBy: user,
      timestamp: study.timestamp
    });

    res.status(201).json({ success: true, study });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete('/api/studies/:id', async (req, res) => {
  try {
    const user = req.headers['x-user-name'] || 'Dr. Joel Colón';
    const ok = await centralDb.deleteStudy(req.params.id, user);
    if (!ok) return res.status(404).json({ success: false, error: 'Estudio no encontrado' });

    broadcastRealtimeEvent('study.deleted', {
      studyId: req.params.id,
      deletedBy: user,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, message: 'Estudio eliminado exitosamente' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/stroke', async (req, res) => {
  try {
    const user = req.headers['x-user-name'] || 'Dr. Joel Colón';
    const record = await centralDb.saveStrokeRecord(req.body, user);

    broadcastRealtimeEvent('stroke.updated', {
      record,
      patientId: record.patientId,
      registeredBy: user,
      timestamp: record.updatedAt
    });

    res.json({ success: true, record });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/audit-logs', (req, res) => {
  const logs = centralDb.getAuditLogs(100);
  res.json({ success: true, count: logs.length, logs });
});

// =========================================================================
// 7. ENDPOINTS DE INTELIGENCIA ARTIFICIAL CLÍNICA (GEMINI)
// =========================================================================
app.get('/api/gemini/models', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(401).json({ success: false, error: 'API Key inválida o sin autorización.' });

  try {
    const models = await fetchCompatibleModels(apiKey);
    const selected = selectBestModel(models);
    res.json({ success: true, models, selectedModel: selected });
  } catch (err) {
    const translated = translateGeminiError(err);
    res.status(translated.status).json({ success: false, error: translated.message });
  }
});

// Generación general con Gemini (texto e imágenes: transcripción de notas, fotos, PDF escaneados…)
// Requiere sesión. La clave de Gemini sólo vive en el servidor.
app.post('/api/gemini/generate', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ success: false, error: 'La inteligencia artificial no está configurada en el servidor.' });
  const who = req.auth?.user?.id || 'relay';
  if (!checkRateLimit(`gemini:${who}`, 30, 60 * 1000)) {
    return res.status(429).json({ success: false, error: 'Demasiadas solicitudes a la IA. Espere un minuto.' });
  }
  const { prompt, contents, systemInstruction, generationConfig, model } = req.body || {};
  const normContents = Array.isArray(contents) && contents.length
    ? contents.map((c) => ({ role: c.role || 'user', parts: Array.isArray(c.parts) ? c.parts : [{ text: String(c.text || '') }] }))
    : [{ role: 'user', parts: [{ text: String(prompt || '') }] }];
  if (!normContents[0].parts.length || (normContents[0].parts.length === 1 && !normContents[0].parts[0].text && !normContents[0].parts[0].inlineData)) {
    return res.status(400).json({ success: false, error: 'La solicitud está vacía.' });
  }
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    let candidates = [];
    try {
      candidates = await fetchCompatibleModels(apiKey);
    } catch {}
    const first = model && (!candidates.length || candidates.includes(model)) ? model : selectBestModel(candidates);
    const order = [first, ...candidates.filter((m) => m !== first && /flash/i.test(m)).slice(0, 2)].filter(Boolean);
    let lastErr = null;
    for (const name of order) {
      try {
        const m = genAI.getGenerativeModel({ model: name, ...(systemInstruction ? { systemInstruction } : {}) });
        const result = await m.generateContent({ contents: normContents, ...(generationConfig ? { generationConfig } : {}) });
        const response = await result.response;
        return res.json({ success: true, text: response.text() || '', modelUsed: name });
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error('Sin modelos disponibles');
  } catch (err) {
    const translated = translateGeminiError(err);
    return res.status(translated.status).json({ success: false, error: translated.message });
  }
});

app.post('/api/gemini/test', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(401).json({ success: false, message: 'API Key inválida o sin autorización.' });

  try {
    const models = await fetchCompatibleModels(apiKey);
    const initialModel = selectBestModel(models);
    const genAI = new GoogleGenerativeAI(apiKey);

    const tryTestModel = async (modelName, isRetry = false) => {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Responde únicamente: OK');
        const response = await result.response;
        return {
          success: true,
          model: modelName,
          message: 'Conexión con Google Gemini establecida correctamente.',
          rawOutput: (response.text() || '').trim()
        };
      } catch (err) {
        if (!isRetry) {
          const remaining = models.filter(m => m !== modelName);
          const next = selectBestModel(remaining);
          if (next && next !== modelName) return await tryTestModel(next, true);
        }
        throw err;
      }
    };

    const outcome = await tryTestModel(initialModel);
    return res.json(outcome);
  } catch (err) {
    const translated = translateGeminiError(err);
    return res.status(translated.status).json({ success: false, message: translated.message });
  }
});

app.post('/api/ai/search', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(401).json({ success: false, error: 'API Key inválida o sin autorización.' });

  const { query, useWeb, stream, model } = req.body;
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ success: false, error: 'La consulta no puede estar vacía.' });
  }

  const cleanQuery = query.trim();
  const isStreaming = stream === true || req.headers.accept === 'text/event-stream';

  try {
    if (isStreaming) {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders?.();

      const startTime = Date.now();
      const result = await clinicalAiService.searchClinical({
        query: cleanQuery,
        useWeb: Boolean(useWeb),
        modelName: model || null,
        onChunk: (chunkText) => {
          res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunkText })}\n\n`);
        }
      });

      const latencyMs = Date.now() - startTime;
      res.write(`data: ${JSON.stringify({
        type: 'done',
        success: true,
        answer: result.answer,
        sources: result.sources || [],
        modelUsed: result.modelUsed,
        latencyMs,
        timestamp: new Date().toISOString()
      })}\n\n`);
      res.end();
    } else {
      const startTime = Date.now();
      const result = await clinicalAiService.searchClinical({
        query: cleanQuery,
        useWeb: Boolean(useWeb),
        modelName: model || null
      });
      res.json({
        success: true,
        answer: result.answer,
        sources: result.sources || [],
        modelUsed: result.modelUsed,
        latencyMs: Date.now() - startTime,
        timestamp: new Date().toISOString()
      });
    }
  } catch (err) {
    const translated = translateGeminiError(err);
    if (isStreaming && !res.headersSent) {
      return res.status(translated.status).json({ success: false, error: translated.message });
    } else if (isStreaming) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: translated.message })}\n\n`);
      res.end();
    } else {
      return res.status(translated.status).json({ success: false, error: translated.message });
    }
  }
});

// =========================================================================
// APLICACIÓN WEB (misma dirección para PC, iPhone y Android en la red)
// =========================================================================
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR, {
    index: false,
    setHeaders: (res, filePath) => {
      if (/[\\/]assets[\\/]/.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        // index.html, version.json, manifest: siempre la versión más nueva
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
  }));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
} else {
  app.get('/', (req, res) => res.redirect('/api/status'));
}

// Inicio del servidor: primero se conecta la base permanente en la nube (si existe)
async function connectCloudDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('[CentralDB] MONGODB_URI no configurada: se usa el archivo local.');
    return;
  }
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const store = await MongoStore.connect(uri);
      await centralDb.attachMongo(store);
      return;
    } catch (err) {
      console.error(`[CentralDB] Intento ${attempt} de conectar a MongoDB falló:`, err?.message);
      await new Promise((r) => setTimeout(r, attempt * 3000));
    }
  }
  // Sin nube no se debe aceptar datos que se perderían al reiniciar Render
  console.error('[CentralDB] No se pudo conectar a MongoDB. El servidor se cerrará para que Render lo reintente.');
  process.exit(1);
}

await connectCloudDatabase();
ensureAuthSecret(centralDb.memoryData);
await centralDb.persistToDisk().catch(() => {});
startCloudRelay(centralDb, broadcastRealtimeEvent);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`========================================================================`);
  console.log(`[HOSPITAL DR. ÁNGEL MARÍA GATÓN - BACKEND CENTRALIZADO & REALTIME]`);
  console.log(`- Puerto Activo: ${PORT}`);
  console.log(`- Base de Datos Central: Cargada y Persistente`);
  console.log(`- Canal Real-Time SSE: /api/events`);
  console.log(`- API REST Clínico: /api/patients, /api/users, /api/sync`);
  console.log(`========================================================================`);
});
