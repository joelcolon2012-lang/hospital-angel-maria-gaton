import React, { useState } from 'react';
import { Patient, ClinicalHistory } from '../../types';
import { ChevronDown, ChevronUp, FileText, Save, Download, Sparkles, Check, Trash2 } from 'lucide-react';
import { VoiceDictationButton } from '../common/VoiceDictationButton';
import { QuickChipsSelector } from '../common/QuickChipsSelector';
import { normalizeMedicalText } from '../../services/medicalSpellingService';
import { downloadFileToPC } from '../../services/hospitalNoteGenerator';
import { exportClinicalHistoryToWord } from '../../services/wordExportService';

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
    }
  );

  const [savedFeedback, setSavedFeedback] = useState(false);
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
    const updated = {
      ...history,
      physicalExam: {
        ...history.physicalExam,
        [examField]: val,
      },
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

  // Limpiar Sección 3: Examen Físico
  const handleClearExam = () => {
    if (window.confirm('¿Limpiar los hallazgos del examen físico?')) {
      const updated = {
        ...history,
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
      };
      setHistory(updated);
      onUpdateHistory(updated);
    }
  };

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
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleClearExam}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-white hover:bg-red-600 border border-red-200 hover:border-red-600 px-2.5 py-1 rounded-lg transition-all shadow-xs"
                title="Limpiar examen físico"
              >
                <Trash2 className="w-3 h-3" />
                <span>Limpiar Examen Físico</span>
              </button>
            </div>
            {/* General */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Inspección General</label>
              <QuickChipsSelector
                chips={[
                  'Consciente, orientado en 3 esferas, eupneico, normocoloreado, hidratado y afebril',
                  'Paciente en decúbito obligado, fascies dolorosa, diaforético',
                  'Regular estado general, somnoliento pero reactivo a estímulos verbales',
                ]}
                onSelectChip={(chip) => appendToExam('general', chip)}
              />
              <textarea
                rows={2}
                value={history.physicalExam.general}
                onChange={(e) => handleExamChange('general', e.target.value)}
                placeholder="Estado general, aspecto, hidratación..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs"
              />
            </div>

            {/* Cardiovascular */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Cardiovascular</label>
              <QuickChipsSelector
                chips={[
                  'R1 y R2 rítmicos, regulares, normofonéticos, sin soplos audibles ni galope, pulsos periféricos presentes y simétricos',
                  'Taquicárdico, rítmico, soplo sistólico en foco aórtico grado II/VI, no frote pericárdico',
                  'Arrítmico (compatible con FA), no soplos, pulsos desiguales',
                ]}
                onSelectChip={(chip) => appendToExam('cardiovascular', chip)}
              />
              <textarea
                rows={2}
                value={history.physicalExam.cardiovascular}
                onChange={(e) => handleExamChange('cardiovascular', e.target.value)}
                placeholder="Ruidos cardíacos, soplos, pulsos periféricos..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs"
              />
            </div>

            {/* Respiratorio */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Respiratorio</label>
              <QuickChipsSelector
                chips={[
                  'Murmullo vesicular bilateralmente conservado, no estertores, no tirajes, adecuada expansión torácica',
                  'Estertores crepitantes basales bilaterales, sibilancias espiratorias diseminadas',
                  'Murmullo vesicular disminuido en base pulmonar derecha con matidez a la percusión',
                ]}
                onSelectChip={(chip) => appendToExam('respiratory', chip)}
              />
              <textarea
                rows={2}
                value={history.physicalExam.respiratory}
                onChange={(e) => handleExamChange('respiratory', e.target.value)}
                placeholder="Patrón respiratorio, murmullo vesicular, ruidos agregados..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs"
              />
            </div>

            {/* Abdomen */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Abdomen</label>
              <QuickChipsSelector
                chips={[
                  'Blando, depresible, no doloroso a la palpación superficial ni profunda, RHA normoactivos, sin megalias ni irritación peritoneal',
                  'Doloroso a la palpación en epigastrio y mesogastrio, sin defensa muscular, RHA presentes',
                  'Distendido, timpánico, doloroso difusamente, signo de Blumberg dudoso',
                ]}
                onSelectChip={(chip) => appendToExam('abdominal', chip)}
              />
              <textarea
                rows={2}
                value={history.physicalExam.abdominal}
                onChange={(e) => handleExamChange('abdominal', e.target.value)}
                placeholder="Inspección, palpación, ruidos hidroaéreos, visceromegalias..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs"
              />
            </div>

            {/* Neurológico */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Neurológico</label>
              <QuickChipsSelector
                chips={[
                  'Glasgow 15/15, pupilas isocóricas fotorreactivas, sin déficit motor ni sensitivo focal, sin signos meníngeos',
                  'Alerta, orientado, pares craneales íntegros, fuerza 5/5 simétrica en cuatro extremidades',
                  'Desorientado en tiempo y espacio, sin rigidez de nuca, sensibilidad conservada',
                ]}
                onSelectChip={(chip) => appendToExam('neurological', chip)}
              />
              <textarea
                rows={2}
                value={history.physicalExam.neurological}
                onChange={(e) => handleExamChange('neurological', e.target.value)}
                placeholder="Estado de conciencia, pares craneales, fuerza, reflejos, signos meníngeos..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs"
              />
            </div>

            {/* Extremidades */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Extremidades</label>
              <QuickChipsSelector
                chips={[
                  'Simétricas, eutróficas, sin edemas periféricos, llenado capilar distal < 2 segundos',
                  'Edema bilateral con fóvea grado II/IV en miembros inferiores hasta tercio medio pretibial',
                  'Extremidad inferior derecha con aumento de volumen, dolor a la palpación de pantorrilla y empastamiento',
                ]}
                onSelectChip={(chip) => appendToExam('extremities', chip)}
              />
              <textarea
                rows={2}
                value={history.physicalExam.extremities}
                onChange={(e) => handleExamChange('extremities', e.target.value)}
                placeholder="Edemas, fóvea, pulsos pedios y tibiales, llenado capilar..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* 4. Impresión Diagnóstica & Plan */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('impresion')}
          className="w-full px-4 py-3.5 bg-slate-50 flex items-center justify-between font-bold text-sm text-petrol-900 border-b border-slate-200"
        >
          <span>4. Impresión Diagnóstica & Plan Inicial</span>
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
              <textarea
                rows={2}
                value={history.clinicalImpression}
                onChange={(e) => handleFieldChange('clinicalImpression', e.target.value)}
                placeholder="Diagnósticos sindrómicos y presuntivos..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs sm:text-sm font-semibold"
              />
            </div>

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
    </div>
  );
};
