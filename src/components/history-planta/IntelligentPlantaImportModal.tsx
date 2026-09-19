import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  FileCheck, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  PlusCircle, 
  ArrowLeft, 
  RefreshCw, 
  X, 
  Info,
  ShieldCheck,
  Edit3
} from 'lucide-react';
import { Patient, ClinicalHistoryPlanta } from '../../types';
import { 
  historyPlantaImportEngine, 
  ParsedPlantaImportResult, 
  ConfidenceLevel 
} from '../../services/historyPlantaImportEngine';

interface IntelligentPlantaImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  admissionId?: string;
  onApplyImportedHistory: (history: ClinicalHistoryPlanta) => void;
  onCreateBlankHistory: () => void;
}

type Step = 'SELECT_MODE' | 'UPLOAD' | 'EXTRACTING' | 'PREVIEW';

export const IntelligentPlantaImportModal: React.FC<IntelligentPlantaImportModalProps> = ({
  isOpen,
  onClose,
  patient,
  admissionId,
  onApplyImportedHistory,
  onCreateBlankHistory,
}) => {
  const [step, setStep] = useState<Step>('SELECT_MODE');
  const [sourceType, setSourceType] = useState<'EMERGENCIA' | 'HISTORIA_ANTERIOR' | 'DOCUMENTO_EXTERNO'>('HISTORIA_ANTERIOR');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [importResult, setImportResult] = useState<ParsedPlantaImportResult | null>(null);
  const [editableHistory, setEditableHistory] = useState<ClinicalHistoryPlanta | null>(null);
  const [isDoctorConfirmed, setIsDoctorConfirmed] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSelectMode = (mode: 'BLANK' | 'HISTORIA_ANTERIOR' | 'EMERGENCIA') => {
    if (mode === 'BLANK') {
      onCreateBlankHistory();
      onClose();
      return;
    }

    setSourceType(mode);
    setStep('UPLOAD');
    setIsDoctorConfirmed(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleStartExtraction = async () => {
    setIsProcessing(true);
    setStep('EXTRACTING');
    setProgressStatus('Leyendo archivo y analizando estructura clínica...');

    try {
      let result: ParsedPlantaImportResult;

      if (selectedFile) {
        setProgressStatus(`Extrayendo texto y datos desde ${selectedFile.name}...`);
        result = await historyPlantaImportEngine.processFile(selectedFile, patient, sourceType, admissionId);
      } else if (pastedText.trim().length > 10) {
        setProgressStatus('Normalizando acápites y aplicando reglas anti-alucinación...');
        result = historyPlantaImportEngine.processRawText(pastedText, patient, 'Texto Clínico Pegado', 'txt', sourceType, admissionId);
      } else {
        alert('Por favor seleccione un archivo válido o pegue el texto clínico.');
        setStep('UPLOAD');
        setIsProcessing(false);
        return;
      }

      setProgressStatus('Verificando niveles de confianza y asignando campos no documentados...');
      await new Promise(r => setTimeout(r, 600));

      setImportResult(result);
      setEditableHistory(JSON.parse(JSON.stringify(result.extractedHistory)));
      setStep('PREVIEW');
    } catch (err: any) {
      alert('Error procesando el archivo clínico: ' + (err?.message || 'Error desconocido'));
      setStep('UPLOAD');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    if (!isDoctorConfirmed || !editableHistory) return;
    onApplyImportedHistory(editableHistory);
    onClose();
  };

  const renderConfidenceBadge = (confidence?: ConfidenceLevel) => {
    if (confidence === 'ALTA') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          🟢 ALTA
        </span>
      );
    }
    if (confidence === 'MEDIA') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
          🟡 MEDIA
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
        🔴 NO DOCUMENTADO
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-700 text-white flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/15 rounded-xl backdrop-blur-sm">
              <Sparkles className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Historia Clínica de Planta Inteligente</h2>
              <p className="text-xs text-blue-100">
                {patient.fullName} • {patient.age ? `${patient.age} años` : ''} • Sala: {patient.cubicle || 'Sin asignar'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content by Step */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STEP 1: PANTALLA DE ENTRADA (3 OPCIONES PRINCIPALES) */}
          {step === 'SELECT_MODE' && (
            <div className="space-y-6 py-4">
              <div className="text-center max-w-xl mx-auto">
                <h3 className="text-xl font-bold text-slate-800">¿Cómo desea iniciar la Historia Clínica de Planta?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Seleccione una de las siguientes tres modalidades de trabajo clínico:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {/* Opción 1: Crear desde cero */}
                <button
                  onClick={() => handleSelectMode('BLANK')}
                  className="flex flex-col items-center text-center p-6 rounded-2xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 hover:shadow-lg transition-all group cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-700 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-all shadow-sm mb-4">
                    <PlusCircle className="w-7 h-7" />
                  </div>
                  <h4 className="text-base font-bold text-slate-800 group-hover:text-blue-700 mb-1">
                    Crear Desde Cero
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-3">
                    Plantilla estructurada en blanco para llenado manual completo por el médico de planta.
                  </p>
                  <span className="mt-4 text-[11px] font-semibold text-blue-600 group-hover:underline inline-flex items-center gap-1">
                    Iniciar plantilla vacía →
                  </span>
                </button>

                {/* Opción 2: Cargar historia anterior */}
                <button
                  onClick={() => handleSelectMode('HISTORIA_ANTERIOR')}
                  className="flex flex-col items-center text-center p-6 rounded-2xl border-2 border-indigo-200 hover:border-indigo-600 hover:bg-indigo-50/50 hover:shadow-lg transition-all group cursor-pointer relative"
                >
                  <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-all shadow-sm mb-4">
                    <FileText className="w-7 h-7" />
                  </div>
                  <h4 className="text-base font-bold text-slate-800 group-hover:text-indigo-700 mb-1">
                    Cargar Historia Anterior
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-3">
                    Sube un archivo previo del paciente: internamiento anterior, nota de traslado o resumen clínico.
                  </p>
                  <span className="mt-4 text-[11px] font-semibold text-indigo-600 group-hover:underline inline-flex items-center gap-1">
                    Subir PDF, DOCX, TXT o foto →
                  </span>
                </button>

                {/* Opción 3: Cargar nota de emergencias */}
                <button
                  onClick={() => handleSelectMode('EMERGENCIA')}
                  className="flex flex-col items-center text-center p-6 rounded-2xl border-2 border-cyan-200 hover:border-cyan-600 hover:bg-cyan-50/50 hover:shadow-lg transition-all group cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-2xl bg-cyan-100 text-cyan-700 group-hover:bg-cyan-600 group-hover:text-white flex items-center justify-center transition-all shadow-sm mb-4">
                    <FileCheck className="w-7 h-7" />
                  </div>
                  <h4 className="text-base font-bold text-slate-800 group-hover:text-cyan-700 mb-1">
                    Cargar Nota de Emergencias
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-3">
                    Extrae y migra los datos de la nota de triage/emergencia hacia los acápites oficiales de Planta.
                  </p>
                  <span className="mt-4 text-[11px] font-semibold text-cyan-600 group-hover:underline inline-flex items-center gap-1">
                    Migrar datos de emergencia →
                  </span>
                </button>
              </div>

              {/* Banner de Garantías Clínicas */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3 mt-6 text-xs text-slate-600">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800 font-semibold block mb-0.5">Garantía Estricta Anti-Alucinación (Cero Datos Inventados):</strong>
                  Cualquier acápite ausente en el documento cargado se marcará explícitamente como <span className="font-bold text-rose-700">"NO DOCUMENTADO"</span>. Los datos nunca se guardarán automáticamente sin su previa revisión y confirmación médica.
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CARGA MULTIFORMATO */}
          {step === 'UPLOAD' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep('SELECT_MODE')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  <ArrowLeft className="w-4 h-4" /> Volver a opciones principales
                </button>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                  {sourceType === 'EMERGENCIA' ? 'Fuente: Nota de Emergencias' : 'Fuente: Historia Anterior / Traslado'}
                </span>
              </div>

              {/* Zona de Drop / Carga de archivo */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-indigo-300 hover:border-indigo-600 rounded-2xl p-8 text-center cursor-pointer bg-indigo-50/30 hover:bg-indigo-50/70 transition-all flex flex-col items-center justify-center space-y-3"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.doc,.txt,.jpg,.jpeg,.png"
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-sm">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {selectedFile ? selectedFile.name : 'Haga clic para seleccionar archivo o arrástrelo aquí'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Formatos aceptados: <span className="font-semibold text-slate-700">PDF, DOC, DOCX, TXT, JPG, JPEG, PNG</span> (fotos de notas físicas con OCR)
                  </p>
                </div>
                {selectedFile && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Archivo listo ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>

              {/* Fallback de pegado de texto */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                  O pegue el texto clínico directamente:
                </label>
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Pegue aquí el contenido de la nota de emergencia o historia anterior si la tiene en el portapapeles..."
                  rows={4}
                  className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Botón Iniciar Extracción */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleStartExtraction}
                  disabled={!selectedFile && pastedText.trim().length < 10}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  Procesar y Extraer Acápites
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PROCESANDO / OCR */}
          {step === 'EXTRACTING' && (
            <div className="py-16 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="p-4 bg-indigo-50 rounded-full animate-spin">
                <RefreshCw className="w-8 h-8 text-indigo-600" />
              </div>
              <h4 className="text-base font-bold text-slate-800">Analizando Documento Clínico</h4>
              <p className="text-xs text-slate-600 max-w-md">{progressStatus}</p>
              <div className="w-64 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div className="bg-indigo-600 h-full w-2/3 animate-pulse rounded-full" />
              </div>
            </div>
          )}

          {/* STEP 4: VISTA PREVIA Y CONFIRMACIÓN OBLIGATORIA */}
          {step === 'PREVIEW' && importResult && editableHistory && (
            <div className="space-y-6">
              {/* Barra de Resumen de Confianza */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Auditoría de Extracción Clínica
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Archivo: <span className="font-semibold text-slate-700">{importResult.fileName}</span> ({importResult.fileType.toUpperCase()})
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                    🟢 {importResult.confidenceSummary.altaCount} Alta
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-bold border border-amber-300">
                    🟡 {importResult.confidenceSummary.mediaCount} Media
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 font-bold border border-rose-300">
                    🔴 {importResult.confidenceSummary.notDocumentedCount} No Documentados
                  </span>
                </div>
              </div>

              {/* Lista editable de acápites */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-indigo-600" />
                  Revisión y Edición de Acápites de Planta
                </h4>

                {/* 1. Motivo de Consulta */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">1. Motivo de Consulta</label>
                    {renderConfidenceBadge(importResult.fields['motivo']?.confidence)}
                  </div>
                  <input
                    type="text"
                    value={editableHistory.chiefComplaints?.join(', ') || ''}
                    onChange={(e) => setEditableHistory({
                      ...editableHistory,
                      chiefComplaints: [e.target.value]
                    })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                  />
                </div>

                {/* 2. Historia de la Enfermedad Actual */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">2. Historia de la Enfermedad Actual</label>
                    {renderConfidenceBadge(importResult.fields['hda']?.confidence)}
                  </div>
                  <textarea
                    rows={4}
                    value={editableHistory.presentIllness || ''}
                    onChange={(e) => setEditableHistory({
                      ...editableHistory,
                      presentIllness: e.target.value
                    })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-800"
                  />
                </div>

                {/* 3. Antecedentes Patológicos y Medicamentos */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">3. Antecedentes Patológicos</label>
                    {renderConfidenceBadge(importResult.fields['app.narrative']?.confidence)}
                  </div>
                  <textarea
                    rows={2}
                    value={editableHistory.pathologicalHistory.adulthood || ''}
                    onChange={(e) => setEditableHistory({
                      ...editableHistory,
                      pathologicalHistory: { ...editableHistory.pathologicalHistory, adulthood: e.target.value }
                    })}
                    placeholder="Detalle de antecedentes patológicos personales..."
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-800"
                  />
                </div>

                {/* 4. Signos Vitales */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">4. Signos Vitales Iniciales</label>
                    {renderConfidenceBadge(importResult.fields['vital.ta']?.confidence)}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block">TA Sistólica (mmHg)</span>
                      <input
                        type="number"
                        value={editableHistory.vitalSigns.systolicBP || ''}
                        onChange={(e) => setEditableHistory({
                          ...editableHistory,
                          vitalSigns: { ...editableHistory.vitalSigns, systolicBP: parseInt(e.target.value) || 0 }
                        })}
                        className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block">TA Diastólica (mmHg)</span>
                      <input
                        type="number"
                        value={editableHistory.vitalSigns.diastolicBP || ''}
                        onChange={(e) => setEditableHistory({
                          ...editableHistory,
                          vitalSigns: { ...editableHistory.vitalSigns, diastolicBP: parseInt(e.target.value) || 0 }
                        })}
                        className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block">Frecuencia Cardíaca (lpm)</span>
                      <input
                        type="number"
                        value={editableHistory.vitalSigns.heartRate || ''}
                        onChange={(e) => setEditableHistory({
                          ...editableHistory,
                          vitalSigns: { ...editableHistory.vitalSigns, heartRate: parseInt(e.target.value) || 0 }
                        })}
                        className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block">Sat O2 (%)</span>
                      <input
                        type="number"
                        value={editableHistory.vitalSigns.oxygenSaturation || ''}
                        onChange={(e) => setEditableHistory({
                          ...editableHistory,
                          vitalSigns: { ...editableHistory.vitalSigns, oxygenSaturation: parseInt(e.target.value) || 0 }
                        })}
                        className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Examen Físico */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">5. Examen Físico (Resumen de Sistemas)</label>
                    {renderConfidenceBadge(importResult.fields['pe.general']?.confidence)}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block">Tórax y Pulmones:</span>
                      <input
                        type="text"
                        value={editableHistory.physicalExam.lungs}
                        onChange={(e) => setEditableHistory({
                          ...editableHistory,
                          physicalExam: { ...editableHistory.physicalExam, lungs: e.target.value }
                        })}
                        className="w-full p-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block">Cardiovascular:</span>
                      <input
                        type="text"
                        value={editableHistory.physicalExam.heart}
                        onChange={(e) => setEditableHistory({
                          ...editableHistory,
                          physicalExam: { ...editableHistory.physicalExam, heart: e.target.value }
                        })}
                        className="w-full p-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block">Abdomen:</span>
                      <input
                        type="text"
                        value={editableHistory.physicalExam.abdomen}
                        onChange={(e) => setEditableHistory({
                          ...editableHistory,
                          physicalExam: { ...editableHistory.physicalExam, abdomen: e.target.value }
                        })}
                        className="w-full p-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block">Neurológico:</span>
                      <input
                        type="text"
                        value={editableHistory.physicalExam.neurological}
                        onChange={(e) => setEditableHistory({
                          ...editableHistory,
                          physicalExam: { ...editableHistory.physicalExam, neurological: e.target.value }
                        })}
                        className="w-full p-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* 6. Diagnósticos */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">6. Impresión Diagnóstica</label>
                    {renderConfidenceBadge(importResult.fields['diagnoses']?.confidence)}
                  </div>
                  <div className="space-y-1.5">
                    {editableHistory.diagnoses.map((diag, idx) => (
                      <div key={diag.id || idx} className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 w-5">{idx + 1}.</span>
                        <input
                          type="text"
                          value={diag.name}
                          onChange={(e) => {
                            const newDiag = [...editableHistory.diagnoses];
                            newDiag[idx] = { ...newDiag[idx], name: e.target.value.toUpperCase() };
                            setEditableHistory({ ...editableHistory, diagnoses: newDiag });
                          }}
                          className="flex-1 text-xs p-2 border border-slate-300 rounded-lg font-bold text-slate-800"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* CHECKBOX OBLIGATORIO DE CONFIRMACIÓN MÉDICA */}
              <div className="p-4 rounded-xl border-2 border-amber-300 bg-amber-50/80 space-y-2">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isDoctorConfirmed}
                    onChange={(e) => setIsDoctorConfirmed(e.target.checked)}
                    className="mt-0.5 w-5 h-5 rounded border-amber-400 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-amber-950 leading-relaxed">
                    He revisado los datos importados y confirmo que la información clínica es correcta.
                  </span>
                </label>
                <p className="text-[11px] text-amber-800 ml-8">
                  El botón de aplicación a la Historia de Planta permanecerá deshabilitado hasta que usted marque esta casilla de validación facultativa obligatoria.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div>
            {step === 'PREVIEW' && (
              <button
                onClick={() => setStep('UPLOAD')}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Re-cargar otro archivo
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
            >
              Cerrar
            </button>
            {step === 'PREVIEW' && (
              <button
                onClick={handleApply}
                disabled={!isDoctorConfirmed}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
              >
                <FileCheck className="w-4 h-4" />
                Aplicar a Historia de Planta
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
