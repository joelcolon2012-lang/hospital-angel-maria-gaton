/**
 * Motor de sincronización registro-por-registro (servidor)
 * --------------------------------------------------------
 * - Cada registro lleva `_mtime` (hora de la última modificación hecha por un
 *   dispositivo) y `_seq` (número de secuencia asignado por el servidor).
 * - Resolución de conflictos: gana la modificación más reciente (LWW) por registro,
 *   nunca por archivo completo, por lo que ningún dispositivo puede borrar lo que
 *   otro agregó.
 * - Los borrados se guardan como "lápidas" (tombstones) para que se propaguen a
 *   todos los dispositivos y los registros eliminados no reaparezcan.
 * - Los clientes piden sólo los cambios posteriores a su último `_seq` (delta).
 */

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
];

const MAX_AUDIT_LOGS = 3000;
const MAX_TOMBSTONES = 20000;

/** Reloj lógico de un registro (ms). */
export function recordClock(r) {
  if (!r) return 0;
  const m = Number(r._mtime);
  if (Number.isFinite(m) && m > 0) return m;
  const t = Date.parse(r.updatedAt || r.createdAt || r.timestamp || r.uploadedAt || '');
  return Number.isFinite(t) ? t : 0;
}

const META_KEYS = new Set(['id', '_mtime', '_lmod', '_seq', '_fclk', '_partial']);

/**
 * Fusión campo por campo (idéntica a la del cliente). `_fclk` guarda la hora de
 * la última edición de cada campo; si dos dispositivos editan campos distintos
 * del mismo registro, se conservan ambos cambios.
 */
export function mergeRecord(current, incoming) {
  if (!current) return incoming;
  const lc = recordClock(current);
  const rc = recordClock(incoming);
  const lf = current._fclk || null;
  const rf = incoming._fclk || null;
  if (!lf && !rf) return rc > lc ? incoming : current;
  const out = { id: current.id ?? incoming.id };
  const keys = new Set([...Object.keys(current), ...Object.keys(incoming)]);
  for (const k of keys) {
    if (META_KEYS.has(k)) continue;
    const lt = (lf && lf[k]) || 0;
    const rt = (rf && rf[k]) || 0;
    const pickIncoming = lt !== rt ? rt > lt : rc > lc;
    const inL = Object.prototype.hasOwnProperty.call(current, k);
    const inR = Object.prototype.hasOwnProperty.call(incoming, k);
    out[k] = pickIncoming ? (inR ? incoming[k] : current[k]) : (inL ? current[k] : incoming[k]);
  }
  const f = { ...(lf || {}) };
  for (const [k, v] of Object.entries(rf || {})) f[k] = Math.max(f[k] || 0, Number(v) || 0);
  out._fclk = f;
  out._mtime = Math.max(lc, rc);
  if (current._partial && incoming._partial) out._partial = true;
  return out;
}

/** JSON con claves ordenadas: dos registros iguales comparan igual aunque el orden de sus campos difiera. */
function stableStringify(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map((x) => (x === undefined ? 'null' : stableStringify(x))).join(',')}]`;
  const keys = Object.keys(v).filter((k) => v[k] !== undefined).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(v[k])}`).join(',')}}`;
}

function sameContent(a, b) {
  try {
    const strip = (x) => { const c = { ...x }; delete c._seq; delete c._lmod; return c; };
    return stableStringify(strip(a)) === stableStringify(strip(b));
  } catch {
    return false;
  }
}

const PROTECTED_USER_FIELDS = ['role', 'isSuperAdmin', 'isActive', 'isDeleted', 'permissions'];
const SERVER_ONLY_USER_FIELDS = ['tokensValidAfter'];

function isAdminCtx(ctx) {
  const u = ctx && ctx.user;
  return Boolean(u && !u._restoring && (u.isSuperAdmin || u.id === 'usr-admin-colon' || String(u.role || '').toUpperCase() === 'ADMINISTRADOR'));
}

function keyOf(record) {
  return record && (record.id ?? null);
}

export class SyncStore {
  /**
   * @param {object} data  memoryData del CentralDatabaseManager (se muta en sitio)
   * @param {object} opts  { hashPassword }
   */
  constructor(data, opts = {}) {
    this.data = data;
    this.hashPassword = opts.hashPassword || ((x) => x);
    this.stamped = new WeakSet();
    if (!Number.isFinite(this.data.seq)) this.data.seq = 0;
    // Identificador único de esta base de datos. Si el servidor se reinicia vacío
    // (p. ej. Render gratuito borra el disco), cambia y los dispositivos reenvían todo.
    if (!this.data.dbId) this.data.dbId = `db-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    if (!Array.isArray(this.data.tombstones)) this.data.tombstones = [];
    for (const t of SYNC_TABLES) {
      if (!Array.isArray(this.data[t])) this.data[t] = [];
    }
    this.migrate();
  }

  /** Asigna _seq/_mtime a registros antiguos que no los tienen. */
  migrate() {
    for (const t of SYNC_TABLES) {
      for (const r of this.data[t]) {
        if (!Number.isFinite(r._seq)) r._seq = ++this.data.seq;
        if (!Number.isFinite(Number(r._mtime)) || !r._mtime) r._mtime = recordClock(r) || Date.now();
        this.stamped.add(r);
      }
    }
    for (const tb of this.data.tombstones) {
      if (!Number.isFinite(tb._seq)) tb._seq = ++this.data.seq;
    }
  }

  nextSeq() {
    this.data.seq = (this.data.seq || 0) + 1;
    return this.data.seq;
  }

  /**
   * Marca con _seq nuevo cualquier objeto que haya sido creado o reemplazado
   * por los métodos REST clásicos (que siempre crean objetos nuevos con spread).
   * Devuelve la cantidad de registros marcados.
   */
  autoStamp() {
    let n = 0;
    const now = Date.now();
    for (const t of SYNC_TABLES) {
      for (const r of this.data[t]) {
        if (!this.stamped.has(r)) {
          r._seq = this.nextSeq();
          // Si un método REST modificó el registro sin reloj, usar su updatedAt.
          const clock = Date.parse(r.updatedAt || '') || 0;
          if (!r._mtime || clock > Number(r._mtime)) r._mtime = clock || now;
          this.stamped.add(r);
          n++;
        }
      }
    }
    if (this.data.auditLogs.length > MAX_AUDIT_LOGS) {
      this.data.auditLogs.length = MAX_AUDIT_LOGS;
    }
    return n;
  }

  /** Fuerza a que un objeto mutado en sitio reciba un _seq nuevo. */
  touch(record) {
    if (record) this.stamped.delete(record);
  }

  findTombstone(table, id) {
    return this.data.tombstones.find((tb) => tb.table === table && tb.id === id) || null;
  }

  /** Borrado con lápida (se propaga a todos los dispositivos). */
  tombstone(table, id, deletedAt = Date.now(), deletedBy = '') {
    const arr = this.data[table];
    if (!Array.isArray(arr)) return false;
    const idx = arr.findIndex((r) => keyOf(r) === id);
    let removed = false;
    if (idx !== -1) {
      if (recordClock(arr[idx]) > deletedAt) return false; // el registro se editó después del borrado
      arr.splice(idx, 1);
      removed = true;
    }
    const existing = this.findTombstone(table, id);
    if (existing) {
      if (deletedAt > existing.deletedAt) existing.deletedAt = deletedAt;
      existing._seq = this.nextSeq();
    } else {
      this.data.tombstones.push({ table, id, deletedAt, deletedBy, _seq: this.nextSeq() });
      if (this.data.tombstones.length > MAX_TOMBSTONES) {
        this.data.tombstones.splice(0, this.data.tombstones.length - MAX_TOMBSTONES);
      }
    }
    return removed || !existing;
  }

  /**
   * @param ctx  quién envía: { kind: 'relay' } (PC del hospital, confianza total),
   *             { kind: 'user', user } (médico con sesión) o undefined (uso interno).
   * Devuelve null si el registro no se debe aceptar.
   */
  prepareIncoming(table, incoming, existing, ctx) {
    const rec = { ...incoming };
    if (table === 'users' && typeof rec.avatarUrl === 'string' && rec.avatarUrl.length > 1_500_000) {
      // Foto demasiado grande (se reducen en el dispositivo): conservar la anterior
      if (existing && existing.avatarUrl !== undefined) rec.avatarUrl = existing.avatarUrl;
      else delete rec.avatarUrl;
    }
    if (table === 'users' && ctx && ctx.kind !== 'relay') {
      // El PIN NUNCA se cambia por sincronización: sólo con /api/users/:id/password
      // (antes un dispositivo con el PIN de fábrica guardado lo restablecía al editar el perfil)
      delete rec.pinHash;
      delete rec.pin;
      delete rec.password;
      for (const f of SERVER_ONLY_USER_FIELDS) {
        if (existing && existing[f] !== undefined) rec[f] = existing[f];
        else delete rec[f];
      }
      const admin = isAdminCtx(ctx);
      const self = ctx.user && ctx.user.id === rec.id;
      if (!admin && !self) return null; // un médico no modifica cuentas ajenas
      if (!admin) {
        for (const f of PROTECTED_USER_FIELDS) {
          if (existing && Object.prototype.hasOwnProperty.call(existing, f)) rec[f] = existing[f];
          else delete rec[f];
        }
        if (rec._fclk) {
          rec._fclk = { ...rec._fclk };
          for (const f of PROTECTED_USER_FIELDS) delete rec._fclk[f];
        }
      }
    }
    delete rec._seq;
    delete rec._lmod;
    if (!rec._mtime) rec._mtime = recordClock(incoming) || Date.now();
    // Registro parcial (sin imágenes, venía de la nube de Google): conservar campos pesados
    if (rec._partial && existing) {
      for (const k of Object.keys(existing)) {
        if (rec[k] === undefined) rec[k] = existing[k];
      }
      if (!existing._partial) delete rec._partial;
    }
    if (table === 'users') {
      if (rec.pin) {
        rec.pinHash = this.hashPassword(String(rec.pin));
        rec.tokensValidAfter = Date.now();
        delete rec.pin;
      }
      if (rec.password) {
        rec.pinHash = this.hashPassword(String(rec.password));
        rec.tokensValidAfter = Date.now();
        delete rec.password;
      }
      if (!rec.pinHash && existing?.pinHash) rec.pinHash = existing.pinHash;
    }
    return rec;
  }

  /**
   * Fusiona registros entrantes de una tabla (gana el más reciente).
   * @returns {number} registros aceptados
   */
  mergeRecords(table, list, ctx) {
    if (!SYNC_TABLES.includes(table) || !Array.isArray(list)) return 0;
    const arr = this.data[table];
    const index = new Map(arr.map((r, i) => [keyOf(r), i]));
    let accepted = 0;

    for (const incoming of list) {
      const id = keyOf(incoming);
      if (id === null || id === undefined || id === '') continue;
      const inClock = recordClock(incoming);

      const tb = this.findTombstone(table, id);
      if (tb && tb.deletedAt >= inClock) continue; // borrado posterior: no resucitar

      const pos = index.get(id);
      if (pos === undefined) {
        const rec = this.prepareIncoming(table, incoming, null, ctx);
        if (!rec) continue;
        rec._seq = this.nextSeq();
        this.stamped.add(rec);
        arr.push(rec);
        index.set(id, arr.length - 1);
        if (tb) this.data.tombstones.splice(this.data.tombstones.indexOf(tb), 1);
        accepted++;
        continue;
      }

      const current = arr[pos];
      const prepared = this.prepareIncoming(table, incoming, current, ctx);
      if (!prepared) continue;
      let merged = mergeRecord(current, prepared);
      if (merged === current || sameContent(merged, current)) continue; // nada nuevo
      if (table === 'users' && !merged.pinHash && current.pinHash) merged = { ...merged, pinHash: current.pinHash };
      merged._seq = this.nextSeq();
      this.stamped.add(merged);
      arr[pos] = merged;
      accepted++;
    }
    return accepted;
  }

  applyTombstones(list, ctx) {
    if (!Array.isArray(list)) return 0;
    let n = 0;
    for (const tb of list) {
      if (!tb || !SYNC_TABLES.includes(tb.table) || tb.id === undefined) continue;
      if (tb.table === 'users' && ctx && ctx.kind !== 'relay' && !isAdminCtx(ctx)) continue;
      const deletedAt = Number(tb.deletedAt) || Date.now();
      if (this.tombstone(tb.table, tb.id, deletedAt, tb.deletedBy || '')) n++;
    }
    return n;
  }

  sanitize(table, r, ctx) {
    if (table !== 'users') return r;
    if (ctx && ctx.kind === 'relay') return r; // la PC guarda la copia completa
    const safe = { ...r };
    delete safe.pinHash;
    delete safe.pin;
    delete safe.password;
    return safe;
  }

  /** Cambios con _seq mayor que `since`. */
  changesSince(since = 0, ctx) {
    const s = Number(since) || 0;
    const tables = {};
    for (const t of SYNC_TABLES) {
      const rows = this.data[t].filter((r) => (r._seq || 0) > s).map((r) => this.sanitize(t, r, ctx));
      if (rows.length) tables[t] = rows;
    }
    const tombstones = this.data.tombstones
      .filter((tb) => (tb._seq || 0) > s)
      .map(({ table, id, deletedAt, _seq }) => ({ table, id, deletedAt, _seq }));
    return { seq: this.data.seq, dbId: this.data.dbId, tables, tombstones, serverTime: Date.now() };
  }
}
