import React from 'react';
import { Users, Flame, Building2, Clock, AlertTriangle, CheckCircle2, UserPlus } from 'lucide-react';
import { Patient, PatientStatus } from '../../types';

interface Props {
  patients: Patient[];
  onOpenRegister: () => void;
  selectedStatus?: PatientStatus | 'todos' | 'criticos';
  onSelectFilter?: (status: PatientStatus | 'todos' | 'criticos') => void;
}

export const DashboardStats: React.FC<Props> = ({
  patients,
  onOpenRegister,
  selectedStatus = 'todos',
  onSelectFilter,
}) => {
  // Conteo de métricas hospitalarias
  const activePatients = patients.filter((p) => !p.isArchived && !p.isDeleted && p.status !== 'alta');
  const activeCount = activePatients.length;
  const emergencyCount = patients.filter((p) => !p.isArchived && !p.isDeleted && p.status === 'activos').length;
  const wardCount = patients.filter((p) => !p.isArchived && !p.isDeleted && p.status === 'ingresados').length;
  const pendingCount = patients.filter((p) => !p.isArchived && !p.isDeleted && (p.status === 'pendientes' || p.status === 'observacion')).length;
  const criticalCount = patients.filter((p) => !p.isArchived && !p.isDeleted && p.status !== 'alta' && p.triageLevel <= 2).length;
  const dischargedTodayCount = patients.filter((p) => p.status === 'alta').length;

  const cards = [
    {
      id: 'todos' as const,
      label: 'Pacientes Activos',
      value: activeCount,
      icon: Users,
      color: 'text-slate-900',
      activeBorder: 'border-[#0F4C5C] bg-[#0F4C5C]/5',
    },
    {
      id: 'activos' as const,
      label: 'En Emergencia',
      value: emergencyCount,
      icon: Flame,
      color: 'text-[#0F4C5C]',
      activeBorder: 'border-[#0F4C5C] bg-[#0F4C5C]/5',
    },
    {
      id: 'ingresados' as const,
      label: 'Ingresados en Sala',
      value: wardCount,
      icon: Building2,
      color: 'text-indigo-700',
      activeBorder: 'border-indigo-600 bg-indigo-50/40',
    },
    {
      id: 'pendientes' as const,
      label: 'Pendientes / Observación',
      value: pendingCount,
      icon: Clock,
      color: 'text-amber-700',
      activeBorder: 'border-amber-500 bg-amber-50/40',
    },
    {
      id: 'criticos' as const,
      label: 'Pacientes Críticos',
      value: criticalCount,
      icon: AlertTriangle,
      color: 'text-red-600',
      activeBorder: 'border-red-500 bg-red-50/40',
    },
    {
      id: 'alta' as const,
      label: 'Altas del Día',
      value: dischargedTodayCount,
      icon: CheckCircle2,
      color: 'text-emerald-700',
      activeBorder: 'border-emerald-600 bg-emerald-50/40',
    },
  ];

  return (
    <div className="mb-4 space-y-3">
      {/* Header bar with summary & register trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-[16px] border border-slate-200/80 shadow-[0_1px_3px_0_rgba(15,23,42,0.03)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Servicio Activo
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-0.5">
            Hospital Regional Dr. Ángel María Gatón
          </h2>
          <p className="text-xs text-slate-500">
            {activeCount} pacientes en seguimiento clínico hoy
          </p>
        </div>

        <button
          onClick={onOpenRegister}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0F4C5C] hover:bg-[#134E5E] text-white rounded-[12px] font-bold text-xs shadow-xs active:scale-[0.98] transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4 text-emerald-300" />
          <span>Registrar Paciente</span>
        </button>
      </div>

      {/* Metric Cards Grid (6 Columns) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
        {cards.map((c) => {
          const Icon = c.icon;
          const isSelected = selectedStatus === c.id;

          return (
            <button
              key={c.id}
              onClick={() => onSelectFilter && onSelectFilter(c.id as any)}
              className={`p-3 sm:p-3.5 rounded-[14px] bg-white border text-left transition-all select-none cursor-pointer active:scale-[0.98] ${
                isSelected
                  ? `${c.activeBorder} shadow-xs`
                  : 'border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-semibold text-slate-500 truncate">
                  {c.label}
                </span>
                <Icon className={`w-4 h-4 ${c.color} shrink-0 stroke-[1.8]`} />
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-xl sm:text-2xl font-black ${c.color} tracking-tight`}>
                  {c.value}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
