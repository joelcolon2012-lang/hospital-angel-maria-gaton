import React, { useState, useEffect } from 'react';
import { 
  X, Copy, Check, FileDown, Save, RefreshCw, 
  FileText, Activity, Brain, AlertCircle, ShieldCheck, Stethoscope 
} from 'lucide-react';
import { Patient, ClinicalHistoryPlanta } from '../../types';
import { 
  generateNotaIngresoPlantaText, 
  exportNotaIngresoPlantaDocx, 
  exportNotaIngresoPlantaPdf, 
  saveNotaIngresoPlantaToPatient 
} from '../../services/notaIngresoPlantaService';

interface NotaIngresoPlantaModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: ClinicalHistoryPlanta;
  patient: Patient;
  onPatientUpdated?: (updated: Patient) => void;
}

export const NotaIngresoPlantaModal: React.FC<NotaIngresoPlantaModalProps> = ({
  isOpen,
  onClose,
  history,
  patient,
  onPatientUpdated
}) => {
  const [noteContent, setNoteContent] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isExportingDocx, setIsExportingDocx] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  // Inicializar o regenerar texto de la nota al abrir o cuando cambia la historia
  useEffect(() => {
    if (isOpen && history) {
      const generated = generateNotaIngresoPlantaText(history, patient);
      setNoteContent(generated);
      setIsCopied(false);
      setSaveSuccess(false);
    }
  }, [isOpen, history, patient]);

  if (!isOpen) return null;

  // Copiar al portapapeles
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(noteContent);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    } catch (err) {
      console.error('Error al copiar al portapapeles:', err);
    }
  };

  // Regenerar desde la historia clínica
  const handleRegenerate = () => {
    if (window.confirm('¿Desea regenerar el texto de la nota a partir de los datos actuales de la Historia Clínica? Se sobreescribirán los cambios manuales.')) {
      const generated = generateNotaIngresoPlantaText(history, patient);
      setNoteContent(generated);
      setSaveSuccess(false);
    }
  };

  // Guardar en el expediente del paciente
  const handleSaveToPatient = async () => {
    setIsSaving(true);
    try {
      await saveNotaIngresoPlantaToPatient(history, patient, noteContent);
      setSaveSuccess(true);
      if (onPatientUpdated) {
        onPatientUpdated({
          ...patient,
          status: 'ingresados',
          cubicle: history.generalData.sala || patient.cubicle
        });
      }
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Error al guardar nota en el expediente:', err);
      alert('Ocurrió un error al guardar la nota en el expediente.');
    } finally {
      setIsSaving(false);
    }
  };

  // Descargar Word
  const handleDownloadDocx = async () => {
    setIsExportingDocx(true);
    try {
      await exportNotaIngresoPlantaDocx(history, noteContent);
    } finally {
      setIsExportingDocx(false);
    }
  };

  // Descargar PDF
  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      await exportNotaIngresoPlantaPdf(history, noteContent);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const wordCount = noteContent.trim().split(/\s+/).filter(Boolean).length;
  const lineCount = noteContent.split('\n').length;

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden text-slate-100">
        
        {/* ENCABEZADO MODAL */}
        <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide uppercase">
                  NOTA DE INGRESO EN PLANTA
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  RECIBIMIENTO EN SALA
                </span>
                {saveSuccess && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 animate-pulse">
                    <Check className="w-3 h-3" /> Guardada en Expediente
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Generada automáticamente a partir de la Historia Clínica de Planta &bull; <span className="text-slate-300 font-semibold">{history.generalData.nombre || patient.fullName}</span> ({history.generalData.edad || patient.age} años) &bull; Sala: <span className="text-indigo-300 font-semibold">{history.generalData.sala || patient.cubicle || 'Medicina Interna'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleRegenerate}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Volver a generar desde los datos actuales de la historia"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Regenerar</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              title="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BARRA DE HERRAMIENTAS Y ACCIONES RÁPIDAS */}
        <div className="px-6 py-2.5 bg-slate-900/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs flex-shrink-0">
          <div className="flex items-center space-x-2 text-slate-400 text-[11px]">
            <span>{wordCount} palabras</span>
            <span>&bull;</span>
            <span>{lineCount} líneas</span>
            <span>&bull;</span>
            <span className="text-slate-400">Texto editable directamente para ajustes</span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Copiar */}
            <button
              onClick={handleCopy}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                isCopied 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
              title="Copiar texto completo al portapapeles"
            >
              {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-indigo-400" />}
              <span>{isCopied ? '¡Copiado!' : 'Copiar Nota'}</span>
            </button>

            {/* Descargar Word */}
            <button
              onClick={handleDownloadDocx}
              disabled={isExportingDocx}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              title="Descargar archivo Word .DOCX oficial"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>{isExportingDocx ? 'Generando...' : 'Word (.DOCX)'}</span>
            </button>

            {/* Descargar PDF */}
            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              title="Descargar archivo PDF institucional"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>{isExportingPdf ? 'Generando...' : 'PDF Oficial'}</span>
            </button>

            {/* Guardar en Expediente */}
            <button
              onClick={handleSaveToPatient}
              disabled={isSaving}
              className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-900/30"
              title="Guardar como nota de ingreso oficial en el expediente del paciente"
            >
              <Save className="w-3.5 h-3.5 text-emerald-200" />
              <span>{isSaving ? 'Guardando...' : 'Guardar en Expediente'}</span>
            </button>
          </div>
        </div>

        {/* CUERPO PRINCIPAL: EDITOR Y RESUMEN LATERAL */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-4 gap-4 p-4 sm:p-6 bg-slate-950/40">
          
          {/* EDITOR DE TEXTO CLÍNICO PRINCIPAL (3 Columnas) */}
          <div className="lg:col-span-3 flex flex-col h-full bg-slate-900 rounded-xl border border-slate-800 shadow-inner overflow-hidden">
            <div className="px-4 py-2 bg-slate-800/60 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-indigo-400" />
                Narrativa Hospitalaria Oficial &bull; Hospital Dr. Ángel María Gatón
              </span>
              <span>Modo Edición Activo</span>
            </div>
            <textarea
              value={noteContent}
              onChange={(e) => {
                setNoteContent(e.target.value);
                setSaveSuccess(false);
              }}
              spellCheck={false}
              className="flex-1 w-full p-4 sm:p-6 bg-slate-900 text-slate-100 font-mono text-xs sm:text-sm leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 overflow-y-auto selection:bg-indigo-600 selection:text-white"
              placeholder="Cargando o generando nota de ingreso..."
            />
          </div>

          {/* PANEL LATERAL DE SÍNTESIS Y CLÍNICA (1 Columna) */}
          <div className="space-y-4 overflow-y-auto pr-1">
            
            {/* Card: Signos Vitales al Ingreso */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center space-x-2 mb-2.5 text-indigo-400">
                <Activity className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Signos Vitales</h4>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                  <span className="text-[10px] text-slate-400 block font-semibold">Tensión Art.</span>
                  <span className="font-bold text-white">
                    {history.vitalSigns.systolicBP || '--'}/{history.vitalSigns.diastolicBP || '--'}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                  <span className="text-[10px] text-slate-400 block font-semibold">Frec. Cardíaca</span>
                  <span className="font-bold text-white">{history.vitalSigns.heartRate || '--'} lpm</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                  <span className="text-[10px] text-slate-400 block font-semibold">Frec. Resp.</span>
                  <span className="font-bold text-white">{history.vitalSigns.respiratoryRate || '--'} rpm</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                  <span className="text-[10px] text-slate-400 block font-semibold">SatO2</span>
                  <span className="font-bold text-white">{history.vitalSigns.oxygenSaturation || '--'}%</span>
                </div>
                <div className="col-span-2 p-2 rounded-lg bg-indigo-950/40 border border-indigo-800/40 flex justify-between items-center">
                  <span className="text-[10px] text-indigo-300 font-semibold">IMC Calculado</span>
                  <span className="font-bold text-indigo-200 text-xs">
                    {history.vitalSigns.bmi ? `${history.vitalSigns.bmi} kg/m²` : '--'}
                  </span>
                </div>
              </div>
            </div>

            {/* Card: Escala Neurológica */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center space-x-2 mb-2 text-purple-400">
                <Brain className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Neurología</h4>
              </div>
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-400 text-[11px]">Glasgow Total</span>
                  <span className="font-bold text-purple-300">
                    {history.neurologicalExam.glasgow.total || 15}/15
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-400 text-[11px]">Fuerza Daniels</span>
                  <span className="font-semibold text-slate-200">
                    MSD: {history.neurologicalExam.muscleStrength.rightUpper ?? 5}/5 | MSI: {history.neurologicalExam.muscleStrength.leftUpper ?? 5}/5
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400 text-[11px]">Conciencia</span>
                  <span className="font-semibold text-slate-200">{history.neurologicalExam.consciousness}</span>
                </div>
              </div>
            </div>

            {/* Card: Diagnósticos de Ingreso */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center space-x-2 mb-2 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Diagnósticos</h4>
              </div>
              <div className="space-y-1.5 text-xs">
                {history.diagnoses.length > 0 ? (
                  history.diagnoses.map((d, i) => (
                    <div key={d.id} className="p-1.5 bg-slate-800/70 border border-slate-700/40 rounded-lg text-slate-200 font-semibold flex items-start gap-1.5">
                      <span className="text-emerald-400 font-bold">{i + 1}.</span>
                      <span className="text-[11px] leading-snug">{d.name}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-slate-400 italic">Sin diagnósticos definidos aún.</p>
                )}
              </div>
            </div>

            {/* Guía Institucional */}
            <div className="p-3 bg-indigo-950/30 border border-indigo-800/40 rounded-xl text-[11px] text-indigo-300 space-y-1">
              <p className="font-bold flex items-center gap-1 text-indigo-200">
                <AlertCircle className="w-3.5 h-3.5" /> Directriz Hospitalaria
              </p>
              <p className="text-slate-400 leading-relaxed text-[10px]">
                Esta nota resume el ingreso en piso/sala para el equipo de enfermería y médicos de guardia. Al hacer clic en <strong>Guardar en Expediente</strong>, se creará automáticamente una entrada en la pestaña de <em>Evoluciones</em> del paciente.
              </p>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
