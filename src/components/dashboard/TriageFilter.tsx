import React from 'react';
import { PatientStatus, TriageLevel } from '../../types';
import { Filter, ArrowUpDown } from 'lucide-react';

interface Props {
  selectedStatus: PatientStatus | 'todos';
  onSelectStatus: (status: PatientStatus | 'todos') => void;
  sortBy: 'arrival' | 'severity' | 'name' | 'cubicle';
  onSortChange: (sort: 'arrival' | 'severity' | 'name' | 'cubicle') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const TriageFilter: React.FC<Props> = ({
  selectedStatus,
  onSelectStatus,
  sortBy,
  onSortChange,
  searchQuery,
  onSearchChange,
}) => {
  const statusTabs: { id: PatientStatus | 'todos'; label: string }[] = [
    { id: 'todos', label: 'Todos' },
    { id: 'activos', label: 'Activos' },
    { id: 'observacion', label: 'Observación' },
    { id: 'pendientes', label: 'Pend. Estudios' },
    { id: 'reevaluacion', label: 'Reevaluación' },
    { id: 'ingresados', label: 'Ingresados' },
    { id: 'referidos', label: 'Referidos' },
    { id: 'alta', label: 'Alta' },
  ];

  return (
    <div className="space-y-2.5 mb-4">
      {/* Search Input and Sort selector */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nombre, código, expediente, cubículo..."
            className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-petrol-800"
          />
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-700">
          <ArrowUpDown className="w-3.5 h-3.5 text-petrol-800" />
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as any)}
            className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
          >
            <option value="severity">Gravedad (Triaje)</option>
            <option value="arrival">Hora de llegada</option>
            <option value="name">Nombre</option>
            <option value="cubicle">Cubículo / Cama</option>
          </select>
        </div>
      </div>

      {/* Horizontal Scrollable Status Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        {statusTabs.map((tab) => {
          const isActive = selectedStatus === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectStatus(tab.id)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-xl font-bold transition-all ${
                isActive
                  ? 'bg-petrol-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
