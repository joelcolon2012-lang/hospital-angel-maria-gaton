/**
 * Motor de Sincronización Multidispositivo (cliente)
 * Hospital Regional Dr. Ángel María Gatón — Dr. Colón
 *
 * Garantías:
 *  1. Toda escritura local (desde cualquier pantalla) se registra automáticamente
 *     mediante hooks de Dexie: no hace falta llamar a nada extra al guardar.
 *  2. Cola de envío persistente: si no hay señal, los cambios quedan guardados
 *     en el dispositivo y se envían solos al volver la conexión.
 *  3. Fusión registro-por-registro: gana la modificación más reciente de cada
 *     registro. Nunca se reemplaza la base completa, por lo que un dispositivo
 *     no puede borrar lo que otro agregó.
 *  4. Borrados con "lápida": se propagan a todos los dispositivos y los registros
 *     eliminados no reaparecen.
 *  5. Tiempo real: el servidor avisa por SSE y cada dispositivo descarga sólo los
 *     cambios nuevos (delta).
 */

import Dexie from 'dexie';
import { db, type SyncTombstone } from '../db/dexieDb';

export const SYNC_TABLES = [
  'patients',
  'studies',
  'labs',
  'problems',
  'orders',
  'evolutions',
  'pendingTasks',
  'users',
  'clinicalNotes',
  'clinicalHistoriesPlanta',
  'clinicalHistoryVersions',
  'strokeRegistry',
  'sourceDocuments',
  'auditLogs'
] as const;

export type SyncTableName = (typeof SYNC_TABLES)[number];

export type EngineState = 'connected' | 'syncing' | 'offline' | 'error';

export interface EngineStatus {
  state: EngineState;
  backendUrl: string;
  connectedDevices: number;
  lastSyncedAt: string;
  lastSyncedAtMs: number;
  pendingChanges: number;
  isRealtimeActive: boolean;
  errorMessage?: string;
}

export interface RemoteChanges {
  tables?: Partial<Record<string, any[]>>;
  tombstones?: Array<{ table: string; id: string; deletedAt: number }>;
}

const DEFAULT_RENDER_BACKEND = 'https://hospital-angel-maria-gaton-backend.onrender.com';
const LS_DEVICE_ID = 'hr_colon_device_id';
const LS_BACKEND = 'hr_colon_custom_backend_url';
const LS_MIGRATED = 'hr_colon_sync_v2_full_push_done';
const MAX_BATCH_BYTES = 4 * 1024 * 1024; // lotes de ~4 MB para imágenes grandes
const TOMBSTONE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

// Campos "de transporte" que no deben viajar de vuelta como datos locales
const LOCAL_ONLY_FIELDS = ['_lmod'];

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
export function recordClock(r: any): number {
  if (!r) return 0;
  const m = Number(r._mtime);
  if (Number.isFinite(m) && m > 0) return m;
  const t = Date.parse(r.updatedAt || r.createdAt || r.timestamp || r.uploadedAt || '');
  return Number.isFinite(t) ? t : 0;
}

let lastClock = 0;
function monotonicNow(): number {
  const now = Date.now();
  lastClock = now > lastClock ? now : lastClock + 1;
  return lastClock;
}

function safeLS(key: string, value?: string | null): string | null {
  try {
    if (value === undefined) return localStorage.getItem(key);
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
  return null;
}

function getDeviceId(): string {
  let id = safeLS(LS_DEVICE_ID);
  if (!id) {
    const rnd =
      typeof crypto !== 'undefined' && (crypto as any).randomUUID
        ? (crypto as any).randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    id = `dev-${rnd}`;
    safeLS(LS_DEVICE_ID, id);
  }
  return id;
}

function stripLocal(rec: any) {
  const clean = { ...rec };
  for (const f of LOCAL_ONLY_FIELDS) delete clean[f];
  return clean;
}

const META_KEYS = new Set(['id', '_mtime', '_lmod', '_seq', '_fclk', '_partial']);

/**
 * Fusión campo por campo (nivel superior del registro).
 * Cada registro guarda `_fclk` = { campo: hora de su última edición }.
 * Si dos dispositivos editan campos distintos del mismo paciente (p. ej. signos
 * vitales en uno e historia clínica en otro), se conservan AMBOS cambios.
 * Si editan el mismo campo, gana la edición más reciente.
 */
export function mergeRecords(local: any, remote: any): any {
  if (!local) return remote;
  if (!remote) return local;
  const lc = recordClock(local);
  const rc = recordClock(remote);
  const lf = local._fclk || null;
  const rf = remote._fclk || null;
  if (!lf && !rf) {
    if (rc > lc) return remote;
    if (lc > rc) return local;
    return remote._partial ? local : remote;
  }
  const out: any = { id: local.id ?? remote.id };
  const keys = new Set([...Object.keys(local), ...Object.keys(remote)]);
  for (const k of keys) {
    if (META_KEYS.has(k)) continue;
    const lt = (lf && lf[k]) || 0;
    const rt = (rf && rf[k]) || 0;
    const pickRemote = lt !== rt ? rt > lt : rc > lc;
    const inL = Object.prototype.hasOwnProperty.call(local, k);
    const inR = Object.prototype.hasOwnProperty.call(remote, k);
    if (pickRemote) out[k] = inR ? remote[k] : local[k];
    else out[k] = inL ? local[k] : remote[k];
  }
  const f: Record<string, number> = { ...(lf || {}) };
  for (const [k, v] of Object.entries(rf || {})) f[k] = Math.max(f[k] || 0, Number(v) || 0);
  out._fclk = f;
  out._mtime = Math.max(lc, rc);
  if (local._partial && remote._partial) out._partial = true;
  return out;
}

function sameContent(a: any, b: any): boolean {
  try {
    const strip = (x: any) => {
      const c = { ...x };
      delete c._lmod;
      delete c._seq;
      return c;
    };
    return JSON.stringify(strip(a)) === JSON.stringify(strip(b));
  } catch {
    return false;
  }
}

/** Genera un ID único a prueba de colisiones entre dispositivos. */
export function newSyncId(prefix: string): string {
  const rnd =
    typeof crypto !== 'undefined' && (crypto as any).randomUUID
      ? (crypto as any).randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${rnd}`;
}

// ---------------------------------------------------------------------------
// Seguimiento automático de cambios (hooks de Dexie)
// ---------------------------------------------------------------------------
let suspendDepth = 0;
const REMOTE_FLAG = '__syncRemote';

function isRemoteTx(tx: any, op: 'create' | 'update' | 'delete' = 'update'): boolean {
  // La pausa global SÓLO aplica a inserciones de datos semilla; nunca a ediciones
  // ni borrados del usuario (antes una edición podía quedar sin enviar).
  if (op === 'create' && suspendDepth > 0) return true;
  if (tx && tx[REMOTE_FLAG]) return true;
  const cur: any = Dexie.currentTransaction;
  return Boolean(cur && cur[REMOTE_FLAG]);
}

const txWithListener = new WeakSet<object>();
function afterCommit(tx: any, fn: () => void) {
  if (!tx || typeof tx.on !== 'function') {
    setTimeout(fn, 0);
    return;
  }
  tx.on('complete', fn);
}

function onLocalWrite(tx: any) {
  if (tx && !txWithListener.has(tx)) {
    txWithListener.add(tx);
    afterCommit(tx, () => syncEngine.notifyLocalChange());
  }
}

let hooksInstalled = false;
function installHooks() {
  if (hooksInstalled) return;
  hooksInstalled = true;

  for (const name of SYNC_TABLES) {
    const table: any = (db as any)[name];
    if (!table) continue;

    table.hook('creating', function (_pk: any, obj: any, tx: any) {
      if (isRemoteTx(tx, 'create')) return;
      const now = monotonicNow();
      obj._mtime = now;
      obj._lmod = now;
      onLocalWrite(tx);
    });

    table.hook('updating', function (mods: any, _pk: any, prev: any, tx: any) {
      if (isRemoteTx(tx, 'update')) return undefined;
      const changed = new Set<string>();
      for (const k of Object.keys(mods || {})) {
        const top = k.split('.')[0];
        if (!META_KEYS.has(top)) changed.add(top);
      }
      if (changed.size === 0) return undefined; // nada cambió realmente: no enviar
      const now = monotonicNow();
      const fclk: Record<string, number> = { ...((prev && prev._fclk) || {}) };
      changed.forEach((k) => (fclk[k] = now));
      onLocalWrite(tx);
      return { _mtime: now, _lmod: now, _fclk: fclk };
    });

    table.hook('deleting', function (pk: any, _obj: any, tx: any) {
      if (isRemoteTx(tx, 'delete')) return;
      const deletedAt = monotonicNow();
      afterCommit(tx, () => {
        syncEngine.recordTombstone(name, String(pk), deletedAt);
      });
    });
  }
}

// ---------------------------------------------------------------------------
// Motor
// ---------------------------------------------------------------------------
class SyncEngine {
  readonly deviceId = getDeviceId();
  private backendUrl = '';
  private state: EngineState = 'offline';
  private connectedDevices = 1;
  private lastSyncedAtMs = 0;
  private pendingChanges = 0;
  private errorMessage = '';
  private listeners = new Set<(s: EngineStatus) => void>();
  private eventSource: EventSource | null = null;
  private sseRetryTimer: any = null;
  private pushTimer: any = null;
  private pollTimer: any = null;
  private backoffTimer: any = null;
  private backoffMs = 2000;
  private running: Promise<boolean> | null = null;
  private rerun = false;
  private started = false;
  private realtime = false;
  private localChangeListeners = new Set<() => void>();

  constructor() {
    installHooks();
    this.backendUrl = this.detectBackendUrl();
  }

  // ---------------- Configuración ----------------
  private detectBackendUrl(): string {
    try {
      const custom = safeLS(LS_BACKEND);
      if (custom && custom.trim()) return custom.trim().replace(/\/+$/, '');
    } catch {}
    const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
    if (envUrl && String(envUrl).trim()) return String(envUrl).trim().replace(/\/+$/, '');
    if (typeof window !== 'undefined') {
      const { hostname, origin, protocol } = window.location;
      const isStaticHost = /github\.io$|vercel\.app$|netlify\.app$/i.test(hostname) || protocol === 'file:';
      if (!isStaticHost && origin && origin !== 'null') {
        // Servida por el servidor del hospital (PC, iPhone o Android en la misma red o túnel)
        return origin;
      }
    }
    return DEFAULT_RENDER_BACKEND;
  }

  getBackendUrl() {
    return this.backendUrl;
  }

  setBackendUrl(url: string) {
    const clean = (url || '').trim().replace(/\/+$/, '');
    safeLS(LS_BACKEND, clean || null);
    this.backendUrl = clean || this.detectBackendUrl();
    this.setSince(0);
    this.connectRealtime();
    this.syncNow();
  }

  private sinceKey() {
    return `hr_colon_sync_since::${this.backendUrl}`;
  }
  private getSince(): number {
    return Number(safeLS(this.sinceKey())) || 0;
  }
  private setSince(v: number) {
    safeLS(this.sinceKey(), String(v));
  }
  private pushedMarkKey() {
    return `hr_colon_sync_pushed::${this.backendUrl}`;
  }
  private getPushedMark(): number {
    return Number(safeLS(this.pushedMarkKey())) || 0;
  }
  private setPushedMark(v: number) {
    safeLS(this.pushedMarkKey(), String(v));
  }

  // ---------------- Estado ----------------
  getStatus(): EngineStatus {
    return {
      state: this.state,
      backendUrl: this.backendUrl,
      connectedDevices: this.connectedDevices,
      lastSyncedAt: this.lastSyncedAtMs
        ? new Date(this.lastSyncedAtMs).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : 'Pendiente',
      lastSyncedAtMs: this.lastSyncedAtMs,
      pendingChanges: this.pendingChanges,
      isRealtimeActive: this.realtime,
      errorMessage: this.errorMessage || undefined
    };
  }

  subscribe(cb: (s: EngineStatus) => void): () => void {
    this.listeners.add(cb);
    cb(this.getStatus());
    return () => this.listeners.delete(cb);
  }

  onLocalChange(cb: () => void): () => void {
    this.localChangeListeners.add(cb);
    return () => this.localChangeListeners.delete(cb);
  }

  private setState(s: EngineState, err = '') {
    this.state = s;
    this.errorMessage = err;
    this.emit();
  }

  private emit() {
    const st = this.getStatus();
    for (const cb of this.listeners) {
      try {
        cb(st);
      } catch (e) {
        console.error('[Sync] listener', e);
      }
    }
  }

  private emitDataChanged(type: string, detail: any = {}) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('hospital_central_data_changed', { detail: { type, ...detail, timestamp: Date.now() } })
    );
  }

  // ---------------- Ciclo de vida ----------------
  start() {
    if (this.started || typeof window === 'undefined') return;
    this.started = true;

    this.connectRealtime();
    this.syncNow();

    // Respaldo por sondeo (si el canal en tiempo real falla, cada 15 s; si no, cada 60 s)
    this.pollTimer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      const age = Date.now() - this.lastSyncedAtMs;
      if (!this.realtime || age > 60000) this.syncNow();
    }, 15000);

    const wake = () => {
      if (document.visibilityState === 'visible') {
        if (!this.eventSource || this.eventSource.readyState === 2) this.connectRealtime();
        this.syncNow();
      }
    };
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('focus', wake);
    window.addEventListener('pageshow', wake);
    window.addEventListener('online', () => {
      this.backoffMs = 2000;
      this.connectRealtime();
      this.syncNow();
    });
    window.addEventListener('offline', () => this.setState('offline'));

    // Al cerrar o bloquear el celular, intentar enviar lo pendiente
    window.addEventListener('pagehide', () => {
      if (this.pendingChanges > 0) this.syncNow();
    });

    this.refreshPendingCount();
  }

  /** Llamado por los hooks tras cada escritura local confirmada. */
  notifyLocalChange() {
    this.pendingChanges = Math.max(this.pendingChanges, 1);
    this.emit();
    for (const cb of this.localChangeListeners) {
      try {
        cb();
      } catch {}
    }
    this.schedulePush();
  }

  schedulePush(delayMs = 350) {
    if (this.pushTimer) clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => {
      this.pushTimer = null;
      this.syncNow();
    }, delayMs);
  }

  async recordTombstone(table: string, id: string, deletedAt: number) {
    try {
      const tb: SyncTombstone = { key: `${table}|${id}`, table, id, deletedAt };
      await db.syncTombstones.put(tb);
    } catch (e) {
      console.warn('[Sync] No se pudo registrar el borrado', e);
    }
    this.notifyLocalChange();
  }

  /**
   * Inserta datos semilla (demostración / respaldo local) SIN marcarlos como cambios.
   * Sólo afecta a inserciones y debe usarse únicamente al arrancar.
   */
  async withoutTracking<T>(fn: () => Promise<T>): Promise<T> {
    suspendDepth++;
    try {
      return await fn();
    } finally {
      suspendDepth--;
    }
  }

  // ---------------- Tiempo real (SSE) ----------------
  private connectRealtime() {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
    if (this.sseRetryTimer) {
      clearTimeout(this.sseRetryTimer);
      this.sseRetryTimer = null;
    }
    try {
      this.eventSource?.close();
    } catch {}
    this.eventSource = null;
    this.realtime = false;

    let es: EventSource;
    try {
      es = new EventSource(`${this.backendUrl}/api/events?device=${encodeURIComponent(this.deviceId)}`);
    } catch {
      return;
    }
    this.eventSource = es;

    const onRemoteSignal = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data || '{}');
        if (data.deviceId && data.deviceId === this.deviceId) return; // eco propio
        if (typeof data.seq === 'number' && data.seq <= this.getSince()) return; // ya lo tenemos
      } catch {}
      this.schedulePull();
    };

    es.addEventListener('init', (e: MessageEvent) => {
      this.realtime = true;
      try {
        const d = JSON.parse(e.data);
        this.connectedDevices = d.connectedDevices || this.connectedDevices;
        if (typeof d.seq === 'number' && d.seq > this.getSince()) this.schedulePull(50);
      } catch {}
      if (this.state !== 'syncing') this.setState('connected');
      else this.emit();
    });
    es.addEventListener('devices', (e: MessageEvent) => {
      try {
        this.connectedDevices = JSON.parse(e.data).connectedDevices || 1;
        this.emit();
      } catch {}
    });
    es.addEventListener('sync.changed', onRemoteSignal as any);
    // Eventos antiguos del servidor: todos provocan una descarga delta
    [
      'sync.completed', 'patient.created', 'patient.updated', 'patient.deleted', 'user.created', 'user.updated',
      'history_planta.updated', 'order.created', 'order.updated', 'order.deleted', 'evolution.created',
      'evolution.deleted', 'pending.created', 'pending.updated', 'pending.completed', 'pending.deleted',
      'lab.created', 'lab.deleted', 'study.created', 'study.deleted', 'stroke.updated'
    ].forEach((ev) => es.addEventListener(ev, onRemoteSignal as any));

    es.onerror = () => {
      this.realtime = false;
      try {
        es.close();
      } catch {}
      if (this.eventSource === es) this.eventSource = null;
      if (this.state === 'connected') this.setState('offline');
      this.sseRetryTimer = setTimeout(() => this.connectRealtime(), 5000);
    };
  }

  private pullTimer: any = null;
  private schedulePull(delay = 250) {
    if (this.pullTimer) clearTimeout(this.pullTimer);
    this.pullTimer = setTimeout(() => {
      this.pullTimer = null;
      this.syncNow();
    }, delay);
  }

  // ---------------- Sincronización ----------------
  /** Envía lo pendiente y descarga lo nuevo. Seguro llamarlo muchas veces. */
  syncNow(): Promise<boolean> {
    if (this.running) {
      this.rerun = true;
      return this.running;
    }
    this.running = this.runCycle()
      .catch((e) => {
        console.warn('[Sync] ciclo fallido', e);
        return false;
      })
      .finally(() => {
        this.running = null;
        if (this.rerun) {
          this.rerun = false;
          this.syncNow();
        }
      });
    return this.running;
  }

  private async collectOutbox(fullPush: boolean) {
    const mark = fullPush ? -1 : this.getPushedMark();
    const entries: Array<{ table: string; rec: any }> = [];
    // Punto de corte: todo lo modificado antes de este instante queda confirmado.
    // Se deja un margen de seguridad de 5 s para transacciones que aún no se
    // habían confirmado al leer (se reenvían; el servidor ignora duplicados).
    const cutoff = monotonicNow();
    const maxLmod = Math.max(mark, cutoff - 5000);
    for (const name of SYNC_TABLES) {
      const table: any = (db as any)[name];
      if (!table) continue;
      let rows: any[];
      if (fullPush) rows = await table.toArray();
      else rows = await table.where('_lmod').above(mark).toArray();
      for (const r of rows) {
        entries.push({ table: name, rec: stripLocal(r) });
      }
    }
    const tombs = (await db.syncTombstones.toArray()).filter((t) => !t.serverAckedAt && t.deletedAt < cutoff);
    return { entries, tombs, maxLmod, cutoff };
  }

  private confirmedUpTo = 0;

  async refreshPendingCount() {
    try {
      const mark = Math.max(this.getPushedMark(), this.confirmedUpTo);
      let n = 0;
      for (const name of SYNC_TABLES) {
        const table: any = (db as any)[name];
        if (table) n += await table.where('_lmod').above(mark).count();
      }
      n += (await db.syncTombstones.toArray()).filter((t) => !t.serverAckedAt).length;
      this.pendingChanges = n;
      this.emit();
    } catch {}
  }

  private async post(body: any): Promise<any> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const res = await fetch(`${this.backendUrl}/api/sync/v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-device-id': this.deviceId },
        body: JSON.stringify(body),
        signal: controller.signal,
        cache: 'no-store'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('json')) throw new Error('El servidor central no respondió (¿versión antigua?)');
      return await res.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  private async runCycle(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.setState('offline');
      await this.refreshPendingCount();
      return false;
    }
    this.setState('syncing');

    try {
      const fullPush = !safeLS(`${LS_MIGRATED}::${this.backendUrl}`);
      const { entries, tombs, maxLmod, cutoff } = await this.collectOutbox(fullPush);

      // Partir en lotes para no exceder el límite del servidor con imágenes grandes
      const batches: Array<Record<string, any[]>> = [];
      let current: Record<string, any[]> = {};
      let size = 0;
      for (const { table, rec } of entries) {
        const len = JSON.stringify(rec).length;
        if (size > 0 && size + len > MAX_BATCH_BYTES) {
          batches.push(current);
          current = {};
          size = 0;
        }
        (current[table] ||= []).push(rec);
        size += len;
      }
      batches.push(current);

      const since = this.getSince();
      let last: any = null;
      for (let i = 0; i < batches.length; i++) {
        const isLast = i === batches.length - 1;
        last = await this.post({
          deviceId: this.deviceId,
          since: isLast ? since : Number.MAX_SAFE_INTEGER,
          tables: batches[i],
          tombstones: isLast ? tombs.map(({ table, id, deletedAt }) => ({ table, id, deletedAt })) : []
        });
      }

      // ¿El servidor se reinició con una base distinta/vacía? -> reenviar todo y descargar desde cero
      const dbKey = `hr_colon_sync_dbid::${this.backendUrl}`;
      const knownDb = safeLS(dbKey);
      if (last?.dbId && knownDb && knownDb !== last.dbId) {
        safeLS(dbKey, last.dbId);
        this.setSince(0);
        this.setPushedMark(0);
        safeLS(`${LS_MIGRATED}::${this.backendUrl}`, null);
        await db.syncTombstones.toCollection().modify((t: any) => { delete t.serverAckedAt; });
        this.rerun = true;
        return true;
      }
      if (last?.dbId) safeLS(dbKey, last.dbId);

      // Confirmación: marcar lo enviado
      if (maxLmod > this.getPushedMark()) this.setPushedMark(maxLmod);
      this.confirmedUpTo = cutoff;
      if (fullPush) safeLS(`${LS_MIGRATED}::${this.backendUrl}`, '1');
      if (tombs.length) {
        const now = Date.now();
        await db.syncTombstones.bulkPut(tombs.map((t) => ({ ...t, serverAckedAt: now })));
      }
      await this.pruneTombstones();

      // Aplicar lo que cambió en otros dispositivos
      const changed = await this.applyRemote(last || {});
      if (typeof last?.seq === 'number') this.setSince(last.seq);

      this.lastSyncedAtMs = Date.now();
      safeLS('hr_colon_has_synced', '1');
      this.backoffMs = 2000;
      if (this.backoffTimer) {
        clearTimeout(this.backoffTimer);
        this.backoffTimer = null;
      }
      await this.refreshPendingCount();
      this.setState('connected');
      if (changed > 0) this.emitDataChanged('remote_sync', { changed });
      return true;
    } catch (err: any) {
      await this.refreshPendingCount();
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      this.setState(offline ? 'offline' : 'error', err?.message || 'Sin conexión con el servidor central');
      // Reintento con espera exponencial (máx. 60 s)
      if (this.backoffTimer) clearTimeout(this.backoffTimer);
      this.backoffTimer = setTimeout(() => this.syncNow(), this.backoffMs);
      this.backoffMs = Math.min(this.backoffMs * 2, 60000);
      return false;
    }
  }

  private async pruneTombstones() {
    try {
      const cutoff = Date.now() - TOMBSTONE_RETENTION_MS;
      const old = (await db.syncTombstones.toArray()).filter((t) => t.serverAckedAt && t.deletedAt < cutoff);
      if (old.length) await db.syncTombstones.bulkDelete(old.map((t) => t.key));
    } catch {}
  }

  /**
   * Aplica cambios remotos con fusión por registro.
   * Devuelve cuántos registros locales cambiaron.
   */
  async applyRemote(payload: RemoteChanges): Promise<number> {
    const tables = payload.tables || {};
    const tombstones = payload.tombstones || [];
    const names = SYNC_TABLES.filter((n) => (tables as any)[n]?.length || tombstones.some((t) => t.table === n));
    if (names.length === 0) return 0;

    const dexieTables = names.map((n) => (db as any)[n]).filter(Boolean);
    let changed = 0;
    let needsResend = false;

    await db.transaction('rw', dexieTables, async (tx: any) => {
      tx[REMOTE_FLAG] = true;

      for (const name of names) {
        const table: any = (db as any)[name];
        const incoming: any[] = (tables as any)[name] || [];
        if (incoming.length) {
          const ids = incoming.map((r) => r?.id).filter((x) => x !== undefined && x !== null);
          const locals: any[] = await table.bulkGet(ids);
          const toPut: any[] = [];
          incoming.forEach((remote, i) => {
            if (!remote || remote.id === undefined || remote.id === null) return;
            const local = locals[i];
            const clean = stripLocal(remote);
            delete clean._seq;
            if (!local) {
              toPut.push(clean);
              return;
            }
            let merged = mergeRecords(stripLocal(local), clean);
            // Registro parcial (sin imagen, vía nube de Google) nunca borra la imagen local
            if (merged === clean && remote._partial) {
              merged = { ...local, ...clean };
              delete merged._partial;
              delete merged._lmod;
            }
            if (merged === clean && local._partial && !remote._partial) delete merged._partial;
            // Usuarios: conservar PIN local si el servidor no lo expone
            if (name === 'users') {
              if (local.pin && !merged.pin) merged = { ...merged, pin: local.pin };
              if (local.password && !merged.password) merged = { ...merged, password: local.password };
            }
            if (sameContent(merged, local)) return;
            // Si el resultado contiene cambios locales que el otro lado no tenía, re-enviarlo
            if (!sameContent(merged, clean) && merged !== clean) {
              merged = { ...merged, _lmod: monotonicNow() };
              needsResend = true;
            }
            toPut.push(merged);
          });
          if (toPut.length) {
            await table.bulkPut(toPut);
            changed += toPut.length;
          }
        }

        const tbs = tombstones.filter((t) => t.table === name);
        if (tbs.length) {
          const locals: any[] = await table.bulkGet(tbs.map((t) => t.id));
          const del: string[] = [];
          tbs.forEach((t, i) => {
            const local = locals[i];
            if (local && recordClock(local) <= Number(t.deletedAt)) del.push(t.id);
          });
          if (del.length) {
            await table.bulkDelete(del);
            changed += del.length;
          }
        }
      }
    });

    if (needsResend) this.schedulePush(500);
    return changed;
  }

  /** Fuerza a reenviar todos los registros locales en el próximo ciclo (p. ej. tras importar un respaldo). */
  requestFullResend() {
    safeLS(`${LS_MIGRATED}::${this.backendUrl}`, null);
    this.schedulePush(100);
  }

  /** Instantánea completa (para respaldo en la nube de Google y exportación). */
  async snapshot(opts: { maxFieldBytes?: number; includeAudit?: boolean } = {}) {
    const out: Record<string, any[]> = {};
    for (const name of SYNC_TABLES) {
      if (name === 'auditLogs' && !opts.includeAudit) continue;
      const table: any = (db as any)[name];
      if (!table) continue;
      const rows = (await table.toArray()).map(stripLocal);
      if (opts.maxFieldBytes) {
        out[name] = rows.map((r: any) => {
          let partial = false;
          const copy: any = { ...r };
          for (const [k, v] of Object.entries(copy)) {
            if (typeof v === 'string' && v.length > opts.maxFieldBytes!) {
              delete copy[k];
              partial = true;
            }
          }
          if (partial) copy._partial = true;
          return copy;
        });
      } else {
        out[name] = rows;
      }
    }
    const tombstones = (await db.syncTombstones.toArray()).map(({ table, id, deletedAt }) => ({ table, id, deletedAt }));
    return { tables: out, tombstones };
  }
}

export const syncEngine = new SyncEngine();
