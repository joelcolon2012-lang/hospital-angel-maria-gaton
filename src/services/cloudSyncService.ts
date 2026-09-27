/**
 * Servicio Integral de Sincronización en Tiempo Real & Nube
 * Hospital Regional Ángel María Gatón — Dr. Colón
 * 
 * Garantiza:
 * 1. Persistencia permanente en el disco duro de la PC (database/hospital_master_db.json)
 * 2. Sincronización bidireccional instantánea entre PC y Teléfono Celular en la misma red Wi-Fi
 * 3. Sincronización en la Nube 24/7 en cualquier red (4G / Datos móviles / Fuera del hospital)
 *    mediante Firebase Realtime Database REST API o Cloud Vault
 * 4. Respaldo maestro de seguridad (.JSON) con descarga e importación en 1 clic
 */

import { db } from '../db/dexieDb';
import { 
  Patient, 
  MedicalStudy, 
  LabResult, 
  MedicalOrder, 
  PatientEvolution, 
  User, 
  AuditLogEntry, 
  StrokeRecord 
} from '../types';
import { googleDriveService, DEFAULT_GAS_URL } from './googleDriveService';
import { syncEngine, SYNC_TABLES, recordClock } from './syncEngine';

export interface HospitalMasterData {
  patients: Patient[];
  studies: MedicalStudy[];
  labs: LabResult[];
  orders: MedicalOrder[];
  evolutions: PatientEvolution[];
  users?: User[];
  auditLogs?: AuditLogEntry[];
  clinicalHistoriesPlanta?: any[];
  strokeRegistry?: StrokeRecord[];
  lastUpdated: number;
  deviceOrigin?: string;
}

export interface SyncConfiguration {
  enableLocalServerSync: boolean;
  enableCloudSync: boolean;
  cloudProvider: 'firebase' | 'cloudVault' | 'disabled';
  firebaseUrl: string;
  cloudVaultKey: string;
  autoSyncDebounceSeconds: number;
  lastSyncedTime: string;
  syncState: 'idle' | 'syncing' | 'synced' | 'error';
  errorMessage?: string;
}

const SYNC_STORAGE_KEY = 'hr_colon_sync_settings_v2';
const DEFAULT_VAULT_KEY = 'dr-colon-emergencia-gaton';
export const MASTER_GAS_URL = DEFAULT_GAS_URL;

class CloudSyncService {
  private config: SyncConfiguration;
  private syncTimeout: any = null;
  private pollInterval: any = null;
  private isProcessingSync = false;
  private lastLocalTimestamp = 0;
  private pendingGasPush = false;
  private listeners: Array<() => void> = [];

  constructor() {
    this.config = this.loadConfig();
    try {
      const storedTime = localStorage.getItem('hr_colon_last_local_timestamp');
      if (storedTime) {
        this.lastLocalTimestamp = parseInt(storedTime, 10) || 0;
      }
    } catch {}
    this.initNetworkListeners();
    this.startBackgroundSync();
  }

  private loadConfig(): SyncConfiguration {
    try {
      const saved = localStorage.getItem(SYNC_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          enableLocalServerSync: true,
          cloudProvider: parsed.cloudProvider && parsed.cloudProvider !== 'disabled' ? parsed.cloudProvider : 'cloudVault',
          firebaseUrl: parsed.firebaseUrl || '',
          cloudVaultKey: parsed.cloudVaultKey || DEFAULT_VAULT_KEY,
          autoSyncDebounceSeconds: 0.5,
          lastSyncedTime: parsed.lastSyncedTime || '',
          syncState: 'idle',
          ...parsed,
          enableCloudSync: true,
        };
      }
    } catch {
      // Usar defaults si hay error
    }

    return {
      enableLocalServerSync: true,
      enableCloudSync: true,
      cloudProvider: 'cloudVault',
      firebaseUrl: '',
      cloudVaultKey: DEFAULT_VAULT_KEY,
      autoSyncDebounceSeconds: 0.5,
      lastSyncedTime: '',
      syncState: 'idle',
    };
  }

  public saveConfig(updates: Partial<SyncConfiguration>) {
    this.config = { ...this.config, ...updates };
    localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(this.config));
    this.notifyListeners();
  }

  public getConfig(): SyncConfiguration {
    return { ...this.config };
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notifyListeners() {
    for (const cb of this.listeners) {
      try {
        cb();
      } catch (err) {
        console.error('Error en listener de sincronización:', err);
      }
    }
  }

  private initNetworkListeners() {
    if (typeof window === 'undefined') return;
    const wake = () => {
      if (document.visibilityState === 'visible') this.pullLatestData();
    };
    window.addEventListener('visibilitychange', wake);
    window.addEventListener('focus', wake);
    window.addEventListener('online', () => this.scheduleAutoSync());
    // Cualquier cambio local programa también el respaldo en la nube de Google
    syncEngine.onLocalChange(() => this.scheduleAutoSync());
  }

  public getGasUrl(): string {
    const driveCfg = googleDriveService.getConfig();
    return (driveCfg.gasUrl && driveCfg.gasUrl.trim()) || MASTER_GAS_URL;
  }

  private startBackgroundSync() {
    if (typeof window === 'undefined') return;
    if (this.pollInterval) clearInterval(this.pollInterval);
    // Nube de Google: canal secundario (funciona aunque el servidor central esté apagado)
    this.pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && !this.isProcessingSync) {
        this.pullLatestData();
      }
    }, 20000);
  }

  /**
   * Obtiene todos los datos clínicos actuales de IndexedDB (Dexie)
   */
  public async getLocalMasterData(): Promise<HospitalMasterData> {
    const snap = await syncEngine.snapshot({ includeAudit: true });
    const t = snap.tables as any;
    return {
      ...t,
      patients: t.patients || [],
      studies: t.studies || [],
      labs: t.labs || [],
      orders: t.orders || [],
      evolutions: t.evolutions || [],
      tombstones: snap.tombstones,
      lastUpdated: Date.now(),
      deviceOrigin: navigator.userAgent.includes('Mobile') ? 'Móvil' : 'Escritorio PC',
    } as any;
  }

  /**
   * Programa la sincronización (servidor central inmediato + nube de Google con espera)
   */
  public scheduleAutoSync() {
    this.lastLocalTimestamp = Date.now();
    syncEngine.schedulePush();
    if (this.syncTimeout) clearTimeout(this.syncTimeout);
    this.syncTimeout = setTimeout(() => {
      this.triggerPushSync();
    }, 4000);
  }

  private async fetchGasSnapshot(): Promise<any | null> {
    const gasUrl = this.getGasUrl();
    if (!gasUrl) return null;
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(`${gasUrl}?t=${Date.now()}`, { signal: controller.signal, cache: 'no-store' });
      if (!res.ok) return null;
      const json = await res.json().catch(() => null);
      if (!json) return null;
      return json.data || json;
    } finally {
      clearTimeout(to);
    }
  }

  private async fetchFirebaseSnapshot(): Promise<any | null> {
    if (!(this.config.enableCloudSync && this.config.cloudProvider === 'firebase' && this.config.firebaseUrl)) return null;
    let url = this.config.firebaseUrl.trim();
    if (!url.endsWith('.json')) url = url.replace(/\/+$/, '') + '/hospital_master.json';
    const res = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    return json ? json.data || json : null;
  }

  /** Convierte una instantánea (formato antiguo o nuevo) a cambios fusionables. */
  private toRemoteChanges(master: any) {
    const tables: Record<string, any[]> = {};
    for (const name of SYNC_TABLES) {
      if (Array.isArray(master?.[name])) tables[name] = master[name];
    }
    return { tables, tombstones: Array.isArray(master?.tombstones) ? master.tombstones : [] };
  }

  /**
   * Envía los datos a la nube de Google: primero DESCARGA y FUSIONA lo que otros
   * dispositivos subieron, luego sube la unión. Así nunca se pierden registros.
   */
  public async triggerPushSync(): Promise<{ success: boolean; message: string }> {
    // El servidor central siempre primero (rápido y con tiempo real)
    const centralOk = await syncEngine.syncNow().catch(() => false);

    if (this.isProcessingSync) {
      this.pendingGasPush = true;
      return { success: centralOk, message: 'Sincronización en curso' };
    }
    this.isProcessingSync = true;
    this.config.syncState = 'syncing';
    this.notifyListeners();

    const synced: string[] = [];
    if (centralOk) synced.push('Servidor central');

    try {
      // 1. Descargar y fusionar la copia de la nube (no destructivo)
      for (const fetcher of [() => this.fetchGasSnapshot(), () => this.fetchFirebaseSnapshot()]) {
        try {
          const remote = await fetcher();
          if (remote) {
            const changed = await syncEngine.applyRemote(this.toRemoteChanges(remote));
            if (changed > 0) this.emitChanged(changed);
          }
        } catch (e) {
          console.warn('[Sync] Nube: no se pudo descargar antes de subir', e);
        }
      }

      // 2. Subir la unión (sin imágenes pesadas: el límite de Google es ~500 KB)
      const snap = await syncEngine.snapshot({ maxFieldBytes: 60000 });
      const data: any = {
        ...snap.tables,
        tombstones: snap.tombstones,
        lastUpdated: Date.now(),
        deviceOrigin: navigator.userAgent.includes('Mobile') ? 'Móvil' : 'Escritorio PC',
        syncProtocol: 2
      };
      this.lastLocalTimestamp = data.lastUpdated;

      const gasUrl = this.getGasUrl();
      if (gasUrl) {
        try {
          const res = await fetch(gasUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'sync_push', payload: { version: 2, lastUpdated: data.lastUpdated, data } })
          });
          if (res.ok) {
            const resJson = await res.json().catch(() => null);
            if (!resJson || resJson.success !== false) synced.push('Google Drive Cloud');
          }
        } catch (e) {
          console.warn('[Sync] Error con Google Drive Cloud push:', e);
        }
      }

      if (this.config.enableCloudSync && this.config.cloudProvider === 'firebase' && this.config.firebaseUrl) {
        try {
          let url = this.config.firebaseUrl.trim();
          if (!url.endsWith('.json')) url = url.replace(/\/+$/, '') + '/hospital_master.json';
          const res = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ version: 2, lastUpdated: data.lastUpdated, data })
          });
          if (res.ok) synced.push('Google Firebase Realtime');
        } catch (e) {
          console.warn('[Sync] Error Firebase push:', e);
        }
      }

      try {
        localStorage.setItem('hr_colon_last_local_timestamp', String(data.lastUpdated));
      } catch {}

      const nowTime = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const ok = synced.length > 0;
      this.saveConfig({ syncState: ok ? 'synced' : 'error', lastSyncedTime: ok ? nowTime : this.config.lastSyncedTime, errorMessage: ok ? undefined : 'Sin conexión: los cambios quedan guardados en este dispositivo y se enviarán solos.' });
      return {
        success: true,
        message: ok ? `Guardado en: ${synced.join(', ')} (${nowTime})` : 'Guardado en este dispositivo. Se enviará al recuperar la conexión.'
      };
    } catch (err: any) {
      this.saveConfig({ syncState: 'error', errorMessage: err?.message || 'Error durante la sincronización' });
      return { success: false, message: this.config.errorMessage || 'Error de sincronización' };
    } finally {
      this.isProcessingSync = false;
      this.notifyListeners();
      if (this.pendingGasPush) {
        this.pendingGasPush = false;
        this.scheduleAutoSync();
      }
    }
  }

  /**
   * Trae cambios de otros dispositivos (servidor central + nube de Google)
   * y los FUSIONA registro por registro. Nunca borra datos locales más nuevos.
   */
  public async pullLatestData(): Promise<boolean> {
    if (this.isProcessingSync) return false;
    this.isProcessingSync = true;
    let changedTotal = 0;
    let needsPush = false;
    try {
      await syncEngine.syncNow().catch(() => false);

      for (const fetcher of [() => this.fetchGasSnapshot(), () => this.fetchFirebaseSnapshot()]) {
        try {
          const remote = await fetcher();
          if (!remote) continue;
          const changes = this.toRemoteChanges(remote);
          changedTotal += await syncEngine.applyRemote(changes);
          // Si este dispositivo tiene registros que la nube no tiene (o más nuevos), resubir
          needsPush = needsPush || (await this.localHasNewer(changes));
        } catch (e) {
          console.warn('[Sync] Nube: descarga fallida', e);
        }
      }

      if (changedTotal > 0) {
        const nowTime = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        this.saveConfig({ lastSyncedTime: nowTime, syncState: 'synced' });
        this.emitChanged(changedTotal);
      }
    } finally {
      this.isProcessingSync = false;
    }
    if (needsPush) this.scheduleAutoSync();
    return changedTotal > 0;
  }

  private async localHasNewer(changes: { tables: Record<string, any[]> }): Promise<boolean> {
    for (const name of ['patients', 'orders', 'evolutions', 'labs', 'pendingTasks', 'studies'] as const) {
      const remoteRows = changes.tables[name];
      if (!remoteRows) continue;
      const remoteMap = new Map(remoteRows.map((r: any) => [r.id, recordClock(r)]));
      const localRows: any[] = await (db as any)[name].toArray();
      for (const l of localRows) {
        const rc = remoteMap.get(l.id);
        if (rc === undefined || recordClock(l) > rc) return true;
      }
    }
    return false;
  }

  private emitChanged(changed: number) {
    this.notifyListeners();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hospital_central_data_changed', { detail: { type: 'cloud_sync', changed, timestamp: Date.now() } }));
    }
  }

  /**
   * Compatibilidad: hidrata la base local desde una instantánea (fusión no destructiva)
   */
  public async hydrateDexie(data: HospitalMasterData): Promise<void> {
    await syncEngine.applyRemote(this.toRemoteChanges(data));
  }

  /**
   * Exporta todo el contenido a un archivo de respaldo .json descargable en la PC o Teléfono
   */
  public async exportMasterBackup(): Promise<void> {
    const data = await this.getLocalMasterData();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Respaldo_Emergencia_Dr_Colon_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Importa un archivo .json y restaura completamente el sistema
   */
  public async importMasterBackup(file: File): Promise<{ success: boolean; count: number }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const parsed: HospitalMasterData = JSON.parse(content);
          if (!parsed.patients || !Array.isArray(parsed.patients)) {
            throw new Error('El archivo no contiene un formato de pacientes válido.');
          }

          parsed.lastUpdated = Date.now();
          // Fusión no destructiva (gana el registro más reciente) y luego se propaga
          await this.hydrateDexie(parsed);
          syncEngine.requestFullResend();
          this.lastLocalTimestamp = parsed.lastUpdated;

          // Propagar inmediatamente al servidor local y a la nube
          await this.triggerPushSync();

          resolve({ success: true, count: parsed.patients.length });
        } catch (err: any) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo.'));
      reader.readAsText(file);
    });
  }
}

export const cloudSyncService = new CloudSyncService();
// Compatibilidad con código anterior
export const cloudSyncManager = cloudSyncService;
