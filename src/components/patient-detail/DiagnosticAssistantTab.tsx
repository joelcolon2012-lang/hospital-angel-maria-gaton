import React, { useState } from 'react';
import { Patient, LabResult, MedicalStudy } from '../../types';
import { evaluateClinicalData } from '../../services/clinicalDecisionSupport';
import {
  findMatchingScales,
  CLINICAL_SCALES,
  ClinicalScaleDefinition,
} from '../../services/clinicalCalculators';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  BookOpen,
  ShieldAlert,
  Calculator,
  Save,
  Check,
  Trash2,
} from 'lucide-react';
import { downloadFileToPC } from '../../services/hospitalNoteGenerator';
import { DifferentialDiagnosisModal } from '../diagnostics/DifferentialDiagnosisModal';
import { TherapeuticDiscussionModal } from '../orders/TherapeuticDiscussionModal';
import { MedicalSpellCheckModal } from '../common/MedicalSpellCheckModal';
import { IntegratedScalesCalculator } from '../scales/IntegratedScalesCalculator';

interface Props {
  patient: Patient;
  labs: LabResult[];
  studies: MedicalStudy[];
  onUpdateDiagnoses?: (diagnosticSummary: string) => void;
}

export const DiagnosticAssistantTab: React.FC<Props> = ({
  patient,
  labs,
  studies,
  onUpdateDiagnoses,
}) => {
  const result = evaluateClinicalData(patient, labs, studies);

  const initialDiag =
    patient.clinicalHistory?.clinicalImpression ||
    patient.chiefComplaint ||
    '';

  const [enteredDiagnosis, setEnteredDiagnosis] = useState(initialDiag);
  const [selectedScaleItems, setSelectedScaleItems] = useState<Record<string, boolean>>({});
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [isTherapeuticModalOpen, setIsTherapeuticModalOpen] = useState(false);
  const [isSpellModalOpen, setIsSpellModalOpen] = useState(false);
  const [showIntegratedScales, setShowIntegratedScales] = useState(false);

  // Escalas coincidentes con el diagnóstico escrito o de la historia
  const matchingScales = findMatchingScales(enteredDiagnosis);

  const toggleScaleItem = (itemId: string) => {
    setSelectedScaleItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const calculateScore = (scale: ClinicalScaleDefinition) => {
    return scale.items.reduce((acc, item) => (selectedScaleItems[item.id] ? acc + item.points : acc), 0);
  };

  // Guardar y descargar
  const handleSaveAndDownload = () => {
    let content = `EVALUACIÓN DIAGNÓSTICA Y ESCALAS CLÍNICAS\n`;
    content += `Hospital Regional Ángel María Gatón — Dr. Colón\n`;
    content += `Paciente: ${patient.fullName} | Cédula/Exp: ${patient.medicalRecordNumber || patient.idDocument || 'S/N'}\n`;
    content += `Fecha: ${new Date().toLocaleString('es-ES')}\n`;
    content += `------------------------------------------------------------\n\n`;
    content += `DIAGNÓSTICO ESTABLECIDO:\n${enteredDiagnosis}\n\n`;

    if (matchingScales.length > 0) {
      content += `ESCALAS CLÍNICAS APLICADAS:\n`;
      matchingScales.forEach((scale) => {
        const score = calculateScore(scale);
        const interp = scale.interpret(score);
        content += `\n[${scale.name}]\n`;
        content += `Puntos totales: ${score}\n`;
        content += `Estratificación: ${interp.risk}\n`;
        content += `Recomendación: ${interp.recommendation}\n`;
        content += `Criterios cumplidos:\n`;
        scale.items.forEach((item) => {
          if (selectedScaleItems[item.id]) {
            content += `  - ${item.label} (+${item.points} pt)\n`;
          }
        });
      });
    }

    const filename = `Diagnosticos_Escalas_${patient.fullName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.txt`;
    downloadFileToPC(filename, content);

    if (onUpdateDiagnoses) {
      onUpdateDiagnoses(enteredDiagnosis);
    }

    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
  };

  const handleClearDiagnosisAndScales = () => {
    setEnteredDiagnosis('');
    setSelectedScaleItems({});
    if (onUpdateDiagnoses) {
      onUpdateDiagnoses('');
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Top Action Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
          <Calculator className="w-4 h-4 text-teal-700" />
          <span>Apartado: <strong>Diagnósticos y Escalas de Justificación</strong></span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClearDiagnosisAndScales}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-all active:scale-95 shadow-sm"
            title="Limpiar diagnósticos y escalas seleccionadas"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-600" />
            <span>Limpiar Diagnóstico</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAndDownload}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-[#0F4C5C] hover:bg-petrol-800 text-white transition-all active:scale-95 shadow-sm"
            title="Guarda los diagnósticos y genera la descarga inmediata en tu PC"
          >
            {savedFeedback ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Save className="w-3.5 h-3.5" />}
            {savedFeedback ? '¡Guardado y Descargado!' : 'Guardar y Descargar en PC'}
          </button>
        </div>
      </div>

      {/* Input de Diagnóstico para Despliegue Automático de Escalas */}
      <div className="bg-white rounded-2xl border-2 border-teal-600/30 p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs sm:text-sm font-black text-teal-950 uppercase tracking-wide flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <span>Diagnóstico del Paciente (Despliega Escala Automáticamente)</span>
          </label>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={enteredDiagnosis}
            onChange={(e) => {
              setEnteredDiagnosis(e.target.value);
              if (onUpdateDiagnoses) onUpdateDiagnoses(e.target.value);
            }}
            placeholder="Escribe el diagnóstico (ej: Neumonía, Sepsis, Falla Cardíaca, TEP, Fibrilación Auricular, IAM, Cirrosis, EVC)..."
            className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500/40 focus:outline-none"
          />
        </div>

        {/* Chips sugeridos de diagnósticos rápidos */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <span className="text-[11px] font-semibold text-slate-400 self-center mr-1">Probar con:</span>
          {[
            'EVC Isquémico / ACV (NIHSS & Rankin)',
            'Neumonía Adquirida en la Comunidad',
            'Sepsis / Foco infeccioso',
            'Insuficiencia Cardíaca Congestiva',
            'Sospecha de TEP / Embolia',
            'Fibrilación Auricular con RVR',
            'Síndrome Coronario Agudo (SCA)',
            'Cirrosis Hepática Descompensada',
          ].map((d, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setEnteredDiagnosis(d);
                if (onUpdateDiagnoses) onUpdateDiagnoses(d);
              }}
              className="text-[11px] bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-full font-medium transition-colors"
            >
              + {d}
            </button>
          ))}
        </div>
      </div>

      {/* Barra de Herramientas de IA Clínica y Calculadoras (Secciones 18, 25, 27, 30) */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setIsDiffModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-300 transition-all active:scale-95 shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-teal-700" />
          <span>Diagnósticos Diferenciales con IA</span>
        </button>

        <button
          type="button"
          onClick={() => setIsTherapeuticModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-300 transition-all active:scale-95 shadow-xs"
        >
          <BookOpen className="w-3.5 h-3.5 text-sky-700" />
          <span>Discusión Terapéutica Guías Oficiales</span>
        </button>

        <button
          type="button"
          onClick={() => setIsSpellModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-all active:scale-95 shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>Corrector Ortográfico & Duplicados</span>
        </button>

        <button
          type="button"
          onClick={() => setShowIntegratedScales(!showIntegratedScales)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all active:scale-95 shadow-xs border ${
            showIntegratedScales
              ? 'bg-[#0F4C5C] text-white border-teal-900'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
          }`}
        >
          <Calculator className="w-3.5 h-3.5 text-teal-600" />
          <span>8 Calculadoras Integradas (CURB-65, PSI, SOFA, NEWS2...)</span>
        </button>
      </div>

      {/* Despliegue de Calculadoras Integradas */}
      {showIntegratedScales && (
        <div className="pt-1 animate-fade-in">
          <IntegratedScalesCalculator
            patient={patient}
            labs={labs}
            onAddScaleResultToImpression={(text) => {
              const updated = enteredDiagnosis ? `${enteredDiagnosis}\n\n${text}` : text;
              setEnteredDiagnosis(updated);
              if (onUpdateDiagnoses) onUpdateDiagnoses(updated);
            }}
            onClose={() => setShowIntegratedScales(false)}
          />
        </div>
      )}

      {/* SECCIÓN DE ESCALAS AUTOMÁTICAS DESPLEGADAS */}
      {matchingScales.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Calculator className="w-4 h-4 text-teal-700" />
              <span>Escalas Clínicas que Justifican el Diagnóstico:</span>
            </h3>
            <span className="text-xs bg-teal-100 text-teal-900 font-bold px-2 py-0.5 rounded-full">
              {matchingScales.length} {matchingScales.length === 1 ? 'escala detectada' : 'escalas detectadas'}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {matchingScales.map((scale) => {
              const score = calculateScore(scale);
              const interpretation = scale.interpret(score);

              return (
                <div
                  key={scale.id}
                  className="bg-white rounded-2xl border-2 border-teal-700/20 shadow-md p-4 sm:p-5 space-y-4"
                >
                  <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-base font-black text-teal-950">{scale.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{scale.description}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold bg-slate-100 text-slate-800 px-3 py-1 rounded-xl border border-slate-200">
                        Puntuación: <strong className="text-teal-900 text-sm">{score} pts</strong>
                      </span>
                    </div>
                  </div>

                  {/* Checklist Items */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-700 block">
                      Selecciona los criterios presentes en el paciente:
                    </span>
                    <div className="grid grid-cols-1 gap-1.5">
                      {scale.items.map((item) => {
                        const isChecked = !!selectedScaleItems[item.id];
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => toggleScaleItem(item.id)}
                            className={`w-full flex items-start gap-2.5 p-2.5 rounded-xl text-left text-xs transition-colors border ${
                              isChecked
                                ? 'bg-teal-50 border-teal-300 text-teal-950 font-semibold'
                                : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 mt-0.5 rounded flex items-center justify-center border shrink-0 ${
                                isChecked ? 'bg-teal-600 border-teal-700 text-white' : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                            </div>
                            <span className="flex-1">{item.label}</span>
                            <span className="font-mono text-xs font-bold text-teal-800 shrink-0">
                              +{item.points} pt
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Interpretation & Recommendation Box */}
                  <div
                    className={`p-4 rounded-xl border ${
                      interpretation.level === 'rojo'
                        ? 'bg-rose-50 border-rose-200 text-rose-950'
                        : interpretation.level === 'amarillo'
                        ? 'bg-amber-50 border-amber-200 text-amber-950'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    }`}
                  >
                    <div className="text-sm font-black">{interpretation.risk}</div>
                    <div className="text-xs mt-1 leading-relaxed opacity-95">
                      <strong>Conducta sugerida:</strong> {interpretation.recommendation}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500 text-center">
          Escribe un diagnóstico (como <em>Neumonía</em>, <em>Sepsis</em>, <em>Falla cardíaca</em> o <em>TEP</em>) para desplegar su escala clínica de estratificación y justificación médica.
        </div>
      )}

      {/* Red Flags Alert Box */}
      {result.hasRedFlags && (
        <div className="bg-red-50 border-2 border-red-400 p-4 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />
            <span>Signos de Alarma y Banderas Rojas Detectadas:</span>
          </div>
          <ul className="space-y-1.5 pl-6 list-disc text-xs text-red-800 font-semibold">
            {result.activeRedFlags.map((flag, idx) => (
              <li key={idx}>{flag}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Diagnósticos Diferenciales sugeridos por paraclínicos */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-bold text-petrol-900 uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>Diagnósticos Diferenciales Sugeridos por Datos del Paciente</span>
        </h3>

        <div className="grid grid-cols-1 gap-4">
          {result.suggestions.map((sug, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-base font-black text-slate-900">{sug.condition}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{sug.clinicalRationale}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setEnteredDiagnosis(sug.condition)}
                  className="text-xs font-bold px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl transition-colors shrink-0"
                >
                  Usar este diagnóstico →
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Datos clínicos utilizados:</span>
                  </span>
                  <ul className="space-y-1 pl-4 list-disc text-slate-600">
                    {sug.dataUsed.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/60">
                  <span className="font-bold text-amber-900 flex items-center gap-1.5 mb-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Estudios o datos faltantes:</span>
                  </span>
                  {sug.missingData.length > 0 ? (
                    <ul className="space-y-1 pl-4 list-disc text-amber-900">
                      {sug.missingData.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-emerald-700 font-medium pl-1">Estudios primarios completos</p>
                  )}
                </div>
              </div>

              <div className="pt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                <BookOpen className="w-3.5 h-3.5 text-petrol-800" />
                <span>Referencia clínica: <strong>{sug.guidelineReference}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Save Button */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSaveAndDownload}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl bg-[#0F4C5C] hover:bg-petrol-800 text-white transition-all active:scale-95 shadow-md"
        >
          {savedFeedback ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
          {savedFeedback ? '¡Diagnósticos y Escalas Guardados!' : 'Guardar y Descargar Diagnósticos en PC'}
        </button>
      </div>

      {/* Modal Diagnósticos Diferenciales Razonados con IA (Sección 27 & 28) */}
      <DifferentialDiagnosisModal
        isOpen={isDiffModalOpen}
        onClose={() => setIsDiffModalOpen(false)}
        patient={patient}
        labs={labs}
        studies={studies}
        onAddDiagnosisToImpression={(text) => {
          const updated = enteredDiagnosis ? `${enteredDiagnosis}\n\n• ${text}` : text;
          setEnteredDiagnosis(updated);
          if (onUpdateDiagnoses) onUpdateDiagnoses(updated);
        }}
      />

      {/* Modal Discusión Terapéutica con Guías Oficiales (Sección 30 & 31) */}
      <TherapeuticDiscussionModal
        isOpen={isTherapeuticModalOpen}
        onClose={() => setIsTherapeuticModalOpen(false)}
        patient={patient}
        labs={labs}
        onInsertDiscussionToNote={(text) => {
          const updated = enteredDiagnosis ? `${enteredDiagnosis}\n\n${text}` : text;
          setEnteredDiagnosis(updated);
          if (onUpdateDiagnoses) onUpdateDiagnoses(updated);
        }}
      />

      {/* Modal Corrector Ortográfico Médico & Duplicados (Sección 18 & 20) */}
      <MedicalSpellCheckModal
        isOpen={isSpellModalOpen}
        onClose={() => setIsSpellModalOpen(false)}
        originalText={enteredDiagnosis}
        onApplyCleanedText={(newText) => {
          setEnteredDiagnosis(newText);
          if (onUpdateDiagnoses) onUpdateDiagnoses(newText);
        }}
        fieldLabel="Diagnósticos e Impresión Clínica"
      />
    </div>
  );
};
