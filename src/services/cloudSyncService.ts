/** Compatibilidad para las pantallas y respaldos manuales.
 * Toda sincronización automática utiliza el motor central autenticado.
 */
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
import { syncEngine, SYNC_TABLES } from './syncEngine';

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
  lastSyncedTime: string;
  syncState: 'idle' | 'syncing' | 'synced' | 'error';
  errorMessage?: string;
}

class CloudSyncService {
  public getConfig(): SyncConfiguration {
    const s = syncEngine.getStatus();
    return { lastSyncedTime: s.lastSyncedAt, syncState: s.state === 'connected' && !s.pendingChanges ? 'synced' : s.state === 'syncing' ? 'syncing' : 'error', errorMessage: s.errorMessage };
  }

  public subscribe(callback: () => void): () => void {
    return syncEngine.subscribe(callback);
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
   * Programa el envío al servidor central
   */
  public scheduleAutoSync() {
    syncEngine.schedulePush();
  }

  /** Convierte una instantánea (formato antiguo o nuevo) a cambios fusionables. */
  private toRemoteChanges(master: any) {
    const tables: Record<string, any[]> = {};
    for (const name of SYNC_TABLES) {
      if (Array.isArray(master?.[name])) tables[name] = master[name];
    }
    return { tables, tombstones: Array.isArray(master?.tombstones) ? master.tombstones : [] };
  }

  /** Envía y descarga cambios usando una única fuente de confirmación. */
  public async triggerPushSync(): Promise<{ success: boolean; message: string }> {
    const success = await syncEngine.syncNow();
    const status = syncEngine.getStatus();
    return {
      success,
      message: success ? 'Cambios confirmados en el servidor central.' :
        status.errorMessage || 'Guardado localmente. El envío se reintentará automáticamente.'
    };
  }

  public async pullLatestData(): Promise<boolean> {
    return syncEngine.syncNow();
  }

  /**
   * Compatibilidad: hidrata la base local desde una instantánea (fusión no destructiva)
   */
  public async hydrateDexie(input: HospitalMasterData): Promise<void> {
    const data = (input as any).data || input;
    if (!Array.isArray(data.patients)) throw new Error('El respaldo no contiene una lista de pacientes válida.');
    for (const table of SYNC_TABLES) {
      if (data[table] !== undefined && (!Array.isArray(data[table]) || data[table].some((row: any) => !row || typeof row.id !== 'string'))) {
        throw new Error(`Registros inválidos en ${table}`);
      }
    }
    await syncEngine.applyRemote(this.toRemoteChanges(data));
    syncEngine.requestFullResend();
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

          // Propagar al servidor central
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
