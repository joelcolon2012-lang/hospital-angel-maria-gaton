import React, { useState, useEffect, useRef } from 'react';
import {
  Cloud,
  Smartphone,
  ShieldCheck,
  HardDrive,
  CheckCircle2,
  X,
  RefreshCw,
  Download,
  Upload,
  Wifi,
  Globe,
  Database,
  Check,
  AlertCircle
} from 'lucide-react';
import { cloudSyncService, SyncConfiguration } from '../../services/cloudSyncService';
import { googleDriveService } from '../../services/googleDriveService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenGoogleDrive: () => void;
  onDataRestored?: () => void;
}

export const CloudSyncModal: React.FC<Props> = ({ isOpen, onClose, onOpenGoogleDrive, onDataRestored }) => {
  const [config, setConfig] = useState<SyncConfiguration>(cloudSyncService.getConfig());
  const [isSyncing, setIsSyncing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDriveConnected = googleDriveService.isConnected();

  useEffect(() => {
    if (!isOpen) return;
    setConfig(cloudSyncService.getConfig());
    const unsub = cloudSyncService.subscribe(() => {
      setConfig(cloudSyncService.getConfig());
    });
    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleManualSync = async () => {
    setIsSyncing(true);
    setFeedbackMsg(null);
    try {
      const res = await cloudSyncService.triggerPushSync();
      await cloudSyncService.pullLatestData();
      if (res.success) {
        setFeedbackMsg({ type: 'success', text: res.message });
      } else {
        setFeedbackMsg({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err?.message || 'Error al sincronizar' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      await cloudSyncService.exportMasterBackup();
      setFeedbackMsg({ type: 'success', text: 'Respaldo maestro .JSON descargado con éxito en tu PC/móvil.' });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: 'Error al exportar respaldo: ' + err?.message });
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm(`¿Confirmas restaurar la base de datos desde "${file.name}"? Los datos actuales se actualizarán con este archivo.`)) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setIsSyncing(true);
      const res = await cloudSyncService.importMasterBackup(file);
      setFeedbackMsg({ type: 'success', text: `¡Base de datos restaurada con éxito! Se cargaron ${res.count} pacientes.` });
      if (onDataRestored) onDataRestored();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: 'Error al importar respaldo: ' + err?.message });
    } finally {
      setIsSyncing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveConfig = (updates: Partial<SyncConfiguration>) => {
    cloudSyncService.saveConfig(updates);
    setConfig(cloudSyncService.getConfig());
    setFeedbackMsg({ type: 'success', text: 'Configuración guardada.' });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#0F4C5C] text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Cloud className="w-5 h-5 text-teal-300" />
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">
                Sincronización en Tiempo Real & Nube
              </h3>
              <p className="text-xs text-teal-100/80">Acceso garantizado en PC, Celular y Cualquier Red</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-teal-100 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-700">
          {/* Feedback message banner */}
          {feedbackMsg && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                feedbackMsg.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-red-50 border-red-300 text-red-900'
              }`}
            >
              {feedbackMsg.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span className="text-xs font-semibold">{feedbackMsg.text}</span>
            </div>
          )}

          {/* Status Bar */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-slate-900 flex items-center gap-2">
                  <span>Estado de Sincronización:</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                      config.syncState === 'synced'
                        ? 'bg-emerald-100 text-emerald-800'
                        : config.syncState === 'syncing'
                        ? 'bg-amber-100 text-amber-800 animate-pulse'
                        : config.syncState === 'error'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {config.syncState === 'synced' && '● Al Día'}
                    {config.syncState === 'syncing' && '● Sincronizando...'}
                    {config.syncState === 'error' && '● Requiere Conexión'}
                    {config.syncState === 'idle' && '● En Espera'}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Última sincronización: <strong>{config.lastSyncedTime || 'Recién iniciado'}</strong>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0F4C5C] hover:bg-petrol-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Ahora'}</span>
            </button>
          </div>

          {/* SECTION 1: Red Wi-Fi del Hospital (PC & Celular en la misma red) */}
          <div className="p-4 bg-teal-50/60 border border-teal-200 rounded-xl space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-teal-950">
              <Wifi className="w-4 h-4 text-teal-700" />
              <span>1. Red Local del Hospital (Wi-Fi — Sin Internet Requerido)</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              Mientras estés conectado al Wi-Fi del hospital o la misma red, tu teléfono se comunica directamente con el disco duro de esta computadora:
            </p>
            <div className="p-2.5 bg-white border border-teal-300 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-teal-700 block">Enlace directo para tu celular:</span>
                <span className="font-mono text-sm font-bold text-teal-950 select-all">http://172.17.36.154:3000</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText('http://172.17.36.154:3000');
                  setFeedbackMsg({ type: 'success', text: 'Enlace http://172.17.36.154:3000 copiado al portapapeles.' });
                }}
                className="px-2.5 py-1 text-xs font-semibold bg-teal-100 text-teal-800 hover:bg-teal-200 rounded-lg transition-colors"
              >
                Copiar
              </button>
            </div>
            <div className="text-[11px] text-teal-900 bg-teal-100/50 p-2 rounded-lg border border-teal-200/60">
              💾 <strong>Persistencia en Disco Duro:</strong> Los datos se escriben automáticamente en el archivo <code>database/hospital_master_db.json</code> de la PC. Aunque cierres el navegador, nada se borra.
            </div>
          </div>

          {/* SECTION 2: Sincronización en la Nube 24/7 (En Cualquier Red / Datos 4G) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Globe className="w-4 h-4 text-blue-600" />
                <span>2. Nube 24/7 en Cualquier Red (4G / Celular fuera del hospital)</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enableCloudSync}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    handleSaveConfig({
                      enableCloudSync: enabled,
                      cloudProvider: enabled ? (config.cloudProvider === 'disabled' ? 'cloudVault' : config.cloudProvider) : 'disabled',
                    });
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Permite ingresar pacientes desde tu celular con datos móviles 4G cuando estés fuera del hospital o en cualquier red externa.
            </p>

            {config.enableCloudSync && (
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveConfig({ cloudProvider: 'cloudVault' })}
                    className={`p-2.5 rounded-xl border text-left font-medium text-xs transition-all ${
                      config.cloudProvider === 'cloudVault'
                        ? 'border-blue-500 bg-blue-50/60 text-blue-900 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <Cloud className="w-3.5 h-3.5 text-blue-600" />
                      <span>Bóveda Nube Gratuita</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">Listo para usar sin crear cuentas.</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveConfig({ cloudProvider: 'firebase' })}
                    className={`p-2.5 rounded-xl border text-left font-medium text-xs transition-all ${
                      config.cloudProvider === 'firebase'
                        ? 'border-blue-500 bg-blue-50/60 text-blue-900 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-amber-600" />
                      <span>Google Firebase</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">100% gratuito permanente (Spark).</div>
                  </button>
                </div>

                {config.cloudProvider === 'cloudVault' && (
                  <div className="p-3 bg-white border border-blue-200 rounded-xl space-y-2">
                    <label className="block text-xs font-bold text-slate-800">
                      Código / Clave de Bóveda Médica:
                    </label>
                    <input
                      type="text"
                      value={config.cloudVaultKey}
                      onChange={(e) => handleSaveConfig({ cloudVaultKey: e.target.value })}
                      placeholder="dr-colon-emergencia-gaton"
                      className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-[11px] text-slate-500">
                      Usa la misma clave en tu teléfono y computadora para mantenerlos sincronizados en tiempo real por datos 4G.
                    </p>
                  </div>
                )}

                {config.cloudProvider === 'firebase' && (
                  <div className="p-3 bg-white border border-amber-200 rounded-xl space-y-2">
                    <label className="block text-xs font-bold text-slate-800">
                      URL de Firebase Realtime Database:
                    </label>
                    <input
                      type="text"
                      value={config.firebaseUrl}
                      onChange={(e) => handleSaveConfig({ firebaseUrl: e.target.value })}
                      placeholder="https://mi-proyecto-default-rtdb.firebaseio.com"
                      className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                    />
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Crea una base de datos gratuita en <em>console.firebase.google.com</em> y pega la URL aquí para sincronización instantánea 24/7.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 3: Respaldo Maestro (.JSON) y Restauración */}
          <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3">
            <div className="flex items-center gap-2 font-bold text-emerald-950">
              <HardDrive className="w-4 h-4 text-emerald-700" />
              <span>3. Respaldo Maestro de Seguridad (Copia de Respaldo en 1 Clic)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Descarga un archivo con todos los pacientes, historias clínicas, órdenes y estudios. Si cambias de computadora o celular, solo restaura este archivo.
            </p>
            <div className="flex flex-wrap gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleExportBackup}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar Respaldo Total (.JSON)</span>
              </button>

              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95">
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                <span>Restaurar desde Archivo (.JSON)</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            Hospital Regional Dr. Ángel María Gatón
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-900 transition-colors"
          >
            Listo / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

