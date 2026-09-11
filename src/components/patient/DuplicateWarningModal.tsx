import React from 'react';
import { Patient } from '../../types';
import { AlertTriangle, UserCheck, ArrowRight, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  matchedPatient: Patient;
  reasons: string[];
  onOpenExisting: (patient: Patient) => void;
  onProceedAnyway: () => void;
}

export const DuplicateWarningModal: React.FC<Props> = ({
  isOpen,
  onClose,
  matchedPatient,
  reasons,
  onOpenExisting,
  onProceedAnyway,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-amber-300 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-amber-500 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-600/50 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">
                POSIBLE PACIENTE DUPLICADO
              </h3>
              <p className="text-xs text-amber-100 font-medium">
                Alerta de seguridad clínica para evitar registros dobles
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-amber-100 hover:text-white p-1 rounded-lg hover:bg-amber-600/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-amber-950">
              <span>Coincidencias encontradas:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-amber-800 font-semibold pl-1">
              {reasons.map((r, idx) => (
                <li key={idx}>{r}</li>
              ))}
            </ul>
          </div>

          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Paciente Registrado Actualmente en Sistema
            </span>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-black text-slate-800">
                  {matchedPatient.fullName}
                </p>
                <p className="text-xs text-slate-500">
                  Expediente: <span className="font-mono font-bold text-slate-700">{matchedPatient.medicalRecordNumber || 'Sin exp.'}</span> • Cédula: <span className="font-mono font-bold text-slate-700">{matchedPatient.idDocument || 'Sin cédula'}</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Ubicación: <span className="font-semibold text-[#0F4C5C]">{matchedPatient.cubicle || 'Cubículo'}</span> • Ingreso: {matchedPatient.arrivalDateTime}
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono">
                {matchedPatient.internalCode}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-500 text-center">
            El sistema <strong className="text-slate-700">no fusionará automáticamente</strong> los datos para preservar la trazabilidad médica.
          </p>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
            <button
              onClick={() => onOpenExisting(matchedPatient)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F4C5C] hover:bg-[#134E5E] text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-emerald-300" />
              <span>ABRIR PACIENTE EXISTENTE</span>
            </button>
            <button
              onClick={onProceedAnyway}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold transition-all active:scale-95 cursor-pointer"
            >
              <ArrowRight className="w-4 h-4 text-slate-500" />
              <span>CONTINUAR DE TODAS FORMAS</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
