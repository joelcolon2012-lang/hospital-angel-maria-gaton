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
  AlertCircle,
  Server
} from 'lucide-react';
import { centralSyncService } from '../../services/centralSyncService';
import { syncEngine, type EngineStatus } from '../../services/syncEngine';
import { cloudSyncService } from '../../services/cloudSyncService';
import { googleDriveService } from '../../services/googleDriveService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenGoogleDrive: () => void;
  onDataRestored?: () => void;
}

export const CloudSyncModal: React.FC<Props> = ({ isOpen, onClose, onOpenGoogleDrive, onDataRestored }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [engine, setEngine] = useState<EngineStatus>(() => syncEngine.getStatus());
  const [serverDraft, setServerDraft] = useState<string>(() => centralSyncService.getBackendUrl());
  const [lanUrls, setLanUrls] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = syncEngine.subscribe(setEngine);
    setServerDraft(centralSyncService.getBackendUrl());
    // Dirección real de la PC en la red (antes estaba fija y dejaba de funcionar al cambiar la IP)
    fetch(`${centralSyncService.getBackendUrl()}/api/health`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const isLocalServer = /^https?:\/\/(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(centralSyncService.getBackendUrl());
        setLanUrls(isLocalServer && Array.isArray(j?.lanUrls) ? j.lanUrls : []);
      })
      .catch(() => setLanUrls([]));
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
              <p className="text-xs text-teal-100/80">Cambios compartidos entre celular y PC</p>
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
                      engine.state === 'connected' && engine.pendingChanges === 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : engine.state === 'syncing' || isSyncing
                        ? 'bg-sky-100 text-sky-800 animate-pulse'
                        : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {engine.state === 'syncing' || isSyncing
                      ? '● Sincronizando…'
                      : engine.state === 'connected'
                      ? engine.pendingChanges === 0
                        ? '● Al día'
                        : `● ${engine.pendingChanges} por enviar`
                      : '● Sin conexión (guardado en el equipo)'}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Servidor central: <strong>{engine.lastSyncedAt}</strong>
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

          {/* Servidor central (tiempo real) */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Server className="w-4 h-4 text-[#0F4C5C]" />
                <span>Servidor central en tiempo real</span>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  engine.state === 'connected'
                    ? 'bg-emerald-100 text-emerald-800'
                    : engine.state === 'syncing'
                    ? 'bg-sky-100 text-sky-800'
                    : 'bg-amber-100 text-amber-900'
                }`}
              >
                {engine.state === 'connected' && `● Conectado · ${engine.connectedDevices} dispositivo${engine.connectedDevices === 1 ? '' : 's'}`}
                {engine.state === 'syncing' && '● Sincronizando…'}
                {(engine.state === 'offline' || engine.state === 'error') && '● Sin conexión'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Cambios por enviar</div>
                <div className="font-bold text-slate-900 text-sm tabular-nums">{engine.pendingChanges}</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Última sincronización</div>
                <div className="font-bold text-slate-900 text-sm">{engine.lastSyncedAt}</div>
              </div>
            </div>
            {engine.errorMessage && engine.state !== 'connected' && (
              <div className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2">{engine.errorMessage}</div>
            )}
            <label className="block text-[11px] font-semibold text-slate-600">Dirección del servidor</label>
            <div className="flex gap-2">
              <input
                value={serverDraft}
                onChange={(e) => setServerDraft(e.target.value)}
                placeholder="Automático"
                className="flex-1 min-w-0 px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-xs"
                inputMode="url"
                autoCapitalize="off"
                autoCorrect="off"
              />
              <button
                type="button"
                onClick={() => {
                  centralSyncService.setBackendUrl(serverDraft);
                  setServerDraft(centralSyncService.getBackendUrl());
                  setFeedbackMsg({ type: 'success', text: 'Servidor actualizado. Sincronizando…' });
                }}
                className="shrink-0 px-3 py-1.5 bg-[#0F4C5C] text-white rounded-lg text-xs font-bold"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={() => {
                  centralSyncService.setBackendUrl('');
                  setServerDraft(centralSyncService.getBackendUrl());
                  setFeedbackMsg({ type: 'success', text: 'Servidor restablecido a detección automática.' });
                }}
                className="shrink-0 px-2.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
                title="Usar detección automática"
              >
                Auto
              </button>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Automático: todos los dispositivos utilizan el servidor central del hospital. Cambie esta dirección solamente para un servidor configurado por el administrador.
            </p>
          </div>

          <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl space-y-2">
            <h4 className="font-bold text-teal-900">Una sola base para celular y PC</h4>
            <p>Utilice el mismo enlace del hospital e inicie sesión en ambos dispositivos. Los cambios se envían automáticamente con conexión y se reintentan al volver la señal.</p>
            <p>Si aparece «Guardado local», mantenga la app abierta hasta ver «Sincronizado» antes de comprobarlo en el otro dispositivo.</p>
          </div>

          {/* SECTION 3: Respaldo Maestro (.JSON) y Restauración */}
          <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3">
            <div className="flex items-center gap-2 font-bold text-emerald-950">
              <HardDrive className="w-4 h-4 text-emerald-700" />
              <span>Respaldo Maestro de Seguridad (Copia de Respaldo en 1 Clic)</span>
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

