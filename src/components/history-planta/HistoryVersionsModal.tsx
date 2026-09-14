import React from 'react';
import { X, History, RotateCcw, User, Calendar } from 'lucide-react';
import { ClinicalHistoryVersionRecord } from '../../types';

interface HistoryVersionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  versions: ClinicalHistoryVersionRecord[];
  onRestoreVersion: (versionId: string) => void;
}

export const HistoryVersionsModal: React.FC<HistoryVersionsModalProps> = ({
  isOpen,
  onClose,
  versions,
  onRestoreVersion
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Historial de Versiones y Trazabilidad</h3>
              <p className="text-xs text-slate-500">
                Registro inmutable de revisiones médicas y puntos de guardado
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {versions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Aún no se registran versiones previas para este expediente.
            </div>
          ) : (
            versions.map((ver, idx) => (
              <div 
                key={ver.id}
                className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 transition-all bg-white flex items-center justify-between shadow-sm"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full border border-indigo-200">
                      Versión {ver.version}
                    </span>
                    {idx === 0 && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                        ACTUAL
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-slate-800 mt-2">
                    {ver.changeSummary || 'Guardado de Historia Clínica Planta'}
                  </h4>
                  <div className="flex items-center space-x-4 text-xs text-slate-400 mt-1">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" /> {ver.createdBy || 'Médico tratante'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> {new Date(ver.createdAt).toLocaleString('es-DO')}
                    </span>
                  </div>
                </div>

                {idx > 0 && (
                  <button
                    onClick={() => {
                      if (window.confirm(`¿Seguro que desea restaurar la Versión ${ver.version}? Se guardará como una nueva versión manteniendo el historial.`)) {
                        onRestoreVersion(ver.id);
                        onClose();
                      }
                    }}
                    className="px-3 py-1.5 border border-indigo-200 hover:bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
