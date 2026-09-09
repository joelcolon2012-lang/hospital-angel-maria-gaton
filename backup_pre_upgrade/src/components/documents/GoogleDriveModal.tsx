import React, { useState } from 'react';
import { googleDriveService } from '../../services/googleDriveService';
import { db } from '../../db/dexieDb';
import { X, Cloud, HardDrive, CheckCircle2, AlertCircle, Database, RefreshCw, Key, Folder } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData?: () => void;
}

export const GoogleDriveModal: React.FC<Props> = ({ isOpen, onClose, onRefreshData }) => {
  const [config, setConfig] = useState(googleDriveService.getConfig());
  const [clientIdInput, setClientIdInput] = useState(config.clientId || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  if (!isOpen) return null;

  const handleConnectMock = async () => {
    setIsProcessing(true);
    const res = await googleDriveService.authenticate(true);
    setConfig(googleDriveService.getConfig());
    setIsProcessing(false);
    setStatusMessage({ text: res.message, isError: !res.success });
  };

  const handleConnectOAuth = async () => {
    if (!clientIdInput.trim()) {
      setStatusMessage({ text: 'Por favor ingresa el Client ID de Google Cloud Console.', isError: true });
      return;
    }
    setIsProcessing(true);
    googleDriveService.saveConfig({ clientId: clientIdInput.trim() });
    const res = await googleDriveService.authenticate(false);
    setConfig(googleDriveService.getConfig());
    setIsProcessing(false);
    setStatusMessage({ text: res.message, isError: !res.success });
  };

  const handleDisconnect = () => {
    googleDriveService.disconnect();
    setConfig(googleDriveService.getConfig());
    setStatusMessage({ text: 'Desconectado de Google Drive.', isError: false });
  };

  const handleBackupNow = async () => {
    setIsProcessing(true);
    try {
      const patients = await db.patients.toArray();
      const studies = await db.studies.toArray();
      const labs = await db.labs.toArray();
      const orders = await db.orders.toArray();
      const evolutions = await db.evolutions.toArray();

      const fullBackup = {
        exportedAt: new Date().toISOString(),
        application: 'Hospital Regional Ángel María Gatón — Emergencias',
        version: '1.0.0',
        patients,
        studies,
        labs,
        orders,
        evolutions,
      };

      const res = await googleDriveService.backupDatabase(fullBackup);
      setConfig(googleDriveService.getConfig());
      setStatusMessage({ text: res.message, isError: !res.success });
    } catch (err: any) {
      setStatusMessage({ text: `Error al crear respaldo: ${err.message}`, isError: true });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        if (!json.patients) {
          throw new Error('Formato de archivo de respaldo no válido.');
        }

        if (confirm(`Se restaurarán ${json.patients.length} pacientes. ¿Deseas continuar?`)) {
          await db.patients.clear();
          await db.patients.bulkAdd(json.patients);

          if (json.studies) {
            await db.studies.clear();
            await db.studies.bulkAdd(json.studies);
          }
          if (json.labs) {
            await db.labs.clear();
            await db.labs.bulkAdd(json.labs);
          }
          if (json.orders) {
            await db.orders.clear();
            await db.orders.bulkAdd(json.orders);
          }
          if (json.evolutions) {
            await db.evolutions.clear();
            await db.evolutions.bulkAdd(json.evolutions);
          }

          setStatusMessage({ text: 'Copia de seguridad restaurada exitosamente.', isError: false });
          if (onRefreshData) onRefreshData();
        }
      } catch (err: any) {
        setStatusMessage({ text: `Error al restaurar: ${err.message}`, isError: true });
      }
    };
    reader.readAsText(file);
  };

  const isConnected = googleDriveService.isConnected();

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Cloud className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Conexión con Google Drive</h3>
              <p className="text-xs text-slate-500">Respaldo en la nube y exportación directa de PDFs</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status banner */}
        {statusMessage && (
          <div
            className={`p-3 rounded-xl border text-xs font-semibold ${
              statusMessage.isError
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        {/* Current status card */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Estado de Conexión:</span>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                isConnected
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              {isConnected ? (config.isMockMode ? 'Conectado (Modo Demostración)' : 'Conectado (Cuenta Google)') : 'Desconectado'}
            </span>
          </div>

          {isConnected && (
            <p className="text-xs text-slate-600">
              Cuenta vinculada: <strong>{config.userEmail || 'dr.colon.emergencias@gmail.com'}</strong>
            </p>
          )}

          {config.lastBackupDate && (
            <p className="text-xs text-slate-500">
              Último respaldo en Drive: <strong>{config.lastBackupDate}</strong>
            </p>
          )}
        </div>

        {/* Drive Folder Structure Info */}
        <div className="bg-teal-50/70 border border-teal-200 p-3 rounded-xl text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-petrol-900">
            <Folder className="w-4 h-4 text-emerald-600" />
            <span>Organización Automática en tu Google Drive:</span>
          </div>
          <p className="text-slate-600 pl-5 font-mono text-[11px]">
            Mi unidad / Hospital Regional Angel Maria Gaton / Pacientes / [Código - Nombre] /
          </p>
          <p className="text-[11px] text-slate-500 pl-5">
            Los PDFs de historias clínicas y las copias de seguridad se guardan organizadas por paciente.
          </p>
        </div>

        {/* Connection Action Buttons */}
        {!isConnected ? (
          <div className="space-y-3 pt-1">
            <button
              onClick={handleConnectMock}
              disabled={isProcessing}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Conectar Modo Instantáneo (Listo para pruebas sin credenciales)</span>
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200" />
              <span className="flex-shrink mx-2 text-[11px] text-slate-400">O ingresa tus credenciales de Google</span>
              <div className="flex-grow border-t border-slate-200" />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Google OAuth Client ID:</label>
              <input
                type="text"
                value={clientIdInput}
                onChange={(e) => setClientIdInput(e.target.value)}
                placeholder="xxxxxx-xxxxxxxx.apps.googleusercontent.com"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs"
              />
              <button
                onClick={handleConnectOAuth}
                disabled={isProcessing}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Autorizar con Google OAuth2</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {/* Backup to Drive Button */}
            <button
              onClick={handleBackupNow}
              disabled={isProcessing}
              className="w-full py-3 bg-petrol-900 hover:bg-petrol-800 active:scale-95 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Database className="w-4 h-4 text-emerald-300" />
              <span>Crear Copia de Seguridad Completa en Google Drive</span>
            </button>

            {/* Restore from File */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Restaurar Base de Datos desde Respaldo JSON:
              </label>
              <input
                type="file"
                accept=".json"
                onChange={handleRestoreFile}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs"
              />
            </div>

            {/* Disconnect Button */}
            <button
              onClick={handleDisconnect}
              className="w-full py-2 text-slate-500 hover:text-red-600 font-semibold text-xs transition-colors"
            >
              Desconectar cuenta de Google Drive
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
