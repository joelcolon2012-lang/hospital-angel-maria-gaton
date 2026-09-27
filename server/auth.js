/**
 * Seguridad de la API central
 * ---------------------------
 * 1. Sesión de usuario: al iniciar sesión con su PIN, el servidor entrega un
 *    "token" firmado (válido 30 días). Toda lectura/escritura de datos clínicos
 *    lo exige. Si el PIN cambia, los tokens anteriores dejan de valer.
 * 2. Enlace de la PC del hospital: la PC firma sus peticiones con una clave
 *    privada que sólo existe en su carpeta `database/` (no se publica). El
 *    servidor comprueba la firma con la clave pública de este repositorio.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_DAYS = 30;
const RELAY_WINDOW_MS = 5 * 60 * 1000;

const b64u = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

export function ensureAuthSecret(memoryData) {
  if (!memoryData.authSecret) {
    memoryData.authSecret = process.env.SYNC_SECRET || crypto.randomBytes(32).toString('hex');
  }
  return memoryData.authSecret;
}

function sign(secret, payload, user) {
  return b64u(crypto.createHmac('sha256', secret).update(`${payload}|${user.id}|${user.pinHash || ''}`).digest());
}

export function issueToken(memoryData, user, days = TOKEN_DAYS) {
  const secret = ensureAuthSecret(memoryData);
  const payload = b64u(JSON.stringify({ u: user.id, e: Date.now() + days * 86400000 }));
  return `v1.${payload}.${sign(secret, payload, user)}`;
}

/** Devuelve el usuario dueño del token, o null si no es válido. */
export function verifyToken(memoryData, token) {
  try {
    if (!token || !memoryData.authSecret) return null;
    const [v, payload, sig] = String(token).split('.');
    if (v !== 'v1' || !payload || !sig) return null;
    const { u, e } = JSON.parse(unb64u(payload).toString('utf8'));
    if (!u || !e || Date.now() > Number(e)) return null;
    const user = (memoryData.users || []).find((x) => x.id === u);
    if (!user || user.isDeleted || user.isActive === false) return null;
    const expected = sign(memoryData.authSecret, payload, user);
    const a = Buffer.from(expected);
    const b = Buffer.from(sig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    return user;
  } catch {
    return null;
  }
}

// --------------------------- Enlace firmado de la PC ---------------------------
const PUBLIC_KEY_FILE = path.join(__dirname, 'relay_public_key.pem');
let relayPublicKey = null;
try {
  if (fs.existsSync(PUBLIC_KEY_FILE)) relayPublicKey = crypto.createPublicKey(fs.readFileSync(PUBLIC_KEY_FILE, 'utf8'));
} catch (err) {
  console.warn('[Auth] Clave pública del enlace no válida:', err?.message);
}

function relayMessage(ts, method, url, rawBody) {
  const bodyHash = crypto.createHash('sha256').update(rawBody || '').digest('hex');
  return `${ts}\n${String(method).toUpperCase()}\n${url}\n${bodyHash}`;
}

export function signRelayRequest(privateKey, method, url, rawBody = '') {
  const ts = String(Date.now());
  const sig = crypto.sign(null, Buffer.from(relayMessage(ts, method, url, rawBody)), privateKey).toString('base64');
  return { 'x-relay-ts': ts, 'x-relay-sig': sig };
}

const seenRelaySigs = new Map();
export function verifyRelayRequest(req) {
  try {
    if (!relayPublicKey) return false;
    const ts = String(req.headers['x-relay-ts'] || '');
    const sig = String(req.headers['x-relay-sig'] || '');
    if (!ts || !sig) return false;
    if (Math.abs(Date.now() - Number(ts)) > RELAY_WINDOW_MS) return false;
    if (seenRelaySigs.has(sig)) return false; // no reutilizar una firma
    const ok = crypto.verify(null, Buffer.from(relayMessage(ts, req.method, req.originalUrl, req.rawBody || '')), relayPublicKey, Buffer.from(sig, 'base64'));
    if (ok) {
      seenRelaySigs.set(sig, Date.now());
      if (seenRelaySigs.size > 5000) {
        const cut = Date.now() - RELAY_WINDOW_MS;
        for (const [k, t] of seenRelaySigs) if (t < cut) seenRelaySigs.delete(k);
      }
    }
    return ok;
  } catch {
    return false;
  }
}

export function relayEnabled() {
  return Boolean(relayPublicKey);
}

/** Identifica quién hace la petición: { kind: 'relay' } | { kind: 'user', user } | null */
export function authContext(req, memoryData) {
  if (req.headers['x-relay-sig'] && verifyRelayRequest(req)) return { kind: 'relay' };
  const h = String(req.headers.authorization || '');
  const token = h.startsWith('Bearer ') ? h.slice(7).trim() : String(req.query?.token || '');
  const user = verifyToken(memoryData, token);
  return user ? { kind: 'user', user } : null;
}

export function isAdminUser(user) {
  return Boolean(user && (user.isSuperAdmin || user.id === 'usr-admin-colon' || String(user.role || '').toUpperCase() === 'ADMINISTRADOR'));
}
