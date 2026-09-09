import React from 'react';
import { Patient, PatientStatus } from '../../types';
import {
  ArrowLeft,
  MapPin,
  AlertTriangle,
  FileDown,
  Clock,
  History,
  FileText,
  Pill,
  ShieldAlert,
} from 'lucide-react';
import { TriageBadge } from '../common/TriageBadge';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface Props {
  patient: Patient;
  onBack: () => void;
  onOpenDocumentExport: () => void;
  onOpenHospitalNotes?: () => void;
  onOpenMedicalOrder?: () => void;
  onLoadPreviousHistory?: () => void;
  onStatusChange: (status: PatientStatus) => void;
}

export const PatientHeader: React.FC<Props> = ({
  patient,
  onBack,
  onOpenDocumentExport,
  onOpenHospitalNotes,
  onOpenMedicalOrder,
  onLoadPreviousHistory,
  onStatusChange,
}) => {
  const vitals = patient.vitals;
  const allergies = vitals?.allergies || [];
  const hasAllergies = allergies.length > 0;
  const primaryDiagnosis =
    patient.clinicalHistory?.clinicalImpression ||
    patient.chiefComplaint ||
    'Diagnóstico en evaluación';

  return (
    <div className="bg-white rounded-[18px] border border-slate-200/80 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.05)] sticky top-[56px] z-20 overflow-hidden mb-3">
      {/* Top Navigation & Action Row */}
      <div className="px-3 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/40">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-[#0F4C5C] active:scale-95 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400" />
          <span>Volver al Tablero</span>
        </button>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Cargar Historia Previa */}
          {onLoadPreviousHistory && (
            <button
              onClick={onLoadPreviousHistory}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] bg-amber-50 hover:bg-amber-100/80 text-amber-900 border border-amber-200 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
              title="Cargar o restaurar antecedentes e historia previa (.docx / .pdf)"
            >
              <History className="w-3.5 h-3.5 text-amber-700" />
              <span className="hidden sm:inline">Historia Previa</span>
            </button>
          )}

          {/* Notas de Ingreso */}
          {onOpenHospitalNotes && (
            <button
              onClick={onOpenHospitalNotes}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] bg-teal-50 hover:bg-teal-100/80 text-teal-900 border border-teal-200 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
              title="Estudio de Notas de Ingreso (Hospital Ángel María Gatón)"
            >
              <FileText className="w-3.5 h-3.5 text-teal-700" />
              <span>Notas de Ingreso</span>
            </button>
          )}

          {/* Orden Médica */}
          {onOpenMedicalOrder && (
            <button
              onClick={onOpenMedicalOrder}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] bg-indigo-50 hover:bg-indigo-100/80 text-indigo-900 border border-indigo-200 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
              title="Hoja de Órdenes Médicas Oficial"
            >
              <Pill className="w-3.5 h-3.5 text-indigo-700" />
              <span>Orden Médica</span>
            </button>
          )}

          {/* Selector de Estado */}
          <select
            value={patient.status}
            onChange={(e) => onStatusChange(e.target.value as PatientStatus)}
            className="text-xs font-bold uppercase tracking-wider bg-slate-100 hover:bg-slate-200/80 text-slate-800 px-2.5 py-1.5 rounded-[10px] border border-slate-200 outline-none cursor-pointer transition-all"
          >
            <option value="activos">Estado: Activo</option>
            <option value="observacion">Estado: Observación</option>
            <option value="pendientes">Estado: Pend. Estudios</option>
            <option value="reevaluacion">Estado: Reevaluación</option>
            <option value="ingresados">Estado: Ingresado</option>
            <option value="referidos">Estado: Referido</option>
            <option value="alta">Estado: Alta Médica</option>
          </select>

          {/* Exportar / Drive */}
          <button
            onClick={onOpenDocumentExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#0F4C5C] hover:bg-[#134E5E] text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
            title="Exportar Expediente Completo o Guardar en Google Drive"
          >
            <FileDown className="w-3.5 h-3.5 text-emerald-300" />
            <span className="hidden md:inline">Exportar / Drive</span>
          </button>
        </div>
      </div>

      {/* Main Patient Identity Card */}
      <div className="px-3 sm:px-5 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Patient Details Left */}
          <div className="flex items-start sm:items-center gap-3">
            <TriageBadge level={patient.triageLevel} size="md" />

            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
                  {patient.fullName}
                </h2>
                <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  {patient.internalCode}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0F4C5C] bg-[#E0F2FE] px-2 py-0.5 rounded-md border border-[#0F4C5C]/20">
                  <MapPin className="w-3 h-3 text-[#0F4C5C]" />
                  {patient.cubicle || 'Cubículo no asignado'}
                </span>
              </div>

              {/* Demographics row */}
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 font-medium">
                <span>{patient.age ? `${patient.age} años` : 'Edad no reg.'}</span>
                <span>•</span>
                <span>
                  {patient.sex === 'M' ? 'Masculino' : patient.sex === 'F' ? 'Femenino' : 'Otro'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  Llegada: {patient.arrivalDateTime}
                </span>
                {patient.attendingDoctor && (
                  <>
                    <span>•</span>
                    <span className="text-slate-700 font-semibold">
                      Médico: {patient.attendingDoctor}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Chief Diagnosis Preview */}
          <div className="lg:text-right text-xs max-w-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Diagnóstico Principal
            </span>
            <span className="font-bold text-slate-800 line-clamp-1">
              {primaryDiagnosis}
            </span>
          </div>
        </div>

        {/* ALWAYS-VISIBLE ALLERGY BANNER (Apple-Pill High-Visibility) */}
        {hasAllergies ? (
          <div className="mt-3 bg-red-50 text-red-900 px-3.5 py-2 rounded-[12px] flex items-center justify-between text-xs font-bold border border-red-200 shadow-2xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>ALERGIAS REGISTRADAS: {allergies.join(', ')}</span>
            </div>
            <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider font-black">
              Alerta Crítica
            </span>
          </div>
        ) : (
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Sin alergias reportadas hasta el momento</span>
          </div>
        )}
      </div>
    </div>
  );
};
