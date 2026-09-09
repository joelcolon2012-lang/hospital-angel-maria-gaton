import React, { useState } from 'react';
import { googleDriveService } from '../../services/googleDriveService';
import { db } from '../../db/dexieDb';
import { Patient, MedicalOrder, LabResult } from '../../types';
import { X, Cloud, HardDrive, CheckCircle2, AlertCircle, Database, RefreshCw, Key, Folder, FileText, Download, Copy, ExternalLink, Zap, ShieldCheck } from 'lucide-react';
import { generateEmergencyNoteDocx } from '../../services/docxTemplateService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData?: () => void;
  activePatient?: Patient | null;
  orders?: MedicalOrder[];
  labs?: LabResult[];
}

export const GoogleDriveModal: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  onRefreshData,
  activePatient,
  orders = [],
  labs = [] 
}) => {
  const [config, setConfig] = useState(googleDriveService.getConfig());
  const [clientIdInput, setClientIdInput] = useState(config.clientId || '');
  const [gasUrlInput, setGasUrlInput] = useState(config.gasUrl || '');
  const [connectionTab, setConnectionTab] = useState<'gas' | 'oauth' | 'mock'>('gas');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);
  const [gasDiagnosis, setGasDiagnosis] = useState<{
    tested: boolean;
    isV2Ready: boolean;
    hasPatients: boolean;
    patientCount: number;
    message: string;
  } | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const currentCfg = googleDriveService.getConfig();
    setConfig(currentCfg);
    setGasUrlInput(currentCfg.gasUrl || '');

    if (currentCfg.gasUrl) {
      googleDriveService.verifyGasEndpoint(currentCfg.gasUrl).then((diag) => {
        setGasDiagnosis({
          tested: true,
          ...diag
        });
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyScriptCode = () => {
    navigator.clipboard.writeText(googleDriveService.getGasScriptCode());
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3500);
  };

  const handleTestGasConnection = async () => {
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const diag = await googleDriveService.verifyGasEndpoint(gasUrlInput || config.gasUrl);
      setGasDiagnosis({
        tested: true,
        ...diag
      });
      setStatusMessage({ text: diag.message, isError: !diag.isV2Ready });
    } catch (err: any) {
      setStatusMessage({ text: 'Error al verificar: ' + err?.message, isError: true });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConnectGas = async () => {
    if (!gasUrlInput.trim()) {
      setStatusMessage({ text: 'Por favor ingresa la URL de la Aplicación Web de Google Script.', isError: true });
      return;
    }
    setIsProcessing(true);
    const res = await googleDriveService.connectWithGasUrl(gasUrlInput.trim());
    setConfig(googleDriveService.getConfig());
    setIsProcessing(false);
    setStatusMessage({ text: res.message, isError: !res.success });
  };

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
              {isConnected 
                ? (config.isMockMode 
                    ? 'Conectado (Modo Demostración)' 
                    : (config.gasUrl ? 'Conectado (Google Drive Vinculado)' : 'Conectado (Google Cloud OAuth)')) 
                : 'Desconectado'}
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

        {/* Exportación en Formato Word (.DOCX) */}
        <div className="bg-blue-50/80 border border-blue-200 p-3.5 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-950">
            <FileText className="w-4 h-4 text-blue-700" />
            <span>Descarga en Formato Word (.DOCX Oficial):</span>
          </div>
          <p className="text-[11px] text-blue-800 leading-relaxed">
            {activePatient 
              ? `Genera y descarga la Nota de Emergencia de ${activePatient.fullName.toUpperCase()} directamente en plantilla Microsoft Word (.DOCX).`
              : 'Exporta la nota clínica o expediente del paciente seleccionado en formato Microsoft Word (.DOCX) oficial.'}
          </p>
          <button
            type="button"
            onClick={async () => {
              if (activePatient) {
                await generateEmergencyNoteDocx(activePatient, orders, labs);
              } else {
                const patients = await db.patients.toArray();
                if (patients.length > 0) {
                  await generateEmergencyNoteDocx(patients[0], [], []);
                } else {
                  alert('No hay pacientes disponibles para generar documento en Word.');
                }
              }
            }}
            className="w-full py-2.5 px-3 bg-blue-800 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
          >
            <Download className="w-3.5 h-3.5 text-blue-200" />
            <span>Descargar en Formato Word (.DOCX)</span>
          </button>
        </div>

        {/* Live Cloud Status & Diagnostic Card */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Estado de Google Drive Cloud:</span>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                gasDiagnosis?.isV2Ready
                  ? 'bg-emerald-100 text-emerald-800'
                  : gasDiagnosis?.tested
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : isConnected
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${gasDiagnosis?.isV2Ready ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              {gasDiagnosis?.isV2Ready 
                ? '🟢 v2 Activo en Tiempo Real' 
                : gasDiagnosis?.tested
                ? '⚠️ Requiere Nueva Versión'
                : (config.gasUrl ? 'URL Configurada' : 'Desconectado')}
            </span>
          </div>

          {gasDiagnosis && (
            <div className={`p-3 rounded-xl border text-xs font-medium leading-relaxed ${
              gasDiagnosis.isV2Ready
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <p className="font-bold mb-1">
                {gasDiagnosis.isV2Ready ? '¡Sincronización en la Nube Operativa!' : 'Atención: Actualización Necesaria en Google Script'}
              </p>
              <p>{gasDiagnosis.message}</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-1 text-xs text-slate-600">
            <span>Endpoint: <strong className="font-mono text-[11px]">{config.gasUrl ? '.../exec' : 'No configurado'}</strong></span>
            <button
              type="button"
              onClick={handleTestGasConnection}
              disabled={isProcessing}
              className="inline-flex items-center gap-1 px-3 py-1 bg-petrol-800 hover:bg-petrol-700 text-white font-bold rounded-lg text-xs transition-all disabled:opacity-50 active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>Verificar Conexión en Vivo</span>
            </button>
          </div>
        </div>

        {/* SECTION: Actualizar o Instalar Conector en Google Apps Script */}
        <div className="space-y-3 bg-emerald-50/60 border border-emerald-200 p-4 rounded-2xl">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
              <Cloud className="w-4 h-4 text-emerald-600" />
              <span>Código Oficial de Sincronización en la Nube (Google Drive + Móvil)</span>
            </h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Para que los pacientes admitidos en el celular se guarden en la nube y aparezcan de inmediato en la PC:
            </p>
          </div>

          <div className="bg-white border border-emerald-300 rounded-xl p-3.5 space-y-2.5 text-[11px] text-slate-700">
            <p className="font-bold text-slate-900">Instrucciones para activar en 1 minuto:</p>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-600">
              <li>Abre <a href="https://script.google.com" target="_blank" rel="noreferrer" className="text-emerald-700 underline font-bold">script.google.com</a> con tu cuenta Google y entra a tu proyecto.</li>
              <li>Copia el código actualizado con el botón de abajo, selecciónalo todo en el editor de Google (Ctrl+A), pégalo y haz clic en Guardar (💾).</li>
            </ol>
            <button
              type="button"
              onClick={handleCopyScriptCode}
              className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border shadow-sm transition-all active:scale-95 ${
                copiedCode
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-emerald-700 hover:bg-emerald-600 text-white border-emerald-700'
              }`}
            >
              {copiedCode ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCode ? '¡Código Copiado al Portapapeles!' : '📋 Copiar Código del Conector de Sincronización'}</span>
            </button>
            <ol start={3} className="list-decimal list-inside space-y-1.5 text-slate-600">
              <li>Arriba haz clic en: <strong>Implementar &gt; Administrar implementaciones</strong>.</li>
              <li>Haz clic en el <strong>Lápiz ✏️ (Editar)</strong>, en <em>Versión</em> selecciona <strong>"Nueva versión"</strong>, verifica que <em>Quién tiene acceso</em> sea <strong>"Cualquier usuario"</strong> y haz clic en <strong>Implementar</strong>.</li>
            </ol>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              URL de la Aplicación Web de Google:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={gasUrlInput}
                onChange={(e) => setGasUrlInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 bg-white border border-emerald-300 rounded-xl p-2.5 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleConnectGas}
                disabled={isProcessing}
                className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs transition-all shrink-0 active:scale-95 disabled:opacity-50"
              >
                Guardar URL
              </button>
            </div>
          </div>
        </div>

        {/* SECTION: Respaldos y Restauración */}
        <div className="space-y-3 pt-1 border-t border-slate-200">
          <button
            onClick={handleBackupNow}
            disabled={isProcessing}
            className="w-full py-2.5 bg-petrol-900 hover:bg-petrol-800 active:scale-95 text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <Database className="w-4 h-4 text-emerald-300" />
            <span>Crear Respaldo Completo en Google Drive</span>
          </button>

          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Restaurar Base de Datos desde Archivo JSON:
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleRestoreFile}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
