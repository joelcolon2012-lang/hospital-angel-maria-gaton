import React from 'react';
import { BrainCircuit, X, Plus, CheckCircle2 } from 'lucide-react';
import { Patient } from '../../types';

interface StrokeAutoPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  onAccept: () => void;
  detectedTerm?: string;
}

export const StrokeAutoPromptModal: React.FC<StrokeAutoPromptModalProps> = ({
  isOpen,
  onClose,
  patient,
  onAccept,
  detectedTerm = 'Diagnóstico Vascular / EVC',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full p-4 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-purple-300 p-4 relative overflow-hidden">
        {/* Glow corner */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-purple-100 rounded-xl text-purple-700 shrink-0">
            <BrainCircuit className="w-6 h-6 animate-pulse" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                Alerta de Registro Vascular
              </span>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h4 className="text-xs font-bold text-slate-900 mt-1.5 leading-snug">
              ¿Desea agregar a <strong className="text-purple-900">{patient.fullName}</strong> al Registro de Eventos Cerebrovasculares?
            </h4>
            <p className="text-[11px] text-slate-500 mt-1">
              Se detectó el término <span className="font-semibold text-purple-700">"{detectedTerm}"</span> en la documentación clínica activa.
            </p>

            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100">
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] font-semibold transition-colors"
              >
                No por ahora
              </button>
              <button
                onClick={() => {
                  onClose();
                  onAccept();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-[11px] font-bold shadow-sm transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Sí, Registrar en EVC</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
