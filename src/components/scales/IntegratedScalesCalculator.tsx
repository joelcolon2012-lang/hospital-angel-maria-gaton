import React, { useState } from 'react';
import { Patient, LabResult, Vitals } from '../../types';
import {
  calculateCURB65,
  calculateQSOFA,
  calculateNEWS2,
  calculateGlasgowBlatchford,
  calculateSOFA,
  calculatePSI,
  ScaleCalculationOutput,
  EXPANDED_SCALE_LIST,
} from '../../services/clinicalScaleEngine';
import { CLINICAL_SCALES } from '../../services/clinicalCalculators';
import {
  Calculator,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  Plus,
  RefreshCw,
  X,
  ExternalLink,
} from 'lucide-react';

interface Props {
  patient: Patient;
  labs?: LabResult[];
  onAddScaleResultToImpression?: (textToAppend: string) => void;
  initialScaleId?: string;
  onClose?: () => void;
}

export const IntegratedScalesCalculator: React.FC<Props> = ({
  patient,
  labs = [],
  onAddScaleResultToImpression,
  initialScaleId = 'curb65',
  onClose,
}) => {
  const [selectedScaleId, setSelectedScaleId] = useState<string>(initialScaleId);

  // Overrides manuales por escala si el médico desea alternar
  const [curbOverrides, setCurbOverrides] = useState({
    isConfused: patient.vitals?.glasgowTotal ? patient.vitals.glasgowTotal < 15 : undefined,
    bunOver19: undefined as boolean | undefined,
    rrOver30: patient.vitals?.respiratoryRate ? patient.vitals.respiratoryRate >= 30 : undefined,
    sbpLow: patient.vitals?.systolicBP ? patient.vitals.systolicBP < 90 : undefined,
  });

  const [qsofaOverrides, setQsofaOverrides] = useState({
    rrOver22: patient.vitals?.respiratoryRate ? patient.vitals.respiratoryRate >= 22 : undefined,
    alteredMentalState: patient.vitals?.glasgowTotal ? patient.vitals.glasgowTotal < 15 : undefined,
    sbpUnder100: patient.vitals?.systolicBP ? patient.vitals.systolicBP <= 100 : undefined,
  });

  const [blatchfordOverrides, setBlatchfordOverrides] = useState({
    melena: false,
    syncope: false,
    hepaticDisease: false,
    heartFailure: false,
  });

  const [news2Overrides, setNews2Overrides] = useState({
    useSpO2Scale2: false,
    onOxygen: Boolean(patient.vitals?.supplementalOxygen && patient.vitals.supplementalOxygen !== 'Aire ambiente'),
  });

  // Escala NIHSS / Rankin
  const [nihssChecked, setNihssChecked] = useState<Record<string, boolean>>({});
  const [rankinScore, setRankinScore] = useState<number | null>(null);

  const [addedFeedback, setAddedFeedback] = useState(false);

  // Contexto del paciente
  const ctx = {
    age: patient.age,
    sex: patient.sex,
    vitals: patient.vitals,
    labs,
  };

  // Cálculo según la escala seleccionada
  let currentOutput: ScaleCalculationOutput | null = null;

  if (selectedScaleId === 'curb65') {
    currentOutput = calculateCURB65(ctx, curbOverrides);
  } else if (selectedScaleId === 'qsofa') {
    currentOutput = calculateQSOFA(ctx, qsofaOverrides);
  } else if (selectedScaleId === 'news2') {
    currentOutput = calculateNEWS2(ctx, news2Overrides);
  } else if (selectedScaleId === 'glasgow_blatchford') {
    currentOutput = calculateGlasgowBlatchford(ctx, blatchfordOverrides);
  } else if (selectedScaleId === 'sofa') {
    currentOutput = calculateSOFA(ctx);
  } else if (selectedScaleId === 'psi_port') {
    currentOutput = calculatePSI(ctx);
  } else if (selectedScaleId === 'nihss') {
    const nihssDef = CLINICAL_SCALES.find((s) => s.id === 'nihss');
    const score = Object.entries(nihssChecked).reduce((total, [id, checked]) => {
      if (!checked) return total;
      const item = nihssDef?.items.find((i) => i.id === id);
      return total + (item ? item.points : 0);
    }, 0);
    const interp = nihssDef?.interpret(score);

    currentOutput = {
      scaleId: 'nihss',
      scaleName: 'Escala NIHSS (Déficit Neurológico en Ictus)',
      score,
      maxScore: 42,
      interpretation: interp?.risk || '',
      riskCategory: score >= 16 ? 'Riesgo Crítico' : score >= 5 ? 'Alto Riesgo' : 'Bajo Riesgo',
      recommendation: interp?.recommendation || '',
      officialSource: 'National Institute of Neurological Disorders and Stroke (NINDS) / Brott T et al. Stroke 1989;20:864-870.',
      missingData: Object.keys(nihssChecked).length === 0 ? ['Completar evaluación neurológica por ítems'] : [],
      isComplete: true,
      variablesUsed: { score },
      summaryText: `NIHSS: ${score}/42 pts — ${interp?.risk}`,
    };
  } else if (selectedScaleId === 'rankin') {
    const rankinDef = CLINICAL_SCALES.find((s) => s.id === 'rankin');
    const score = rankinScore ?? 0;
    const interp = rankinDef?.interpret(score);

    currentOutput = {
      scaleId: 'rankin',
      scaleName: 'Escala de Rankin Modificada (mRS — Discapacidad Funcional)',
      score,
      maxScore: 6,
      interpretation: interp?.risk || '',
      riskCategory: score >= 4 ? 'Alto Riesgo' : score >= 3 ? 'Riesgo Intermedio' : 'Bajo Riesgo',
      recommendation: interp?.recommendation || '',
      officialSource: 'van Swieten JC et al. Interobserver agreement for the assessment of handicap in stroke patients. Stroke 1988;19:604-607.',
      missingData: rankinScore === null ? ['Seleccionar grado de discapacidad funcional (0 a 6)'] : [],
      isComplete: rankinScore !== null,
      variablesUsed: { score },
      summaryText: `Rankin mRS: Grado ${score} — ${interp?.risk}`,
    };
  }

  const handleAppendToHistory = () => {
    if (!currentOutput || !onAddScaleResultToImpression) return;

    const formatted = `[${currentOutput.scaleName.toUpperCase()}]: ${currentOutput.score} pts. Estratificación: ${currentOutput.interpretation}. Conducta recomendada: ${currentOutput.recommendation} (Fuente: ${currentOutput.officialSource})`;

    onAddScaleResultToImpression(formatted);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col text-xs">
      {/* Top Header */}
      <div className="bg-slate-900 text-white p-3 sm:px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-teal-400" />
          <h3 className="font-bold text-xs sm:text-sm">
            Calculadoras Clínicas Integradas (Sección 25 & 26)
          </h3>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Scale Selector Tabs */}
      <div className="bg-slate-100 p-2 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {EXPANDED_SCALE_LIST.map((scale) => (
          <button
            key={scale.id}
            onClick={() => setSelectedScaleId(scale.id)}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all text-xs ${
              selectedScaleId === scale.id
                ? 'bg-[#0F4C5C] text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            {scale.name}
          </button>
        ))}
      </div>

      {/* Main Calculator Content */}
      <div className="p-4 space-y-3.5">
        {/* Missing Data Warning Alert */}
        {currentOutput && currentOutput.missingData.length > 0 && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r-xl space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>DATOS FALTANTES DETECTADOS (Cálculo Incompleto o Parcial):</span>
            </div>
            <ul className="list-disc list-inside text-amber-800 text-[11px] space-y-0.5">
              {currentOutput.missingData.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
            <p className="text-[10px] text-amber-700 italic mt-1">
              * El sistema médico no calcula silenciosamente sin estos parámetros. Digita o confirma los valores para completar la estratificación.
            </p>
          </div>
        )}

        {/* Results Card */}
        {currentOutput && (
          <div className="bg-gradient-to-br from-slate-50 to-teal-50/30 p-4 rounded-2xl border border-teal-200 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Escala Seleccionada
                </span>
                <h4 className="text-sm sm:text-base font-extrabold text-slate-900">
                  {currentOutput.scaleName}
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right">
                  <span className="text-2xl sm:text-3xl font-black text-teal-800">
                    {currentOutput.score}
                  </span>
                  {currentOutput.maxScore && (
                    <span className="text-xs text-slate-400 font-bold">
                      /{currentOutput.maxScore} pts
                    </span>
                  )}
                </div>

                <span
                  className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg ${
                    currentOutput.riskCategory === 'Riesgo Crítico'
                      ? 'bg-red-600 text-white'
                      : currentOutput.riskCategory === 'Alto Riesgo'
                      ? 'bg-orange-500 text-white'
                      : currentOutput.riskCategory === 'Riesgo Intermedio'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  }`}
                >
                  {currentOutput.riskCategory}
                </span>
              </div>
            </div>

            {/* Interpretation */}
            <div>
              <span className="font-bold text-slate-700 block text-xs">Interpretación:</span>
              <p className="font-bold text-slate-900 text-xs sm:text-sm mt-0.5">
                {currentOutput.interpretation}
              </p>
            </div>

            {/* Recommendation */}
            <div>
              <span className="font-bold text-slate-700 block text-xs">Conducta Clínica Recomendada:</span>
              <p className="text-slate-700 text-xs mt-0.5">
                {currentOutput.recommendation}
              </p>
            </div>

            {/* Official Citation Source */}
            <div className="pt-2 border-t border-slate-200 flex items-start gap-1.5 text-[10px] text-slate-500">
              <BookOpen className="w-3.5 h-3.5 text-teal-700 shrink-0 mt-0.5" />
              <span>
                <strong>Fuente Oficial:</strong> {currentOutput.officialSource}
              </span>
            </div>
          </div>
        )}

        {/* Specialized Interactive Controls for NIHSS */}
        {selectedScaleId === 'nihss' && (
          <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <h5 className="font-bold text-slate-800 text-xs">
              Marcar ítems del déficit neurológico presentes en el paciente:
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-60 overflow-y-auto pr-1">
              {CLINICAL_SCALES.find((s) => s.id === 'nihss')?.items.map((item) => (
                <label
                  key={item.id}
                  className={`flex items-start gap-2 p-2 rounded-lg border text-[11px] cursor-pointer transition-colors ${
                    nihssChecked[item.id]
                      ? 'bg-teal-50 border-teal-400 font-bold text-teal-950'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(nihssChecked[item.id])}
                    onChange={(e) =>
                      setNihssChecked((prev) => ({ ...prev, [item.id]: e.target.checked }))
                    }
                    className="mt-0.5 text-teal-700 rounded focus:ring-teal-500"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Specialized Interactive Controls for Modified Rankin */}
        {selectedScaleId === 'rankin' && (
          <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <h5 className="font-bold text-slate-800 text-xs">
              Seleccionar grado de dependencia funcional post-ictus (0 a 6):
            </h5>
            <div className="grid grid-cols-1 gap-1.5">
              {[
                { score: 0, label: 'Grado 0: Sin síntomas; completamente asintomático' },
                { score: 1, label: 'Grado 1: Incapacidad no significativa; realiza todas sus actividades previas' },
                { score: 2, label: 'Grado 2: Incapacidad leve; incapaz de algunas actividades, pero independiente en autocuidado' },
                { score: 3, label: 'Grado 3: Incapacidad moderada; requiere alguna ayuda pero camina sin asistencia' },
                { score: 4, label: 'Grado 4: Incapacidad moderadamente severa; incapaz de caminar o atender necesidades sin ayuda' },
                { score: 5, label: 'Grado 5: Incapacidad severa; confinado a cama, incontinente y requiere cuidados continuos' },
                { score: 6, label: 'Grado 6: Fallecimiento' },
              ].map((r) => (
                <button
                  key={r.score}
                  type="button"
                  onClick={() => setRankinScore(r.score)}
                  className={`text-left p-2 rounded-lg border text-[11px] font-medium transition-all ${
                    rankinScore === r.score
                      ? 'bg-[#0F4C5C] text-white font-bold border-teal-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Append to Impression Button */}
        {onAddScaleResultToImpression && currentOutput && (
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleAppendToHistory}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>
                {addedFeedback
                  ? '¡Agregado a la Impresión Clínica!'
                  : 'AGREGAR RESULTADO A IMPRESIÓN DIAGNÓSTICA'}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
