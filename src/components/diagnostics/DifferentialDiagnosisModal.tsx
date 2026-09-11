import React, { useState } from 'react';
import { Patient, LabResult, MedicalStudy } from '../../types';
import {
  generateReasonedDifferentials,
  ReasonedDifferentialDiagnosis,
  DifferentialAnalysisReport,
} from '../../services/ai/DifferentialDiagnosisService';
import {
  Sparkles,
  X,
  Plus,
  Check,
  AlertTriangle,
  FileSearch,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  HelpCircle,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  labs?: LabResult[];
  studies?: MedicalStudy[];
  onAddDiagnosisToImpression: (diagnosisText: string) => void;
}

export const DifferentialDiagnosisModal: React.FC<Props> = ({
  isOpen,
  onClose,
  patient,
  labs = [],
  studies = [],
  onAddDiagnosisToImpression,
}) => {
  const [report] = useState<DifferentialAnalysisReport>(() =>
    generateReasonedDifferentials(patient, labs, studies)
  );
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const handleAddDifferential = (diff: ReasonedDifferentialDiagnosis) => {
    const formatted = `${diff.diagnosisName}${diff.cie10Code ? ` (${diff.cie10Code})` : ''} — Urgencia: ${diff.urgencyLevel}. Justificación: ${diff.argumentsInFavor[0]}`;
    onAddDiagnosisToImpression(formatted);
    setAddedIds((prev) => new Set(prev).add(diff.id));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] text-xs">
        {/* Header */}
        <div className="bg-[#0F4C5C] text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-300" />
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                Diagnósticos Diferenciales Razonados con IA
              </h3>
              <p className="text-[11px] text-teal-100">
                Hospital Regional Ángel María Gatón — Requisitos 27, 28 y 29
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-teal-200 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4">
          {/* Disclaimer Banner */}
          <div className="bg-teal-50 border border-teal-200 p-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-teal-900">
              <Sparkles className="w-4 h-4 text-teal-700 shrink-0" />
              <span className="font-bold text-xs">
                GENERADO CON IA — REQUIERE REVISIÓN MÉDICA
              </span>
            </div>
            <span className="text-[11px] text-slate-500 italic hidden sm:inline">
              La IA no incorpora ningún diagnóstico sin tu aprobación.
            </span>
          </div>

          {/* Clinical Consistency Warnings if any */}
          {report.clinicalConsistencyWarnings.length > 0 && (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r-xl space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>AVISO DE CONSISTENCIA CLÍNICA (Sección 34):</span>
              </div>
              <ul className="list-disc list-inside text-amber-800 text-[11px]">
                {report.clinicalConsistencyWarnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Primary Impression Anchor */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Sospecha o Impresión Clínica Actual del Paciente:
            </span>
            <p className="text-slate-900 font-extrabold text-xs sm:text-sm mt-0.5">
              {report.primaryImpression}
            </p>
          </div>

          {/* Differentials List */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 text-xs sm:text-sm">
              Diagnósticos Diferenciales Sugeridos ({report.differentials.length}):
            </h4>

            {report.differentials.map((diff, index) => {
              const isAdded = addedIds.has(diff.id);

              return (
                <div
                  key={diff.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow space-y-3"
                >
                  {/* Title & Urgency */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#0F4C5C] text-white flex items-center justify-center font-bold text-xs">
                        {index + 1}
                      </span>
                      <h5 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                        {diff.diagnosisName}
                      </h5>
                      {diff.cie10Code && (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          CIE-10: {diff.cie10Code}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase ${
                          diff.urgencyLevel === 'ALTA'
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : diff.urgencyLevel === 'MEDIA'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}
                      >
                        Urgencia: {diff.urgencyLevel}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleAddDifferential(diff)}
                        disabled={isAdded}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all active:scale-95 shadow-xs ${
                          isAdded
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Agregado</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>AGREGAR A IMPRESIÓN DIAGNÓSTICA</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Arguments in Favor */}
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-xs mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Argumentos a favor:</span>
                    </div>
                    <ul className="list-disc list-inside text-slate-700 text-[11px] space-y-0.5 pl-1">
                      {diff.argumentsInFavor.map((arg, i) => (
                        <li key={i}>{arg}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Arguments Against */}
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-slate-700 text-xs mb-1">
                      <XCircle className="w-3.5 h-3.5 text-rose-500" />
                      <span>Argumentos en contra o a descartar:</span>
                    </div>
                    <ul className="list-disc list-inside text-slate-600 text-[11px] space-y-0.5 pl-1">
                      {diff.argumentsAgainst.map((arg, i) => (
                        <li key={i}>{arg}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Confirmatory Studies */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-1.5 font-bold text-teal-900 text-[11px] mb-1">
                      <FileSearch className="w-3.5 h-3.5 text-teal-700" />
                      <span>Estudios para confirmarlo o descartarlo:</span>
                    </div>
                    <ul className="list-disc list-inside text-slate-700 text-[11px] space-y-0.5">
                      {diff.confirmatoryStudies.map((study, i) => (
                        <li key={i}>{study}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#0F4C5C] text-white rounded-xl font-bold text-xs shadow-md active:scale-95"
          >
            Listo / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
