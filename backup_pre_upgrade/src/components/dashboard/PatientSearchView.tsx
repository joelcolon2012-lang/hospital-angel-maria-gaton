import React, { useState } from 'react';
import { Patient } from '../../types';
import { PatientCard } from './PatientCard';
import { Search, Filter, X } from 'lucide-react';

interface Props {
  patients: Patient[];
  onSelectPatient: (p: Patient) => void;
}

export const PatientSearchView: React.FC<Props> = ({ patients, onSelectPatient }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTriage, setSelectedTriage] = useState<number | 'todos'>('todos');

  const filtered = patients.filter((p) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      p.fullName.toLowerCase().includes(term) ||
      p.internalCode.toLowerCase().includes(term) ||
      (p.medicalRecordNumber && p.medicalRecordNumber.toLowerCase().includes(term)) ||
      (p.idDocument && p.idDocument.toLowerCase().includes(term)) ||
      p.cubicle.toLowerCase().includes(term) ||
      p.chiefComplaint.toLowerCase().includes(term);

    const matchesTriage = selectedTriage === 'todos' || p.triageLevel === selectedTriage;

    return matchesSearch && matchesTriage;
  });

  return (
    <div className="space-y-4 pb-16">
      {/* Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, código, expediente, motivo, cubículo..."
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-petrol-800"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Triage Level Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <span className="text-slate-500 font-semibold mr-1">Triaje:</span>
          {['todos', 1, 2, 3, 4, 5].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSelectedTriage(lvl as any)}
              className={`px-3 py-1 rounded-xl font-bold whitespace-nowrap transition-all ${
                selectedTriage === lvl
                  ? 'bg-petrol-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {lvl === 'todos' ? 'Todos' : `Nivel ${lvl}`}
            </button>
          ))}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>{filtered.length} {filtered.length === 1 ? 'paciente encontrado' : 'pacientes encontrados'}</span>
      </div>

      {/* Results Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500 text-xs">
          <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-700">No se encontraron pacientes coincidentes</p>
          <p className="mt-1">Intenta con otro término o limpia los filtros de búsqueda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((patient) => (
            <PatientCard key={patient.id} patient={patient} onSelect={onSelectPatient} />
          ))}
        </div>
      )}
    </div>
  );
};
