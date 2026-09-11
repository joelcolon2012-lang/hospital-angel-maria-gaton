import React, { useState } from 'react';
import { Patient, ClinicalHistory } from '../../types';
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Save,
  Download,
  Sparkles,
  Check,
  Trash2,
  Brain,
  Activity,
  CheckSquare,
  Square,
  AlertCircle,
  Calculator,
} from 'lucide-react';
import { VoiceDictationButton } from '../common/VoiceDictationButton';
import { QuickChipsSelector } from '../common/QuickChipsSelector';
import { normalizeMedicalText } from '../../services/medicalSpellingService';
import { downloadFileToPC } from '../../services/hospitalNoteGenerator';
import { exportClinicalHistoryToWord } from '../../services/wordExportService';
import { CLINICAL_SCALES } from '../../services/clinicalCalculators';

import {
  OFFICIAL_16_SYSTEMS,
  getCustomNormalPhysicalExam,
  Cephalo16System,
} from '../../services/clinicalNormalTemplateService';
import { CustomNormalExamModal } from '../settings/CustomNormalExamModal';
import { IntegratedScalesCalculator } from '../scales/IntegratedScalesCalculator';
import { Settings } from 'lucide-react';

interface Props {
  patient: Patient;
  onUpdateHistory: (history: ClinicalHistory) => void;
}

export const ClinicalHistoryTab: React.FC<Props> = ({ patient, onUpdateHistory }) => {
  const [history, setHistory] = useState<ClinicalHistory>(
    patient.clinicalHistory || {
      reasonForConsultation: patient.chiefComplaint || '',
      currentIllnessHistory: '',
      pathologicalHistory: '',
      surgicalHistory: '',
      allergicHistory: (patient.vitals?.allergies || []).join(', '),
      habitualMedications: '',
      toxicHabits: '',
      familyHistory: '',
      obGynHistory: '',
      systemsReview: '',
      physicalExam: {
        head: '',
        eyes: '',
        ears: '',
        nose: '',
        mouth: '',
        neck: '',
        thorax: '',
        abdominal: '',
        upperExtremities: '',
        lowerExtremities: '',
        genitourinaryRectal: '',
        neurological: '',
        general: '',
        cardiovascular: '',
        respiratory: '',
        extremities: '',
        skin: '',
        otherFindings: '',
      },
      clinicalImpression: '',
      diagnosticAndTherapeuticPlan: '',
    }
  );

  const [savedFeedback, setSavedFeedback] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [showIntegratedScales, setShowIntegratedScales] = useState(false);
  const [activeScaleTab, setActiveScaleTab] = useState<'none' | 'nihss' | 'rankin'>('none');
  const [nihssChecked, setNihssChecked] = useState<Record<string, boolean>>({});
  const [rankinSelected, setRankinSelected] = useState<number | null>(null);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    hda: true,
    antecedentes: false,
    examen: true,
    impresion: true,
  });

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleFieldChange = (field: keyof ClinicalHistory, val: any) => {
    const updated = { ...history, [field]: val };
    setHistory(updated);
    onUpdateHistory(updated);
  };

  const handleExamChange = (examField: keyof ClinicalHistory['physicalExam'], val: string) => {
    const updatedExam = {
      ...history.physicalExam,
      [examField]: val,
    };

    // Auto-sync backward compatibility fields
    if (examField === 'thorax') {
      updatedExam.cardiovascular = val;
      updatedExam.respiratory = val;
    } else if (examField === 'upperExtremities' || examField === 'lowerExtremities') {
      const up = updatedExam.upperExtremities || '';
      const low = updatedExam.lowerExtremities || '';
      updatedExam.extremities = [up, low].filter(Boolean).join(' | ');
    }

    const updated = {
      ...history,
      physicalExam: updatedExam,
    };
    setHistory(updated);
    onUpdateHistory(updated);
  };

  const appendToField = (field: keyof ClinicalHistory, phrase: string) => {
    const current = (history[field] as string) || '';
    const updated = current ? `${current}. ${phrase}` : phrase;
    handleFieldChange(field, updated);
  };

  const appendToExam = (examField: keyof ClinicalHistory['physicalExam'], phrase: string) => {
    const current = history.physicalExam[examField] || '';
    const updated = current ? `${current}. ${phrase}` : phrase;
    handleExamChange(examField, updated);
  };

  // Normalizar ortografía de toda la historia
  const handleNormalizeAll = () => {
    const updated: ClinicalHistory = {
      ...history,
      reasonForConsultation: normalizeMedicalText(history.reasonForConsultation),
      currentIllnessHistory: normalizeMedicalText(history.currentIllnessHistory),
      pathologicalHistory: normalizeMedicalText(history.pathologicalHistory),
      surgicalHistory: normalizeMedicalText(history.surgicalHistory),
      allergicHistory: normalizeMedicalText(history.allergicHistory),
      habitualMedications: normalizeMedicalText(history.habitualMedications),
      toxicHabits: normalizeMedicalText(history.toxicHabits),
      familyHistory: normalizeMedicalText(history.familyHistory),
      obGynHistory: normalizeMedicalText(history.obGynHistory),
      systemsReview: normalizeMedicalText(history.systemsReview),
      physicalExam: {
        general: normalizeMedicalText(history.physicalExam.general),
        cardiovascular: normalizeMedicalText(history.physicalExam.cardiovascular),
        respiratory: normalizeMedicalText(history.physicalExam.respiratory),
        abdominal: normalizeMedicalText(history.physicalExam.abdominal),
        neurological: normalizeMedicalText(history.physicalExam.neurological),
        extremities: normalizeMedicalText(history.physicalExam.extremities),
        skin: normalizeMedicalText(history.physicalExam.skin),
        otherFindings: normalizeMedicalText(history.physicalExam.otherFindings),
      },
      clinicalImpression: normalizeMedicalText(history.clinicalImpression),
      diagnosticAndTherapeuticPlan: normalizeMedicalText(history.diagnosticAndTherapeuticPlan),
    };

    setHistory(updated);
    onUpdateHistory(updated);
  };

  // Limpiar y vaciar toda la historia clínica
  const handleClearAllHistory = () => {
    if (window.confirm('¿Estás seguro de que deseas limpiar y vaciar toda la historia clínica de este paciente?')) {
      const emptyHistory: ClinicalHistory = {
        reasonForConsultation: '',
        currentIllnessHistory: '',
        pathologicalHistory: '',
        surgicalHistory: '',
        allergicHistory: '',
        habitualMedications: '',
        toxicHabits: '',
        familyHistory: '',
        obGynHistory: '',
        systemsReview: '',
        physicalExam: {
          general: '',
          cardiovascular: '',
          respiratory: '',
          abdominal: '',
          neurological: '',
          extremities: '',
          skin: '',
          otherFindings: '',
        },
        clinicalImpression: '',
        diagnosticAndTherapeuticPlan: '',
      };
      setHistory(emptyHistory);
      onUpdateHistory(emptyHistory);
    }
  };

  // Limpiar Sección 1: Motivo y Enfermedad Actual
  const handleClearHda = () => {
    if (window.confirm('¿Limpiar motivo de consulta y enfermedad actual?')) {
      const updated = { ...history, reasonForConsultation: '', currentIllnessHistory: '' };
      setHistory(updated);
      onUpdateHistory(updated);
    }
  };

  // Limpiar Sección 2: Antecedentes
  const handleClearAntecedentes = () => {
    if (window.confirm('¿Limpiar todos los antecedentes clínicos?')) {
      const updated = {
        ...history,
        pathologicalHistory: '',
        surgicalHistory: '',
        allergicHistory: '',
        habitualMedications: '',
        toxicHabits: '',
        familyHistory: '',
        obGynHistory: '',
        systemsReview: '',
      };
      setHistory(updated);
      onUpdateHistory(updated);
    }
  };

  // Cargar Examen Físico Normal Personalizado del Hospital (16 Sistemas Oficiales)
  const handleLoadNormalExam = async () => {
    const customNormal = await getCustomNormalPhysicalExam();
    const loadedExam = {
      ...history.physicalExam,
      general: customNormal.general || 'Paciente en aceptables condiciones generales, alerta, consciente, orientado en tiempo, espacio y persona, cooperador, normocoloreado, hidratado, eupneico.',
      head: customNormal.head || 'Normocéfalo, sin hematomas ni hundimientos, adecuada implantación pilosa.',
      eyes: customNormal.eyes || 'Pupilas isocóricas y fotorreactivas a la luz de 3 mm bilateral, escleras anictéricas, conjuntivas normocoloreadas.',
      ears: customNormal.ears || 'Pabellones auriculares bien implantados, conductos auditivos externos permeables, sin otorragia ni otorrea.',
      nose: customNormal.nose || 'Fosas nasales permeables, sin secreciones patológicas, mucosa normocoloreada, sin epistaxis.',
      mouth: customNormal.mouth || 'Mucosa oral húmeda y normocoloreada, lengua móvil y centrada, piezas dentales en regular estado, faringe no congestiva.',
      neck: customNormal.neck || 'Simétrico, móvil, no doloroso, sin ingurgitación yugular a 45°, sin adenopatías palpables, pulsos carotídeos rítmicos.',
      thorax: customNormal.thorax || 'Tórax simétrico, normoexpansible, sin deformidades torácicas ni dolor costal.',
      lungs: customNormal.lungs || 'Campos pulmonares normoventilados bilateralmente, murmullo vesicular conservado sin estertores ni sibilancias.',
      heart: customNormal.heart || 'Ruidos cardíacos rítmicos y regulares, R1 y R2 normofonéticos en los 4 focos, sin soplos ni galopes.',
      abdominal: customNormal.abdominal || 'Abdomen blando, depresible, no doloroso a la palpación superficial ni profunda, RHA normoactivos, sin visceromegalias ni irritación peritoneal.',
      genitals: customNormal.genitals || 'Genitales externos acordes a edad y sexo, sin lesiones evidentes ni secreciones patológicas.',
      skin: customNormal.skin || 'Piel normotérmica, elástica, turgencia conservada, llenado capilar menor de 2 segundos, sin lesiones activas, rash ni petequias.',
      upperExtremities: customNormal.upperExtremities || 'Simétricas, móviles, tono y fuerza muscular 5/5, pulsos radiales presentes y simétricos, sin edema ni deformidades.',
      lowerExtremities: customNormal.lowerExtremities || 'Simétricas, sin deformidades, arcos de movilidad conservados, fuerza 5/5 bilateral, pulsos pedios palpables, sin edema periférico.',
      neurological: customNormal.neurological || 'Alerta, consciente, Glasgow 15/15, orientado en 3 esferas, pares craneales íntegros sin déficit motor focal, marcha estable.',
      // Compatibilidad previa
      cardiovascular: customNormal.heart || '',
      respiratory: customNormal.lungs || customNormal.thorax || '',
      extremities: [customNormal.upperExtremities, customNormal.lowerExtremities].filter(Boolean).join(' | '),
      otherFindings: '',
    };
    const updated = { ...history, physicalExam: loadedExam };
    setHistory(updated);
    onUpdateHistory(updated);
  };

  // Limpiar Sección 3: Examen Físico
  const handleClearExam = () => {
    if (window.confirm('¿Limpiar los hallazgos del examen físico?')) {
      const updated = {
        ...history,
        physicalExam: {
          general: '',
          head: '',
          eyes: '',
          ears: '',
          nose: '',
          mouth: '',
          neck: '',
          thorax: '',
          lungs: '',
          heart: '',
          abdominal: '',
          genitals: '',
          skin: '',
          upperExtremities: '',
          lowerExtremities: '',
          neurological: '',
          cardiovascular: '',
          respiratory: '',
          extremities: '',
          otherFindings: '',
        },
      };
      setHistory(updated);
      onUpdateHistory(updated);
    }
  };

  // Helpers para Escalas Neurológicas (NIHSS y Rankin)
  const nihssDefinition = CLINICAL_SCALES.find((s) => s.id === 'nihss');
  const nihssScore = Object.entries(nihssChecked).reduce((total, [itemId, isChecked]) => {
    if (!isChecked) return total;
    const item = nihssDefinition?.items.find((i) => i.id === itemId);
    return total + (item ? item.points : 0);
  }, 0);
  const nihssInterpretation = nihssDefinition?.interpret(nihssScore);

  const rankinDefinition = CLINICAL_SCALES.find((s) => s.id === 'rankin');
  const rankinInterpretation = rankinSelected !== null ? rankinDefinition?.interpret(rankinSelected) : null;

  const handleInsertNihssToImpression = () => {
    const textToInsert = `[ESCALA NIHSS: ${nihssScore}/42 pts — ${nihssInterpretation?.risk || ''}. Conducta: ${nihssInterpretation?.recommendation || ''}]`;
    const cur = history.clinicalImpression || '';
    const updatedImpression = cur ? `${cur}\n\n${textToInsert}` : textToInsert;
    handleFieldChange('clinicalImpression', updatedImpression);
  };

  const handleInsertRankinToImpression = () => {
    if (rankinSelected === null) return;
    const textToInsert = `[ESCALA DE RANKIN MODIFICADA (mRS): Grado ${rankinSelected} — ${rankinInterpretation?.risk || ''}. ${rankinInterpretation?.recommendation || ''}]`;
    const cur = history.clinicalImpression || '';
    const updatedImpression = cur ? `${cur}\n\n${textToInsert}` : textToInsert;
    handleFieldChange('clinicalImpression', updatedImpression);
  };

  const hasStrokeSuspicion = /evc|acv|ictus|isqu[eé]m|cerebrovascular|cerebral|hemipares|afasia/i.test(
    history.clinicalImpression || ''
  );

  // Limpiar Sección 4: Impresión Diagnóstica y Plan
  const handleClearImpression = () => {
    if (window.confirm('¿Limpiar impresión diagnóstica y plan inicial?')) {
      const updated = {
        ...history,
        clinicalImpression: '',
        diagnosticAndTherapeuticPlan: '',
      };
      setHistory(updated);
      onUpdateHistory(updated);
    }
  };

  // Guardar y descargar archivo en la PC
  const handleSaveAndDownload = () => {
    onUpdateHistory(history);

    const filename = `Historia_Clinica_${patient.fullName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.txt`;
    let content = `HISTORIA CLÍNICA — HOSPITAL REGIONAL ÁNGEL MARÍA GATÓN\n`;
    content += `Paciente: ${patient.fullName} | Cédula/Exp: ${patient.medicalRecordNumber || patient.idDocument || 'S/N'}\n`;
    content += `Fecha de registro: ${new Date().toLocaleString('es-ES')}\n`;
    content += `------------------------------------------------------------\n\n`;
    content += `1. MOTIVO DE CONSULTA:\n${history.reasonForConsultation}\n\n`;
    content += `2. HISTORIA DE LA ENFERMEDAD ACTUAL:\n${history.currentIllnessHistory}\n\n`;
    content += `3. ANTECEDENTES:\n`;
    content += `- Patológicos: ${history.pathologicalHistory}\n`;
    content += `- Quirúrgicos: ${history.surgicalHistory}\n`;
    content += `- Alergias: ${history.allergicHistory}\n`;
    content += `- Medicamentos habituales: ${history.habitualMedications}\n`;
    content += `- Hábitos tóxicos: ${history.toxicHabits}\n\n`;
    content += `4. EXAMEN FÍSICO:\n`;
    content += `- General: ${history.physicalExam.general}\n`;
    content += `- Cardiovascular: ${history.physicalExam.cardiovascular}\n`;
    content += `- Respiratorio: ${history.physicalExam.respiratory}\n`;
    content += `- Abdomen: ${history.physicalExam.abdominal}\n`;
    content += `- Neurológico: ${history.physicalExam.neurological}\n`;
    content += `- Extremidades: ${history.physicalExam.extremities}\n\n`;
    content += `5. IMPRESIÓN CLÍNICA:\n${history.clinicalImpression}\n\n`;
    content += `6. PLAN:\n${history.diagnosticAndTherapeuticPlan}\n`;

    downloadFileToPC(filename, content);

    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Action Header Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
          <FileText className="w-4 h-4 text-teal-700" />
          <span>Apartado: <strong>Historia Clínica y Examen Físico</strong></span>
        </div>

        <div className="flex items-center gap-2">
          {/* Limpiar Historia Completa */}
          <button
            type="button"
            onClick={handleClearAllHistory}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-all active:scale-95 shadow-sm"
            title="Limpiar y vaciar toda la historia clínica"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-600" />
            <span>Limpiar Historia</span>
          </button>

          {/* Spell check / Normalize button */}
          <button
            type="button"
            onClick={handleNormalizeAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-all active:scale-95 shadow-sm"
            title="Corrige tildes médicas, puntuación y mayúsculas sin errores de digitación"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Corregir Ortografía Médica</span>
          </button>

          {/* Descargar Word (.DOC) */}
          <button
            type="button"
            onClick={() => exportClinicalHistoryToWord(patient)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-850 border border-blue-200 transition-all active:scale-95 shadow-sm"
            title="Descargar Historia Clínica en formato editable Microsoft Word (.DOC)"
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>Descargar Word (.DOC)</span>
          </button>

          {/* Section Save & Auto-Download Button */}
          <button
            type="button"
            onClick={handleSaveAndDownload}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-[#0F4C5C] hover:bg-petrol-800 text-white transition-all active:scale-95 shadow-sm"
            title="Guarda la historia clínica y genera la descarga inmediata del archivo en tu PC"
          >
            {savedFeedback ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Save className="w-3.5 h-3.5" />}
            {savedFeedback ? '¡Guardado y Descargado!' : 'Guardar y Descargar en PC'}
          </button>
        </div>
      </div>

      {/* 1. HDA */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('hda')}
          className="w-full px-4 py-3.5 bg-slate-50 flex items-center justify-between font-bold text-sm text-petrol-900 border-b border-slate-200"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-petrol-800" />
            <span>1. Motivo de Consulta & Enfermedad Actual</span>
          </div>
          {openSections.hda ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {openSections.hda && (
          <div className="p-4 space-y-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleClearHda}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-white hover:bg-red-600 border border-red-200 hover:border-red-600 px-2.5 py-1 rounded-lg transition-all shadow-xs"
                title="Limpiar motivo de consulta y enfermedad actual"
              >
                <Trash2 className="w-3 h-3" />
                <span>Limpiar este acápite</span>
              </button>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Motivo de Consulta</label>
                <VoiceDictationButton
                  onTranscript={(text) =>
                    handleFieldChange(
                      'reasonForConsultation',
                      history.reasonForConsultation ? `${history.reasonForConsultation} ${text}` : text
                    )
                  }
                />
              </div>

              {/* Chips preestablecidos para motivo */}
              <QuickChipsSelector
                title="Selección rápida de motivo:"
                chips={[
                  'Dolor precordial opresivo',
                  'Disnea de medianos esfuerzos',
                  'Cefalea intensa holocraneana',
                  'Dolor abdominal difuso',
                  'Fiebre cuantificada con escalofríos',
                  'Síncope sin pródromos',
                  'Diarrea acuosa y vómitos',
                  'Pérdida de fuerza en hemicuerpo',
                ]}
                onSelectChip={(chip) => appendToField('reasonForConsultation', chip)}
              />

              <textarea
                rows={2}
                value={history.reasonForConsultation}
                onChange={(e) => handleFieldChange('reasonForConsultation', e.target.value)}
                placeholder="Motivo expresado por el paciente o acompañante..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs sm:text-sm focus:bg-white transition-colors"
                spellCheck={true}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  Historia de la Enfermedad Actual (HDA)
                </label>
                <VoiceDictationButton
                  onTranscript={(text) =>
                    handleFieldChange(
                      'currentIllnessHistory',
                      history.currentIllnessHistory ? `${history.currentIllnessHistory} ${text}` : text
                    )
                  }
                />
              </div>
              <textarea
                rows={4}
                value={history.currentIllnessHistory}
                onChange={(e) => handleFieldChange('currentIllnessHistory', e.target.value)}
                placeholder="Cronología detallada, forma de inicio, síntomas acompañantes, atenuantes y agravantes..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs sm:text-sm focus:bg-white transition-colors"
                spellCheck={true}
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. Antecedentes */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('antecedentes')}
          className="w-full px-4 py-3.5 bg-slate-50 flex items-center justify-between font-bold text-sm text-petrol-900 border-b border-slate-200"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-petrol-800" />
            <span>2. Antecedentes Clínicos y Hábitos</span>
          </div>
          {openSections.antecedentes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {openSections.antecedentes && (
          <div className="p-4 space-y-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleClearAntecedentes}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-white hover:bg-red-600 border border-red-200 hover:border-red-600 px-2.5 py-1 rounded-lg transition-all shadow-xs"
                title="Limpiar antecedentes clínicos y hábitos"
              >
                <Trash2 className="w-3 h-3" />
                <span>Limpiar Antecedentes</span>
              </button>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Antecedentes Patológicos</label>
              <QuickChipsSelector
                title="Patologías crónicas frecuentes:"
                chips={[
                  'Hipertensión Arterial (HTA)',
                  'Diabetes Mellitus tipo 2 (DM2)',
                  'Asma bronquial',
                  'Cardiopatía isquémica',
                  'Enfermedad Renal Crónica (ERC)',
                  'EPOC',
                  'Fibrilación Auricular',
                  'Niega antecedentes patológicos',
                ]}
                onSelectChip={(chip) => appendToField('pathologicalHistory', chip)}
              />
              <textarea
                rows={2}
                value={history.pathologicalHistory}
                onChange={(e) => handleFieldChange('pathologicalHistory', e.target.value)}
                placeholder="Enfermedades crónicas conocidas y tiempo de evolución..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Quirúrgicos / Traumáticos</label>
                <textarea
                  rows={2}
                  value={history.surgicalHistory}
                  onChange={(e) => handleFieldChange('surgicalHistory', e.target.value)}
                  placeholder="Cirugías previas, traumatismos, transfusiones..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Alergias Medicamentosas</label>
                <textarea
                  rows={2}
                  value={history.allergicHistory}
                  onChange={(e) => handleFieldChange('allergicHistory', e.target.value)}
                  placeholder="Medicamentos o alimentos causantes de alergia..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-red-700 font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Medicamentos Habituales</label>
                <textarea
                  rows={2}
                  value={history.habitualMedications}
                  onChange={(e) => handleFieldChange('habitualMedications', e.target.value)}
                  placeholder="Fármacos que consume en casa y adherencia..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Hábitos Tóxicos</label>
                <textarea
                  rows={2}
                  value={history.toxicHabits}
                  onChange={(e) => handleFieldChange('toxicHabits', e.target.value)}
                  placeholder="Tabaco, alcohol, cafeína, sustancias..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Examen Físico */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('examen')}
          className="w-full px-4 py-3.5 bg-slate-50 flex items-center justify-between font-bold text-sm text-petrol-900 border-b border-slate-200"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-petrol-800" />
            <span>3. Examen Físico por Sistemas (Llenado Rápido)</span>
          </div>
          {openSections.examen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {openSections.examen && (
          <div className="p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 mb-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold">
                <span className="bg-[#0F4C5C] text-white px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-black">
                  16 Sistemas
                </span>
                <span>Exploración Cefalocaudal Oficial</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadNormalExam}
                  className="inline-flex items-center gap-1.5 text-xs font-black text-white bg-teal-700 hover:bg-teal-800 px-3.5 py-1.5 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
                  title="Cargar examen físico normal predeterminado en 1 clic para editar solo hallazgos patológicos"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                  <span>CARGAR EXAMEN FÍSICO NORMAL</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-3 py-1.5 rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer"
                  title="Personalizar los 16 textos normales de tu examen físico estándar"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-600" />
                  <span>Configurar Mi Examen Normal</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearExam}
                  className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-white hover:bg-red-600 border border-red-200 px-2.5 py-1.5 rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer"
                  title="Limpiar examen físico"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpiar</span>
                </button>
              </div>
            </div>

            {/* 16 Acápites Cefalocaudales Oficiales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {OFFICIAL_16_SYSTEMS.map((sys) => {
                const curVal = (history.physicalExam as any)[sys.id] || '';
                const isNormal = curVal.trim() === sys.defaultNormal.trim();
                const isAltered = curVal.includes('[Alterado]') || (curVal.trim().length > 0 && !isNormal);

                return (
                  <div
                    key={sys.id}
                    className="bg-slate-50/90 border border-slate-200 rounded-xl p-3 space-y-2 hover:border-slate-300 transition-colors shadow-2xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">{sys.name}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                          {sys.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleExamChange(sys.id as any, sys.defaultNormal)}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors border cursor-pointer ${
                            isNormal
                              ? 'bg-teal-700 text-white border-teal-700'
                              : 'bg-white text-teal-800 border-teal-300 hover:bg-teal-50'
                          }`}
                          title="Marcar como Normal e insertar texto estándar"
                        >
                          NORMAL
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!curVal.startsWith('[Alterado]')) {
                              handleExamChange(sys.id as any, `[Alterado]: ${curVal}`);
                            }
                          }}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors border cursor-pointer ${
                            isAltered && !isNormal
                              ? 'bg-amber-600 text-white border-amber-600'
                              : 'bg-white text-amber-800 border-amber-300 hover:bg-amber-50'
                          }`}
                          title="Marcar como Alterado para documentar patología"
                        >
                          ALTERADO
                        </button>
                        <VoiceDictationButton
                          onTranscript={(text) => {
                            const updated = curVal ? `${curVal} ${text}` : text;
                            handleExamChange(sys.id as any, updated);
                          }}
                        />
                      </div>
                    </div>

                    {/* Menú Desplegable de Hallazgos Frecuentes */}
                    <div className="flex items-center gap-1">
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            appendToExam(sys.id as any, e.target.value);
                          }
                        }}
                        className="text-[11px] font-semibold bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-700 outline-none w-full cursor-pointer hover:border-[#0F4C5C]"
                      >
                        <option value="">Opciones rápidas frecuentes de {sys.name}...</option>
                        {sys.quickOptions.map((opt, i) => (
                          <option key={i} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <QuickChipsSelector
                      chips={sys.quickOptions.slice(0, 3)}
                      onSelectChip={(chip) => appendToExam(sys.id as any, chip)}
                    />

                    <textarea
                      rows={2}
                      value={curVal}
                      onChange={(e) => handleExamChange(sys.id as any, e.target.value)}
                      placeholder={`Hallazgos clínicos de ${sys.name.toLowerCase()}...`}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:border-[#0F4C5C] focus:bg-white transition-colors"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4. Impresión Diagnóstica & Plan con Escalas Neurológicas */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('impresion')}
          className="w-full px-4 py-3.5 bg-slate-50 flex items-center justify-between font-bold text-sm text-petrol-900 border-b border-slate-200"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-petrol-800" />
            <span>4. Impresión Diagnóstica & Plan Inicial (Escalas EVC Integradas)</span>
          </div>
          {openSections.impresion ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {openSections.impresion && (
          <div className="p-4 space-y-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleClearImpression}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-white hover:bg-red-600 border border-red-200 hover:border-red-600 px-2.5 py-1 rounded-lg transition-all shadow-xs"
                title="Limpiar impresión diagnóstica y plan"
              >
                <Trash2 className="w-3 h-3" />
                <span>Limpiar Diagnóstico y Plan</span>
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Impresión Clínica Inicial</label>
                <VoiceDictationButton
                  onTranscript={(text) =>
                    handleFieldChange(
                      'clinicalImpression',
                      history.clinicalImpression ? `${history.clinicalImpression} ${text}` : text
                    )
                  }
                />
              </div>

              {/* Chips rápidos de diagnóstico */}
              <QuickChipsSelector
                title="Diagnósticos frecuentes:"
                chips={[
                  'EVC Isquémico Agudo (Arteria Cerebral Media)',
                  'EVC Hemorrágico',
                  'Ataque Isquémico Transitorio (AIT)',
                  'Crisis Hipertensiva tipo Emergencia',
                  'Síndrome Coronario Agudo sin elevación del ST (SCASEST)',
                  'Insuficiencia Cardíaca Congestiva Descompensada',
                  'Cetoacidosis Diabética moderada',
                  'Neumonía Adquirida en la Comunidad (CURB-65)',
                ]}
                onSelectChip={(chip) => {
                  const cur = history.clinicalImpression || '';
                  handleFieldChange('clinicalImpression', cur ? `${cur}\n• ${chip}` : `• ${chip}`);
                }}
              />

              <textarea
                rows={2}
                value={history.clinicalImpression}
                onChange={(e) => handleFieldChange('clinicalImpression', e.target.value)}
                placeholder="Diagnósticos presuntivos, sindrómicos o etiológicos..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs sm:text-sm font-semibold focus:bg-white transition-colors"
              />
            </div>

            {/* Detección y Barra de Escalas NIHSS & Rankin */}
            {hasStrokeSuspicion && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 animate-fade-in shadow-2xs">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Sospecha de EVC / ACV Isquémico detectada:</strong> Evalúa las escalas oficiales NIHSS y Rankin para estratificar gravedad y ventana terapéutica.
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveScaleTab(activeScaleTab === 'nihss' ? 'none' : 'nihss')}
                    className="px-2.5 py-1 bg-teal-800 hover:bg-teal-700 text-white font-bold rounded-lg transition-colors text-[11px]"
                  >
                    {activeScaleTab === 'nihss' ? 'Ocultar NIHSS' : 'Abrir NIHSS'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveScaleTab(activeScaleTab === 'rankin' ? 'none' : 'rankin')}
                    className="px-2.5 py-1 bg-indigo-800 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors text-[11px]"
                  >
                    {activeScaleTab === 'rankin' ? 'Ocultar Rankin' : 'Abrir Rankin'}
                  </button>
                </div>
              </div>
            )}

            {/* Botones de activación manual de escalas */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-500">Escalas Clínicas:</span>
              <button
                type="button"
                onClick={() => setShowIntegratedScales(!showIntegratedScales)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  showIntegratedScales
                    ? 'bg-[#0F4C5C] text-white border-teal-900 shadow-sm'
                    : 'bg-teal-50 text-teal-900 border-teal-300 hover:bg-teal-100'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Estratificación & Escalas (CURB-65, PSI, SOFA, qSOFA, NEWS2, Blatchford, NIHSS)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveScaleTab(activeScaleTab === 'nihss' ? 'none' : 'nihss')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                  activeScaleTab === 'nihss'
                    ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                    : 'bg-white text-teal-800 border-teal-300 hover:bg-teal-50'
                }`}
              >
                <Brain className="w-3.5 h-3.5" />
                <span>NIHSS Rápido</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveScaleTab(activeScaleTab === 'rankin' ? 'none' : 'rankin')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                  activeScaleTab === 'rankin'
                    ? 'bg-indigo-700 text-white border-indigo-700 shadow-xs'
                    : 'bg-white text-indigo-800 border-indigo-300 hover:bg-indigo-50'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Rankin (mRS)</span>
              </button>
            </div>

            {/* Módulo Calculadoras Integradas Completo (Sección 25 & 26) */}
            {showIntegratedScales && (
              <div className="pt-2 animate-fade-in">
                <IntegratedScalesCalculator
                  patient={patient}
                  onAddScaleResultToImpression={(text) => {
                    const current = history.clinicalImpression || '';
                    const updated = current ? `${current}\n\n${text}` : text;
                    handleFieldChange('clinicalImpression', updated);
                  }}
                  onClose={() => setShowIntegratedScales(false)}
                />
              </div>
            )}

            {/* Módulo Interactivo: Escala NIHSS */}
            {activeScaleTab === 'nihss' && (
              <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-4 space-y-3 animate-fade-in">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-teal-200">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-teal-800" />
                    <div>
                      <h4 className="text-xs font-bold text-teal-900">Escala NIHSS para EVC Isquémico</h4>
                      <p className="text-[11px] text-teal-700">Marca los déficits neurológicos presentes en el paciente</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-teal-950 bg-white px-3 py-1 rounded-xl border border-teal-200 shadow-2xs">
                      Puntuación: {nihssScore} / 42 pts
                    </span>
                    <button
                      type="button"
                      onClick={handleInsertNihssToImpression}
                      className="px-3 py-1 bg-teal-800 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition-all"
                    >
                      + Insertar en Nota
                    </button>
                  </div>
                </div>

                {/* Interpretación NIHSS en vivo */}
                {nihssInterpretation && (
                  <div className="bg-white p-2.5 rounded-xl border border-teal-200 text-xs space-y-1">
                    <p className="font-bold text-teal-900">{nihssInterpretation.risk}</p>
                    <p className="text-slate-600 text-[11px]"><strong>Conducta sugerida: </strong>{nihssInterpretation.recommendation}</p>
                  </div>
                )}

                {/* Items del NIHSS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {nihssDefinition?.items.map((item) => {
                    const isChecked = !!nihssChecked[item.id];
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() =>
                          setNihssChecked((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                        }
                        className={`text-left p-2 rounded-lg border transition-all flex items-start gap-2 ${
                          isChecked
                            ? 'bg-teal-800 text-white border-teal-800 shadow-2xs font-semibold'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-teal-50/50'
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        )}
                        <span className="text-[11px] leading-tight">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Módulo Interactivo: Escala de Rankin Modificada */}
            {activeScaleTab === 'rankin' && (
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 space-y-3 animate-fade-in">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-indigo-200">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-800" />
                    <div>
                      <h4 className="text-xs font-bold text-indigo-900">Escala de Rankin Modificada (mRS — Discapacidad en EVC)</h4>
                      <p className="text-[11px] text-indigo-700">Selecciona el grado funcional post-evento cerebrovascular</p>
                    </div>
                  </div>
                  {rankinSelected !== null && (
                    <button
                      type="button"
                      onClick={handleInsertRankinToImpression}
                      className="px-3 py-1 bg-indigo-800 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition-all"
                    >
                      + Insertar en Nota
                    </button>
                  )}
                </div>

                {/* Items del Rankin */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {[
                    { grade: 0, label: 'Grado 0: Asintomático; sin ningún síntoma neurológico detectable.' },
                    { grade: 1, label: 'Grado 1: Incapacidad no significativa; presenta síntomas pero realiza sus actividades habituales.' },
                    { grade: 2, label: 'Grado 2: Incapacidad leve; incapaz de algunas actividades, pero independiente en autocuidado.' },
                    { grade: 3, label: 'Grado 3: Incapacidad moderada; requiere alguna ayuda pero camina sin asistencia.' },
                    { grade: 4, label: 'Grado 4: Incapacidad moderadamente severa; requiere asistencia para caminar y aseo personal.' },
                    { grade: 5, label: 'Grado 5: Incapacidad severa; confinado a cama, incontinente y dependiente constante.' },
                    { grade: 6, label: 'Grado 6: Fallecimiento del paciente.' },
                  ].map((rg) => {
                    const isSelected = rankinSelected === rg.grade;
                    return (
                      <button
                        type="button"
                        key={rg.grade}
                        onClick={() => setRankinSelected(rg.grade)}
                        className={`text-left p-2.5 rounded-xl border transition-all flex items-start gap-2 ${
                          isSelected
                            ? 'bg-indigo-800 text-white border-indigo-800 shadow-2xs font-semibold'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50/50'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            isSelected ? 'bg-white text-indigo-900' : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {rg.grade}
                        </span>
                        <span className="text-[11px] leading-tight">{rg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Plan Inicial</label>
                <VoiceDictationButton
                  onTranscript={(text) =>
                    handleFieldChange(
                      'diagnosticAndTherapeuticPlan',
                      history.diagnosticAndTherapeuticPlan ? `${history.diagnosticAndTherapeuticPlan} ${text}` : text
                    )
                  }
                />
              </div>
              <textarea
                rows={3}
                value={history.diagnosticAndTherapeuticPlan}
                onChange={(e) => handleFieldChange('diagnosticAndTherapeuticPlan', e.target.value)}
                placeholder="Conducta médica, monitoreo y metas terapéuticas..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs sm:text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Save & Download Button */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSaveAndDownload}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl bg-[#0F4C5C] hover:bg-petrol-800 text-white transition-all active:scale-95 shadow-md"
        >
          {savedFeedback ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
          {savedFeedback ? '¡Historia Guardada y Descargada!' : 'Guardar y Descargar Historia Clínica en PC'}
        </button>
      </div>

      {/* Modal de Configuración: Mi Examen Físico Normal */}
      {isConfigModalOpen && (
        <CustomNormalExamModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          onSaved={() => {
            handleLoadNormalExam();
          }}
        />
      )}
    </div>
  );
};
