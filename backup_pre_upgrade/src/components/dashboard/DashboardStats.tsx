import React from 'react';
import { Patient } from '../../types';
import { Users, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';

interface Props {
  patients: Patient[];
  onOpenRegister: () => void;
}

export const DashboardStats: React.FC<Props> = ({ patients, onOpenRegister }) => {
  const activeCount = patients.filter(p => p.status !== 'alta' && p.status !== 'referidos').length;
  const observationCount = patients.filter(p => p.status === 'observacion').length;
  const pendingCount = patients.filter(p => p.status === 'pendientes').length;
  const criticalCount = patients.filter(p => p.triageLevel <= 2 && p.status !== 'alta').length;

  // Counts by triage level
  const t1 = patients.filter(p => p.triageLevel === 1 && p.status !== 'alta').length;
  const t2 = patients.filter(p => p.triageLevel === 2 && p.status !== 'alta').length;
  const t3 = patients.filter(p => p.triageLevel === 3 && p.status !== 'alta').length;
  const t4 = patients.filter(p => p.triageLevel === 4 && p.status !== 'alta').length;
  const t5 = patients.filter(p => p.triageLevel === 5 && p.status !== 'alta').length;

  return (
    <div className="mb-4">
      {/* Top Banner with Action */}
      <div className="bg-gradient-to-r from-petrol-900 to-petrol-800 rounded-2xl p-4 sm:p-5 text-white shadow-md mb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-200">
              Servicio de Emergencia Activo
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black">
            {activeCount} Pacientes en Atención
          </h2>
          <p className="text-xs text-teal-100/80 mt-0.5">
            {observationCount} en observación • {pendingCount} con estudios pendientes
          </p>
        </div>

        <button
          onClick={onOpenRegister}
          className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2 text-sm"
        >
          <span>+ Registrar Paciente</span>
        </button>
      </div>

      {/* Triage Level Quick Distribution Chips */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        <div className="bg-white rounded-xl p-2 sm:p-2.5 border border-red-200 shadow-sm flex flex-col items-center text-center">
          <span className="text-[10px] sm:text-xs font-bold text-red-600">Nivel I</span>
          <span className="text-base sm:text-lg font-black text-red-700">{t1}</span>
          <span className="text-[9px] text-slate-400 hidden xs:block">Reanimación</span>
        </div>
        <div className="bg-white rounded-xl p-2 sm:p-2.5 border border-amber-200 shadow-sm flex flex-col items-center text-center">
          <span className="text-[10px] sm:text-xs font-bold text-amber-600">Nivel II</span>
          <span className="text-base sm:text-lg font-black text-amber-700">{t2}</span>
          <span className="text-[9px] text-slate-400 hidden xs:block">Emergencia</span>
        </div>
        <div className="bg-white rounded-xl p-2 sm:p-2.5 border border-yellow-200 shadow-sm flex flex-col items-center text-center">
          <span className="text-[10px] sm:text-xs font-bold text-yellow-600">Nivel III</span>
          <span className="text-base sm:text-lg font-black text-yellow-700">{t3}</span>
          <span className="text-[9px] text-slate-400 hidden xs:block">Urgencia</span>
        </div>
        <div className="bg-white rounded-xl p-2 sm:p-2.5 border border-emerald-200 shadow-sm flex flex-col items-center text-center">
          <span className="text-[10px] sm:text-xs font-bold text-emerald-600">Nivel IV</span>
          <span className="text-base sm:text-lg font-black text-emerald-700">{t4}</span>
          <span className="text-[9px] text-slate-400 hidden xs:block">Prioritario</span>
        </div>
        <div className="bg-white rounded-xl p-2 sm:p-2.5 border border-blue-200 shadow-sm flex flex-col items-center text-center">
          <span className="text-[10px] sm:text-xs font-bold text-blue-600">Nivel V</span>
          <span className="text-base sm:text-lg font-black text-blue-700">{t5}</span>
          <span className="text-[9px] text-slate-400 hidden xs:block">No urgente</span>
        </div>
      </div>
    </div>
  );
};
