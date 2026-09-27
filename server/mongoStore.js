/**
 * Almacenamiento permanente en MongoDB Atlas (la "base única" en la nube).
 * ---------------------------------------------------------------------
 * - Se activa sólo si existe la variable de entorno MONGODB_URI (en Render).
 * - Cada registro se guarda como un documento { _id: "tabla:id", t, seq, json }.
 *   El registro viaja como texto JSON para conservarlo exactamente igual
 *   (MongoDB no altera fechas, claves con puntos, etc.).
 * - Sólo se escriben los registros que cambiaron (según su número `_seq`).
 * - Los borrados se guardan como lápidas y el registro se elimina de la nube.
 */

const RECORDS = 'records';
const TOMBSTONES = 'tombstones';
const META = 'meta';
const MAX_BULK_BYTES = 12 * 1024 * 1024;

export class MongoStore {
  /** @param {any} db  instancia `Db` del driver oficial (o un doble de pruebas) */
  constructor(db, client = null) {
    this.db = db;
    this.client = client;
    this.persistedSeq = 0;
    this.lastError = null;
    this.lastWriteAt = 0;
  }

  static async connect(uri, dbName = process.env.MONGODB_DB || 'hospital_angel_maria_gaton') {
    const { MongoClient } = await import('mongodb');
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 20000,
      retryWrites: true,
      appName: 'hospital-angel-maria-gaton'
    });
    await client.connect();
    const store = new MongoStore(client.db(dbName), client);
    await store.ensureIndexes();
    return store;
  }

  async ensureIndexes() {
    try {
      await this.db.collection(RECORDS).createIndex({ t: 1 });
    } catch {}
  }

  /** Lee toda la base desde la nube. Devuelve null si la nube está vacía. */
  async load(tables) {
    const meta = await this.db.collection(META).findOne({ _id: 'meta' });
    const docs = await this.db.collection(RECORDS).find({}).toArray();
    const tombs = await this.db.collection(TOMBSTONES).find({}).toArray();
    if (!meta && docs.length === 0 && tombs.length === 0) return null;

    const data = {};
    for (const t of tables) data[t] = [];
    for (const d of docs) {
      if (!Array.isArray(data[d.t])) continue;
      try {
        data[d.t].push(JSON.parse(d.json));
      } catch {}
    }
    data.tombstones = tombs.map((tb) => ({
      table: tb.table,
      id: tb.id,
      deletedAt: tb.deletedAt,
      deletedBy: tb.deletedBy || '',
      _seq: tb.seq
    }));
    data.seq = Number(meta?.seq) || 0;
    data.dbId = meta?.dbId || null;
    data.version = Number(meta?.version) || 1;
    data.lastUpdated = Number(meta?.lastUpdated) || Date.now();
    data.authSecret = meta?.authSecret || null;
    this.persistedSeq = data.seq;
    return data;
  }

  /**
   * Escribe en la nube lo que cambió desde la última escritura.
   * @param {object} memoryData  base en memoria (ya con _seq asignados)
   * @param {string[]} tables
   * @param {{ full?: boolean }} opts  full = subir todo (primera vez)
   */
  async persist(memoryData, tables, opts = {}) {
    const since = opts.full ? -1 : this.persistedSeq;
    const target = Number(memoryData.seq) || 0;
    const ops = [];
    let batchBytes = 0;
    const flush = async () => {
      if (!ops.length) return;
      await this.db.collection(RECORDS).bulkWrite(ops.splice(0), { ordered: false });
      batchBytes = 0;
    };

    for (const t of tables) {
      for (const r of memoryData[t] || []) {
        if (!r || r.id === undefined || r.id === null) continue;
        if ((r._seq || 0) <= since) continue;
        const json = JSON.stringify(r);
        ops.push({
          replaceOne: {
            filter: { _id: `${t}:${r.id}` },
            replacement: { _id: `${t}:${r.id}`, t, seq: r._seq || 0, json },
            upsert: true
          }
        });
        batchBytes += json.length;
        if (batchBytes > MAX_BULK_BYTES || ops.length >= 500) await flush();
      }
    }

    const tombOps = [];
    for (const tb of memoryData.tombstones || []) {
      if ((tb._seq || 0) <= since) continue;
      ops.push({ deleteOne: { filter: { _id: `${tb.table}:${tb.id}` } } });
      tombOps.push({
        replaceOne: {
          filter: { _id: `${tb.table}:${tb.id}` },
          replacement: {
            _id: `${tb.table}:${tb.id}`,
            table: tb.table,
            id: tb.id,
            deletedAt: tb.deletedAt,
            deletedBy: tb.deletedBy || '',
            seq: tb._seq || 0
          },
          upsert: true
        }
      });
      if (ops.length >= 500) await flush();
    }
    // Un registro puede haber "resucitado" (se volvió a crear después de borrarse):
    // en ese caso se quita su lápida de la nube.
    const liveIds = [];
    for (const t of tables) {
      for (const r of memoryData[t] || []) {
        if ((r._seq || 0) > since) liveIds.push(`${t}:${r.id}`);
      }
    }
    await flush();
    if (tombOps.length) await this.db.collection(TOMBSTONES).bulkWrite(tombOps, { ordered: false });
    if (liveIds.length && !opts.full) {
      await this.db.collection(TOMBSTONES).deleteMany({ _id: { $in: liveIds } });
    }

    await this.db.collection(META).replaceOne(
      { _id: 'meta' },
      {
        _id: 'meta',
        seq: target,
        dbId: memoryData.dbId,
        version: memoryData.version || 1,
        lastUpdated: memoryData.lastUpdated || Date.now(),
        authSecret: memoryData.authSecret || null
      },
      { upsert: true }
    );
    this.persistedSeq = target;
    this.lastWriteAt = Date.now();
    this.lastError = null;
  }

  /** Elimina de la nube los registros de auditoría que ya no están en memoria (se recortan). */
  async trimTable(table, keepIds) {
    const keep = new Set(keepIds.map((id) => `${table}:${id}`));
    const docs = await this.db.collection(RECORDS).find({ t: table }, { projection: { _id: 1 } }).toArray();
    const drop = docs.map((d) => d._id).filter((id) => !keep.has(id));
    if (drop.length) await this.db.collection(RECORDS).deleteMany({ _id: { $in: drop } });
  }

  async close() {
    try {
      await this.client?.close();
    } catch {}
  }
}
