import React from 'react';
import { X, AlertTriangle, ShieldCheck, ArrowRight, AlertCircle, Info } from 'lucide-react';
import { ClinicalInconsistencyAlert } from '../../types';

interface ConsistencyReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: ClinicalInconsistencyAlert[];
  onNavigateToSection: (sectionId: string) => void;
}

export const ConsistencyReviewModal: React.FC<ConsistencyReviewModalProps> = ({
  isOpen,
  onClose,
  alerts,
  onNavigateToSection
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-amber-50/80 border-b border-amber-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Revisión de Coherencia Clínica</h3>
              <p className="text-xs text-slate-500">
                {alerts.length === 0 
                  ? 'No se detectaron discordancias clínicas' 
                  : `Se identificaron ${alerts.length} alertas preventivas para comprobación médica`}
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
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {alerts.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-800">¡Alta Coherencia Clínica!</h4>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                No se detectaron contradicciones de lateralidad, discrepancias de sexo, diagnósticos duplicados ni conflictos de medicamentos con alergias registradas.
              </p>
            </div>
          ) : (
            alerts.map(a => {
              const isDanger = a.type === 'DANGER';
              const isWarning = a.type === 'WARNING';
              return (
                <div 
                  key={a.id}
                  className={`p-4 rounded-xl border flex items-start space-x-3 transition-all ${
                    isDanger 
                      ? 'bg-rose-50/70 border-rose-200' 
                      : isWarning 
                        ? 'bg-amber-50/70 border-amber-200' 
                        : 'bg-blue-50/70 border-blue-200'
                  }`}
                >
                  <div className={`p-2 rounded-lg mt-0.5 ${
                    isDanger ? 'bg-rose-100 text-rose-600' : isWarning ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {isDanger ? <AlertCircle className="w-5 h-5" /> : isWarning ? <AlertTriangle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <h4 className={`text-sm font-bold ${
                      isDanger ? 'text-rose-900' : isWarning ? 'text-amber-900' : 'text-blue-900'
                    }`}>
                      {a.title}
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {a.description}
                    </p>
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => {
                          onNavigateToSection(a.sectionId);
                          onClose();
                        }}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                          isDanger 
                            ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                            : 'bg-amber-600 hover:bg-amber-700 text-white'
                        }`}
                      >
                        Revisar Apartado <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
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
