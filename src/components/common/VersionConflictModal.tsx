import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, X, Eye, FileText, CheckCircle2, ArrowRight } from 'lucide-react';
import { ClinicalHistoryPlanta } from '../../types';

interface VersionConflictModalProps {
  isOpen: boolean;
  serverHistory: ClinicalHistoryPlanta | null;
  clientHistory: ClinicalHistoryPlanta | null;
  onUseServerData: () => void;
  onForceOverwrite: () => void;
  onCancel: () => void;
}

export const VersionConflictModal: React.FC<VersionConflictModalProps> = ({
  isOpen,
  serverHistory,
  clientHistory,
  onUseServerData,
  onForceOverwrite,
  onCancel,
}) => {
  const [showDiff, setShowDiff] = useState(false);

  if (!isOpen || !serverHistory || !clientHistory) return null;

  const serverDate = serverHistory.updatedAt 
    ? new Date(serverHistory.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'recientemente';
  const serverDoctor = serverHistory.updatedBy || 'otro médico del equipo';

  // Resumen de diferencias relevantes
  const differences: { section: string; localVal: string; remoteVal: string }[] = [];

  const localChief = Array.isArray(clientHistory.chiefComplaints) ? clientHistory.chiefComplaints.join(', ') : '';
  const serverChief = Array.isArray(serverHistory.chiefComplaints) ? serverHistory.chiefComplaints.join(', ') : '';
  if (serverChief !== localChief) {
    differences.push({
      section: 'Motivo de Consulta',
      localVal: localChief || '(Vacío)',
      remoteVal: serverChief || '(Vacío)'
    });
  }

  if (serverHistory.presentIllness !== clientHistory.presentIllness) {
    differences.push({
      section: 'Historia de la Enfermedad Actual',
      localVal: (clientHistory.presentIllness?.slice(0, 100) || '') + '...',
      remoteVal: (serverHistory.presentIllness?.slice(0, 100) || '') + '...'
    });
  }

  if (serverHistory.generalStatus?.generalStatusSummary !== clientHistory.generalStatus?.generalStatusSummary) {
    differences.push({
      section: 'Estado General',
      localVal: clientHistory.generalStatus?.generalStatusSummary?.slice(0, 100) + '...' || '(Vacío)',
      remoteVal: serverHistory.generalStatus?.generalStatusSummary?.slice(0, 100) + '...' || '(Vacío)'
    });
  }

  const localDiag = clientHistory.diagnoses?.map(d => d.name).join(', ');
  const remoteDiag = serverHistory.diagnoses?.map(d => d.name).join(', ');
  if (localDiag !== remoteDiag) {
    differences.push({
      section: 'Diagnósticos',
      localVal: localDiag || '(Sin diagnósticos)',
      remoteVal: remoteDiag || '(Sin diagnósticos)'
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-amber-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header con alerta */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-5 text-white flex items-start gap-4">
          <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm shrink-0">
            <AlertTriangle className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold tracking-tight">
              Conflicto de Edición Simultánea Detectado
            </h3>
            <p className="text-amber-100 text-sm mt-1">
              Esta historia clínica fue modificada por el <strong className="text-white">{serverDoctor}</strong> a las <strong className="text-white">{serverDate}</strong> (Versión {serverHistory.version}).
            </p>
          </div>
          <button 
            onClick={onCancel}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Explicación y aviso de seguridad */}
        <div className="p-5 overflow-y-auto space-y-4 text-slate-700 text-sm">
          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Para evitar la pérdida accidental de datos clínicos, el sistema no sobreescribirá silenciosamente la versión más reciente guardada por su colega.
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-500 block mb-1">SU VERSIÓN LOCAL:</span>
              <p className="font-semibold text-slate-800">Versión {clientHistory.version || 1}</p>
              <p className="text-slate-500 text-[11px] mt-0.5">Modificaciones pendientes en su pantalla</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
              <span className="font-bold text-blue-600 block mb-1">VERSIÓN EN EL SERVIDOR:</span>
              <p className="font-semibold text-blue-900">Versión {serverHistory.version || 1}</p>
              <p className="text-blue-700 text-[11px] mt-0.5">Guardado por {serverDoctor}</p>
            </div>
          </div>

          {/* Toggle para comparar */}
          <div>
            <button
              onClick={() => setShowDiff(!showDiff)}
              className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-800 py-1"
            >
              <Eye className="w-3.5 h-3.5" />
              {showDiff ? 'Ocultar comparación de campos' : 'Ver / Comparar diferencias de campos'}
            </button>

            {showDiff && (
              <div className="mt-2 space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50 max-h-56 overflow-y-auto">
                {differences.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No se detectaron divergencias de texto mayores en los campos principales.</p>
                ) : (
                  differences.map((diff, i) => (
                    <div key={i} className="text-xs border-b border-slate-200 pb-2 last:border-b-0 last:pb-0">
                      <span className="font-bold text-slate-700 block">{diff.section}</span>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <div className="bg-red-50 p-1.5 rounded border border-red-100 text-red-800">
                          <span className="text-[10px] uppercase font-bold text-red-500 block">En su pantalla:</span>
                          {diff.localVal}
                        </div>
                        <div className="bg-emerald-50 p-1.5 rounded border border-emerald-100 text-emerald-800">
                          <span className="text-[10px] uppercase font-bold text-emerald-500 block">En el servidor:</span>
                          {diff.remoteVal}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Botones de acción */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-2.5">
          <button
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium text-xs transition-colors"
          >
            Cancelar Edición
          </button>
          <button
            onClick={onForceOverwrite}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-amber-300 text-amber-800 hover:bg-amber-100 font-medium text-xs transition-colors"
          >
            Sobrescribir con mis cambios
          </button>
          <button
            onClick={onUseServerData}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualizar con los datos más recientes
          </button>
        </div>
      </div>
    </div>
  );
};
