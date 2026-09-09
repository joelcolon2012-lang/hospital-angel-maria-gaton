import React from 'react';
import { Patient } from '../../types';
import { TriageBadge } from '../common/TriageBadge';
import { Clock, MapPin, AlertTriangle, FileText, ChevronRight, HeartPulse, FileSpreadsheet, Image as ImageIcon } from 'lucide-react';

interface Props {
  patient: Patient;
  onSelect: (patient: Patient) => void;
}

export const PatientCard: React.FC<Props> = ({ patient, onSelect }) => {
  const vitals = patient.vitals;
  const hasAllergies = vitals?.allergies && vitals.allergies.length > 0;

  // Highlight abnormal vitals
  const isHypotensive = vitals?.systolicBP && vitals.systolicBP < 90;
  const isHypertensive = vitals?.systolicBP && vitals.systolicBP > 140;
  const isTachycardic = vitals?.heartRate && vitals.heartRate > 100;
  const isDesaturating = vitals?.oxygenSaturation && vitals.oxygenSaturation < 94;
  const isFebrile = vitals?.temperature && vitals.temperature >= 38.0;

  return (
    <div
      onClick={() => onSelect(patient)}
      className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all border border-slate-200/90 active:scale-[0.99] cursor-pointer relative overflow-hidden"
    >
      {/* Triage indicator left bar */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1.5 ${
          patient.triageLevel === 1
            ? 'bg-red-600'
            : patient.triageLevel === 2
            ? 'bg-amber-500'
            : patient.triageLevel === 3
            ? 'bg-yellow-400'
            : patient.triageLevel === 4
            ? 'bg-emerald-500'
            : 'bg-blue-500'
        }`}
      />

      {/* Top row: Code, Triage & Bed */}
      <div className="flex items-center justify-between gap-2 mb-2 pl-1">
        <div className="flex items-center gap-2">
          <TriageBadge level={patient.triageLevel} size="sm" />
          <span className="text-xs font-semibold text-slate-500 tracking-wider">
            {patient.internalCode}
          </span>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700">
          <MapPin className="w-3.5 h-3.5 text-petrol-800" />
          <span>{patient.cubicle || 'Triaje'}</span>
        </div>
      </div>

      {/* Patient Name & Demographics */}
      <div className="pl-1 mb-2">
        <h3 className="text-base font-bold text-slate-900 leading-snug flex items-center justify-between">
          <span>{patient.fullName}</span>
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          {patient.age ? `${patient.age} años` : 'Edad no reg.'} • {patient.sex === 'M' ? 'Masculino' : patient.sex === 'F' ? 'Femenino' : 'Otro'} • Llegada: {patient.arrivalDateTime.split(' ')[1] || patient.arrivalDateTime}
        </p>
      </div>

      {/* Motivo de consulta */}
      <div className="pl-1 mb-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
        <p className="text-xs font-medium text-slate-700 line-clamp-2">
          <span className="font-semibold text-petrol-900">Motivo: </span>
          {patient.chiefComplaint || 'No especificado'}
        </p>
      </div>

      {/* Vitals Summary Pill Strip */}
      {vitals && (
        <div className="pl-1 flex flex-wrap items-center gap-1.5 mb-3 text-[11px]">
          {/* BP */}
          {vitals.systolicBP && (
            <span
              className={`px-2 py-0.5 rounded-md font-semibold ${
                isHypotensive || isHypertensive
                  ? 'bg-red-100 text-red-700 border border-red-200'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              PA {vitals.systolicBP}/{vitals.diastolicBP}
            </span>
          )}

          {/* Heart Rate */}
          {vitals.heartRate && (
            <span
              className={`px-2 py-0.5 rounded-md font-semibold ${
                isTachycardic
                  ? 'bg-red-100 text-red-700 border border-red-200'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              FC {vitals.heartRate} lpm
            </span>
          )}

          {/* SpO2 */}
          {vitals.oxygenSaturation && (
            <span
              className={`px-2 py-0.5 rounded-md font-semibold ${
                isDesaturating
                  ? 'bg-red-100 text-red-700 border border-red-200'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              SpO2 {vitals.oxygenSaturation}%
            </span>
          )}

          {/* Temperature */}
          {vitals.temperature && (
            <span
              className={`px-2 py-0.5 rounded-md font-semibold ${
                isFebrile
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {vitals.temperature}°C
            </span>
          )}

          {/* Glasgow */}
          {vitals.glasgowTotal && (
            <span
              className={`px-2 py-0.5 rounded-md font-semibold ${
                vitals.glasgowTotal < 15
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              GCS {vitals.glasgowTotal}/15
            </span>
          )}
        </div>
      )}

      {/* Footer tags: Allergies & Status */}
      <div className="pl-1 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
        {hasAllergies ? (
          <div className="flex items-center gap-1 text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-md border border-red-200 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            <span>Alergias: {vitals?.allergies?.join(', ')}</span>
          </div>
        ) : (
          <span className="text-slate-400 text-[11px]">Sin alergias reportadas</span>
        )}

        <span className="text-[11px] font-bold uppercase tracking-wider text-petrol-800 bg-teal-50 px-2 py-0.5 rounded-md">
          {patient.status}
        </span>
      </div>
    </div>
  );
};
