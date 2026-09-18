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
  Sparkles,
  ShieldCheck,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { TriageBadge } from '../common/TriageBadge';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { EditPatientModal } from '../patient/EditPatientModal';
import { Edit3 } from 'lucide-react';

interface Props {
  patient: Patient;
  existingPatients?: Patient[];
  onBack: () => void;
  onOpenDocumentExport: () => void;
  onOpenHospitalNotes?: () => void;
  onOpenMedicalOrder?: () => void;
  onOpenAiSuite?: () => void;
  onOpenGuardiaModal?: () => void;
  onOpenHistoryPlanta?: () => void;
  onLoadPreviousHistory?: () => void;
  onStatusChange: (status: PatientStatus) => void;
  onEditPatient?: (updatedData: Partial<Patient>, changes: { field: string; oldVal: any; newVal: any }[]) => void;
  onSelectPatient?: (patient: Patient) => void;
}

export const PatientHeader: React.FC<Props> = ({
  patient,
  existingPatients = [],
  onBack,
  onOpenDocumentExport,
  onOpenHospitalNotes,
  onOpenMedicalOrder,
  onOpenAiSuite,
  onOpenGuardiaModal,
  onOpenHistoryPlanta,
  onLoadPreviousHistory,
  onStatusChange,
  onEditPatient,
  onSelectPatient,
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const actionsMenuRef = React.useRef<HTMLDivElement>(null);

  // Cerrar menú al hacer clic o tocar fuera
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const vitals = patient.vitals;
  const allergies = vitals?.allergies || [];
  const hasAllergies = allergies.length > 0;
  const primaryDiagnosis =
    patient.clinicalHistory?.clinicalImpression ||
    patient.chiefComplaint ||
    'Diagnóstico en evaluación';

  return (
    <div className="bg-white rounded-[18px] border border-slate-200/80 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.05)] sticky top-[56px] z-20 overflow-visible mb-3">
      {/* Top Navigation & Unified Action Row (100% Responsivo Móvil) */}
      <div className="px-3 sm:px-5 py-2 flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 select-none">
        {/* Izquierda: Volver al Tablero & Selector Rápido de Estado */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 hover:text-[#0F4C5C] active:scale-95 transition-all cursor-pointer touch-manipulation min-h-[36px]"
            title="Volver al Tablero de Pacientes"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="hidden sm:inline">Volver al Tablero</span>
            <span className="inline sm:hidden">Tablero</span>
          </button>

          {/* Selector Rápido de Estado Clínico */}
          <div className="relative inline-flex items-center">
            <select
              value={patient.status}
              onChange={(e) => onStatusChange(e.target.value as PatientStatus)}
              className="text-[11px] sm:text-xs font-bold uppercase tracking-wider bg-white hover:bg-slate-100 text-slate-800 pl-2.5 pr-6 py-1.5 rounded-xl border border-slate-200 outline-none cursor-pointer transition-all appearance-none min-h-[36px] touch-manipulation"
              title="Cambiar estado del paciente"
            >
              <option value="activos">Activo</option>
              <option value="observacion">Observación</option>
              <option value="pendientes">Pend. Estudios</option>
              <option value="reevaluacion">Reevaluación</option>
              <option value="ingresados">Ingresado</option>
              <option value="referidos">Referido</option>
              <option value="alta">Alta</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2 pointer-events-none" />
          </div>
        </div>

        {/* Derecha: Botón Maestro Unificado con Menú Desplegable de Opciones */}
        <div className="relative" ref={actionsMenuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#0F4C5C] to-[#166072] hover:from-[#0d3f4d] hover:to-[#0F4C5C] text-white text-xs font-black shadow-xs active:scale-95 transition-all cursor-pointer border border-teal-700/50 touch-manipulation min-h-[36px]"
            title="Menú de Acciones Clínicas y Documentos del Paciente"
          >
            <Layers className="w-4 h-4 text-emerald-300 shrink-0" />
            <span className="truncate">Menú Clínico & Acciones</span>
            <ChevronDown className={`w-3.5 h-3.5 text-teal-200 transition-transform duration-200 shrink-0 ${isMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Menú Desplegable Flotante Táctil (Optimizado para iPhone y Android) */}
          {isMenuOpen && (
            <>
              {/* Backdrop para cerrar en móvil */}
              <div 
                className="fixed inset-0 z-40 bg-black/20 sm:hidden backdrop-blur-2xs" 
                onClick={() => setIsMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-[310px] sm:w-[350px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-2 z-50 animate-in fade-in zoom-in-95 max-h-[82vh] overflow-y-auto divide-y divide-slate-100">
                {/* 1. Navegación */}
                <div className="px-2 py-1 space-y-0.5">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Navegación
                  </div>
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onBack();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors min-h-[44px] touch-manipulation"
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <ArrowLeft className="w-4 h-4 text-slate-600" />
                    </div>
                    <div>
                      <div className="text-slate-800 font-bold">Volver al Tablero</div>
                      <div className="text-[10px] text-slate-500 font-normal">Lista general de pacientes de emergencia</div>
                    </div>
                  </button>
                </div>

                {/* 2. Documentos Clínicos Oficiales Hospital Gatón */}
                <div className="px-2 py-1 space-y-0.5">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Documentos Oficiales (Hospital Dr. Gatón)
                  </div>

                  {/* HISTORIA CLÍNICA PLANTA */}
                  {onOpenHistoryPlanta && (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenHistoryPlanta();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-left rounded-xl text-xs font-bold text-indigo-950 bg-indigo-50/70 hover:bg-indigo-100 active:bg-indigo-200 transition-colors min-h-[44px] touch-manipulation border border-indigo-200/60"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 text-white shadow-2xs">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-indigo-950 font-black">📋 Historia Clínica Planta</div>
                          <div className="text-[10px] text-indigo-700 font-normal">Expediente oficial de hospitalización</div>
                        </div>
                      </div>
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-indigo-600 text-white shrink-0">
                        Oficial
                      </span>
                    </button>
                  )}

                  {/* NOTAS DE INGRESO */}
                  {onOpenHospitalNotes && (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenHospitalNotes();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-xl text-xs font-bold text-teal-900 hover:bg-teal-50 active:bg-teal-100 transition-colors min-h-[44px] touch-manipulation"
                    >
                      <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-teal-700" />
                      </div>
                      <div>
                        <div className="text-teal-950 font-bold">Notas de Ingreso</div>
                        <div className="text-[10px] text-teal-700 font-normal">Emergencia, Sala y Combinada con membrete</div>
                      </div>
                    </button>
                  )}

                  {/* HOJA DE ORDEN MÉDICA */}
                  {onOpenMedicalOrder && (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenMedicalOrder();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-100 active:bg-slate-200 transition-colors min-h-[44px] touch-manipulation"
                    >
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                        <Pill className="w-4 h-4 text-indigo-700" />
                      </div>
                      <div>
                        <div className="text-slate-800 font-bold">Hoja de Órdenes Médicas</div>
                        <div className="text-[10px] text-slate-500 font-normal">Indicaciones y farmacoterapia oficial</div>
                      </div>
                    </button>
                  )}

                  {/* CARGAR HISTORIA PREVIA */}
                  {onLoadPreviousHistory && (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onLoadPreviousHistory();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-xl text-xs font-bold text-amber-900 hover:bg-amber-50 active:bg-amber-100 transition-colors min-h-[44px] touch-manipulation"
                    >
                      <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                        <History className="w-4 h-4 text-amber-700" />
                      </div>
                      <div>
                        <div className="text-amber-950 font-bold">Cargar Historia Previa</div>
                        <div className="text-[10px] text-amber-700 font-normal">Restaurar antecedentes e ingresos previos</div>
                      </div>
                    </button>
                  )}
                </div>

                {/* 3. Herramientas Clínicas, Guardia & IA */}
                <div className="px-2 py-1 space-y-0.5">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Herramientas & Asistencia
                  </div>

                  {/* INGRESAR A GUARDIA CLÍNICA */}
                  {onOpenGuardiaModal && (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenGuardiaModal();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-xl text-xs font-bold text-[#0F4C5C] hover:bg-teal-50 active:bg-teal-100 transition-colors min-h-[44px] touch-manipulation"
                    >
                      <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-4 h-4 text-[#0F4C5C]" />
                      </div>
                      <div>
                        <div className="text-slate-900 font-bold">Ingresar a Guardia Clínica App</div>
                        <div className="text-[10px] text-slate-500 font-normal">Salas 301 a 316 Medicina Interna I y II</div>
                      </div>
                    </button>
                  )}

                  {/* ASISTENTE IA MULTIMODAL */}
                  {onOpenAiSuite && (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenAiSuite();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-xl text-xs font-bold text-emerald-900 hover:bg-emerald-50 active:bg-emerald-100 transition-colors min-h-[44px] touch-manipulation"
                    >
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 text-emerald-700" />
                      </div>
                      <div>
                        <div className="text-emerald-950 font-bold">Asistente IA Multimodal</div>
                        <div className="text-[10px] text-emerald-700 font-normal">RX, TAC, ECG, Gases, Redacción Clínica</div>
                      </div>
                    </button>
                  )}

                  {/* EDITAR DATOS DEL PACIENTE */}
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsEditModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-100 active:bg-slate-200 transition-colors min-h-[44px] touch-manipulation"
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                      <Edit3 className="w-4 h-4 text-slate-700" />
                    </div>
                    <div>
                      <div className="text-slate-800 font-bold">Editar Datos del Paciente</div>
                      <div className="text-[10px] text-slate-500 font-normal">Cédula, nombre, cubículo, edad, médico</div>
                    </div>
                  </button>

                  {/* EXPORTAR EXPEDIENTE / DRIVE */}
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenDocumentExport();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-100 active:bg-slate-200 transition-colors min-h-[44px] touch-manipulation"
                  >
                    <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
                      <FileDown className="w-4 h-4 text-teal-800" />
                    </div>
                    <div>
                      <div className="text-slate-800 font-bold">Exportar Expediente / Drive</div>
                      <div className="text-[10px] text-slate-500 font-normal">Descargar PDF/Word o guardar en Google Drive</div>
                    </div>
                  </button>
                </div>
              </div>
            </>
          )}
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
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
                    {patient.fullName}
                  </h2>
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="p-1 rounded-lg text-slate-400 hover:text-[#0F4C5C] hover:bg-slate-100 transition-all cursor-pointer"
                    title="Editar datos del paciente"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
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

      {/* Modal para Editar Datos del Paciente */}
      {isEditModalOpen && (
        <EditPatientModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          patient={patient}
          existingPatients={existingPatients}
          onSave={(updatedData, changes) => {
            if (onEditPatient) {
              onEditPatient(updatedData, changes);
            }
          }}
          onOpenExistingPatient={onSelectPatient}
        />
      )}
    </div>
  );
};
