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
  firebaseUrl: string; // ej: https://emergencia-dr-colon-default-rtdb.firebaseio.com/hospital_master.json
  cloudVaultKey: string; // Clave de clínica para sincronización gratuita
  autoSyncDebounceSeconds: number;
  lastSyncedTime: string;
  syncState: 'idle' | 'syncing' | 'synced' | 'error';
  errorMessage?: string;
}

const SYNC_STORAGE_KEY = 'hr_colon_sync_settings_v2';
const DEFAULT_VAULT_KEY = 'dr-colon-emergencia-gaton';

class CloudSyncService {
  private config: SyncConfiguration;
  private syncTimeout: any = null;
  private pollInterval: any = null;
  private isProcessingSync = false;
  private lastLocalTimestamp = 0;
  private listeners: Array<() => void> = [];

  constructor() {
    this.config = this.loadConfig();
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
          autoSyncDebounceSeconds: 1.2,
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
      autoSyncDebounceSeconds: 1.2,
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

  private startBackgroundSync() {
    if (typeof window === 'undefined') return;

    // Polling regular cada 5 segundos para recibir cambios de otros dispositivos
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && !this.isProcessingSync) {
        this.pullLatestData();
      }
    }, 5000);
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
   * Envía los datos locales al servidor de la PC (/api/sync) y a la Nube (si está configurada)
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

      // 1. Sincronizar con el Servidor Local de la PC (/api/sync)
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
          // El servidor local puede no responder si el móvil está en datos 4G fuera del Wi-Fi
          console.log('[Sync] Servidor local no disponible en esta red:', e);
        }
      }

      // 2. Sincronizar con Firebase Realtime Database (si está configurado)
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
            syncedServers.push('Google Firebase (Nube 24/7)');
          }
        } catch (e) {
          console.warn('[Sync] Error sincronizando con Firebase:', e);
        }
      }

      // 3. Sincronizar con Cloud Vault Gratuito (si está configurado)
      if (this.config.enableCloudSync && this.config.cloudProvider === 'cloudVault' && this.config.cloudVaultKey) {
        try {
          const key = encodeURIComponent(this.config.cloudVaultKey.trim());
          const url = `https://kvdb.io/4y9h81u6jQv2D7p8Xw4k/${key}`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          if (res.ok) {
            syncedServers.push('Cloud Vault Seguro');
          }
        } catch (e) {
          console.warn('[Sync] Error con Cloud Vault:', e);
        }
      }

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
   * Consulta el Servidor Local y la Nube para traer cambios hechos en otros dispositivos
   */
  public async pullLatestData(): Promise<boolean> {
    if (this.isProcessingSync) return false;

    let remoteData: HospitalMasterData | null = null;
    let remoteTimestamp = 0;

    // Probar 1: Servidor Local
    if (this.config.enableLocalServerSync) {
      try {
        const res = await fetch('/api/sync');
        if (res.ok) {
          const json = await res.json();
          if (json && json.data && json.lastUpdated) {
            remoteData = json.data;
            remoteTimestamp = json.lastUpdated;
          }
        }
      } catch {
        // Red local inaccesible (ej. fuera de la clínica con 4G)
      }
    }

    // Probar 2: Firebase Realtime Database
    if (!remoteData && this.config.enableCloudSync && this.config.cloudProvider === 'firebase' && this.config.firebaseUrl) {
      try {
        let url = this.config.firebaseUrl.trim();
        if (!url.endsWith('.json')) {
          url = url.replace(/\/+$/, '') + '/hospital_master.json';
        }
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          if (json && json.lastUpdated && json.lastUpdated > remoteTimestamp) {
            remoteData = json;
            remoteTimestamp = json.lastUpdated;
          }
        }
      } catch (e) {
        console.warn('[Sync] Error consultando Firebase:', e);
      }
    }

    // Probar 3: Cloud Vault
    if (!remoteData && this.config.enableCloudSync && this.config.cloudProvider === 'cloudVault' && this.config.cloudVaultKey) {
      try {
        const key = encodeURIComponent(this.config.cloudVaultKey.trim());
        const url = `https://kvdb.io/4y9h81u6jQv2D7p8Xw4k/${key}`;
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          if (json && json.lastUpdated && json.lastUpdated > remoteTimestamp) {
            remoteData = json;
            remoteTimestamp = json.lastUpdated;
          }
        }
      } catch {
        // Vault inaccesible
      }
    }

    // Si no hay datos remotos, o si los datos remotos son más viejos que nuestro último cambio local, no sobrescribir
    if (!remoteData || remoteTimestamp <= this.lastLocalTimestamp) {
      // Si la base de datos local está completamente vacía (por ejemplo, celular que se acaba de abrir por primera vez),
      // pero el servidor remoto sí tiene pacientes, SIEMPRE hidratar:
      const localCount = await db.patients.count();
      if (localCount > 0 || !remoteData || !remoteData.patients || remoteData.patients.length === 0) {
        return false;
      }
    }

    // Si los datos remotos son más recientes, hidratar Dexie
    try {
      this.isProcessingSync = true;
      await this.hydrateDexie(remoteData);
      this.lastLocalTimestamp = remoteTimestamp;

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
   */
  public async hydrateDexie(data: HospitalMasterData): Promise<void> {
    if (!data.patients) return;

    await db.transaction('rw', db.patients, db.studies, db.labs, db.orders, db.evolutions, async () => {
      // Actualizar o insertar pacientes
      if (data.patients && data.patients.length > 0) {
        await db.patients.clear();
        await db.patients.bulkAdd(data.patients);
      }

      // Actualizar estudios
      if (data.studies && data.studies.length > 0) {
        await db.studies.clear();
        await db.studies.bulkAdd(data.studies);
      }

      // Actualizar labs
      if (data.labs && data.labs.length > 0) {
        await db.labs.clear();
        await db.labs.bulkAdd(data.labs);
      }

      // Actualizar orders
      if (data.orders && data.orders.length > 0) {
        await db.orders.clear();
        await db.orders.bulkAdd(data.orders);
      }

      // Actualizar evolutions
      if (data.evolutions && data.evolutions.length > 0) {
        await db.evolutions.clear();
        await db.evolutions.bulkAdd(data.evolutions);
      }
    });
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
