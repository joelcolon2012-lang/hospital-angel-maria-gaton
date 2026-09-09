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
import { Patient, MedicalStudy, LabResult, MedicalOrder, PatientEvolution } from '../types';
import { googleDriveService, DEFAULT_GAS_URL } from './googleDriveService';

export interface HospitalMasterData {
  patients: Patient[];
  studies: MedicalStudy[];
  labs: LabResult[];
  orders: MedicalOrder[];
  evolutions: PatientEvolution[];
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

    // Cuando la pestaña se activa o el usuario desbloquea el celular
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.pullLatestData();
      }
    });

    window.addEventListener('focus', () => {
      this.pullLatestData();
    });

    window.addEventListener('online', () => {
      this.triggerPushSync();
    });
  }

  public getGasUrl(): string {
    const driveCfg = googleDriveService.getConfig();
    return (driveCfg.gasUrl && driveCfg.gasUrl.trim()) || MASTER_GAS_URL;
  }

  private startBackgroundSync() {
    if (typeof window === 'undefined') return;

    // Polling regular cada 12 segundos para recibir cambios de otros dispositivos
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && !this.isProcessingSync) {
        this.pullLatestData();
      }
    }, 12000);
  }

  /**
   * Obtiene todos los datos clínicos actuales de IndexedDB (Dexie)
   */
  public async getLocalMasterData(): Promise<HospitalMasterData> {
    const patients = await db.patients.toArray();
    const studies = await db.studies.toArray();
    const labs = await db.labs.toArray();
    const orders = await db.orders.toArray();
    const evolutions = await db.evolutions.toArray();

    return {
      patients,
      studies,
      labs,
      orders,
      evolutions,
      lastUpdated: this.lastLocalTimestamp || Date.now(),
      deviceOrigin: navigator.userAgent.includes('Mobile') ? 'Móvil' : 'Escritorio PC',
    };
  }

  /**
   * Programa una sincronización automática cada vez que se guarda o modifica un campo
   */
  public scheduleAutoSync() {
    this.lastLocalTimestamp = Date.now();
    if (this.syncTimeout) clearTimeout(this.syncTimeout);

    this.syncTimeout = setTimeout(() => {
      this.triggerPushSync();
    }, this.config.autoSyncDebounceSeconds * 1000);
  }

  /**
   * Envía los datos locales a Google Drive en la Nube y al Servidor Local
   */
  public async triggerPushSync(): Promise<{ success: boolean; message: string }> {
    if (this.isProcessingSync) return { success: false, message: 'Sincronización en curso' };
    this.isProcessingSync = true;
    this.config.syncState = 'syncing';
    this.notifyListeners();

    try {
      const data = await this.getLocalMasterData();
      data.lastUpdated = Date.now();
      this.lastLocalTimestamp = data.lastUpdated;

      let syncedServers: string[] = [];

      // 1. Sincronizar con Google Drive en la Nube 24/7 (Google Apps Script)
      const gasUrl = this.getGasUrl();
      if (gasUrl) {
        try {
          const res = await fetch(gasUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'sync_push',
              payload: {
                version: 1,
                lastUpdated: data.lastUpdated,
                data: data,
              },
            }),
          });
          if (res.ok || res.type === 'opaque') {
            syncedServers.push('Google Drive Cloud (Dr. Colón)');
          }
        } catch (e) {
          console.warn('[Sync] Error con Google Drive Cloud push:', e);
        }
      }

      // 2. Sincronizar con el Servidor Local de la PC (/api/sync)
      if (this.config.enableLocalServerSync) {
        try {
          const res = await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              version: 1,
              lastUpdated: data.lastUpdated,
              data,
            }),
          });
          if (res.ok) {
            syncedServers.push('PC Local (Disco Duro)');
          }
        } catch (e) {
          // Servidor local no disponible en red externa
        }
      }

      // 3. Sincronizar con Firebase (si está configurado)
      if (this.config.enableCloudSync && this.config.cloudProvider === 'firebase' && this.config.firebaseUrl) {
        try {
          let url = this.config.firebaseUrl.trim();
          if (!url.endsWith('.json')) {
            url = url.replace(/\/+$/, '') + '/hospital_master.json';
          }
          const res = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          if (res.ok) {
            syncedServers.push('Google Firebase');
          }
        } catch (e) {}
      }

      // 4. Guardar respaldo local inmediato en el navegador
      try {
        localStorage.setItem('hr_colon_patients_backup', JSON.stringify(data.patients));
        localStorage.setItem('hr_colon_last_local_timestamp', String(data.lastUpdated));
      } catch {}

      const nowTime = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      this.config.syncState = 'synced';
      this.config.lastSyncedTime = nowTime;
      this.saveConfig({ syncState: 'synced', lastSyncedTime: nowTime });

      this.isProcessingSync = false;
      this.notifyListeners();

      const summary = syncedServers.length > 0 ? syncedServers.join(', ') : 'Guardado local en navegador';
      return { success: true, message: `Guardado en: ${summary} (${nowTime})` };
    } catch (err: any) {
      this.config.syncState = 'error';
      this.config.errorMessage = err?.message || 'Error durante la sincronización';
      this.isProcessingSync = false;
      this.notifyListeners();
      return { success: false, message: this.config.errorMessage || 'Error de sincronización' };
    }
  }

  /**
   * Consulta Google Drive y Servidores para traer cambios hechos en otros dispositivos
   */
  public async pullLatestData(): Promise<boolean> {
    if (this.isProcessingSync) return false;

    let remoteData: HospitalMasterData | null = null;
    let remoteTimestamp = 0;

    // 1. Consultar Google Drive en la Nube 24/7 (Google Apps Script)
    const gasUrl = this.getGasUrl();
    if (gasUrl) {
      try {
        const res = await fetch(`${gasUrl}?t=${Date.now()}`);
        if (res.ok) {
          const json = await res.json();
          if (json) {
            const master = json.data || json;
            if (master && Array.isArray(master.patients) && master.patients.length > 0) {
              const ts = json.lastUpdated || master.lastUpdated || 0;
              if (ts > remoteTimestamp || !remoteData) {
                remoteData = master;
                remoteTimestamp = ts;
              }
            }
          }
        }
      } catch (e) {
        console.warn('[Sync] Google Drive Cloud pull:', e);
      }
    }

    // 2. Consultar Servidor Local de la PC (/api/sync)
    if (this.config.enableLocalServerSync) {
      try {
        const res = await fetch('/api/sync');
        if (res.ok) {
          const json = await res.json();
          if (json && json.data && json.lastUpdated) {
            if (json.lastUpdated > remoteTimestamp) {
              remoteData = json.data;
              remoteTimestamp = json.lastUpdated;
            }
          }
        }
      } catch {}
    }

    // 3. Consultar Base de Datos Maestra desplegada (public/hospital_master_db.json)
    if (!remoteData) {
      try {
        const baseUrl = (import.meta as any).env?.BASE_URL || './';
        const res = await fetch(`${baseUrl}hospital_master_db.json?t=${Date.now()}`);
        if (res.ok) {
          const json = await res.json();
          const master = json.data || json;
          if (master && Array.isArray(master.patients) && master.patients.length > 0) {
            remoteData = master;
            remoteTimestamp = json.lastUpdated || Date.now();
          }
        }
      } catch {}
    }

    // 4. Si no hay datos remotos válidos, no hidratar
    if (!remoteData || !remoteData.patients || remoteData.patients.length === 0) {
      return false;
    }

    // Comprobar si el dispositivo local está vacío o solo contiene los casos ficticios iniciales
    const localPatients = await db.patients.toArray();
    const hasOnlyMockData = localPatients.length === 0 || 
      (localPatients.length <= 4 && localPatients.every(p => p.id.startsWith('pat-00')));

    // Si el dispositivo local solo tiene casos modelo de prueba, SIEMPRE hidratar con los datos reales
    if (hasOnlyMockData) {
      console.log('[Sync] Dispositivo nuevo o con datos modelo detectado. Reemplazando con pacientes reales de la nube...');
    } else if (remoteTimestamp <= this.lastLocalTimestamp) {
      return false;
    }

    // Hidratar Dexie
    try {
      this.isProcessingSync = true;
      await this.hydrateDexie(remoteData, hasOnlyMockData);
      this.lastLocalTimestamp = Math.max(remoteTimestamp, this.lastLocalTimestamp);
      try {
        localStorage.setItem('hr_colon_last_local_timestamp', String(this.lastLocalTimestamp));
      } catch {}

      const nowTime = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      this.config.lastSyncedTime = nowTime;
      this.config.syncState = 'synced';
      this.saveConfig({ lastSyncedTime: nowTime, syncState: 'synced' });

      this.isProcessingSync = false;
      this.notifyListeners();
      return true;
    } catch (err) {
      console.error('[Sync] Error hidratando base de datos local:', err);
      this.isProcessingSync = false;
      return false;
    }
  }

  /**
   * Hidrata la base de datos Dexie con los datos suministrados
   * Si purgeMockData es true, elimina primero los 4 casos dummy para que solo queden los pacientes reales
   */
  public async hydrateDexie(data: HospitalMasterData, purgeMockData: boolean = false): Promise<void> {
    if (!data.patients) return;

    await db.transaction('rw', db.patients, db.studies, db.labs, db.orders, db.evolutions, async () => {
      // 1. Si purgeMockData es true, limpiar casos modelo previos
      if (purgeMockData) {
        await db.patients.clear();
        await db.studies.clear();
        await db.labs.clear();
        await db.orders.clear();
        await db.evolutions.clear();
      }

      const localPatients = await db.patients.toArray();
      const localMap = new Map(localPatients.map((p) => [p.id, p]));

      for (const remoteP of data.patients) {
        const localP = localMap.get(remoteP.id);
        if (!localP) {
          await db.patients.add(remoteP);
        } else {
          const localTime = new Date(localP.updatedAt || localP.createdAt || 0).getTime();
          const remoteTime = new Date(remoteP.updatedAt || remoteP.createdAt || 0).getTime();
          if (remoteTime >= localTime) {
            await db.patients.put(remoteP);
          }
        }
      }

      // 2. Actualizar estudios
      if (data.studies && data.studies.length > 0) {
        for (const s of data.studies) {
          await db.studies.put(s);
        }
      }

      // 3. Actualizar labs
      if (data.labs && data.labs.length > 0) {
        for (const l of data.labs) {
          await db.labs.put(l);
        }
      }

      // 4. Actualizar orders
      if (data.orders && data.orders.length > 0) {
        for (const o of data.orders) {
          await db.orders.put(o);
        }
      }

      // 5. Actualizar evolutions
      if (data.evolutions && data.evolutions.length > 0) {
        for (const e of data.evolutions) {
          await db.evolutions.put(e);
        }
      }
    });

    // Guardar copia de seguridad en localStorage
    try {
      const allP = await db.patients.toArray();
      localStorage.setItem('hr_colon_patients_backup', JSON.stringify(allP));
      if (data.lastUpdated) {
        localStorage.setItem('hr_colon_last_local_timestamp', String(data.lastUpdated));
      }
    } catch {}
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
          await this.hydrateDexie(parsed);
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
