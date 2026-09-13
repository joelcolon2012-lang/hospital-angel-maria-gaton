import React, { useState } from 'react';
import {
  Sparkles,
  X,
  FileText,
  Activity,
  Heart,
  Wind,
  Droplets,
  Camera,
  Upload,
  Check,
  Copy,
  AlertTriangle,
  Info,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Clock,
  Layers
} from 'lucide-react';
import { Patient, MedicalOrder, LabResult, PatientEvolution } from '../../types';
import { GeminiClinicalService, AbgClinicalAnalysis, EcgClinicalAnalysis } from '../../services/ai/GeminiClinicalService';

export type AIFeatureTab = 'redaccion' | 'notas' | 'rx' | 'tac' | 'gases' | 'ecg';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  orders?: MedicalOrder[];
  labs?: LabResult[];
  evolutions?: PatientEvolution[];
  initialTab?: AIFeatureTab;
  onInsertToNote?: (text: string) => void;
  onInsertToEvolution?: (text: string) => void;
}

export const PatientAIAnalysisModal: React.FC<Props> = ({
  isOpen,
  onClose,
  patient,
  orders = [],
  labs = [],
  evolutions = [],
  initialTab,
  onInsertToNote,
  onInsertToEvolution
}) => {
  const getInitialTab = (): 'redaccion' | 'rx' | 'tac' | 'gases' | 'ecg' => {
    if (initialTab === 'notas' || initialTab === 'redaccion') return 'redaccion';
    if (initialTab) return initialTab;
    return 'redaccion';
  };

  const [activeTab, setActiveTab] = useState<'redaccion' | 'rx' | 'tac' | 'gases' | 'ecg'>(getInitialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab === 'notas' ? 'redaccion' : initialTab);
    }
  }, [initialTab, isOpen]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // 1. Redacción de Notas
  const [noteType, setNoteType] = useState<'ingreso' | 'evolucion' | 'egreso'>('ingreso');
  const [generatedDraft, setGeneratedDraft] = useState('');
  const [clinicalHighlights, setClinicalHighlights] = useState<string[]>([]);
  const [isAiGenerated, setIsAiGenerated] = useState(false);

  // 2. Multimodal: RX / TAC
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState('');
  const [multimodalReport, setMultimodalReport] = useState<{
    interpretation: string;
    findings: string[];
    urgency: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
    recommendations: string[];
  } | null>(null);

  // 3. Gases Arteriales (ABG)
  const [abgInput, setAbgInput] = useState({
    ph: 7.32,
    pco2: 28,
    po2: 84,
    hco3: 14,
    lactate: 2.8,
    fio2: 0.21,
    na: 138,
    cl: 104,
    albumin: 3.5
  });
  const [abgReport, setAbgReport] = useState<AbgClinicalAnalysis | null>(null);

  // 4. Electrocardiograma
  const [ecgReport, setEcgReport] = useState<{
    interpretation: string;
    findings: string[];
    urgency: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
    recommendations: string[];
  } | null>(null);

  if (!isOpen) return null;

  // Manejador de redacción con estilo del Dr. Colón
  const handleGenerateDraft = async () => {
    if (!patient) {
      alert('Por favor selecciona un paciente del tablero para redactar su nota clínica institucional.');
      return;
    }
    setIsProcessing(true);
    try {
      const res = await GeminiClinicalService.generateHospitalClinicalNoteDraft(
        patient,
        noteType,
        evolutions,
        orders,
        labs
      );
      setGeneratedDraft(res.draft);
      setClinicalHighlights(res.clinicalHighlights);
      setIsAiGenerated(res.isAiGenerated);
    } catch (e) {
      console.warn('Error en borrador:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  // Manejador de carga de fotos para RX / TAC / ECG
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, studyType: 'rx' | 'tac' | 'ecg') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFileName(file.name);
    const reader = new FileReader();
    reader.onload = async () => {
      const b64 = reader.result as string;
      setUploadedImage(b64);
      setIsProcessing(true);

      try {
        const patientDesc = patient
          ? `Paciente ${patient.fullName}, ${patient.age || 'N/D'} años. Diagnóstico: ${patient.clinicalHistory?.clinicalImpression || patient.chiefComplaint}`
          : 'Estudio clínico de paciente en evaluación médica hospitalaria';

        const res = await GeminiClinicalService.analyzeMultimodalImage(
          b64,
          file.type,
          studyType,
          patientDesc
        );

        if (studyType === 'ecg') {
          setEcgReport(res);
        } else {
          setMultimodalReport(res);
        }
      } catch (err) {
        console.warn('Error en análisis de imagen:', err);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Manejador para cálculo de Gases Arteriales
  const handleCalculateAbg = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const report = GeminiClinicalService.calculateAndInterpretAbg(abgInput);
      setAbgReport(report);
      setIsProcessing(false);
    }, 200);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleInsert = (text: string, destination: 'nota' | 'evolucion') => {
    if (destination === 'nota' && onInsertToNote) {
      onInsertToNote(text);
      setSuccessMessage('Texto insertado en la Nota Clínica');
      setTimeout(() => setSuccessMessage(''), 2500);
    } else if (destination === 'evolucion' && onInsertToEvolution) {
      onInsertToEvolution(text);
      setSuccessMessage('Texto insertado en la Evolución del Turno');
      setTimeout(() => setSuccessMessage(''), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Cabecera Modal */}
        <div className="bg-gradient-to-r from-[#0F4C5C] to-[#1c6a7e] text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-teal-300 shadow-xs">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">Suite de Inteligencia Artificial Clínica</h3>
                <span className="text-[10px] bg-teal-400/20 text-teal-200 px-2 py-0.5 rounded-full border border-teal-300/30">
                  Multimodal Gemini
                </span>
              </div>
              <p className="text-xs text-teal-100">
                {patient ? (
                  <>Paciente: <strong className="text-white">{patient.fullName}</strong> • Cama: {patient.cubicle}</>
                ) : (
                  <>Hospital Regional Dr. Ángel María Gatón • Dr. Joel Colón</>
                )}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-teal-100 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notificación de éxito */}
        {successMessage && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            {successMessage}
          </div>
        )}

        {/* Pestañas de Navegación de la Suite IA */}
        <div className="bg-slate-50 border-b border-slate-200 px-3 sm:px-6 flex overflow-x-auto gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('redaccion')}
            className={`px-3.5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'redaccion'
                ? 'border-[#0F4C5C] text-[#0F4C5C] bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Redacción de Notas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rx')}
            className={`px-3.5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'rx'
                ? 'border-[#0F4C5C] text-[#0F4C5C] bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Wind className="w-4 h-4" />
            <span>Radiografía (RX)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tac')}
            className={`px-3.5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'tac'
                ? 'border-[#0F4C5C] text-[#0F4C5C] bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Tomografía (TAC)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gases')}
            className={`px-3.5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'gases'
                ? 'border-[#0F4C5C] text-[#0F4C5C] bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Droplets className="w-4 h-4" />
            <span>Gases Arteriales (ABG)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ecg')}
            className={`px-3.5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'ecg'
                ? 'border-[#0F4C5C] text-[#0F4C5C] bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>Electrocardiograma (ECG)</span>
          </button>
        </div>

        {/* Contenido Dinámico por Pestaña */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* 1. ASISTENTE DE REDACCIÓN */}
          {activeTab === 'redaccion' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-teal-50/70 rounded-xl border border-teal-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Tipo de Documento:</span>
                  <div className="flex items-center bg-white rounded-lg p-0.5 border border-slate-200">
                    <button
                      onClick={() => setNoteType('ingreso')}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                        noteType === 'ingreso' ? 'bg-[#0F4C5C] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Nota de Ingreso
                    </button>
                    <button
                      onClick={() => setNoteType('evolucion')}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                        noteType === 'evolucion' ? 'bg-[#0F4C5C] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Evolución Diaria
                    </button>
                    <button
                      onClick={() => setNoteType('egreso')}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                        noteType === 'egreso' ? 'bg-[#0F4C5C] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Epicrisis / Egreso
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleGenerateDraft}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F4C5C] hover:bg-[#0c3c49] text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                  <span>{isProcessing ? 'Analizando expediente...' : 'Generar Borrador con Estilo Hospitalario'}</span>
                </button>
              </div>

              {generatedDraft ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      GENERADO CON IA — REQUIERE REVISIÓN MÉDICA OBLIGATORIA
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCopy(generatedDraft)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedText ? 'Copiado' : 'Copiar'}</span>
                      </button>

                      {onInsertToNote && (
                        <button
                          type="button"
                          onClick={() => handleInsert(generatedDraft, 'nota')}
                          className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-2xs"
                        >
                          Insertar en Nota
                        </button>
                      )}

                      {onInsertToEvolution && (
                        <button
                          type="button"
                          onClick={() => handleInsert(generatedDraft, 'evolucion')}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs"
                        >
                          Insertar en Evolución
                        </button>
                      )}
                    </div>
                  </div>

                  <textarea
                    rows={12}
                    value={generatedDraft}
                    onChange={(e) => setGeneratedDraft(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-sans text-slate-800 leading-relaxed focus:bg-white focus:ring-2 focus:ring-[#0F4C5C] outline-hidden"
                  />

                  {clinicalHighlights.length > 0 && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <p className="font-bold text-slate-700 mb-1">Puntos de Análisis Sintetizados:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-600 text-[11px]">
                        {clinicalHighlights.map((ch, idx) => (
                          <li key={idx}>{ch}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Haz clic en <strong>"Generar Borrador"</strong> para que la IA analice los signos vitales, antecedentes y laboratorios de {patient?.fullName || 'del paciente seleccionado'} y elabore la nota respetando el formato hospitalario del Dr. Joel Colón.
                </div>
              )}
            </div>
          )}

          {/* 2. RADIOGRAFÍA (RX) */}
          {activeTab === 'rx' && (
            <div className="space-y-4">
              <div className="p-4 border-2 border-dashed border-slate-300 rounded-2xl text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <input
                  type="file"
                  id="rx-upload"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'rx')}
                  className="hidden"
                />
                <label htmlFor="rx-upload" className="cursor-pointer flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-slate-800">
                      Subir o tomar fotografía de la Radiografía (RX)
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">Tórax PA/AP, Abdomen, Huesos largos o extremidades</p>
                  </div>
                  {imageFileName && (
                    <span className="text-xs bg-teal-100 text-teal-800 px-2.5 py-0.5 rounded-full font-mono font-bold">
                      {imageFileName}
                    </span>
                  )}
                </label>
              </div>

              {isProcessing && (
                <div className="text-center py-6 text-xs text-slate-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
                  <span>Gemini Vision analizando parénquima pulmonar, silueta cardíaca y estructuras óseas...</span>
                </div>
              )}

              {multimodalReport && (
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Interpretación Radiológica Asistida
                    </h4>
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                      Urgencia: {multimodalReport.urgency}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm font-semibold text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    {multimodalReport.interpretation}
                  </p>

                  <div>
                    <p className="text-xs font-bold text-slate-700 mb-1">Hallazgos Clave Identificados:</p>
                    <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                      {multimodalReport.findings.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleCopy(multimodalReport.interpretation)}
                      className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
                    >
                      Copiar Hallazgos
                    </button>
                    {onInsertToEvolution && (
                      <button
                        type="button"
                        onClick={() => handleInsert(`RX TÓRAX: ${multimodalReport.interpretation}`, 'evolucion')}
                        className="px-3 py-1.5 bg-[#0F4C5C] text-white rounded-lg text-xs font-bold"
                      >
                        Insertar en Evolución
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. TOMOGRAFÍA (TAC) */}
          {activeTab === 'tac' && (
            <div className="space-y-4">
              <div className="p-4 border-2 border-dashed border-slate-300 rounded-2xl text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <input
                  type="file"
                  id="tac-upload"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'tac')}
                  className="hidden"
                />
                <label htmlFor="tac-upload" className="cursor-pointer flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-slate-800">
                      Subir fotografía o corte de Tomografía Computarizada (TAC)
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">TAC Cráneo simple, TAC Tórax, TAC Abdomen y Pelvis</p>
                  </div>
                  {imageFileName && (
                    <span className="text-xs bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full font-mono font-bold">
                      {imageFileName}
                    </span>
                  )}
                </label>
              </div>

              {isProcessing && (
                <div className="text-center py-6 text-xs text-slate-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
                  <span>Gemini Vision analizando densidades, línea media y ventrículos cerebrales...</span>
                </div>
              )}

              {multimodalReport && (
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Informe Tomográfico Asistido
                  </h4>
                  <p className="text-xs sm:text-sm font-semibold text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    {multimodalReport.interpretation}
                  </p>

                  <div>
                    <p className="text-xs font-bold text-slate-700 mb-1">Detalle de Estructuras:</p>
                    <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                      {multimodalReport.findings.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleCopy(multimodalReport.interpretation)}
                      className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
                    >
                      Copiar Informe
                    </button>
                    {onInsertToEvolution && (
                      <button
                        type="button"
                        onClick={() => handleInsert(`TAC: ${multimodalReport.interpretation}`, 'evolucion')}
                        className="px-3 py-1.5 bg-purple-700 text-white rounded-lg text-xs font-bold"
                      >
                        Insertar en Evolución
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. GASES ARTERIALES (ABG) */}
          {activeTab === 'gases' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                  Valores Gasométricos Arteriales del Paciente
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">pH</label>
                    <input
                      type="number"
                      step="0.01"
                      value={abgInput.ph}
                      onChange={(e) => setAbgInput({ ...abgInput, ph: parseFloat(e.target.value) || 7.4 })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">pCO2 (mmHg)</label>
                    <input
                      type="number"
                      value={abgInput.pco2}
                      onChange={(e) => setAbgInput({ ...abgInput, pco2: parseFloat(e.target.value) || 40 })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">pO2 (mmHg)</label>
                    <input
                      type="number"
                      value={abgInput.po2}
                      onChange={(e) => setAbgInput({ ...abgInput, po2: parseFloat(e.target.value) || 90 })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">HCO3 (mEq/L)</label>
                    <input
                      type="number"
                      value={abgInput.hco3}
                      onChange={(e) => setAbgInput({ ...abgInput, hco3: parseFloat(e.target.value) || 24 })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Lactato (mmol/L)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={abgInput.lactate}
                      onChange={(e) => setAbgInput({ ...abgInput, lactate: parseFloat(e.target.value) || 1.0 })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Sodio (Na)</label>
                    <input
                      type="number"
                      value={abgInput.na}
                      onChange={(e) => setAbgInput({ ...abgInput, na: parseFloat(e.target.value) || 140 })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Cloro (Cl)</label>
                    <input
                      type="number"
                      value={abgInput.cl}
                      onChange={(e) => setAbgInput({ ...abgInput, cl: parseFloat(e.target.value) || 102 })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">FiO2 (0.21 - 1.0)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={abgInput.fio2}
                      onChange={(e) => setAbgInput({ ...abgInput, fio2: parseFloat(e.target.value) || 0.21 })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={handleCalculateAbg}
                    className="px-4 py-2 bg-[#0F4C5C] text-white text-xs font-bold rounded-xl shadow-xs"
                  >
                    Calcular & Interpretar Gasometría
                  </button>
                </div>
              </div>

              {abgReport && (
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Diagnóstico Gasométrico</span>
                    <span className="text-xs font-mono font-bold bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full">
                      PaO2/FiO2: {abgReport.pao2Fio2Ratio} mmHg ({abgReport.kirbyArdsClassification})
                    </span>
                  </div>

                  <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-lg text-xs font-bold text-indigo-900 leading-relaxed">
                    {abgReport.clinicalInterpretation}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="font-bold text-slate-700">Anion Gap & Delta-Delta:</p>
                      <p className="text-slate-600 mt-0.5">
                        Anion Gap: <strong>{abgReport.anionGap.toFixed(1)} mEq/L</strong> (Corregido: {abgReport.anionGapCorrected?.toFixed(1)})
                      </p>
                      {abgReport.deltaRatio && (
                        <p className="text-slate-600 mt-0.5">
                          Delta Ratio: {abgReport.deltaRatio} — {abgReport.deltaRatioInterpretation}
                        </p>
                      )}
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="font-bold text-slate-700">Conducta Gasométrica Recomendada:</p>
                      <ul className="list-disc list-inside text-slate-600 mt-0.5 space-y-0.5 text-[11px]">
                        {abgReport.therapeuticConduct.map((tc, idx) => (
                          <li key={idx}>{tc}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleCopy(abgReport.clinicalInterpretation)}
                      className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
                    >
                      Copiar Gasometría
                    </button>
                    {onInsertToEvolution && (
                      <button
                        type="button"
                        onClick={() => handleInsert(`GASES ARTERIALES: ${abgReport.clinicalInterpretation}`, 'evolucion')}
                        className="px-3 py-1.5 bg-[#0F4C5C] text-white rounded-lg text-xs font-bold"
                      >
                        Insertar en Evolución
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. ELECTROCARDIOGRAMA (ECG) */}
          {activeTab === 'ecg' && (
            <div className="space-y-4">
              <div className="p-4 border-2 border-dashed border-slate-300 rounded-2xl text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <input
                  type="file"
                  id="ecg-upload"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'ecg')}
                  className="hidden"
                />
                <label htmlFor="ecg-upload" className="cursor-pointer flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                    <Heart className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-slate-800">
                      Subir fotografía del Electrocardiograma de 12 derivaciones
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Evalúa ritmo, FC, eje eléctrico, elevación ST (STEMI) y bloqueos AV/de rama
                    </p>
                  </div>
                  {imageFileName && (
                    <span className="text-xs bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full font-mono font-bold">
                      {imageFileName}
                    </span>
                  )}
                </label>
              </div>

              {isProcessing && (
                <div className="text-center py-6 text-xs text-slate-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-red-600" />
                  <span>Gemini Vision analizando trazado electrocardiográfico de 12 derivaciones...</span>
                </div>
              )}

              {ecgReport && (
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Informe Electrocardiográfico Oficial
                    </h4>
                    <span className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold">
                      Prioridad: {ecgReport.urgency}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm font-semibold text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    {ecgReport.interpretation}
                  </p>

                  <div>
                    <p className="text-xs font-bold text-slate-700 mb-1">Criterios Detectados:</p>
                    <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                      {ecgReport.findings.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleCopy(ecgReport.interpretation)}
                      className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
                    >
                      Copiar ECG
                    </button>
                    {onInsertToEvolution && (
                      <button
                        type="button"
                        onClick={() => handleInsert(`ECG: ${ecgReport.interpretation}`, 'evolucion')}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold"
                      >
                        Insertar en Evolución
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-3 sm:p-4 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            Privacidad hospitalaria: Datos anonimizados para procesamiento de seguridad.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-semibold"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatientAIAnalysisModal;
