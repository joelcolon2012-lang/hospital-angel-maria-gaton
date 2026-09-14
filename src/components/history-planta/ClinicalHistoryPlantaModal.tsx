import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Save, FileDown, CheckCircle2, AlertTriangle, SpellCheck, 
  History, Eye, Clock, Plus, Trash2, Edit3, ArrowUpDown, 
  Activity, Brain, Check, RefreshCw, AlertCircle, FileText, ChevronRight
} from 'lucide-react';
import { 
  Patient, 
  ClinicalHistoryPlanta, 
  PendingFieldItem, 
  SpellingCorrectionProposal, 
  ClinicalInconsistencyAlert,
  ClinicalHistoryVersionRecord
} from '../../types';
import { clinicalHistoryPlantaService } from '../../services/clinicalHistoryPlantaService';
import { clinicalHistorySpellingService } from '../../services/clinicalHistorySpellingService';
import { clinicalHistoryConsistencyService } from '../../services/clinicalHistoryConsistencyService';
import { generateClinicalHistoryDocx } from '../../services/clinicalHistoryDocxExporter';
import { generateClinicalHistoryPdf } from '../../services/clinicalHistoryPdfExporter';

import { PendingFieldsModal } from './PendingFieldsModal';
import { SpellingReviewModal } from './SpellingReviewModal';
import { ConsistencyReviewModal } from './ConsistencyReviewModal';
import { HistoryVersionsModal } from './HistoryVersionsModal';
import { WysiwygPreviewModal } from './WysiwygPreviewModal';
import { NotaIngresoPlantaModal } from './NotaIngresoPlantaModal';

interface ClinicalHistoryPlantaModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  admissionId?: string;
  onPatientUpdated?: (updatedPatient: Patient) => void;
}

export const ClinicalHistoryPlantaModal: React.FC<ClinicalHistoryPlantaModalProps> = ({
  isOpen,
  onClose,
  patient,
  admissionId,
  onPatientUpdated
}) => {
  const [history, setHistory] = useState<ClinicalHistoryPlanta | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeSection, setActiveSection] = useState<string>('sec-datos-generales');
  const [isAutosaving, setIsAutosaving] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Sub-modales
  const [showPendingModal, setShowPendingModal] = useState<boolean>(false);
  const [showSpellingModal, setShowSpellingModal] = useState<boolean>(false);
  const [showConsistencyModal, setShowConsistencyModal] = useState<boolean>(false);
  const [showVersionsModal, setShowVersionsModal] = useState<boolean>(false);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [showNotaIngresoModal, setShowNotaIngresoModal] = useState<boolean>(false);

  // Listas de revisión
  const [pendingFields, setPendingFields] = useState<PendingFieldItem[]>([]);
  const [spellingProposals, setSpellingProposals] = useState<SpellingCorrectionProposal[]>([]);
  const [consistencyAlerts, setConsistencyAlerts] = useState<ClinicalInconsistencyAlert[]>([]);
  const [versions, setVersions] = useState<ClinicalHistoryVersionRecord[]>([]);

  // Sincronización con ingreso
  const [showSyncBanner, setShowSyncBanner] = useState<boolean>(false);

  // Autosave timer debounce ref
  const autosaveTimerRef = useRef<any>(null);

  // Cargar o inicializar historia clínica
  useEffect(() => {
    if (!isOpen || !patient) return;
    setIsLoading(true);

    const load = async () => {
      let current = await clinicalHistoryPlantaService.getHistory(patient.id, admissionId);
      if (!current) {
        current = clinicalHistoryPlantaService.createInitialHistory(patient, admissionId);
        await clinicalHistoryPlantaService.saveHistory(current, 'Creación Inicial');
      } else {
        // Verificar si existen cambios centrales en el paciente (ej. sala o nombre actualizados)
        if (patient.fullName && current.generalData.nombre !== patient.fullName.toUpperCase()) {
          setShowSyncBanner(true);
        }
      }

      setHistory(current);
      updateAnalysis(current);
      setLastSavedTime('Guardado');
      setIsLoading(false);
    };

    load();

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [isOpen, patient?.id, admissionId]);

  // Actualiza listas de pendientes, ortografía e inconsistencias
  const updateAnalysis = (h: ClinicalHistoryPlanta) => {
    const pend = clinicalHistoryPlantaService.getPendingFields(h);
    setPendingFields(pend);

    const alerts = clinicalHistoryConsistencyService.reviewConsistency(h);
    setConsistencyAlerts(alerts);
  };

  // Guardado con debounce automático (3s)
  const triggerAutosave = (updated: ClinicalHistoryPlanta) => {
    setHistory(updated);
    setHasUnsavedChanges(true);
    updateAnalysis(updated);

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(async () => {
      setIsAutosaving(true);
      try {
        await clinicalHistoryPlantaService.saveHistory(updated, 'Guardado Automático');
        setLastSavedTime(`Guardado ${new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}`);
        setHasUnsavedChanges(false);
      } catch (err) {
        console.error('Error en guardado automático:', err);
      } finally {
        setIsAutosaving(false);
      }
    }, 2500);
  };

  // Guardar manual inmediato
  const handleManualSave = async () => {
    if (!history) return;
    setIsAutosaving(true);
    try {
      const saved = await clinicalHistoryPlantaService.saveHistory(history, 'Guardado Manual');
      setHistory(saved);
      setHasUnsavedChanges(false);
      setLastSavedTime('Guardado');
      alert('¡Historia Clínica Planta guardada con éxito!');
    } catch (err) {
      alert('Error al guardar la Historia Clínica.');
    } finally {
      setIsAutosaving(false);
    }
  };

  // Sincronizar desde ingreso
  const handleAcceptSync = () => {
    if (!history) return;
    const updated: ClinicalHistoryPlanta = {
      ...history,
      generalData: {
        ...history.generalData,
        nombre: patient.fullName.toUpperCase(),
        edad: patient.age ? `${patient.age} AÑOS` : history.generalData.edad,
        sexo: patient.sex === 'F' ? 'FEMENINA' : 'MASCULINO',
        sala: patient.cubicle ? patient.cubicle.toUpperCase() : history.generalData.sala
      }
    };
    triggerAutosave(updated);
    setShowSyncBanner(false);
  };

  // Navegar a sección por id
  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Marcar como completada
  const handleMarkAsCompleted = async () => {
    if (!history) return;
    if (pendingFields.length > 0) {
      const proceed = window.confirm(`Esta Historia Clínica tiene ${pendingFields.length} campos pendientes. ¿Desea marcarla como COMPLETADA de todas formas?`);
      if (!proceed) return;
    }
    const updated: ClinicalHistoryPlanta = { ...history, status: 'COMPLETADA' };
    await triggerAutosave(updated);
    alert('Historia Clínica marcada como COMPLETADA exitosamente.');
  };

  if (!isOpen) return null;

  if (isLoading || !history) {
    return (
      <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center">
        <div className="bg-white p-6 rounded-2xl shadow-2xl flex items-center space-x-4">
          <RefreshCw className="w-6 h-6 animate-spin text-teal-600" />
          <span className="text-sm font-semibold text-slate-700">Cargando Historia Clínica Planta...</span>
        </div>
      </div>
    );
  }

  // Lista de las 13 secciones para el menú lateral con estados
  const sectionsMenu = [
    { id: 'sec-datos-generales', title: '1. Datos Generales', status: history.generalData.nombre && history.generalData.sala !== 'PENDIENTE' ? 'COMPLETE' : 'PENDING' },
    { id: 'sec-motivos-consulta', title: '2. Motivos de Consulta', status: history.chiefComplaints.length > 0 ? 'COMPLETE' : 'PENDING' },
    { id: 'sec-enfermedad-actual', title: '3. Enfermedad Actual (HDA)', status: history.presentIllness.length > 20 ? 'COMPLETE' : 'PARTIAL' },
    { id: 'sec-patologicos', title: '4. Antecedentes Patológicos', status: history.pathologicalHistory.adulthood !== 'NO REGISTRADOS.' ? 'COMPLETE' : 'PARTIAL' },
    { id: 'sec-medicamentos', title: '5. Medicamentos Habituales', status: history.pathologicalHistory.medications.length > 0 ? 'COMPLETE' : 'PARTIAL' },
    { id: 'sec-no-patologicos', title: '6. Antecedentes No Patológicos', status: 'COMPLETE' },
    { id: 'sec-heredofamiliares', title: '7. Heredofamiliares', status: 'COMPLETE' },
    { id: 'sec-psicosocial', title: '8. Esfera Psicosocial', status: 'COMPLETE' },
    { id: 'sec-revision-sistemas', title: '9. Revisión por Sistemas', status: 'COMPLETE' },
    { id: 'sec-estado-general', title: '10. Estado General', status: 'COMPLETE' },
    { id: 'sec-signos-vitales', title: '11. Signos Vitales (IMC)', status: history.vitalSigns.systolicBP ? 'COMPLETE' : 'PENDING' },
    { id: 'sec-examen-fisico', title: '12. Examen Físico por Sistemas', status: 'COMPLETE' },
    { id: 'sec-neurologico', title: '13. Examen Neurológico Avanzado', status: history.neurologicalExam.glasgow.total ? 'COMPLETE' : 'PARTIAL' },
    { id: 'sec-diagnosticos', title: '14. Diagnósticos', status: history.diagnoses.length > 0 ? 'COMPLETE' : 'PENDING' }
  ];

  return (
    <div className="fixed inset-0 z-[110] bg-slate-900/80 backdrop-blur-sm flex flex-col overflow-hidden animate-in fade-in duration-200">
      
      {/* 1. BARRA SUPERIOR FIJA PRINCIPAL */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between text-white shadow-lg flex-shrink-0">
        
        {/* Identidad y Paciente */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-teal-500/20 text-teal-400 rounded-xl border border-teal-500/30">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-wide uppercase">HISTORIA CLÍNICA PLANTA</h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                  history.status === 'COMPLETADA' 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                    : history.status === 'EN REVISIÓN'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-700 text-slate-300 border-slate-600'
                }`}>
                  {history.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-2">
                <span>{history.generalData.nombre}</span> &bull; 
                <span>{history.generalData.edad}</span> &bull; 
                <span>SALA: {history.generalData.sala}</span> &bull; 
                <span>VERSIÓN {history.version}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Barra de Acciones Fijas */}
        <div className="flex items-center space-x-2">
          
          {/* Indicador de autosave */}
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mr-2">
            {isAutosaving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-400" />
                <span className="text-teal-400">Guardando...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>{lastSavedTime}</span>
              </>
            )}
          </div>

          <button
            onClick={handleManualSave}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Guardar cambios manualmente"
          >
            <Save className="w-3.5 h-3.5 text-teal-400" />
            <span>Guardar</span>
          </button>

          <button
            onClick={() => {
              const props = clinicalHistorySpellingService.analyzeHistory(history);
              setSpellingProposals(props);
              setShowSpellingModal(true);
            }}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Corrector ortográfico especializado en español médico"
          >
            <SpellCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>Ortografía</span>
          </button>

          <button
            onClick={() => {
              const alerts = clinicalHistoryConsistencyService.reviewConsistency(history);
              setConsistencyAlerts(alerts);
              setShowConsistencyModal(true);
            }}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors relative"
            title="Revisar discordancias clínicas y coherencia"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Coherencia</span>
            {consistencyAlerts.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-1 right-1"></span>
            )}
          </button>

          <button
            onClick={() => {
              const pend = clinicalHistoryPlantaService.getPendingFields(history);
              setPendingFields(pend);
              setShowPendingModal(true);
            }}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors relative"
            title="Checklist de campos pendientes"
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>Pendientes</span>
            {pendingFields.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-bold bg-rose-500 text-white rounded-full ml-0.5">
                {pendingFields.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setShowNotaIngresoModal(true)}
            className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-950/40 ring-1 ring-white/10 hover:scale-[1.02] active:scale-[0.98]"
            title="Generar Nota de Ingreso en Planta oficial a partir de esta Historia Clínica"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-200" />
            <span>Nota de Ingreso Planta</span>
          </button>

          <button
            onClick={() => setShowPreviewModal(true)}
            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            title="Vista previa realista idéntica a la impresión"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Vista Previa</span>
          </button>

          {/* Menú de descargas */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => generateClinicalHistoryDocx(history)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              title="Descargar en Word editable basado en plantilla institucional"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Word .DOCX</span>
            </button>
            <button
              onClick={() => generateClinicalHistoryPdf(history)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              title="Descargar en PDF para impresión oficial"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
          </div>

          <button
            onClick={handleMarkAsCompleted}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            title="Marcar historia como completada tras revisión médica"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Completada</span>
          </button>

          <button
            onClick={async () => {
              const vers = await clinicalHistoryPlantaService.getVersions(history.id);
              setVersions(vers);
              setShowVersionsModal(true);
            }}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
            title="Historial de versiones y auditoría"
          >
            <History className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              if (hasUnsavedChanges) {
                const conf = window.confirm('Tiene modificaciones pendientes de guardado. ¿Desea cerrar de todas formas?');
                if (!conf) return;
              }
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors ml-2"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>

        </div>

      </header>

      {/* BANNER DE SINCRONIZACIÓN CON INGRESO */}
      {showSyncBanner && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-6 py-2.5 flex items-center justify-between text-amber-200 text-xs flex-shrink-0 animate-in slide-in-from-top duration-200">
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-amber-100">
              Existen nuevos datos demográficos o de sala provenientes del registro central del ingreso.
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleAcceptSync}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg transition-colors"
            >
              Actualizar Datos Centrales
            </button>
            <button
              onClick={() => setShowSyncBanner(false)}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"
            >
              Conservar Versión Actual
            </button>
          </div>
        </div>
      )}

      {/* CUERPO PRINCIPAL (SIDEBAR + WORKSPACE) */}
      <div className="flex-1 flex overflow-hidden bg-slate-100">
        
        {/* SIDEBAR DE NAVEGACIÓN FIJO */}
        <aside className="w-64 bg-white border-r border-slate-200 overflow-y-auto p-4 flex flex-col flex-shrink-0 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-3 px-2">
            Estructura Oficial
          </div>
          <nav className="space-y-1 flex-1">
            {sectionsMenu.map(sec => {
              const isActive = activeSection === sec.id;
              const isComplete = sec.status === 'COMPLETE';
              const isPending = sec.status === 'PENDING';
              return (
                <button
                  key={sec.id}
                  onClick={() => scrollToSection(sec.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                    isActive 
                      ? 'bg-teal-50 text-teal-800 border border-teal-200 shadow-sm' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                  }`}
                >
                  <span className="truncate pr-2">{sec.title}</span>
                  {isComplete ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" title="Completo"></span>
                  ) : isPending ? (
                    <span className="w-2 h-2 rounded-full bg-rose-400 flex-shrink-0" title="Pendiente"></span>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" title="Parcial"></span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* WORKSPACE CENTRAL DE EDICIÓN CLÍNICA */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
          
          {/* SECCIÓN 1: DATOS GENERALES */}
          <section id="sec-datos-generales" className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm scroll-mt-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
              1. Datos Generales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Nombre Completo</label>
                <input 
                  type="text"
                  value={history.generalData.nombre}
                  onChange={e => triggerAutosave({ ...history, generalData: { ...history.generalData, nombre: e.target.value.toUpperCase() } })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 focus:outline-none font-semibold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Estado Civil</label>
                <select 
                  value={history.generalData.estadoCivil}
                  onChange={e => triggerAutosave({ ...history, generalData: { ...history.generalData, estadoCivil: e.target.value } })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 focus:outline-none text-slate-800"
                >
                  <option value="SOLTERO(A)">SOLTERO(A)</option>
                  <option value="CASADO(A)">CASADO(A)</option>
                  <option value="UNIÓN LIBRE">UNIÓN LIBRE</option>
                  <option value="VIUDO(A)">VIUDO(A)</option>
                  <option value="DIVORCIADO(A)">DIVORCIADO(A)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Edad</label>
                <input 
                  type="text"
                  value={history.generalData.edad}
                  onChange={e => triggerAutosave({ ...history, generalData: { ...history.generalData, edad: e.target.value } })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 focus:outline-none text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Raza</label>
                <input 
                  type="text"
                  value={history.generalData.raza}
                  onChange={e => triggerAutosave({ ...history, generalData: { ...history.generalData, raza: e.target.value.toUpperCase() } })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 focus:outline-none text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Sexo</label>
                <select 
                  value={history.generalData.sexo}
                  onChange={e => triggerAutosave({ ...history, generalData: { ...history.generalData, sexo: e.target.value } })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 focus:outline-none text-slate-800 font-semibold"
                >
                  <option value="MASCULINO">MASCULINO</option>
                  <option value="FEMENINA">FEMENINA</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Religión</label>
                <input 
                  type="text"
                  value={history.generalData.religion}
                  onChange={e => triggerAutosave({ ...history, generalData: { ...history.generalData, religion: e.target.value.toUpperCase() } })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 focus:outline-none text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Escolaridad</label>
                <input 
                  type="text"
                  value={history.generalData.escolaridad}
                  onChange={e => triggerAutosave({ ...history, generalData: { ...history.generalData, escolaridad: e.target.value.toUpperCase() } })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 focus:outline-none text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Sala / Cama</label>
                <input 
                  type="text"
                  value={history.generalData.sala}
                  onChange={e => triggerAutosave({ ...history, generalData: { ...history.generalData, sala: e.target.value.toUpperCase() } })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 focus:outline-none text-slate-800 font-semibold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Fuente</label>
                <input 
                  type="text"
                  value={history.generalData.fuente}
                  onChange={e => triggerAutosave({ ...history, generalData: { ...history.generalData, fuente: e.target.value.toUpperCase() } })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 focus:outline-none text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Fecha Ingreso</label>
                <input 
                  type="text"
                  value={history.generalData.fechaIngreso}
                  onChange={e => triggerAutosave({ ...history, generalData: { ...history.generalData, fechaIngreso: e.target.value } })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 focus:outline-none text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Hora</label>
                <input 
                  type="text"
                  value={history.generalData.hora}
                  onChange={e => triggerAutosave({ ...history, generalData: { ...history.generalData, hora: e.target.value } })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 focus:outline-none text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Procedencia</label>
                <input 
                  type="text"
                  value={history.generalData.procedencia}
                  onChange={e => triggerAutosave({ ...history, generalData: { ...history.generalData, procedencia: e.target.value.toUpperCase() } })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 focus:outline-none text-slate-800"
                />
              </div>
            </div>
          </section>

          {/* SECCIÓN 2: MOTIVOS DE CONSULTA */}
          <section id="sec-motivos-consulta" className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm scroll-mt-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                2. Motivos de Consulta
              </h3>
              <button
                onClick={() => {
                  const val = prompt('Ingrese nuevo motivo de consulta:');
                  if (val && val.trim()) {
                    const list = [...history.chiefComplaints, val.trim().toUpperCase()];
                    triggerAutosave({ ...history, chiefComplaints: list });
                  }
                }}
                className="px-3 py-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-teal-200"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Motivo
              </button>
            </div>
            <div className="space-y-2">
              {history.chiefComplaints.map((mc, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 text-xs">
                  <span className="font-semibold text-slate-800">&bull; {mc}</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        const edited = prompt('Modificar motivo:', mc);
                        if (edited && edited.trim()) {
                          const list = [...history.chiefComplaints];
                          list[idx] = edited.trim().toUpperCase();
                          triggerAutosave({ ...history, chiefComplaints: list });
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-teal-600 rounded transition-colors"
                      title="Editar"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        const list = history.chiefComplaints.filter((_, i) => i !== idx);
                        triggerAutosave({ ...history, chiefComplaints: list });
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* BANNER ACCIÓN RÁPIDA: GENERAR NOTA DE INGRESO EN PLANTA */}
            <div className="mt-6 p-4 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-indigo-950/30 border border-indigo-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  ¿Desea generar la Nota de Ingreso en Planta oficial?
                </h4>
                <p className="text-[11px] text-slate-300">
                  Sintetiza automáticamente los datos, antecedentes, examen físico, escalas neurológicas y diagnósticos de esta historia en la nota oficial de recibimiento en sala.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNotaIngresoModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-900/30 transition-all hover:scale-105 whitespace-nowrap"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-200" />
                <span>Generar Nota de Ingreso en Planta</span>
              </button>
            </div>
          </section>

          {/* SECCIÓN 3: HISTORIA DE LA ENFERMEDAD ACTUAL */}
          <section id="sec-enfermedad-actual" className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm scroll-mt-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
              3. Historia de la Enfermedad Actual (HDA)
            </h3>
            <textarea
              rows={5}
              value={history.presentIllness}
              onChange={e => triggerAutosave({ ...history, presentIllness: e.target.value })}
              placeholder="Describa cronológicamente el inicio, características del síntoma, intensidad, tratamientos previos y motivo de hospitalización..."
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 focus:outline-none text-xs text-slate-800 leading-relaxed font-sans"
            />
          </section>

          {/* SECCIÓN 4: ANTECEDENTES PERSONALES PATOLÓGICOS */}
          <section id="sec-patologicos" className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm scroll-mt-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
              4. Antecedentes Personales Patológicos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Niñez</label>
                <input 
                  type="text"
                  value={history.pathologicalHistory.childhood}
                  onChange={e => triggerAutosave({ ...history, pathologicalHistory: { ...history.pathologicalHistory, childhood: e.target.value.toUpperCase() } })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Adolescencia</label>
                <input 
                  type="text"
                  value={history.pathologicalHistory.adolescence}
                  onChange={e => triggerAutosave({ ...history, pathologicalHistory: { ...history.pathologicalHistory, adolescence: e.target.value.toUpperCase() } })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Adultez (Patologías Crónicas)</label>
                <input 
                  type="text"
                  value={history.pathologicalHistory.adulthood}
                  onChange={e => triggerAutosave({ ...history, pathologicalHistory: { ...history.pathologicalHistory, adulthood: e.target.value.toUpperCase() } })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Antecedentes Hospitalarios</label>
                <input 
                  type="text"
                  value={history.pathologicalHistory.hospitalizations}
                  onChange={e => triggerAutosave({ ...history, pathologicalHistory: { ...history.pathologicalHistory, hospitalizations: e.target.value.toUpperCase() } })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Antecedentes Quirúrgicos</label>
                <input 
                  type="text"
                  value={history.pathologicalHistory.surgeries}
                  onChange={e => triggerAutosave({ ...history, pathologicalHistory: { ...history.pathologicalHistory, surgeries: e.target.value.toUpperCase() } })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Antecedentes Traumáticos</label>
                <input 
                  type="text"
                  value={history.pathologicalHistory.trauma}
                  onChange={e => triggerAutosave({ ...history, pathologicalHistory: { ...history.pathologicalHistory, trauma: e.target.value.toUpperCase() } })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Transfusionales</label>
                <input 
                  type="text"
                  value={history.pathologicalHistory.transfusions}
                  onChange={e => triggerAutosave({ ...history, pathologicalHistory: { ...history.pathologicalHistory, transfusions: e.target.value.toUpperCase() } })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Antecedentes Alérgicos</label>
                <input 
                  type="text"
                  value={history.pathologicalHistory.allergies}
                  onChange={e => triggerAutosave({ ...history, pathologicalHistory: { ...history.pathologicalHistory, allergies: e.target.value.toUpperCase() } })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 focus:outline-none font-semibold text-rose-700"
                />
              </div>
            </div>
          </section>

          {/* SECCIÓN 5: ANTECEDENTES MEDICAMENTOSOS */}
          <section id="sec-medicamentos" className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm scroll-mt-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                5. Antecedentes Medicamentosos (Fármacos Habituales)
              </h3>
              <button
                onClick={() => {
                  const name = prompt('Nombre del fármaco (ej. VALSARTÁN):');
                  if (!name) return;
                  const dose = prompt('Dosis (ej. 320):', '100') || '';
                  const unit = prompt('Unidad (MG, G, ML, UI):', 'MG') || 'MG';
                  const route = prompt('Vía (VO, EV, SC):', 'VO') || 'VO';
                  const freq = prompt('Frecuencia (ej. C/24 HORAS):', 'C/24 HORAS') || 'C/24 HORAS';
                  const list = [
                    ...(history.pathologicalHistory.medications || []),
                    { id: `med-${Date.now()}`, name: name.toUpperCase(), dose, unit: unit.toUpperCase(), route: route.toUpperCase(), frequency: freq.toUpperCase() }
                  ];
                  triggerAutosave({
                    ...history,
                    pathologicalHistory: { ...history.pathologicalHistory, medications: list }
                  });
                }}
                className="px-3 py-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-teal-200"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Medicamento
              </button>
            </div>
            <div className="space-y-2">
              {history.pathologicalHistory.medications?.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No se han registrado medicamentos habituales.</p>
              ) : (
                history.pathologicalHistory.medications.map((m, idx) => (
                  <div key={m.id} className="flex items-center justify-between bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 text-xs">
                    <span className="font-bold text-slate-800">
                      {m.name} | {m.dose} {m.unit} | {m.route} | {m.frequency}
                    </span>
                    <button
                      onClick={() => {
                        const list = history.pathologicalHistory.medications.filter((_, i) => i !== idx);
                        triggerAutosave({
                          ...history,
                          pathologicalHistory: { ...history.pathologicalHistory, medications: list }
                        });
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      title="Eliminar medicamento"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* SECCIÓN 6: ANTECEDENTES NO PATOLÓGICOS (CON CÁLCULO IPA) */}
          <section id="sec-no-patologicos" className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm scroll-mt-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
              6. Antecedentes Personales No Patológicos (Tabaquismo & Hábitos)
            </h3>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={history.nonPathologicalHistory.tobacco.consumes}
                    onChange={e => {
                      const consumes = e.target.checked;
                      triggerAutosave({
                        ...history,
                        nonPathologicalHistory: {
                          ...history.nonPathologicalHistory,
                          tobacco: { ...history.nonPathologicalHistory.tobacco, consumes }
                        }
                      });
                    }}
                    className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                  />
                  <span className="text-xs font-bold text-slate-800">Consumo de Tabaco</span>
                </label>
                {history.nonPathologicalHistory.tobacco.consumes && (
                  <span className="text-xs font-bold px-2.5 py-1 bg-teal-100 text-teal-800 rounded-lg border border-teal-200">
                    Índice Paquete-Año (IPA): {history.nonPathologicalHistory.tobacco.packYears}
                  </span>
                )}
              </div>
              {history.nonPathologicalHistory.tobacco.consumes && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-2 border-t border-slate-200/60">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Cigarrillos al Día</label>
                    <input 
                      type="number"
                      value={history.nonPathologicalHistory.tobacco.cigarettesPerDay}
                      onChange={e => {
                        const cig = parseInt(e.target.value) || 0;
                        const yrs = history.nonPathologicalHistory.tobacco.yearsSmoking;
                        const ipa = clinicalHistoryPlantaService.calculatePackYears(cig, yrs);
                        triggerAutosave({
                          ...history,
                          nonPathologicalHistory: {
                            ...history.nonPathologicalHistory,
                            tobacco: { ...history.nonPathologicalHistory.tobacco, cigarettesPerDay: cig, packYears: ipa }
                          }
                        });
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Años Fumando</label>
                    <input 
                      type="number"
                      value={history.nonPathologicalHistory.tobacco.yearsSmoking}
                      onChange={e => {
                        const yrs = parseInt(e.target.value) || 0;
                        const cig = history.nonPathologicalHistory.tobacco.cigarettesPerDay;
                        const ipa = clinicalHistoryPlantaService.calculatePackYears(cig, yrs);
                        triggerAutosave({
                          ...history,
                          nonPathologicalHistory: {
                            ...history.nonPathologicalHistory,
                            tobacco: { ...history.nonPathologicalHistory.tobacco, yearsSmoking: yrs, packYears: ipa }
                          }
                        });
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Años desde Abandono (si aplica)</label>
                    <input 
                      type="number"
                      value={history.nonPathologicalHistory.tobacco.yearsSinceQuit || 0}
                      onChange={e => {
                        const q = parseInt(e.target.value) || 0;
                        triggerAutosave({
                          ...history,
                          nonPathologicalHistory: {
                            ...history.nonPathologicalHistory,
                            tobacco: { ...history.nonPathologicalHistory.tobacco, yearsSinceQuit: q }
                          }
                        });
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Café</label>
                <input 
                  type="text"
                  value={history.nonPathologicalHistory.coffee}
                  onChange={e => triggerAutosave({ ...history, nonPathologicalHistory: { ...history.nonPathologicalHistory, coffee: e.target.value.toUpperCase() } })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Alcohol</label>
                <input 
                  type="text"
                  value={history.nonPathologicalHistory.alcohol}
                  onChange={e => triggerAutosave({ ...history, nonPathologicalHistory: { ...history.nonPathologicalHistory, alcohol: e.target.value.toUpperCase() } })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Drogas Ilícitas</label>
                <input 
                  type="text"
                  value={history.nonPathologicalHistory.illicitDrugs}
                  onChange={e => triggerAutosave({ ...history, nonPathologicalHistory: { ...history.nonPathologicalHistory, illicitDrugs: e.target.value.toUpperCase() } })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Té</label>
                <input 
                  type="text"
                  value={history.nonPathologicalHistory.tea}
                  onChange={e => triggerAutosave({ ...history, nonPathologicalHistory: { ...history.nonPathologicalHistory, tea: e.target.value.toUpperCase() } })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Trabajos Anteriores</label>
                <input 
                  type="text"
                  value={history.nonPathologicalHistory.previousJobs}
                  onChange={e => triggerAutosave({ ...history, nonPathologicalHistory: { ...history.nonPathologicalHistory, previousJobs: e.target.value.toUpperCase() } })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Exposición a Tóxicos / Biomasa</label>
                <input 
                  type="text"
                  value={history.nonPathologicalHistory.toxicExposure}
                  onChange={e => triggerAutosave({ ...history, nonPathologicalHistory: { ...history.nonPathologicalHistory, toxicExposure: e.target.value.toUpperCase() } })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>
          </section>

          {/* SECCIÓN 7: HEREDOFAMILIARES */}
          <section id="sec-heredofamiliares" className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm scroll-mt-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
              7. Antecedentes Heredofamiliares
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Padre</label>
                <input 
                  type="text"
                  value={history.familyHistory.father.morbidities}
                  onChange={e => triggerAutosave({ ...history, familyHistory: { ...history.familyHistory, father: { ...history.familyHistory.father, morbidities: e.target.value.toUpperCase() } } })}
                  placeholder="Vivo / Fallecido, antecedentes..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Madre</label>
                <input 
                  type="text"
                  value={history.familyHistory.mother.morbidities}
                  onChange={e => triggerAutosave({ ...history, familyHistory: { ...history.familyHistory, mother: { ...history.familyHistory.mother, morbidities: e.target.value.toUpperCase() } } })}
                  placeholder="Viva / Fallecida, antecedentes..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Hermanos</label>
                <input 
                  type="text"
                  value={history.familyHistory.siblings.details}
                  onChange={e => triggerAutosave({ ...history, familyHistory: { ...history.familyHistory, siblings: { ...history.familyHistory.siblings, details: e.target.value.toUpperCase() } } })}
                  placeholder="# de hermanos, estado de salud..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Hijos</label>
                <input 
                  type="text"
                  value={history.familyHistory.children.details}
                  onChange={e => triggerAutosave({ ...history, familyHistory: { ...history.familyHistory, children: { ...history.familyHistory.children, details: e.target.value.toUpperCase() } } })}
                  placeholder="# de hijos, sanos o patologías..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>
          </section>

          {/* SECCIÓN 8: ESFERA PSICOSOCIAL */}
          <section id="sec-psicosocial" className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm scroll-mt-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
              8. Esfera Psicosocial y Condiciones de Vivienda
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Ingresos Mensuales al Hogar</label>
                <input 
                  type="text"
                  value={history.psychosocialHistory.monthlyIncome}
                  onChange={e => triggerAutosave({ ...history, psychosocialHistory: { ...history.psychosocialHistory, monthlyIncome: e.target.value } })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Tipo de Vivienda</label>
                <input 
                  type="text"
                  value={history.psychosocialHistory.housing.housingType}
                  onChange={e => triggerAutosave({ ...history, psychosocialHistory: { ...history.psychosocialHistory, housing: { ...history.psychosocialHistory.housing, housingType: e.target.value.toUpperCase() } } })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Narrativa de Vivienda y Servicios</label>
                <textarea 
                  rows={2}
                  value={history.psychosocialHistory.narrativeText}
                  onChange={e => triggerAutosave({ ...history, psychosocialHistory: { ...history.psychosocialHistory, narrativeText: e.target.value } })}
                  placeholder="Material de techo, paredes, piso, número de habitaciones, personas, baño, agua y luz..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>
          </section>

          {/* SECCIÓN 9: REVISIÓN POR SISTEMAS */}
          <section id="sec-revision-sistemas" className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm scroll-mt-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
              9. Revisión por Sistemas
            </h3>
            <div className="space-y-3">
              {Object.entries(history.reviewOfSystems).map(([sysKey, sysData]) => {
                const sysTitle = sysKey.toUpperCase();
                return (
                  <div key={sysKey} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div className="w-44 font-bold text-slate-700">{sysTitle}</div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => {
                          const updated = { ...history.reviewOfSystems, [sysKey]: { status: 'NORMAL', notes: 'SIN PATOLOGÍAS REFERIDAS.' } };
                          triggerAutosave({ ...history, reviewOfSystems: updated as any });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                          sysData.status === 'NORMAL' 
                            ? 'bg-emerald-600 border-emerald-600 text-white' 
                            : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        NORMAL
                      </button>
                      <button
                        onClick={() => {
                          const updated = { ...history.reviewOfSystems, [sysKey]: { ...sysData, status: 'CON_HALLAZGOS' } };
                          triggerAutosave({ ...history, reviewOfSystems: updated as any });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                          sysData.status === 'CON_HALLAZGOS' 
                            ? 'bg-amber-600 border-amber-600 text-white' 
                            : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        CON HALLAZGOS
                      </button>
                      <button
                        onClick={() => {
                          const updated = { ...history.reviewOfSystems, [sysKey]: { ...sysData, status: 'NO_EVALUADO', notes: 'PENDIENTE DE EVALUACIÓN' } };
                          triggerAutosave({ ...history, reviewOfSystems: updated as any });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                          sysData.status === 'NO_EVALUADO' 
                            ? 'bg-slate-600 border-slate-600 text-white' 
                            : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        NO EVALUADO
                      </button>
                    </div>
                    <input 
                      type="text"
                      value={sysData.notes}
                      onChange={e => {
                        const updated = { ...history.reviewOfSystems, [sysKey]: { ...sysData, notes: e.target.value } };
                        triggerAutosave({ ...history, reviewOfSystems: updated as any });
                      }}
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500"
                    />
                  </div>
                );
              })}
            </div>
          </section>

          {/* SECCIÓN 10 & 11: ESTADO GENERAL Y SIGNOS VITALES */}
          <section id="sec-signos-vitales" className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm scroll-mt-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
              10. Estado General & 11. Signos Vitales (con IMC)
            </h3>
            
            <div className="mb-4">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Descripción del Estado General</label>
              <input 
                type="text"
                value={history.generalStatus.generalStatusSummary}
                onChange={e => triggerAutosave({ ...history, generalStatus: { ...history.generalStatus, generalStatusSummary: e.target.value } })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">TA Sistólica</label>
                <input 
                  type="number"
                  value={history.vitalSigns.systolicBP || ''}
                  onChange={e => triggerAutosave({ ...history, vitalSigns: { ...history.vitalSigns, systolicBP: parseInt(e.target.value) || undefined } })}
                  placeholder="120"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">TA Diastólica</label>
                <input 
                  type="number"
                  value={history.vitalSigns.diastolicBP || ''}
                  onChange={e => triggerAutosave({ ...history, vitalSigns: { ...history.vitalSigns, diastolicBP: parseInt(e.target.value) || undefined } })}
                  placeholder="80"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">FC (L/M)</label>
                <input 
                  type="number"
                  value={history.vitalSigns.heartRate || ''}
                  onChange={e => triggerAutosave({ ...history, vitalSigns: { ...history.vitalSigns, heartRate: parseInt(e.target.value) || undefined } })}
                  placeholder="75"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">FR (R/M)</label>
                <input 
                  type="number"
                  value={history.vitalSigns.respiratoryRate || ''}
                  onChange={e => triggerAutosave({ ...history, vitalSigns: { ...history.vitalSigns, respiratoryRate: parseInt(e.target.value) || undefined } })}
                  placeholder="18"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Temp (°C)</label>
                <input 
                  type="number"
                  step="0.1"
                  value={history.vitalSigns.temperature || ''}
                  onChange={e => triggerAutosave({ ...history, vitalSigns: { ...history.vitalSigns, temperature: parseFloat(e.target.value) || undefined } })}
                  placeholder="37"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">SatO2 (%)</label>
                <input 
                  type="number"
                  value={history.vitalSigns.oxygenSaturation || ''}
                  onChange={e => triggerAutosave({ ...history, vitalSigns: { ...history.vitalSigns, oxygenSaturation: parseInt(e.target.value) || undefined } })}
                  placeholder="98"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-teal-700"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Peso (kg)</label>
                <input 
                  type="number"
                  value={history.vitalSigns.weight || ''}
                  onChange={e => {
                    const w = parseFloat(e.target.value) || undefined;
                    const imc = clinicalHistoryPlantaService.calculateBmi(w, history.vitalSigns.height);
                    triggerAutosave({ ...history, vitalSigns: { ...history.vitalSigns, weight: w, bmi: imc } });
                  }}
                  placeholder="70"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Talla (cm)</label>
                <input 
                  type="number"
                  value={history.vitalSigns.height || ''}
                  onChange={e => {
                    const h = parseFloat(e.target.value) || undefined;
                    const imc = clinicalHistoryPlantaService.calculateBmi(history.vitalSigns.weight, h);
                    triggerAutosave({ ...history, vitalSigns: { ...history.vitalSigns, height: h, bmi: imc } });
                  }}
                  placeholder="170"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>
            </div>
            {history.vitalSigns.bmi && (
              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className="font-bold text-slate-700">Índice de Masa Corporal (IMC):</span>
                <span className="px-2.5 py-0.5 bg-teal-100 text-teal-800 font-bold rounded-full">
                  {history.vitalSigns.bmi} kg/m²
                </span>
              </div>
            )}
          </section>

          {/* SECCIÓN 12: EXAMEN FÍSICO POR SISTEMAS */}
          <section id="sec-examen-fisico" className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm scroll-mt-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
              12. Examen Físico por Sistemas (Orden Cefalocaudal Estricto)
            </h3>
            <div className="space-y-3 text-xs">
              {Object.entries(history.physicalExam).map(([key, val]) => {
                if (key === 'neurological') return null; // Se maneja en la sección 13
                const label = key.toUpperCase();
                return (
                  <div key={key} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center gap-3">
                    <div className="w-48 font-bold text-slate-800">{label}</div>
                    <input 
                      type="text"
                      value={val as string}
                      onChange={e => {
                        const updatedPe = { ...history.physicalExam, [key]: e.target.value };
                        triggerAutosave({ ...history, physicalExam: updatedPe });
                      }}
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500"
                    />
                  </div>
                );
              })}
            </div>
          </section>

          {/* SECCIÓN 13: EXAMEN NEUROLÓGICO AVANZADO */}
          <section id="sec-neurologico" className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm scroll-mt-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                13. Examen Neurológico Estructurado y Avanzado
              </h3>
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full border border-indigo-200">
                Glasgow: {history.neurologicalExam.glasgow.total}/15
              </span>
            </div>

            {/* Escala de Glasgow */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase mb-3">Escala de Coma de Glasgow</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Respuesta Ocular (/4)</label>
                  <select 
                    value={history.neurologicalExam.glasgow.eye}
                    onChange={e => {
                      const eye = parseInt(e.target.value);
                      const g = history.neurologicalExam.glasgow;
                      const total = eye + g.verbal + g.motor;
                      triggerAutosave({
                        ...history,
                        neurologicalExam: {
                          ...history.neurologicalExam,
                          glasgow: { ...g, eye, total }
                        }
                      });
                    }}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                  >
                    <option value="4">4 - Espontánea</option>
                    <option value="3">3 - Al estímulo verbal</option>
                    <option value="2">2 - Al estímulo doloroso</option>
                    <option value="1">1 - Sin respuesta</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Respuesta Verbal (/5)</label>
                  <select 
                    value={history.neurologicalExam.glasgow.verbal}
                    onChange={e => {
                      const verbal = parseInt(e.target.value);
                      const g = history.neurologicalExam.glasgow;
                      const total = g.eye + verbal + g.motor;
                      triggerAutosave({
                        ...history,
                        neurologicalExam: {
                          ...history.neurologicalExam,
                          glasgow: { ...g, verbal, total }
                        }
                      });
                    }}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                  >
                    <option value="5">5 - Orientada y conversando</option>
                    <option value="4">4 - Desorientada y conversando</option>
                    <option value="3">3 - Palabras inapropiadas</option>
                    <option value="2">2 - Sonidos incomprensibles</option>
                    <option value="1">1 - Sin respuesta</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Respuesta Motora (/6)</label>
                  <select 
                    value={history.neurologicalExam.glasgow.motor}
                    onChange={e => {
                      const motor = parseInt(e.target.value);
                      const g = history.neurologicalExam.glasgow;
                      const total = g.eye + g.verbal + motor;
                      triggerAutosave({
                        ...history,
                        neurologicalExam: {
                          ...history.neurologicalExam,
                          glasgow: { ...g, motor, total }
                        }
                      });
                    }}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                  >
                    <option value="6">6 - Obedece órdenes</option>
                    <option value="5">5 - Localiza el dolor</option>
                    <option value="4">4 - Retira al dolor (flexión)</option>
                    <option value="3">3 - Flexión anormal (decorticación)</option>
                    <option value="2">2 - Extensión anormal (descerebración)</option>
                    <option value="1">1 - Sin respuesta</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Fuerza Muscular Daniels */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase mb-3">Fuerza Muscular (Escala de Daniels 0-5)</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {['rightUpper', 'leftUpper', 'rightLower', 'leftLower'].map(memberKey => {
                  const labelMap: Record<string, string> = {
                    rightUpper: 'MS Derecho (MSD)',
                    leftUpper: 'MS Izquierdo (MSI)',
                    rightLower: 'MI Derecho (MID)',
                    leftLower: 'MI Izquierdo (MII)'
                  };
                  const currentVal = (history.neurologicalExam.muscleStrength as any)[memberKey];
                  return (
                    <div key={memberKey}>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">{labelMap[memberKey]}</label>
                      <select 
                        value={currentVal}
                        onChange={e => {
                          const val = parseInt(e.target.value);
                          triggerAutosave({
                            ...history,
                            neurologicalExam: {
                              ...history.neurologicalExam,
                              muscleStrength: {
                                ...history.neurologicalExam.muscleStrength,
                                [memberKey]: val
                              }
                            }
                          });
                        }}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-800"
                      >
                        <option value="5">5/5 - Fuerza Normal</option>
                        <option value="4">4/5 - Vence gravedad y resistencia</option>
                        <option value="3">3/5 - Vence gravedad, no resistencia</option>
                        <option value="2">2/5 - Movimiento sin gravedad</option>
                        <option value="1">1/5 - Contracción perceptible</option>
                        <option value="0">0/5 - Plejia total</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Narrativa continua generada */}
            <div className="mt-4">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Narrativa Médica Continua (Se actualiza automáticamente con cada cambio estructurado)
              </label>
              <textarea 
                rows={4}
                value={history.neurologicalExam.narrativeText}
                onChange={e => {
                  triggerAutosave({
                    ...history,
                    neurologicalExam: {
                      ...history.neurologicalExam,
                      narrativeText: e.target.value
                    }
                  });
                }}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 leading-relaxed font-sans"
              />
            </div>
          </section>

          {/* SECCIÓN 14: DIAGNÓSTICOS */}
          <section id="sec-diagnosticos" className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm scroll-mt-6 mb-12">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                14. Diagnósticos de Ingreso en Planta
              </h3>
              <button
                onClick={() => {
                  const val = prompt('Ingrese diagnóstico clínico:');
                  if (val && val.trim()) {
                    const list = [
                      ...history.diagnoses,
                      { id: `diag-${Date.now()}`, name: val.trim().toUpperCase(), priorityIndex: history.diagnoses.length + 1 }
                    ];
                    triggerAutosave({ ...history, diagnoses: list });
                  }
                }}
                className="px-3 py-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-teal-200"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Diagnóstico
              </button>
            </div>
            <div className="space-y-2">
              {history.diagnoses.map((d, idx) => (
                <div key={d.id} className="flex items-center justify-between bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 text-xs">
                  <span className="font-bold text-slate-900">
                    {idx + 1}. {d.name}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        const edited = prompt('Modificar diagnóstico:', d.name);
                        if (edited && edited.trim()) {
                          const list = [...history.diagnoses];
                          list[idx].name = edited.trim().toUpperCase();
                          triggerAutosave({ ...history, diagnoses: list });
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-teal-600 rounded transition-colors"
                      title="Editar"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        const list = history.diagnoses.filter((_, i) => i !== idx);
                        triggerAutosave({ ...history, diagnoses: list });
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </main>

      </div>

      {/* SUB-MODALES */}
      <PendingFieldsModal
        isOpen={showPendingModal}
        onClose={() => setShowPendingModal(false)}
        pendingFields={pendingFields}
        onNavigateToSection={scrollToSection}
      />

      <SpellingReviewModal
        isOpen={showSpellingModal}
        onClose={() => setShowSpellingModal(false)}
        proposals={spellingProposals}
        onApplyCorrections={(accepted) => {
          let updated = { ...history };
          // Aplicar propuestas aceptadas
          accepted.forEach(p => {
            if (p.fieldKey === 'presentIllness') {
              updated.presentIllness = updated.presentIllness.replace(new RegExp(p.originalWord, 'g'), p.proposedWord);
            }
          });
          triggerAutosave(updated);
        }}
      />

      <ConsistencyReviewModal
        isOpen={showConsistencyModal}
        onClose={() => setShowConsistencyModal(false)}
        alerts={consistencyAlerts}
        onNavigateToSection={scrollToSection}
      />

      <HistoryVersionsModal
        isOpen={showVersionsModal}
        onClose={() => setShowVersionsModal(false)}
        versions={versions}
        onRestoreVersion={async (versionId) => {
          const restored = await clinicalHistoryPlantaService.restoreVersion(versionId);
          if (restored) {
            setHistory(restored);
            updateAnalysis(restored);
            alert('Versión restaurada con éxito.');
          }
        }}
      />

      <WysiwygPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        history={history}
      />

      {showNotaIngresoModal && history && (
        <NotaIngresoPlantaModal
          isOpen={showNotaIngresoModal}
          onClose={() => setShowNotaIngresoModal(false)}
          history={history}
          patient={patient}
          onPatientUpdated={onPatientUpdated}
        />
      )}

    </div>
  );
};
