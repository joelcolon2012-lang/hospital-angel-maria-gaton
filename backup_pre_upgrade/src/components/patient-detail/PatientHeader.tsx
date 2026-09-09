import React from 'react';
import { Patient, PatientStatus } from '../../types';
import { ArrowLeft, MapPin, AlertTriangle, FileDown, Clock, History, FileText, Pill } from 'lucide-react';
import { TriageBadge } from '../common/TriageBadge';

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
  const hasAllergies = vitals?.allergies && vitals.allergies.length > 0;

  return (
    <div className="bg-white border-b border-slate-200 shadow-sm sticky top-14 z-30">
      {/* Top action row */}
      <div className="px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-petrol-900 hover:text-petrol-700 active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Tablero</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Load Previous History Button */}
          {onLoadPreviousHistory && (
            <button
              onClick={onLoadPreviousHistory}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm"
              title="Cargar o restaurar antecedentes e historia previa del paciente"
            >
              <History className="w-3.5 h-3.5 text-amber-700" />
              <span>Cargar Historia Previa</span>
            </button>
          )}

          {/* Hospital Official Admission Notes Button */}
          {onOpenHospitalNotes && (
            <button
              onClick={onOpenHospitalNotes}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-300 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm"
              title="Generar Nota de Ingreso a Sala o Emergencia (Hospital Regional Ángel María Gatón)"
            >
              <FileText className="w-3.5 h-3.5 text-teal-700" />
              <span>Notas de Ingreso</span>
            </button>
          )}

          {/* Individual Medical Order Button */}
          {onOpenMedicalOrder && (
            <button
              onClick={onOpenMedicalOrder}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-300 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm"
              title="Descargar Hoja de Órdenes Médicas individual con formato oficial"
            >
              <Pill className="w-3.5 h-3.5 text-indigo-700" />
              <span>Orden Médica</span>
            </button>
          )}

          {/* Status selector */}
          <select
            value={patient.status}
            onChange={(e) => onStatusChange(e.target.value as PatientStatus)}
            className="text-xs font-bold uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="activos">Estado: Activo</option>
            <option value="observacion">Estado: Observación</option>
            <option value="pendientes">Estado: Pend. Estudios</option>
            <option value="reevaluacion">Estado: Reevaluación</option>
            <option value="ingresados">Estado: Ingresado</option>
            <option value="referidos">Estado: Referido</option>
            <option value="alta">Estado: Alta Médica</option>
          </select>

          {/* Document & Drive Export Trigger */}
          <button
            onClick={onOpenDocumentExport}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#0F4C5C] hover:bg-petrol-800 text-white rounded-xl text-xs font-bold shadow-sm active:scale-95"
            title="Generar Historia Clínica, PDF o Guardar en Google Drive"
          >
            <FileDown className="w-3.5 h-3.5 text-emerald-300" />
            <span className="hidden sm:inline">Exportar / Drive</span>
          </button>
        </div>
      </div>

      {/* Patient info bar */}
      <div className="px-3 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-start sm:items-center gap-3">
            <TriageBadge level={patient.triageLevel} size="md" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  {patient.fullName}
                </h2>
                <span className="text-xs font-bold text-petrol-900 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                  {patient.internalCode}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                <span>{patient.age ? `${patient.age} años` : 'Edad no reg.'}</span>
                <span>•</span>
                <span>{patient.sex === 'M' ? 'Masculino' : patient.sex === 'F' ? 'Femenino' : 'Otro'}</span>
                <span>•</span>
                <span className="flex items-center gap-1 font-medium text-slate-700">
                  <MapPin className="w-3 h-3 text-petrol-800" />
                  {patient.cubicle}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-500">
                  <Clock className="w-3 h-3" />
                  Llegada: {patient.arrivalDateTime}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Allergy Red Alert Banner */}
        {hasAllergies && (
          <div className="mt-2.5 bg-red-600 text-white px-3 py-1.5 rounded-xl flex items-center justify-between text-xs font-bold shadow-sm animate-pulse">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-white shrink-0" />
              <span>ALERGIAS REGISTRADAS: {vitals?.allergies?.join(', ')}</span>
            </div>
            <span className="text-[10px] bg-red-800/80 px-2 py-0.5 rounded uppercase">Alerta de Seguridad</span>
          </div>
        )}
      </div>
    </div>
  );
};
