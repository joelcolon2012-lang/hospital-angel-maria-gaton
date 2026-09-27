/**
 * Servicio Central de Sincronización (fachada)
 * Hospital Regional Dr. Ángel María Gatón — Dr. Colón
 *
 * Mantiene la misma interfaz que usan las pantallas, pero ahora delega en el
 * motor `syncEngine`:
 *  - Cada guardado se escribe primero en el dispositivo (latencia cero).
 *  - Los hooks de la base local lo ponen en la cola de envío automáticamente.
 *  - El motor lo envía al servidor central, reintenta sin señal y descarga
 *    en tiempo real lo que hagan los demás dispositivos, sin sobrescribir
 *    cambios más recientes ni borrar datos.
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
import { syncEngine, newSyncId, type EngineStatus } from './syncEngine';

export type CentralSyncState = 'connected' | 'syncing' | 'offline' | 'error';

export interface CentralSyncStatus extends EngineStatus {}

class CentralSyncService {
  private backendUrl() {
    return syncEngine.getBackendUrl();
  }

  public setBackendUrl(url: string) {
    syncEngine.setBackendUrl(url);
  }

  public getBackendUrl(): string {
    return syncEngine.getBackendUrl();
  }

  public getStatus(): CentralSyncStatus {
    return syncEngine.getStatus();
  }

  public subscribe(cb: (status: CentralSyncStatus) => void): () => void {
    return syncEngine.subscribe(cb);
  }

  public init() {
    syncEngine.start();
  }

  /** Envía lo pendiente y descarga lo nuevo (antes: descarga completa). */
  public async pullCentralMasterData(): Promise<boolean> {
    return syncEngine.syncNow();
  }

  public async triggerPushSync(): Promise<boolean> {
    return syncEngine.syncNow();
  }

  private notifyDataChanged(eventType: string, payload: any) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('hospital_central_data_changed', {
          detail: { type: eventType, payload, timestamp: Date.now(), local: true }
        })
      );
    }
  }

  // =========================================================================
  // PACIENTES
  // =========================================================================
  public async createPatient(patientData: Partial<Patient>, user?: string): Promise<Patient> {
    const effectiveUser = user || patientData.createdBy || patientData.attendingDoctor || 'Dr. Joel Colón';
    const nowIso = new Date().toISOString();
    const existing = patientData.id ? await db.patients.get(patientData.id) : undefined;
    const localPatient: Patient = {
      ...(existing || {}),
      ...patientData,
      id: patientData.id || newSyncId('pat'),
      internalCode: patientData.internalCode || existing?.internalCode || `EMG-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
      fullName: patientData.fullName || existing?.fullName || 'Sin Nombre',
      sex: patientData.sex || existing?.sex || 'M',
      arrivalDateTime: patientData.arrivalDateTime || existing?.arrivalDateTime || nowIso.slice(0, 16).replace('T', ' '),
      provenance: patientData.provenance || existing?.provenance || 'Domicilio',
      cubicle: patientData.cubicle || existing?.cubicle || 'Cubículo 1',
      triageLevel: patientData.triageLevel || existing?.triageLevel || 3,
      chiefComplaint: patientData.chiefComplaint ?? existing?.chiefComplaint ?? '',
      status: patientData.status || existing?.status || 'activos',
      attendingDoctor: patientData.attendingDoctor || existing?.attendingDoctor || effectiveUser,
      createdBy: patientData.createdBy || existing?.createdBy || effectiveUser,
      createdAt: patientData.createdAt || existing?.createdAt || nowIso,
      updatedBy: effectiveUser,
      updatedAt: nowIso,
      vitals: patientData.vitals || existing?.vitals || { hemodynamicStatus: 'Estable', allergies: [], comorbidities: [] },
      clinicalHistory: patientData.clinicalHistory || existing?.clinicalHistory || {
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
    return updated;
  }

  public async deletePatient(patientId: string, user?: string): Promise<boolean> {
    const effectiveUser = user || 'Dr. Joel Colón';
    const p = await db.patients.get(patientId);
    if (p) {
      // Borrado suave: el expediente se archiva y puede restaurarse
      await db.patients.put({
        ...p,
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: effectiveUser
      });
    }
    return true;
  }

  // =========================================================================
  // ÓRDENES, EVOLUCIONES, PENDIENTES, LABS, ESTUDIOS, EVC, HISTORIA DE PLANTA
  // =========================================================================
  public async createOrder(order: MedicalOrder, _user?: string): Promise<MedicalOrder> {
    const rec = { ...order, id: order.id || newSyncId('ord') };
    await db.orders.put(rec);
    return rec;
  }

  public async saveOrderCentral(order: MedicalOrder, user: string): Promise<MedicalOrder> {
    return this.createOrder(order, user);
  }

  public async updateOrderCentral(orderId: string, updates: Partial<MedicalOrder>, _user?: string): Promise<void> {
    await db.orders.update(orderId, { ...updates, updatedAt: new Date().toISOString() } as any);
    const existing = await db.orders.get(orderId);
    if (existing) this.notifyDataChanged('order.updated', existing);
  }

  public async deleteOrderCentral(orderId: string, _user?: string): Promise<void> {
    await db.orders.delete(orderId);
    this.notifyDataChanged('order.deleted', { orderId });
  }

  public async createEvolution(evolution: PatientEvolution, _user?: string): Promise<PatientEvolution> {
    const rec = { ...evolution, id: evolution.id || newSyncId('evo') };
    await db.evolutions.put(rec);
    return rec;
  }

  public async saveEvolutionCentral(evo: PatientEvolution, user: string): Promise<PatientEvolution> {
    return this.createEvolution(evo, user);
  }

  public async deleteEvolutionCentral(evoId: string, _user?: string): Promise<void> {
    await db.evolutions.delete(evoId);
    this.notifyDataChanged('evolution.deleted', { evoId });
  }

  public async saveHistoryPlantaCentral(history: ClinicalHistoryPlanta, _user: string): Promise<ClinicalHistoryPlanta> {
    const rec = { ...history, updatedAt: new Date().toISOString() } as ClinicalHistoryPlanta;
    await db.clinicalHistoriesPlanta.put(rec);
    return rec;
  }

  public async savePendingTaskCentral(task: PendingTask, _user: string): Promise<PendingTask> {
    const rec = { ...task, id: task.id || newSyncId('tsk'), updatedAt: new Date().toISOString() };
    await db.pendingTasks.put(rec);
    this.notifyDataChanged('pending.created', rec);
    return rec;
  }

  public async updatePendingTaskStatusCentral(taskId: string, status: PendingStatus, user: string): Promise<void> {
    const existing = await db.pendingTasks.get(taskId);
    if (!existing) return;
    const nowIso = new Date().toISOString();
    const updated: any = { ...existing, status, updatedAt: nowIso, updatedBy: user };
    if (status === 'REALIZADO') {
      updated.completedAt = nowIso;
      updated.completedBy = user;
    } else {
      delete updated.completedAt;
      delete updated.completedBy;
    }
    await db.pendingTasks.put(updated);
    this.notifyDataChanged(status === 'REALIZADO' ? 'pending.completed' : 'pending.updated', updated);
  }

  public async deletePendingTaskCentral(taskId: string, _user: string): Promise<void> {
    await db.pendingTasks.delete(taskId);
    this.notifyDataChanged('pending.deleted', { taskId });
  }

  public async saveLabCentral(lab: LabResult, _user?: string): Promise<LabResult> {
    const rec = { ...lab, id: lab.id || newSyncId('lab') };
    await db.labs.put(rec);
    this.notifyDataChanged('lab.created', rec);
    return rec;
  }

  public async deleteLabCentral(labId: string, _user?: string): Promise<void> {
    await db.labs.delete(labId);
    this.notifyDataChanged('lab.deleted', { labId });
  }

  public async saveStudyCentral(study: MedicalStudy, _user?: string): Promise<MedicalStudy> {
    const rec = { ...study, id: study.id || newSyncId('std') };
    await db.studies.put(rec);
    this.notifyDataChanged('study.created', rec);
    return rec;
  }

  public async deleteStudyCentral(studyId: string, _user?: string): Promise<void> {
    await db.studies.delete(studyId);
    this.notifyDataChanged('study.deleted', { studyId });
  }

  public async saveStrokeCentral(strokeData: any, _user?: string): Promise<any> {
    const rec = { ...strokeData, id: strokeData.id || strokeData.patientId || newSyncId('strk'), updatedAt: new Date().toISOString() };
    await db.strokeRegistry.put(rec);
    this.notifyDataChanged('stroke.updated', rec);
    return rec;
  }

  // =========================================================================
  // OPERACIONES DE USUARIOS & AUTH
  // =========================================================================
  public async createUser(userData: any, creator: string): Promise<User> {
    const res = await fetch(`${this.backendUrl()}/api/users`, {
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
    const res = await fetch(`${this.backendUrl()}/api/users/${id}`, {
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
    const res = await fetch(`${this.backendUrl()}/api/users/${id}/password`, {
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
    const res = await fetch(`${this.backendUrl()}/api/users/${id}/photo`, {
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
    const res = await fetch(`${this.backendUrl()}/api/users/${id}/status`, {
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

}

export const centralSyncService = new CentralSyncService();
