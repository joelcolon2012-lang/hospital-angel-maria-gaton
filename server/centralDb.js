import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { SyncStore, SYNC_TABLES, recordClock } from './syncEngine.js';

export const DB_DIRECTORY = process.env.HOSPITAL_DB_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'database');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta al archivo de almacenamiento central persistente
const DB_DIR = process.env.HOSPITAL_DB_DIR || path.join(__dirname, '..', 'database');
const DB_FILE = path.join(DB_DIR, 'hospital_master_db.json');

// Helper para hashing seguro de contraseñas y PINs con salt criptográfico
export function hashPassword(plainText, salt = 'hr_angel_maria_gaton_2026_salt') {
  if (!plainText) return '';
  return crypto.createHash('sha256').update(`${plainText}_${salt}`).digest('hex');
}

export function verifyPassword(plainText, hash, salt = 'hr_angel_maria_gaton_2026_salt') {
  if (!plainText || !hash) return false;
  return hashPassword(plainText, salt) === hash;
}

// Generador de UUID v4 seguro
export function generateUUID(prefix = '') {
  const uuid = crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  return prefix ? `${prefix}-${uuid}` : uuid;
}

// Usuarios por defecto iniciales si la base de datos está vacía
export const SEED_USERS = [
  {
    id: 'usr-admin-colon',
    name: 'Dr. Joel Colón',
    email: 'dr.colon@hospitalangelgaton.gob.do',
    role: 'ADMINISTRADOR',
    isSuperAdmin: true,
    specialty: 'Especialista en Medicina de Emergencias & Medicina Interna',
    exequatur: 'EXEQ. 45892-01',
    pinHash: hashPassword('2026'),
    isActive: true,
    isDeleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120&auto=format&fit=crop&q=80',
    createdBy: 'Sistema Central'
  },
  {
    id: 'usr-med-guzman',
    name: 'Dra. Guzmán',
    email: 'dra.guzman@hospitalangelgaton.gob.do',
    role: 'MÉDICO',
    isSuperAdmin: false,
    specialty: 'Médico Especialista en Emergenciología',
    exequatur: 'EXEQ. 51204-12',
    pinHash: hashPassword('1234'),
    isActive: true,
    isDeleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    avatarUrl: 'https://images.unsplash.com/photo-1594824813583-74b88d2d9b62?w=120&auto=format&fit=crop&q=80',
    createdBy: 'Dr. Joel Colón'
  },
  {
    id: 'usr-res-martinez',
    name: 'Dr. Martínez',
    email: 'dr.martinez@hospitalangelgaton.gob.do',
    role: 'RESIDENTE',
    isSuperAdmin: false,
    specialty: 'Médico Residente de Medicina Interna R3',
    exequatur: 'EXEQ. 67812-24',
    pinHash: hashPassword('1234'),
    isActive: true,
    isDeleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    avatarUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=120&auto=format&fit=crop&q=80',
    createdBy: 'Dr. Joel Colón'
  },
  {
    id: 'usr-lec-santana',
    name: 'Licda. Santana',
    email: 'lic.santana@hospitalangelgaton.gob.do',
    role: 'LECTURA',
    isSuperAdmin: false,
    specialty: 'Auditoría Clínica & Personal de Enfermería',
    exequatur: 'EXEQ. 38901-08',
    pinHash: hashPassword('1234'),
    isActive: true,
    isDeleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    avatarUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=120&auto=format&fit=crop&q=80',
    createdBy: 'Dr. Joel Colón'
  }
];

class CentralDatabaseManager {
  constructor() {
    this.memoryData = {
      patients: [],
      studies: [],
      labs: [],
      problems: [],
      orders: [],
      evolutions: [],
      pendingTasks: [],
      users: [...SEED_USERS],
      auditLogs: [],
      clinicalNotes: [],
      clinicalHistoriesPlanta: [],
      clinicalHistoryVersions: [],
      strokeRegistry: [],
      sourceDocuments: [],
      tombstones: [],
      seq: 0,
      lastUpdated: Date.now(),
      version: 1
    };
    this.isWriting = false;
    this.writeQueue = [];
    this.initDatabase();
    // Motor de sincronización registro-por-registro (delta + lápidas)
    this.sync = new SyncStore(this.memoryData, { hashPassword });
    this.persistToDiskSync();
  }

  initDatabase() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        const data = parsed.data || parsed;
        
        if (data && Array.isArray(data.patients)) {
          for (const t of SYNC_TABLES) {
            if (t === 'users') continue;
            this.memoryData[t] = Array.isArray(data[t]) ? data[t] : [];
          }
          this.memoryData.tombstones = Array.isArray(data.tombstones) ? data.tombstones : [];
          this.memoryData.seq = Number(data.seq) || 0;
          if (data.dbId) this.memoryData.dbId = data.dbId;
          if (data.authSecret) this.memoryData.authSecret = data.authSecret;
          this.memoryData.lastUpdated = data.lastUpdated || Date.now();
          this.memoryData.version = data.version || 1;

          // Merge users asegurando que los usuarios existentes y de semilla estén presentes
          const existingUsers = data.users || [];
          const userMap = new Map();
          for (const u of SEED_USERS) userMap.set(u.id, { ...u });
          for (const u of existingUsers) {
            // Asegurar que las contraseñas se conviertan a hash si venían en texto plano
            if (u.pin && !u.pinHash) {
              u.pinHash = hashPassword(u.pin);
              delete u.pin;
            }
            userMap.set(u.id, u);
          }
          this.memoryData.users = Array.from(userMap.values());
          console.log(`[CentralDB] Base de datos cargada: ${this.memoryData.patients.length} pacientes, ${this.memoryData.users.length} usuarios.`);
          return;
        }
      }

      // Si no existe, guardar datos iniciales
      this.persistToDiskSync();
      console.log(`[CentralDB] Base de datos central creada exitosamente en ${DB_FILE}`);
    } catch (err) {
      console.error('[CentralDB] Error inicializando base de datos:', err);
    }
  }

  // Escritura atómica a disco para prevenir corrupción de datos en caídas de energía o reinicio
  async persistToDisk() {
    return new Promise((resolve, reject) => {
      this.writeQueue.push({ resolve, reject });
      this.processWriteQueue();
    });
  }

  async processWriteQueue() {
    if (this.isWriting || this.writeQueue.length === 0) return;
    this.isWriting = true;

    const currentBatch = [...this.writeQueue];
    this.writeQueue = [];

    try {
      if (this.sync) this.sync.autoStamp();
      this.memoryData.lastUpdated = Date.now();
      this.memoryData.version = (this.memoryData.version || 0) + 1;
      
      const payload = {
        success: true,
        version: this.memoryData.version,
        lastUpdated: this.memoryData.lastUpdated,
        data: this.memoryData
      };

      const jsonString = JSON.stringify(payload);
      const tempFile = `${DB_FILE}.tmp.${Date.now()}`;

      // 1. Escribir a archivo temporal
      await fs.promises.writeFile(tempFile, jsonString, 'utf-8');

      // 2. Renombrar atómicamente
      await fs.promises.rename(tempFile, DB_FILE);

      // 3. Base permanente en la nube (MongoDB Atlas), si está configurada
      if (this.mongo) await this.flushMongo();
      if (typeof this.onPersist === 'function') {
        try { this.onPersist(); } catch {}
      }

      // Nota de privacidad: ya NO se copia la base de pacientes a public/,
      // porque esa carpeta se publica en GitHub Pages.

      currentBatch.forEach(b => b.resolve(true));
    } catch (err) {
      console.error('[CentralDB] Error persistiendo a disco:', err);
      currentBatch.forEach(b => b.reject(err));
    } finally {
      this.isWriting = false;
      if (this.writeQueue.length > 0) {
        this.processWriteQueue();
      }
    }
  }

  persistToDiskSync() {
    try {
      if (this.sync) this.sync.autoStamp();
      this.memoryData.lastUpdated = Date.now();
      const payload = {
        success: true,
        version: this.memoryData.version,
        lastUpdated: this.memoryData.lastUpdated,
        data: this.memoryData
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (err) {
      console.error('[CentralDB Sync] Error guardando archivo:', err);
    }
  }

  // ==========================================
  // BASE PERMANENTE EN LA NUBE (MongoDB Atlas)
  // ==========================================
  /**
   * Conecta la base en memoria con MongoDB. Si la nube ya tiene datos, ésos son
   * la fuente de verdad (el disco de Render se borra en cada reinicio).
   */
  async attachMongo(store) {
    const loaded = await store.load(SYNC_TABLES);
    if (loaded) {
      for (const t of SYNC_TABLES) {
        const rows = loaded[t] || [];
        if (t === 'auditLogs') {
          rows.sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
          rows.length = Math.min(rows.length, 3000);
        } else {
          rows.sort((a, b) => (a._seq || 0) - (b._seq || 0));
        }
        this.memoryData[t] = rows;
      }
      // Asegurar que existan los usuarios iniciales (si la nube no los tiene)
      const ids = new Set(this.memoryData.users.map((u) => u.id));
      for (const u of SEED_USERS) if (!ids.has(u.id)) this.memoryData.users.push({ ...u });
      this.memoryData.tombstones = loaded.tombstones || [];
      this.memoryData.seq = loaded.seq || 0;
      if (loaded.dbId) this.memoryData.dbId = loaded.dbId;
      this.memoryData.version = loaded.version || 1;
      this.memoryData.lastUpdated = loaded.lastUpdated || Date.now();
      if (loaded.authSecret) this.memoryData.authSecret = loaded.authSecret;
      this.sync = new SyncStore(this.memoryData, { hashPassword });
      this.mongo = store;
      this.persistToDiskSync();
      await this.flushMongo(); // guarda seq/usuarios nuevos si hubo migraciones
      console.log(`[CentralDB] Nube conectada: ${this.memoryData.patients.length} pacientes, ${this.memoryData.users.length} usuarios.`);
    } else {
      this.sync.autoStamp();
      this.mongo = store;
      await store.persist(this.memoryData, SYNC_TABLES, { full: true });
      console.log('[CentralDB] Nube vacía: se subió la base inicial.');
    }
    return this.memoryData;
  }

  async flushMongo() {
    if (!this.mongo) return;
    if (this.mongoFlushing) {
      this.mongoAgain = true;
      return this.mongoFlushing;
    }
    const run = async () => {
      do {
        this.mongoAgain = false;
        try {
          await this.mongo.persist(this.memoryData, SYNC_TABLES);
        } catch (err) {
          this.mongo.lastError = err?.message || String(err);
          console.error('[CentralDB] No se pudo guardar en la nube (se reintentará):', this.mongo.lastError);
          clearTimeout(this.mongoRetry);
          this.mongoRetry = setTimeout(() => this.flushMongo(), 15000);
          return;
        }
      } while (this.mongoAgain);
    };
    this.mongoFlushing = run().finally(() => {
      this.mongoFlushing = null;
    });
    return this.mongoFlushing;
  }

  storageInfo() {
    return this.mongo
      ? { mode: 'mongodb', persistedSeq: this.mongo.persistedSeq, lastError: this.mongo.lastError, lastWriteAt: this.mongo.lastWriteAt }
      : { mode: 'archivo' };
  }

  // ==========================================
  // MÉTODOS DE PACIENTES
  // ==========================================
  getAllPatients(includeDeleted = false) {
    if (includeDeleted) return [...this.memoryData.patients];
    return this.memoryData.patients.filter(p => !p.isDeleted);
  }

  getPatientById(id) {
    return this.memoryData.patients.find(p => p.id === id) || null;
  }

  async savePatient(patientData, user = 'Dr. Joel Colón') {
    const now = new Date().toISOString();
    let patient = null;

    if (patientData.id) {
      const index = this.memoryData.patients.findIndex(p => p.id === patientData.id);
      if (index !== -1) {
        const existing = this.memoryData.patients[index];
        // Protección: no aceptar una versión más antigua que la del servidor
        if (recordClock(patientData) && recordClock(patientData) < recordClock(existing)) {
          return existing;
        }
        patient = {
          ...existing,
          ...patientData,
          id: existing.id,
          version: (existing.version || 1) + 1,
          updatedAt: now,
          updatedBy: user
        };
        this.memoryData.patients[index] = patient;
      }
    }

    if (!patient) {
      const id = patientData.id || generateUUID('pat');
      const year = new Date().getFullYear();
      const nextNum = String(this.memoryData.patients.length + 1).padStart(3, '0');
      const internalCode = patientData.internalCode || `EMG-${year}-${nextNum}`;

      patient = {
        id,
        internalCode,
        medicalRecordNumber: patientData.medicalRecordNumber || '',
        fullName: patientData.fullName || 'Paciente Sin Nombre',
        idDocument: patientData.idDocument || '',
        birthDate: patientData.birthDate || '',
        age: patientData.age,
        sex: patientData.sex || 'M',
        phone: patientData.phone || '',
        emergencyContact: patientData.emergencyContact || '',
        arrivalDateTime: patientData.arrivalDateTime || now.slice(0, 16).replace('T', ' '),
        provenance: patientData.provenance || 'Domicilio',
        cubicle: patientData.cubicle || 'Cubículo 1',
        triageLevel: patientData.triageLevel || 3,
        chiefComplaint: patientData.chiefComplaint || '',
        status: patientData.status || 'activos',
        attendingDoctor: patientData.attendingDoctor || user,
        vitals: patientData.vitals || {
          hemodynamicStatus: 'Estable',
          allergies: [],
          comorbidities: []
        },
        clinicalHistory: patientData.clinicalHistory || {
          reasonForConsultation: patientData.chiefComplaint || '',
          currentIllnessHistory: '',
          pathologicalHistory: '',
          surgicalHistory: '',
          allergicHistory: '',
          habitualMedications: '',
          toxicHabits: '',
          familyHistory: '',
          obGynHistory: '',
          systemsReview: '',
          physicalExam: { general: '' },
          clinicalImpression: '',
          diagnosticAndTherapeuticPlan: ''
        },
        createdBy: user,
        createdAt: patientData.createdAt || now,
        updatedBy: user,
        updatedAt: now,
        isDeleted: false,
        version: 1
      };
      this.memoryData.patients.unshift(patient);
    }

    // Registrar en auditoría central
    this.recordAuditLogSync({
      action: patientData.id ? 'MODIFICAR' : 'CREAR',
      entity: 'PACIENTE',
      entityId: patient.id,
      patientId: patient.id,
      userName: user,
      details: `${patientData.id ? 'Modificación' : 'Creación'} de paciente: ${patient.fullName} (${patient.internalCode})`
    });

    await this.persistToDisk();
    return patient;
  }

  async deletePatient(id, user = 'Dr. Joel Colón') {
    const p = this.getPatientById(id);
    if (!p) return false;

    p.isDeleted = true;
    p.deletedAt = new Date().toISOString();
    p.updatedBy = user;
    p.updatedAt = new Date().toISOString();
    p._mtime = Date.now();
    this.sync.touch(p);

    this.recordAuditLogSync({
      action: 'ELIMINAR',
      entity: 'PACIENTE',
      entityId: id,
      patientId: id,
      userName: user,
      details: `Soft delete de paciente: ${p.fullName} (${p.internalCode})`
    });

    await this.persistToDisk();
    return true;
  }

  // ==========================================
  // MÉTODOS DE USUARIOS (AUTH & ROLES)
  // ==========================================
  getAllUsers(includeDeleted = false) {
    const list = includeDeleted ? this.memoryData.users : this.memoryData.users.filter(u => !u.isDeleted && u.isActive !== false);
    // Devolver usuarios sin exponer el hash de PIN/contraseña
    return list.map(u => {
      const safe = { ...u };
      delete safe.pinHash;
      delete safe.pin;
      return safe;
    });
  }

  getUserById(id) {
    const u = this.memoryData.users.find(u => u.id === id);
    if (!u) return null;
    const safe = { ...u };
    delete safe.pinHash;
    delete safe.pin;
    return safe;
  }

  async authenticateUser(idOrEmailOrName, plainPin) {
    const term = String(idOrEmailOrName).trim().toLowerCase();
    const u = this.memoryData.users.find(u => 
      !u.isDeleted &&
      (u.id.toLowerCase() === term ||
       (u.email && u.email.toLowerCase() === term) ||
       u.name.toLowerCase() === term ||
       (u.exequatur && u.exequatur.toLowerCase() === term))
    );

    if (!u) return { success: false, error: 'Usuario no encontrado en el sistema.' };
    if (u.isActive === false) return { success: false, error: 'Este usuario se encuentra desactivado. Consulte al administrador.' };

    const isValid = verifyPassword(plainPin, u.pinHash);
    if (!isValid) return { success: false, error: 'Código PIN / Contraseña incorrecta.' };

    const safe = { ...u };
    delete safe.pinHash;
    return { success: true, user: safe };
  }

  async createUser(userData, createdBy = 'Dr. Joel Colón') {
    const now = new Date().toISOString();
    const cleanName = userData.name.trim();
    const cleanExeq = (userData.exequatur || '').trim();

    // Validar duplicado
    const exists = this.memoryData.users.find(u => 
      !u.isDeleted &&
      (u.name.toLowerCase() === cleanName.toLowerCase() ||
       (cleanExeq && u.exequatur && u.exequatur.toLowerCase() === cleanExeq.toLowerCase()))
    );

    if (exists) {
      throw new Error(`Ya existe un médico registrado con el nombre o exequátur indicado (${cleanName}).`);
    }

    const pin = userData.pin || userData.password || '1234';
    const pinHash = hashPassword(pin);

    const newUser = {
      id: userData.id || generateUUID('usr'),
      name: cleanName,
      email: userData.email || '',
      role: userData.role || 'MÉDICO',
      isSuperAdmin: Boolean(userData.isSuperAdmin),
      specialty: userData.specialty || 'Medicina General',
      exequatur: cleanExeq,
      pinHash,
      isActive: true,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
      createdBy,
      avatarUrl: userData.avatarUrl || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120'
    };

    this.memoryData.users.push(newUser);

    this.recordAuditLogSync({
      action: 'CREAR',
      entity: 'USUARIO',
      entityId: newUser.id,
      userName: createdBy,
      details: `Creación de usuario: ${newUser.name} (${newUser.role})`
    });

    await this.persistToDisk();

    const safe = { ...newUser };
    delete safe.pinHash;
    return safe;
  }

  async updateUser(id, updates, updatedBy = 'Dr. Joel Colón') {
    const index = this.memoryData.users.findIndex(u => u.id === id);
    if (index === -1) throw new Error('Usuario no encontrado.');

    const existing = this.memoryData.users[index];
    const now = new Date().toISOString();

    const updated = {
      ...existing,
      ...updates,
      id: existing.id,
      updatedAt: now,
      updatedBy
    };

    // Si viene un nuevo PIN/password en la actualización
    if (updates.newPin || updates.password) {
      updated.pinHash = hashPassword(updates.newPin || updates.password);
      delete updated.newPin;
      delete updated.password;
    }

    this.memoryData.users[index] = updated;

    this.recordAuditLogSync({
      action: 'MODIFICAR',
      entity: 'USUARIO',
      entityId: id,
      userName: updatedBy,
      details: `Modificación de usuario: ${updated.name}`
    });

    await this.persistToDisk();

    const safe = { ...updated };
    delete safe.pinHash;
    return safe;
  }

  async resetUserPassword(id, newPassword, updatedBy = 'Dr. Joel Colón') {
    const user = this.memoryData.users.find(u => u.id === id);
    if (!user) throw new Error('Usuario no encontrado.');

    if (!newPassword || String(newPassword).trim().length < 4) {
      throw new Error('La nueva contraseña/PIN debe tener al menos 4 caracteres.');
    }

    user.pinHash = hashPassword(String(newPassword).trim());
    user.updatedAt = new Date().toISOString();
    user._mtime = Date.now();
    this.sync.touch(user);
    user.updatedBy = updatedBy;

    this.recordAuditLogSync({
      action: 'MODIFICAR',
      entity: 'USUARIO',
      entityId: id,
      userName: updatedBy,
      details: `Restablecimiento de PIN/contraseña para ${user.name}`
    });

    await this.persistToDisk();
    return true;
  }

  async toggleUserStatus(id, active, updatedBy = 'Dr. Joel Colón') {
    const user = this.memoryData.users.find(u => u.id === id);
    if (!user) throw new Error('Usuario no encontrado.');

    user.isActive = Boolean(active);
    user.updatedAt = new Date().toISOString();
    user._mtime = Date.now();
    this.sync.touch(user);
    user.updatedBy = updatedBy;
    if (!active) {
      user.deletedAt = user.updatedAt;
    } else {
      user.deletedAt = null;
    }

    this.recordAuditLogSync({
      action: active ? 'REACTIVAR' : 'DESACTIVAR',
      entity: 'USUARIO',
      entityId: id,
      userName: updatedBy,
      details: `${active ? 'Reactivación' : 'Desactivación'} de usuario ${user.name}`
    });

    await this.persistToDisk();
    return user;
  }

  // ==========================================
  // MÉTODOS DE HISTORIA DE PLANTA, ÓRDENES, EVOLUCIONES
  // ==========================================
  getHistoryPlantaByPatientId(patientId) {
    return this.memoryData.clinicalHistoriesPlanta.find(h => h.patientId === patientId) || null;
  }

  async saveHistoryPlanta(historyData, user = 'Dr. Joel Colón') {
    const now = new Date().toISOString();
    const patientId = historyData.patientId;
    if (!patientId) throw new Error('patientId es requerido para la Historia de Planta.');

    const index = this.memoryData.clinicalHistoriesPlanta.findIndex(h => h.patientId === patientId);
    let record = null;

    if (index !== -1) {
      const existing = this.memoryData.clinicalHistoriesPlanta[index];
      record = {
        ...existing,
        ...historyData,
        version: (existing.version || 1) + 1,
        updatedAt: now,
        updatedBy: user
      };
      this.memoryData.clinicalHistoriesPlanta[index] = record;
    } else {
      record = {
        ...historyData,
        id: historyData.id || generateUUID('chp'),
        patientId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        createdBy: user,
        updatedBy: user
      };
      this.memoryData.clinicalHistoriesPlanta.push(record);
    }

    this.recordAuditLogSync({
      action: index !== -1 ? 'MODIFICAR' : 'CREAR',
      entity: 'HISTORIA_PLANTA',
      entityId: record.id,
      patientId,
      userName: user,
      details: `Guardado de Historia Clínica de Planta (Paciente ${patientId})`
    });

    await this.persistToDisk();
    return record;
  }

  getOrdersByPatientId(patientId) {
    return this.memoryData.orders.filter(o => o.patientId === patientId);
  }

  async saveOrder(orderData, user = 'Dr. Joel Colón') {
    const now = new Date().toISOString();
    let order = null;

    if (orderData.id) {
      const index = this.memoryData.orders.findIndex(o => o.id === orderData.id);
      if (index !== -1) {
        order = { ...this.memoryData.orders[index], ...orderData, updatedAt: now, updatedBy: user };
        this.memoryData.orders[index] = order;
      }
    }

    if (!order) {
      order = {
        ...orderData,
        id: orderData.id || generateUUID('ord'),
        createdAt: orderData.createdAt || now,
        createdBy: user
      };
      this.memoryData.orders.unshift(order);
    }

    await this.persistToDisk();
    return order;
  }

  getEvolutionsByPatientId(patientId) {
    return this.memoryData.evolutions.filter(e => e.patientId === patientId);
  }

  async saveEvolution(evoData, user = 'Dr. Joel Colón') {
    const now = new Date().toISOString();
    let evo = null;

    if (evoData.id) {
      const index = this.memoryData.evolutions.findIndex(e => e.id === evoData.id);
      if (index !== -1) {
        evo = { ...this.memoryData.evolutions[index], ...evoData, updatedAt: now, updatedBy: user };
        this.memoryData.evolutions[index] = evo;
      }
    }

    if (!evo) {
      evo = {
        ...evoData,
        id: evoData.id || generateUUID('evo'),
        createdAt: evoData.createdAt || now,
        createdBy: user
      };
      this.memoryData.evolutions.unshift(evo);
    }

    await this.persistToDisk();
    return evo;
  }

  // ==========================================
  // PENDIENTES DE GUARDIA CLÍNICA
  // ==========================================
  getPendingTasks(patientId = null) {
    if (patientId) {
      return this.memoryData.pendingTasks.filter(t => t.patientId === patientId);
    }
    return [...this.memoryData.pendingTasks];
  }

  async savePendingTask(taskData, user = 'Dr. Joel Colón') {
    const now = new Date().toISOString();
    let task = null;

    if (taskData.id) {
      const index = this.memoryData.pendingTasks.findIndex(t => t.id === taskData.id);
      if (index !== -1) {
        task = {
          ...this.memoryData.pendingTasks[index],
          ...taskData,
          updatedAt: now,
          updatedBy: user
        };
        this.memoryData.pendingTasks[index] = task;
      }
    }

    if (!task) {
      task = {
        ...taskData,
        id: taskData.id || generateUUID('tsk'),
        status: taskData.status || 'PENDIENTE',
        priority: taskData.priority || 'NORMAL',
        createdAt: taskData.createdAt || now,
        updatedAt: now,
        createdBy: user
      };
      this.memoryData.pendingTasks.unshift(task);
    }

    this.recordAuditLogSync({
      action: taskData.id ? 'MODIFICAR' : 'CREAR',
      entity: 'PENDIENTE',
      entityId: task.id,
      patientId: task.patientId || '',
      userName: user,
      details: `Pendiente (${task.priority}): "${task.description}" [${task.status}]`
    });

    await this.persistToDisk();
    return task;
  }

  async updatePendingTaskStatus(id, status, user = 'Dr. Joel Colón') {
    const index = this.memoryData.pendingTasks.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Pendiente no encontrado.');

    const now = new Date().toISOString();
    const task = this.memoryData.pendingTasks[index];
    task.status = status;
    task.updatedAt = now;
    task.updatedBy = user;

    if (status === 'REALIZADO') {
      task.completedAt = now;
      task.completedBy = user;
    } else {
      delete task.completedAt;
      delete task.completedBy;
    }

    task._mtime = Date.now();
    this.memoryData.pendingTasks[index] = task;
    this.sync.touch(task);

    this.recordAuditLogSync({
      action: 'MODIFICAR',
      entity: 'PENDIENTE',
      entityId: id,
      patientId: task.patientId || '',
      userName: user,
      details: `Estado de pendiente actualizado a ${status}: "${task.description}"`
    });

    await this.persistToDisk();
    return task;
  }

  async deletePendingTask(id, user = 'Dr. Joel Colón') {
    const index = this.memoryData.pendingTasks.findIndex(t => t.id === id);
    if (index === -1) return false;

    const task = this.memoryData.pendingTasks[index];
    this.sync.tombstone('pendingTasks', id, Date.now(), user);

    this.recordAuditLogSync({
      action: 'ELIMINAR_SUAVE',
      entity: 'PENDIENTE',
      entityId: id,
      patientId: task.patientId || '',
      userName: user,
      details: `Pendiente eliminado: "${task.description}"`
    });

    await this.persistToDisk();
    return true;
  }

  async deleteOrder(id, user = 'Dr. Joel Colón') {
    const index = this.memoryData.orders.findIndex(o => o.id === id);
    if (index === -1) return false;
    const ord = this.memoryData.orders[index];
    this.sync.tombstone('orders', id, Date.now(), user);
    this.recordAuditLogSync({
      action: 'ELIMINAR_SUAVE',
      entity: 'ORDEN_MEDICA',
      entityId: id,
      patientId: ord.patientId || '',
      userName: user,
      details: `Orden médica eliminada: "${ord.description || id}"`
    });
    await this.persistToDisk();
    return true;
  }

  async deleteEvolution(id, user = 'Dr. Joel Colón') {
    const index = this.memoryData.evolutions.findIndex(e => e.id === id);
    if (index === -1) return false;
    const evo = this.memoryData.evolutions[index];
    this.sync.tombstone('evolutions', id, Date.now(), user);
    this.recordAuditLogSync({
      action: 'ELIMINAR_SUAVE',
      entity: 'EVOLUCION',
      entityId: id,
      patientId: evo.patientId || '',
      userName: user,
      details: `Evolución clínica eliminada: "${id}"`
    });
    await this.persistToDisk();
    return true;
  }

  async deleteLabResult(id, user = 'Dr. Joel Colón') {
    const index = this.memoryData.labs.findIndex(l => l.id === id);
    if (index === -1) return false;
    const lab = this.memoryData.labs[index];
    this.sync.tombstone('labs', id, Date.now(), user);
    this.recordAuditLogSync({
      action: 'ELIMINAR_SUAVE',
      entity: 'LABORATORIO',
      entityId: id,
      patientId: lab.patientId || '',
      userName: user,
      details: `Resultado de laboratorio eliminado: "${lab.title || id}"`
    });
    await this.persistToDisk();
    return true;
  }

  getStudiesByPatientId(patientId) {
    return this.memoryData.studies.filter(s => s.patientId === patientId);
  }

  async saveStudy(studyData, user = 'Dr. Joel Colón') {
    const now = new Date().toISOString();
    let study = null;

    if (studyData.id) {
      const index = this.memoryData.studies.findIndex(s => s.id === studyData.id);
      if (index !== -1) {
        study = { ...this.memoryData.studies[index], ...studyData, updatedAt: now, updatedBy: user };
        this.memoryData.studies[index] = study;
      }
    }

    if (!study) {
      study = {
        ...studyData,
        id: studyData.id || generateUUID('std'),
        timestamp: studyData.timestamp || now,
        registeredBy: user,
        doctorName: user
      };
      this.memoryData.studies.unshift(study);
    }

    await this.persistToDisk();
    return study;
  }

  async deleteStudy(id, user = 'Dr. Joel Colón') {
    const index = this.memoryData.studies.findIndex(s => s.id === id);
    if (index === -1) return false;
    const std = this.memoryData.studies[index];
    this.sync.tombstone('studies', id, Date.now(), user);
    this.recordAuditLogSync({
      action: 'ELIMINAR_SUAVE',
      entity: 'ESTUDIO',
      entityId: id,
      patientId: std.patientId || '',
      userName: user,
      details: `Estudio médico eliminado: "${std.title || id}"`
    });
    await this.persistToDisk();
    return true;
  }

  async saveStrokeRecord(strokeData, user = 'Dr. Joel Colón') {
    const now = new Date().toISOString();
    const id = strokeData.id || strokeData.patientId || generateUUID('strk');
    const index = this.memoryData.strokeRegistry.findIndex(s => s.id === id || s.patientId === strokeData.patientId);
    let record = null;
    if (index !== -1) {
      record = { ...this.memoryData.strokeRegistry[index], ...strokeData, updatedAt: now, updatedBy: user };
      this.memoryData.strokeRegistry[index] = record;
    } else {
      record = { ...strokeData, id, createdAt: now, updatedAt: now, registeredBy: user };
      this.memoryData.strokeRegistry.unshift(record);
    }
    await this.persistToDisk();
    return record;
  }

  // ==========================================
  // AUDITORÍA CENTRAL
  // ==========================================
  getAuditLogs(limit = 100) {
    return this.memoryData.auditLogs.slice(0, limit);
  }

  recordAuditLogSync(entry) {
    const now = new Date().toISOString();
    const log = {
      id: generateUUID('audit'),
      timestamp: now,
      action: entry.action || 'ACCION',
      entity: entry.entity || 'SISTEMA',
      entityId: entry.entityId || '',
      patientId: entry.patientId || '',
      userName: entry.userName || 'Dr. Joel Colón',
      details: entry.details || '',
      ...entry
    };
    this.memoryData.auditLogs.unshift(log);
    if (this.memoryData.auditLogs.length > 500) {
      this.memoryData.auditLogs = this.memoryData.auditLogs.slice(0, 500);
    }
  }

  // ==========================================
  // FUSIÓN Y SINCRONIZACIÓN COMPLETA
  // ==========================================
  async syncMasterData(incomingData, originDevice = 'Dispositivo Clínico', ctx) {
    // Compatibilidad con clientes antiguos que envían la base completa:
    // se fusiona registro por registro (gana el más reciente) y nunca se borra nada.
    if (!incomingData) return this.getMasterData();
    let changesApplied = 0;
    for (const t of SYNC_TABLES) {
      if (Array.isArray(incomingData[t])) changesApplied += this.sync.mergeRecords(t, incomingData[t], ctx);
    }
    if (Array.isArray(incomingData.tombstones)) changesApplied += this.sync.applyTombstones(incomingData.tombstones, ctx);
    if (changesApplied > 0) await this.persistToDisk();
    return this.getMasterData();
  }

  /**
   * Sincronización delta v2: recibe los cambios del dispositivo y devuelve
   * todo lo que cambió en el servidor desde `since`.
   */
  async syncV2(payload = {}, ctx) {
    const tables = payload.tables || {};
    let accepted = 0;
    for (const t of Object.keys(tables)) {
      accepted += this.sync.mergeRecords(t, tables[t], ctx);
    }
    accepted += this.sync.applyTombstones(payload.tombstones || [], ctx);
    if (accepted > 0) await this.persistToDisk();
    return { accepted, ...this.sync.changesSince(payload.since || 0, ctx) };
  }

  getChangesSince(since = 0, ctx) {
    return this.sync.changesSince(since, ctx);
  }

  getMasterData() {
    return {
      version: this.memoryData.version,
      lastUpdated: this.memoryData.lastUpdated,
      data: {
        patients: this.getAllPatients(false),
        studies: this.memoryData.studies,
        labs: this.memoryData.labs,
        orders: this.memoryData.orders,
        evolutions: this.memoryData.evolutions,
        pendingTasks: this.memoryData.pendingTasks || [],
        users: this.getAllUsers(false),
        auditLogs: this.memoryData.auditLogs.slice(0, 100),
        clinicalHistoriesPlanta: this.memoryData.clinicalHistoriesPlanta,
        strokeRegistry: this.memoryData.strokeRegistry,
        lastUpdated: this.memoryData.lastUpdated,
        deviceOrigin: 'Servidor Central'
      }
    };
  }
}

export const centralDb = new CentralDatabaseManager();
