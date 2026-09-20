import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta al archivo de almacenamiento central persistente
const DB_DIR = path.join(__dirname, '..', 'database');
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
      orders: [],
      evolutions: [],
      pendingTasks: [],
      users: [...SEED_USERS],
      auditLogs: [],
      clinicalHistoriesPlanta: [],
      strokeRegistry: [],
      lastUpdated: Date.now(),
      version: 1
    };
    this.isWriting = false;
    this.writeQueue = [];
    this.initDatabase();
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
          this.memoryData.patients = data.patients || [];
          this.memoryData.studies = data.studies || [];
          this.memoryData.labs = data.labs || [];
          this.memoryData.orders = data.orders || [];
          this.memoryData.evolutions = data.evolutions || [];
          this.memoryData.pendingTasks = data.pendingTasks || [];
          this.memoryData.auditLogs = data.auditLogs || [];
          this.memoryData.clinicalHistoriesPlanta = data.clinicalHistoriesPlanta || [];
          this.memoryData.strokeRegistry = data.strokeRegistry || [];
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
      this.memoryData.lastUpdated = Date.now();
      this.memoryData.version = (this.memoryData.version || 0) + 1;
      
      const payload = {
        success: true,
        version: this.memoryData.version,
        lastUpdated: this.memoryData.lastUpdated,
        data: this.memoryData
      };

      const jsonString = JSON.stringify(payload, null, 2);
      const tempFile = `${DB_FILE}.tmp.${Date.now()}`;

      // 1. Escribir a archivo temporal
      await fs.promises.writeFile(tempFile, jsonString, 'utf-8');

      // 2. Renombrar atómicamente
      await fs.promises.rename(tempFile, DB_FILE);

      // 3. Opcional: Mantener copia en public/hospital_master_db.json si existe la carpeta
      try {
        const publicFile = path.join(__dirname, '..', 'public', 'hospital_master_db.json');
        if (fs.existsSync(path.dirname(publicFile))) {
          await fs.promises.writeFile(publicFile, jsonString, 'utf-8');
        }
      } catch {}

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

    this.memoryData.pendingTasks[index] = task;

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
    this.memoryData.pendingTasks.splice(index, 1);

    this.recordAuditLogSync({
      action: 'ELIMINAR_SUAVE',
      entity: 'PENDIENTE',
      entityId: id,
      patientId: task.patientId || '',
      userName: user,
      details: `Pendiente eliminado: "${task.description}"`
    });

  async deleteOrder(id, user = 'Dr. Joel Colón') {
    const index = this.memoryData.orders.findIndex(o => o.id === id);
    if (index === -1) return false;
    const ord = this.memoryData.orders[index];
    this.memoryData.orders.splice(index, 1);
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
    this.memoryData.evolutions.splice(index, 1);
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
    this.memoryData.labs.splice(index, 1);
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
    this.memoryData.studies.splice(index, 1);
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
  async syncMasterData(incomingData, originDevice = 'Dispositivo Clínico') {
    if (!incomingData) return this.getMasterData();

    let changesApplied = 0;

    // 1. Fusionar pacientes
    if (Array.isArray(incomingData.patients)) {
      const patientMap = new Map(this.memoryData.patients.map(p => [p.id, p]));
      for (const p of incomingData.patients) {
        const existing = patientMap.get(p.id);
        if (!existing) {
          this.memoryData.patients.unshift(p);
          changesApplied++;
        } else {
          const remoteTime = new Date(p.updatedAt || p.createdAt || 0).getTime();
          const localTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
          if (remoteTime >= localTime) {
            const index = this.memoryData.patients.findIndex(item => item.id === p.id);
            if (index !== -1) {
              this.memoryData.patients[index] = { ...existing, ...p };
              changesApplied++;
            }
          }
        }
      }
    }

    // 2. Fusionar usuarios (respetando hashes y evitando borrar usuarios centrales)
    if (Array.isArray(incomingData.users)) {
      const userMap = new Map(this.memoryData.users.map(u => [u.id, u]));
      for (const u of incomingData.users) {
        const existing = userMap.get(u.id);
        if (!existing) {
          const pinHash = u.pin ? hashPassword(u.pin) : (u.pinHash || hashPassword('1234'));
          const copy = { ...u, pinHash };
          delete copy.pin;
          this.memoryData.users.push(copy);
          changesApplied++;
        } else {
          const remoteTime = new Date(u.updatedAt || u.createdAt || 0).getTime();
          const localTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
          if (remoteTime >= localTime) {
            const pinHash = u.pin ? hashPassword(u.pin) : (u.pinHash || existing.pinHash);
            const copy = { ...existing, ...u, pinHash };
            delete copy.pin;
            const index = this.memoryData.users.findIndex(item => item.id === u.id);
            if (index !== -1) {
              this.memoryData.users[index] = copy;
              changesApplied++;
            }
          }
        }
      }
    }

    // 3. Fusionar órdenes, evoluciones, estudios, laboratorios, historia de planta, tareas pendientes
    ['orders', 'evolutions', 'studies', 'labs', 'clinicalHistoriesPlanta', 'strokeRegistry', 'pendingTasks'].forEach(key => {
      if (Array.isArray(incomingData[key])) {
        const map = new Map((this.memoryData[key] || []).map(item => [item.id || item.patientId, item]));
        for (const item of incomingData[key]) {
          const itemId = item.id || item.patientId;
          if (!map.has(itemId)) {
            if (!this.memoryData[key]) this.memoryData[key] = [];
            this.memoryData[key].unshift(item);
            changesApplied++;
          } else {
            const index = this.memoryData[key].findIndex(x => (x.id || x.patientId) === itemId);
            if (index !== -1) {
              this.memoryData[key][index] = { ...this.memoryData[key][index], ...item };
            }
          }
        }
      }
    });

    if (changesApplied > 0) {
      this.memoryData.version = (this.memoryData.version || 1) + 1;
      this.memoryData.lastUpdated = Date.now();
      await this.persistToDisk();
    }

    return this.getMasterData();
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
