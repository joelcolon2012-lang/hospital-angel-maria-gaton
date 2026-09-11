import React, { useState } from 'react';
import { Patient, MedicalOrder, LabResult } from '../../types';
import {
  generateTherapeuticDiscussion,
  TherapeuticDiscussionReport,
} from '../../services/ai/TherapeuticDiscussionService';
import {
  BookOpen,
  X,
  Plus,
  Check,
  AlertTriangle,
  Sparkles,
  ShieldAlert,
  ExternalLink,
  Pill,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  orders?: MedicalOrder[];
  labs?: LabResult[];
  onInsertDiscussionToNote?: (discussionText: string) => void;
}

export const TherapeuticDiscussionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  patient,
  orders = [],
  labs = [],
  onInsertDiscussionToNote,
}) => {
  const [report] = useState<TherapeuticDiscussionReport>(() =>
    generateTherapeuticDiscussion(patient, orders, labs)
  );
  const [insertedFeedback, setInsertedFeedback] = useState(false);

  if (!isOpen) return null;

  const handleInsert = () => {
    if (onInsertDiscussionToNote) {
      onInsertDiscussionToNote(report.comprehensiveDiscussionText);
      setInsertedFeedback(true);
      setTimeout(() => {
        setInsertedFeedback(false);
        onClose();
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] text-xs">
        {/* Header */}
        <div className="bg-[#0F4C5C] text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-teal-300" />
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                Discusión Terapéutica Basada en Guías Oficiales
              </h3>
              <p className="text-[11px] text-teal-100">
                Hospital Regional Ángel María Gatón — Requisitos 30, 31, 32, 33 y 35
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
          {/* AI Disclaimer */}
          <div className="bg-teal-50 border border-teal-200 p-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-teal-900 font-bold text-xs">
              <Sparkles className="w-4 h-4 text-teal-700 shrink-0" />
              <span>GENERADO CON IA — ANCLADO EN DIAGNÓSTICO #1 Y ÓRDENES ACTIVAS</span>
            </div>
          </div>

          {/* Guideline Badge */}
          {report.guidelineUsed && (
            <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider block">
                Guía Clínica Oficial Recuperada:
              </span>
              <h4 className="font-extrabold text-sm sm:text-base text-emerald-300">
                {report.guidelineUsed.guidelineName} ({report.guidelineUsed.society})
              </h4>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300 pt-1">
                <span>Año: <strong>{report.guidelineUsed.year}</strong></span>
                <span>Nivel: <strong>{report.guidelineUsed.evidenceLevel}</strong></span>
                <a
                  href={report.guidelineUsed.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-teal-300 hover:underline font-bold"
                >
                  <span>Enlace a la Guía Oficial</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* Unrelated Drugs Alert (VERIFICAR INDICACIÓN) */}
          {report.unrelatedDrugsAlerts.length > 0 && (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r-xl space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>ALERTAS DE INDICACIÓN (Sección 33):</span>
              </div>
              <ul className="list-disc list-inside text-amber-800 text-[11px] space-y-0.5">
                {report.unrelatedDrugsAlerts.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
              <p className="text-[10px] text-amber-700 italic">
                * Los fármacos no se eliminan automáticamente; se sugiere verificar su justificación clínica con el diagnóstico principal.
              </p>
            </div>
          )}

          {/* Renal Dose Alerts */}
          {report.renalDoseAlerts.length > 0 && (
            <div className="bg-rose-50 border-l-4 border-rose-500 p-3 rounded-r-xl space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-rose-900 text-xs">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>ALERTAS DE AJUSTE RENAL / REVISIÓN DE DOSIS (Sección 35):</span>
              </div>
              <ul className="list-disc list-inside text-rose-800 text-[11px] space-y-0.5">
                {report.renalDoseAlerts.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Structured Text Preview */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 block text-xs">
              Texto de Discusión Terapéutica Formateado:
            </label>
            <div className="bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-sans text-slate-800 leading-relaxed whitespace-pre-line select-all">
              {report.comprehensiveDiscussionText}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white text-slate-700 rounded-xl font-bold border border-slate-200 hover:bg-slate-50 text-xs"
          >
            Cerrar
          </button>
          {onInsertDiscussionToNote && (
            <button
              type="button"
              onClick={handleInsert}
              className="px-5 py-2 bg-[#0F4C5C] hover:bg-petrol-800 text-white rounded-xl font-bold text-xs shadow-md active:scale-95 flex items-center gap-1.5"
            >
              {insertedFeedback ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>¡INSERTADO EN NOTA!</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>INSERTAR EN NOTA MÉDICA</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
