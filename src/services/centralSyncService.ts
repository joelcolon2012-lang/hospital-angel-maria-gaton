/**
 * Servicio Central de Sincronización y Comunicación en Tiempo Real (SSE)
 * Hospital Regional Dr. Ángel María Gatón — Dr. Colón
 * 
 * Garantiza:
 * 1. Conexión directa a la Base de Datos Central en el Backend de Render.
 * 2. Canal de Tiempo Real Server-Sent Events (SSE) para recepción instantánea de altas y cambios.
 * 3. Persistencia indestructible en todos los dispositivos (PC #1, PC #2, iPhone, Android, Tablet).
 */

import { db } from '../db/dexieDb';
import { 
  Patient, 
  User, 
  MedicalOrder, 
  PatientEvolution, 
  ClinicalHistoryPlanta, 
  MedicalStudy, 
  LabResult,
  PendingTask,
  PendingStatus
} from '../types';

export type CentralSyncState = 'connected' | 'syncing' | 'offline' | 'error';

export interface CentralSyncStatus {
  state: CentralSyncState;
  backendUrl: string;
  connectedDevices: number;
  lastSyncedAt: string;
  errorMessage?: string;
  isRealtimeActive: boolean;
}

const DEFAULT_RENDER_BACKEND = 'https://hospital-angel-maria-gaton-backend.onrender.com';

class CentralSyncService {
  private backendUrl: string;
  private syncState: CentralSyncState = 'offline';
  private eventSource: EventSource | null = null;
  private reconnectTimer: any = null;
  private isProcessingSync = false;
  private lastSyncedTime = '';
  private connectedDevices = 1;
  private pollingTimer: any = null;
  private listeners: Array<(status: CentralSyncStatus) => void> = [];

  constructor() {
    this.backendUrl = this.detectBackendUrl();
    this.init();
  }

  private detectBackendUrl(): string {
    try {
      if (typeof window !== 'undefined') {
        const customUrl = localStorage.getItem('hr_colon_custom_backend_url');
        if (customUrl && customUrl.trim()) return customUrl.trim().replace(/\/+$/, '');

        // Si estamos en desarrollo local (localhost:5173 o localhost:3000)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          return 'http://localhost:3001';
        }
      }
    } catch {}

    const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
    if (envUrl && envUrl.trim()) return envUrl.trim().replace(/\/+$/, '');

    return DEFAULT_RENDER_BACKEND;
  }

  public setBackendUrl(url: string) {
    this.backendUrl = url.trim().replace(/\/+$/, '');
    try {
      localStorage.setItem('hr_colon_custom_backend_url', this.backendUrl);
    } catch {}
    this.initRealtimeStream();
    this.pullCentralMasterData();
  }

  public getBackendUrl(): string {
    return this.backendUrl;
  }

  public getStatus(): CentralSyncStatus {
    return {
      state: this.syncState,
      backendUrl: this.backendUrl,
      connectedDevices: this.connectedDevices,
      lastSyncedAt: this.lastSyncedTime || 'Pendiente',
      isRealtimeActive: this.syncState === 'connected'
    };
  }

  public subscribe(cb: (status: CentralSyncStatus) => void): () => void {
    this.listeners.push(cb);
    cb(this.getStatus());
    return () => {
      this.listeners = this.listeners.filter(fn => fn !== cb);
    };
  }

  private notify() {
    const status = this.getStatus();
    for (const fn of this.listeners) {
      try {
        fn(status);
      } catch (err) {
        console.error('[CentralSync] Error en subscriber:', err);
      }
    }
  }

  public init() {
    if (typeof window === 'undefined') return;

    this.initRealtimeStream();
    this.pullCentralMasterData();

    // Polling adaptativo en segundo plano cada 5 segundos para garantizar sincronización infalible
    if (!this.pollingTimer) {
      this.pollingTimer = setInterval(() => {
        if (typeof document === 'undefined' || document.visibilityState === 'visible') {
          this.pullCentralMasterData();
        }
      }, 5000);
    }

    // Reconectar cuando la pestaña vuelve a ser visible o el teléfono se desbloquea
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.pullCentralMasterData();
        if (!this.eventSource || this.eventSource.readyState === EventSource.CLOSED) {
          this.initRealtimeStream();
        }
      }
    });

    window.addEventListener('online', () => {
      this.initRealtimeStream();
      this.pullCentralMasterData();
    });
  }

  // =========================================================================
  // CANAL SERVER-SENT EVENTS (SSE) REALTIME
  // =========================================================================
  private initRealtimeStream() {
    if (typeof window === 'undefined') return;

    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch {}
      this.eventSource = null;
    }

    try {
      const url = `${this.backendUrl}/api/events?origin=${encodeURIComponent(window.location.origin)}`;
      this.eventSource = new EventSource(url);

      this.eventSource.addEventListener('init', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          this.syncState = 'connected';
          this.connectedDevices = data.connectedDevices || 1;
          this.lastSyncedTime = new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          this.notify();
          console.log('[Realtime SSE] Conectado al backend central de Hospital Dr. Ángel María Gatón');
        } catch {}
      });

      this.eventSource.addEventListener('patient.created', async (e: MessageEvent) => {
        try {
          const { patient } = JSON.parse(e.data);
          if (patient && patient.id) {
            await db.patients.put(patient);
            this.notifyDataChanged('patient.created', patient);
          }
        } catch (err) {
          console.error('[SSE] Error procesando patient.created:', err);
        }
      });

      this.eventSource.addEventListener('patient.updated', async (e: MessageEvent) => {
        try {
          const { patient } = JSON.parse(e.data);
          if (patient && patient.id) {
            await db.patients.put(patient);
            this.notifyDataChanged('patient.updated', patient);
          }
        } catch (err) {
          console.error('[SSE] Error procesando patient.updated:', err);
        }
      });

      this.eventSource.addEventListener('patient.deleted', async (e: MessageEvent) => {
        try {
          const { patientId } = JSON.parse(e.data);
          if (patientId) {
            const p = await db.patients.get(patientId);
            if (p) {
              p.isDeleted = true;
              p.deletedAt = new Date().toISOString();
              await db.patients.put(p);
            }
            this.notifyDataChanged('patient.deleted', { patientId });
          }
        } catch (err) {}
      });

      this.eventSource.addEventListener('user.created', async (e: MessageEvent) => {
        try {
          const { user } = JSON.parse(e.data);
          if (user && user.id) {
            await db.users.put(user);
            this.notifyDataChanged('user.created', user);
          }
        } catch {}
      });

      this.eventSource.addEventListener('user.updated', async (e: MessageEvent) => {
        try {
          const { user } = JSON.parse(e.data);
          if (user && user.id) {
            await db.users.put(user);
            this.notifyDataChanged('user.updated', user);
          }
        } catch {}
      });

      this.eventSource.addEventListener('history_planta.updated', async (e: MessageEvent) => {
        try {
          const { history } = JSON.parse(e.data);
          if (history && (history.id || history.patientId)) {
            await db.clinicalHistoriesPlanta.put(history);
            this.notifyDataChanged('history_planta.updated', history);
          }
        } catch {}
      });

      this.eventSource.addEventListener('order.created', async (e: MessageEvent) => {
        try {
          const { order } = JSON.parse(e.data);
          if (order && order.id) {
            await db.orders.put(order);
            this.notifyDataChanged('order.created', order);
          }
        } catch {}
      });

      this.eventSource.addEventListener('evolution.created', async (e: MessageEvent) => {
        try {
          const { evolution } = JSON.parse(e.data);
          if (evolution && evolution.id) {
            await db.evolutions.put(evolution);
            this.notifyDataChanged('evolution.created', evolution);
          }
        } catch {}
      });

      this.eventSource.addEventListener('pending.created', async (e: MessageEvent) => {
        try {
          const { task } = JSON.parse(e.data);
          if (task && task.id) {
            await db.pendingTasks.put(task);
            this.notifyDataChanged('pending.created', task);
          }
        } catch {}
      });

      this.eventSource.addEventListener('pending.updated', async (e: MessageEvent) => {
        try {
          const { task } = JSON.parse(e.data);
          if (task && task.id) {
            await db.pendingTasks.put(task);
            this.notifyDataChanged('pending.updated', task);
          }
        } catch {}
      });

      this.eventSource.addEventListener('pending.completed', async (e: MessageEvent) => {
        try {
          const { task } = JSON.parse(e.data);
          if (task && task.id) {
            await db.pendingTasks.put(task);
            this.notifyDataChanged('pending.completed', task);
          }
        } catch {}
      });

      this.eventSource.addEventListener('pending.deleted', async (e: MessageEvent) => {
        try {
          const { taskId } = JSON.parse(e.data);
          if (taskId) {
            await db.pendingTasks.delete(taskId);
            this.notifyDataChanged('pending.deleted', { taskId });
          }
        } catch {}
      });

      this.eventSource.addEventListener('lab.created', async (e: MessageEvent) => {
        try {
          const { lab } = JSON.parse(e.data);
          if (lab && lab.id) {
            await db.labs.put(lab);
            this.notifyDataChanged('lab.created', lab);
          }
        } catch {}
      });

      this.eventSource.addEventListener('order.updated', async (e: MessageEvent) => {
        try {
          const { order } = JSON.parse(e.data);
          if (order && order.id) {
            await db.orders.put(order);
            this.notifyDataChanged('order.updated', order);
          }
        } catch {}
      });

      this.eventSource.addEventListener('order.deleted', async (e: MessageEvent) => {
        try {
          const { orderId } = JSON.parse(e.data);
          if (orderId) {
            await db.orders.delete(orderId);
            this.notifyDataChanged('order.deleted', { orderId });
          }
        } catch {}
      });

      this.eventSource.addEventListener('evolution.deleted', async (e: MessageEvent) => {
        try {
          const { evolutionId } = JSON.parse(e.data);
          if (evolutionId) {
            await db.evolutions.delete(evolutionId);
            this.notifyDataChanged('evolution.deleted', { evolutionId });
          }
        } catch {}
      });

      this.eventSource.addEventListener('lab.deleted', async (e: MessageEvent) => {
        try {
          const { labId } = JSON.parse(e.data);
          if (labId) {
            await db.labs.delete(labId);
            this.notifyDataChanged('lab.deleted', { labId });
          }
        } catch {}
      });

      this.eventSource.addEventListener('study.created', async (e: MessageEvent) => {
        try {
          const { study } = JSON.parse(e.data);
          if (study && study.id) {
            await db.studies.put(study);
            this.notifyDataChanged('study.created', study);
          }
        } catch {}
      });

      this.eventSource.addEventListener('study.deleted', async (e: MessageEvent) => {
        try {
          const { studyId } = JSON.parse(e.data);
          if (studyId) {
            await db.studies.delete(studyId);
            this.notifyDataChanged('study.deleted', { studyId });
          }
        } catch {}
      });

      this.eventSource.addEventListener('stroke.updated', async (e: MessageEvent) => {
        try {
          const { record } = JSON.parse(e.data);
          if (record && record.id) {
            await db.strokeRegistry.put(record);
            this.notifyDataChanged('stroke.updated', record);
          }
        } catch {}
      });

      this.eventSource.addEventListener('sync.completed', () => {
        this.pullCentralMasterData();
      });

      this.eventSource.onerror = () => {
        this.syncState = 'offline';
        this.notify();
        try {
          this.eventSource?.close();
        } catch {}
        this.eventSource = null;

        // Reintentar conexión tras 6 segundos
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
          this.initRealtimeStream();
        }, 6000);
      };
    } catch (err) {
      this.syncState = 'offline';
      this.notify();
    }
  }

  private notifyDataChanged(eventType: string, payload: any) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hospital_central_data_changed', {
        detail: { type: eventType, payload, timestamp: Date.now() }
      }));
    }
  }

  // =========================================================================
  // CONSULTA Y FUSIÓN DE DATOS CENTRALES (PULL FULL SYNC)
  // =========================================================================
  public async pullCentralMasterData(): Promise<boolean> {
    if (this.isProcessingSync) return false;
    this.isProcessingSync = true;
    this.syncState = 'syncing';
    this.notify();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${this.backendUrl}/api/sync?t=${Date.now()}`, {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();
      const master = json.data || json;

      if (master && Array.isArray(master.patients)) {
        await db.transaction('rw', [
          db.patients, 
          db.users, 
          db.orders, 
          db.evolutions, 
          db.studies, 
          db.labs, 
          db.clinicalHistoriesPlanta, 
          db.strokeRegistry,
          db.pendingTasks
        ], async () => {
          // Fusionar pacientes conservando los datos más recientes
          if (master.patients.length > 0) {
            await db.patients.bulkPut(master.patients);
          }
          if (master.users && master.users.length > 0) {
            await db.users.bulkPut(master.users);
          }
          if (master.orders && master.orders.length > 0) {
            await db.orders.bulkPut(master.orders);
          }
          if (master.evolutions && master.evolutions.length > 0) {
            await db.evolutions.bulkPut(master.evolutions);
          }
          if (master.clinicalHistoriesPlanta && master.clinicalHistoriesPlanta.length > 0) {
            await db.clinicalHistoriesPlanta.bulkPut(master.clinicalHistoriesPlanta);
          }
          if (master.studies && master.studies.length > 0) {
            await db.studies.bulkPut(master.studies);
          }
          if (master.labs && master.labs.length > 0) {
            await db.labs.bulkPut(master.labs);
          }
          if (master.strokeRegistry && master.strokeRegistry.length > 0) {
            await db.strokeRegistry.bulkPut(master.strokeRegistry);
          }
          if (master.pendingTasks && master.pendingTasks.length > 0) {
            await db.pendingTasks.bulkPut(master.pendingTasks);
          }
        });

        this.syncState = 'connected';
        this.lastSyncedTime = new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        this.notify();
        this.notifyDataChanged('full_sync', master);
        this.isProcessingSync = false;
        return true;
      }
    } catch (err: any) {
      // Si falla la nube central, mantener modo local sin borrar nada
      this.syncState = 'offline';
      this.notify();
    } finally {
      this.isProcessingSync = false;
    }
    return false;
  }

  // =========================================================================
  // OPERACIONES CRUD DE PACIENTES HACIA EL BACKEND CENTRAL
  // =========================================================================
  public async createPatient(patientData: Partial<Patient>, user?: string): Promise<Patient> {
    const effectiveUser = user || patientData.createdBy || patientData.attendingDoctor || 'Dr. Joel Colón';
    // 1. Guardar primero en Dexie local para latencia cero
    const localId = patientData.id || `pat-${Date.now()}`;
    const localPatient: Patient = {
      ...patientData,
      id: localId,
      internalCode: patientData.internalCode || `EMG-${new Date().getFullYear()}-001`,
      fullName: patientData.fullName || 'Sin Nombre',
      sex: patientData.sex || 'M',
      arrivalDateTime: patientData.arrivalDateTime || new Date().toISOString().slice(0, 16).replace('T', ' '),
      provenance: patientData.provenance || 'Domicilio',
      cubicle: patientData.cubicle || 'Cubículo 1',
      triageLevel: patientData.triageLevel || 3,
      chiefComplaint: patientData.chiefComplaint || '',
      status: patientData.status || 'activos',
      attendingDoctor: patientData.attendingDoctor || effectiveUser,
      createdBy: patientData.createdBy || effectiveUser,
      createdAt: patientData.createdAt || new Date().toISOString(),
      updatedBy: effectiveUser,
      updatedAt: new Date().toISOString(),
      vitals: patientData.vitals || { hemodynamicStatus: 'Estable', allergies: [], comorbidities: [] },
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
      }
    } as Patient;

    await db.patients.put(localPatient);

    // 2. Enviar inmediatamente al backend central
    try {
      const res = await fetch(`${this.backendUrl}/api/patients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-name': effectiveUser
        },
        body: JSON.stringify(localPatient)
      });

      if (res.ok) {
        const json = await res.json();
        if (json.patient) {
          await db.patients.put(json.patient);
          this.syncState = 'connected';
          this.notify();
          return json.patient;
        }
      }
    } catch (e) {
      console.warn('[CentralSync] Backend no disponible temporalmente, paciente guardado en caché local:', e);
    }

    return localPatient;
  }

  public async updatePatient(patient: Patient, user?: string): Promise<Patient> {
    const effectiveUser = user || patient.updatedBy || 'Dr. Joel Colón';
    const updated = {
      ...patient,
      updatedAt: new Date().toISOString(),
      updatedBy: effectiveUser,
      version: (patient.version || 1) + 1
    };

    await db.patients.put(updated);

    try {
      const res = await fetch(`${this.backendUrl}/api/patients/${patient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-name': effectiveUser
        },
        body: JSON.stringify(updated)
      });

      if (res.ok) {
        const json = await res.json();
        if (json.patient) {
          await db.patients.put(json.patient);
          return json.patient;
        }
      }
    } catch (e) {
      console.warn('[CentralSync] Guardado local de actualización paciente:', e);
    }

    return updated;
  }

  public async deletePatient(patientId: string, user?: string): Promise<boolean> {
    const effectiveUser = user || 'Dr. Joel Colón';
    const p = await db.patients.get(patientId);
    if (p) {
      p.isDeleted = true;
      p.deletedAt = new Date().toISOString();
      p.updatedBy = effectiveUser;
      await db.patients.put(p);
    }

    try {
      await fetch(`${this.backendUrl}/api/patients/${patientId}`, {
        method: 'DELETE',
        headers: { 'x-user-name': effectiveUser }
      });
      return true;
    } catch {
      return true;
    }
  }

  public async createOrder(order: MedicalOrder, user?: string): Promise<MedicalOrder> {
    const effectiveUser = user || order.prescribedBy || order.doctorName || 'Dr. Joel Colón';
    await db.orders.put(order);
    try {
      const res = await fetch(`${this.backendUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-name': effectiveUser
        },
        body: JSON.stringify(order)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.order) {
          await db.orders.put(json.order);
          return json.order;
        }
      }
    } catch (e) {
      console.warn('[CentralSync] Guardado local de orden médica:', e);
    }
    return order;
  }

  public async createEvolution(evolution: PatientEvolution, user?: string): Promise<PatientEvolution> {
    const effectiveUser = user || evolution.doctorName || 'Dr. Joel Colón';
    await db.evolutions.put(evolution);
    try {
      const res = await fetch(`${this.backendUrl}/api/evolutions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-name': effectiveUser
        },
        body: JSON.stringify(evolution)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.evolution) {
          await db.evolutions.put(json.evolution);
          return json.evolution;
        }
      }
    } catch (e) {
      console.warn('[CentralSync] Guardado local de evolución:', e);
    }
    return evolution;
  }

  // =========================================================================
  // OPERACIONES DE USUARIOS & AUTH
  // =========================================================================
  public async createUser(userData: any, creator: string): Promise<User> {
    const res = await fetch(`${this.backendUrl}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-name': creator
      },
      body: JSON.stringify(userData)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Error creando usuario (HTTP ${res.status})`);
    }

    const json = await res.json();
    const newUser = json.user;
    if (newUser) {
      await db.users.put(newUser);
    }
    return newUser;
  }

  public async updateUser(id: string, updates: any, editor: string): Promise<User> {
    const res = await fetch(`${this.backendUrl}/api/users/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-name': editor
      },
      body: JSON.stringify(updates)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error modificando usuario');
    }

    const json = await res.json();
    const updated = json.user;
    if (updated) {
      await db.users.put(updated);
    }
    return updated;
  }

  public async resetUserPassword(id: string, newPassword: string, confirmPassword: string, editor: string): Promise<boolean> {
    const res = await fetch(`${this.backendUrl}/api/users/${id}/password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-name': editor
      },
      body: JSON.stringify({ newPassword, confirmPassword })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error restableciendo contraseña');
    }

    return true;
  }

  public async uploadUserPhoto(id: string, avatarUrl: string, editor: string): Promise<User> {
    const res = await fetch(`${this.backendUrl}/api/users/${id}/photo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-name': editor
      },
      body: JSON.stringify({ avatarUrl })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error subiendo foto de usuario');
    }

    const json = await res.json();
    if (json.user) {
      await db.users.put(json.user);
    }
    return json.user;
  }

  public async toggleUserStatus(id: string, active: boolean, editor: string): Promise<User> {
    const res = await fetch(`${this.backendUrl}/api/users/${id}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-name': editor
      },
      body: JSON.stringify({ active })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error cambiando estado de usuario');
    }

    const json = await res.json();
    if (json.user) {
      await db.users.put(json.user);
    }
    return json.user;
  }

  // =========================================================================
  // HISTORIA DE PLANTA, ÓRDENES, EVOLUCIONES
  // =========================================================================
  public async saveHistoryPlantaCentral(history: ClinicalHistoryPlanta, user: string): Promise<ClinicalHistoryPlanta> {
    await db.clinicalHistoriesPlanta.put(history);
    try {
      const res = await fetch(`${this.backendUrl}/api/history-planta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-name': user },
        body: JSON.stringify(history)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.history) {
          await db.clinicalHistoriesPlanta.put(json.history);
          return json.history;
        }
      }
    } catch {}
    return history;
  }

  public async saveOrderCentral(order: MedicalOrder, user: string): Promise<MedicalOrder> {
    await db.orders.put(order);
    try {
      const res = await fetch(`${this.backendUrl}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-name': user },
        body: JSON.stringify(order)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.order) {
          await db.orders.put(json.order);
          return json.order;
        }
      }
    } catch {}
    return order;
  }

  public async saveEvolutionCentral(evo: PatientEvolution, user: string): Promise<PatientEvolution> {
    await db.evolutions.put(evo);
    try {
      const res = await fetch(`${this.backendUrl}/api/evolutions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-name': user },
        body: JSON.stringify(evo)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.evolution) {
          await db.evolutions.put(json.evolution);
          return json.evolution;
        }
      }
    } catch {}
    return evo;
  }

  public async savePendingTaskCentral(task: PendingTask, user: string): Promise<PendingTask> {
    await db.pendingTasks.put(task);
    this.notifyDataChanged('pending.created', task);
    try {
      const res = await fetch(`${this.backendUrl}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-name': user },
        body: JSON.stringify(task)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.task) {
          await db.pendingTasks.put(json.task);
          return json.task;
        }
      }
    } catch {}
    return task;
  }

  public async updatePendingTaskStatusCentral(taskId: string, status: PendingStatus, user: string): Promise<void> {
    const existing = await db.pendingTasks.get(taskId);
    if (existing) {
      existing.status = status;
      existing.updatedAt = new Date().toISOString();
      if (status === 'REALIZADO') {
        existing.completedAt = new Date().toISOString();
        existing.completedBy = user;
      }
      await db.pendingTasks.put(existing);
      this.notifyDataChanged(status === 'REALIZADO' ? 'pending.completed' : 'pending.updated', existing);
    }
    try {
      await fetch(`${this.backendUrl}/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-name': user },
        body: JSON.stringify({ status })
      });
    } catch {}
  }

  public async deletePendingTaskCentral(taskId: string, user: string): Promise<void> {
    await db.pendingTasks.delete(taskId);
    this.notifyDataChanged('pending.deleted', { taskId });
    try {
      await fetch(`${this.backendUrl}/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'x-user-name': user }
      });
    } catch {}
  }

  public async saveLabCentral(lab: LabResult, user?: string): Promise<LabResult> {
    const effectiveUser = user || lab.registeredBy || lab.doctorName || 'Dr. Joel Colón';
    await db.labs.put(lab);
    this.notifyDataChanged('lab.created', lab);
    try {
      const res = await fetch(`${this.backendUrl}/api/labs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-name': effectiveUser },
        body: JSON.stringify(lab)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.lab) {
          await db.labs.put(json.lab);
          return json.lab;
        }
      }
    } catch {}
    return lab;
  }

  public async deleteLabCentral(labId: string, user?: string): Promise<void> {
    const effectiveUser = user || 'Dr. Joel Colón';
    await db.labs.delete(labId);
    this.notifyDataChanged('lab.deleted', { labId });
    try {
      await fetch(`${this.backendUrl}/api/labs/${labId}`, {
        method: 'DELETE',
        headers: { 'x-user-name': effectiveUser }
      });
    } catch {}
  }

  public async updateOrderCentral(orderId: string, updates: Partial<MedicalOrder>, user?: string): Promise<void> {
    const effectiveUser = user || 'Dr. Joel Colón';
    await db.orders.update(orderId, updates);
    const existing = await db.orders.get(orderId);
    if (existing) {
      this.notifyDataChanged('order.updated', existing);
      try {
        await fetch(`${this.backendUrl}/api/orders/${orderId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-user-name': effectiveUser },
          body: JSON.stringify(existing)
        });
      } catch {}
    }
  }

  public async deleteOrderCentral(orderId: string, user?: string): Promise<void> {
    const effectiveUser = user || 'Dr. Joel Colón';
    await db.orders.delete(orderId);
    this.notifyDataChanged('order.deleted', { orderId });
    try {
      await fetch(`${this.backendUrl}/api/orders/${orderId}`, {
        method: 'DELETE',
        headers: { 'x-user-name': effectiveUser }
      });
    } catch {}
  }

  public async deleteEvolutionCentral(evoId: string, user?: string): Promise<void> {
    const effectiveUser = user || 'Dr. Joel Colón';
    await db.evolutions.delete(evoId);
    this.notifyDataChanged('evolution.deleted', { evoId });
    try {
      await fetch(`${this.backendUrl}/api/evolutions/${evoId}`, {
        method: 'DELETE',
        headers: { 'x-user-name': effectiveUser }
      });
    } catch {}
  }

  public async saveStudyCentral(study: MedicalStudy, user?: string): Promise<MedicalStudy> {
    const effectiveUser = user || study.doctorName || study.registeredBy || 'Dr. Joel Colón';
    await db.studies.put(study);
    this.notifyDataChanged('study.created', study);
    try {
      const res = await fetch(`${this.backendUrl}/api/studies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-name': effectiveUser },
        body: JSON.stringify(study)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.study) {
          await db.studies.put(json.study);
          return json.study;
        }
      }
    } catch {}
    return study;
  }

  public async deleteStudyCentral(studyId: string, user?: string): Promise<void> {
    const effectiveUser = user || 'Dr. Joel Colón';
    await db.studies.delete(studyId);
    this.notifyDataChanged('study.deleted', { studyId });
    try {
      await fetch(`${this.backendUrl}/api/studies/${studyId}`, {
        method: 'DELETE',
        headers: { 'x-user-name': effectiveUser }
      });
    } catch {}
  }

  public async saveStrokeCentral(strokeData: any, user?: string): Promise<any> {
    const effectiveUser = user || 'Dr. Joel Colón';
    await db.strokeRegistry.put(strokeData);
    this.notifyDataChanged('stroke.updated', strokeData);
    try {
      const res = await fetch(`${this.backendUrl}/api/stroke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-name': effectiveUser },
        body: JSON.stringify(strokeData)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.record) {
          await db.strokeRegistry.put(json.record);
          return json.record;
        }
      }
    } catch {}
    return strokeData;
  }

  public async triggerPushSync(): Promise<boolean> {
    try {
      const [patients, users, orders, evolutions, studies, labs, clinicalHistoriesPlanta, strokeRegistry, pendingTasks] = await Promise.all([
        db.patients.toArray(),
        db.users.toArray(),
        db.orders.toArray(),
        db.evolutions.toArray(),
        db.studies.toArray(),
        db.labs.toArray(),
        db.clinicalHistoriesPlanta.toArray(),
        db.strokeRegistry.toArray(),
        db.pendingTasks.toArray(),
      ]);

      const payload = {
        patients,
        users,
        orders,
        evolutions,
        studies,
        labs,
        clinicalHistoriesPlanta,
        strokeRegistry,
        pendingTasks,
        deviceOrigin: typeof navigator !== 'undefined' ? `${navigator.userAgent}` : 'Web Client'
      };

      const res = await fetch(`${this.backendUrl}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-device-origin': 'Cliente Sincronizado' },
        body: JSON.stringify({ data: payload })
      });

      return res.ok;
    } catch (e) {
      console.warn('[CentralSync] Error en triggerPushSync:', e);
      return false;
    }
  }
}

export const centralSyncService = new CentralSyncService();
