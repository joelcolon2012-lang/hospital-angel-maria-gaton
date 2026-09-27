/**
 * Enlace PC ⇄ nube
 * ----------------
 * Sólo se ejecuta en la PC del hospital (no en Render). Mantiene la base de la
 * PC idéntica a la base central en la nube:
 *  - Sube a la nube lo que exista sólo en la PC (la primera vez, TODO).
 *  - Descarga lo nuevo de la nube y lo guarda en `database/` como copia local.
 *  - Si la nube se reinicia vacía, la vuelve a llenar con la copia de la PC.
 * Las peticiones van firmadas con la clave privada de la PC
 * (`database/relay_private_key.pem`, nunca se publica).
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DB_DIRECTORY } from './centralDb.js';
import { signRelayRequest } from './auth.js';

const DEFAULT_CLOUD = 'https://hospital-angel-maria-gaton-backend.onrender.com';
const STATE_FILE = path.join(DB_DIRECTORY, 'cloud_relay_state.json');
const KEY_FILE = path.join(DB_DIRECTORY, 'relay_private_key.pem');
const MAX_BATCH_BYTES = 4 * 1024 * 1024;
const RELAY_CTX = { kind: 'relay' };

let status = { enabled: false, reason: 'no iniciado' };

export function cloudRelayStatus() {
  return status;
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { upDbId: null, upSeq: 0, pushedSeq: -1 };
  }
}

function saveState(st) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(st, null, 2), 'utf8');
  } catch {}
}

export function startCloudRelay(centralDb, broadcast) {
  const cloud = String(process.env.CLOUD_URL || DEFAULT_CLOUD).replace(/\/+$/, '');
  if (process.env.RENDER || process.env.MONGODB_URI) {
    status = { enabled: false, reason: 'este servidor es la nube' };
    return;
  }
  if (cloud === 'off' || process.env.CLOUD_RELAY === 'off') {
    status = { enabled: false, reason: 'desactivado' };
    return;
  }
  let privateKey;
  try {
    privateKey = crypto.createPrivateKey(fs.readFileSync(KEY_FILE, 'utf8'));
  } catch {
    status = { enabled: false, reason: 'falta la clave de la PC (database/relay_private_key.pem)' };
    console.log('[Nube] Enlace PC⇄nube inactivo: falta database/relay_private_key.pem');
    return;
  }

  const st = loadState();
  status = { enabled: true, cloud, state: 'iniciando', lastOkAt: st.lastOkAt || null, lastError: null };
  let running = false;
  let again = false;
  let timer = null;

  async function call(method, url, body) {
    const raw = body === undefined ? '' : JSON.stringify(body);
    const res = await fetch(`${cloud}${url}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-device-id': 'pc-hospital-relay',
        ...signRelayRequest(privateKey, method, url, raw)
      },
      body: body === undefined ? undefined : raw,
      signal: AbortSignal.timeout(90000)
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {}
    if (!res.ok || !json) throw new Error(`${method} ${url}: HTTP ${res.status} ${json?.error || text.slice(0, 120)}`);
    return json;
  }

  async function cycle() {
    if (running) {
      again = true;
      return;
    }
    running = true;
    try {
      do {
        again = false;
        const health = await call('GET', '/api/health');
        status.cloudStorage = health.storage?.mode || 'desconocido';
        if (health.dbId && health.dbId !== st.upDbId) {
          // Nube nueva o reiniciada: subir todo y descargar desde cero
          console.log(`[Nube] Base de la nube ${st.upDbId ? 'reiniciada' : 'nueva'} (${health.dbId}). Subiendo la copia completa de la PC...`);
          st.upDbId = health.dbId;
          st.upSeq = 0;
          st.pushedSeq = -1;
        }

        const seqBefore = centralDb.memoryData.seq;
        const local = centralDb.getChangesSince(st.pushedSeq, RELAY_CTX);
        const batches = [];
        let cur = {};
        let size = 0;
        for (const [t, rows] of Object.entries(local.tables || {})) {
          for (const r of rows) {
            const len = JSON.stringify(r).length;
            if (size > 0 && size + len > MAX_BATCH_BYTES) {
              batches.push(cur);
              cur = {};
              size = 0;
            }
            (cur[t] ||= []).push(r);
            size += len;
          }
        }
        batches.push(cur);

        let last = null;
        for (let i = 0; i < batches.length; i++) {
          const isLast = i === batches.length - 1;
          last = await call('POST', '/api/sync/v2', {
            deviceId: 'pc-hospital-relay',
            since: isLast ? st.upSeq : Number.MAX_SAFE_INTEGER,
            tables: batches[i],
            tombstones: isLast ? (local.tombstones || []).map(({ table, id, deletedAt }) => ({ table, id, deletedAt })) : []
          });
        }
        if (last?.dbId && last.dbId !== st.upDbId) {
          // La nube cambió mientras subíamos: repetir desde cero
          st.upDbId = last.dbId;
          st.upSeq = 0;
          st.pushedSeq = -1;
          again = true;
          continue;
        }

        // Guardar en la PC lo que llegó de la nube (fusión síncrona para saber qué números de
        // secuencia vinieron de la nube y no reenviarlos)
        const seqBeforeApply = centralDb.memoryData.seq;
        let accepted = 0;
        for (const [t, rows] of Object.entries(last?.tables || {})) accepted += centralDb.sync.mergeRecords(t, rows, RELAY_CTX);
        accepted += centralDb.sync.applyTombstones(last?.tombstones || [], RELAY_CTX);
        const seqAfterApply = centralDb.memoryData.seq;
        st.pushedSeq = seqBeforeApply === seqBefore ? seqAfterApply : seqBefore;
        if (accepted > 0) await centralDb.persistToDisk();
        const applied = { accepted };
        if (typeof last?.seq === 'number') st.upSeq = last.seq;
        st.lastOkAt = new Date().toISOString();
        status.state = 'conectado';
        status.lastOkAt = st.lastOkAt;
        status.lastError = null;
        saveState(st);
        if (applied.accepted > 0) {
          broadcast?.('sync.changed', { seq: centralDb.memoryData.seq, deviceId: 'pc-hospital-relay' });
          console.log(`[Nube] ${applied.accepted} cambios recibidos de la nube.`);
        }
      } while (again);
    } catch (err) {
      status.state = 'sin conexión';
      status.lastError = err?.message || String(err);
      console.warn('[Nube] No se pudo sincronizar con la nube (se reintentará):', status.lastError);
    } finally {
      running = false;
    }
  }

  const kick = (delay = 1500) => {
    clearTimeout(timer);
    timer = setTimeout(cycle, delay);
  };

  // Cambios hechos en la PC -> subir pronto
  const prevHook = centralDb.onPersist;
  centralDb.onPersist = () => {
    try {
      prevHook?.();
    } catch {}
    kick(2000);
  };

  // Aviso en tiempo real de la nube -> descargar enseguida
  async function listen() {
    for (;;) {
      try {
        const res = await fetch(`${cloud}/api/events`, { headers: { Accept: 'text/event-stream' } });
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf('\n\n')) >= 0) {
            const chunk = buf.slice(0, i);
            buf = buf.slice(i + 2);
            if (/event:\s*sync\.changed/.test(chunk) && !/pc-hospital-relay/.test(chunk)) kick(500);
          }
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 15000));
    }
  }

  setInterval(() => kick(0), 60 * 1000); // además mantiene despierto el servidor gratuito
  kick(3000);
  listen();
  console.log(`[Nube] Enlace PC⇄nube activo con ${cloud}`);
}
