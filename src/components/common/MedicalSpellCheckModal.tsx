import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Check,
  AlertCircle,
  Copy,
  Trash2,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import {
  checkMedicalSpelling,
  removeDuplicatePhrase,
  SpellCheckResult,
  ClinicalSpellingSuggestion,
} from '../../services/ai/ClinicalSpellChecker';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  onApplyCleanedText: (newText: string) => void;
  fieldLabel?: string;
}

export const MedicalSpellCheckModal: React.FC<Props> = ({
  isOpen,
  onClose,
  originalText,
  onApplyCleanedText,
  fieldLabel = 'Nota / Texto Clínico',
}) => {
  const [currentText, setCurrentText] = useState(originalText);
  const [result, setResult] = useState<SpellCheckResult>(() => checkMedicalSpelling(originalText));
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const [appliedFeedback, setAppliedFeedback] = useState(false);

  if (!isOpen) return null;

  const handleApplySingleSuggestion = (sug: ClinicalSpellingSuggestion) => {
    if (sug.category === 'duplicate_phrase') {
      const updated = removeDuplicatePhrase(currentText, sug.original);
      setCurrentText(updated);
      setResult(checkMedicalSpelling(updated));
    } else {
      const regex = new RegExp(`\\b${sug.original}\\b`, 'g');
      const updated = currentText.replace(regex, sug.suggested);
      setCurrentText(updated);
      setResult(checkMedicalSpelling(updated));
    }
    setDismissedSuggestions((prev) => new Set(prev).add(sug.id));
  };

  const handleDismissSuggestion = (id: string) => {
    setDismissedSuggestions((prev) => new Set(prev).add(id));
  };

  const handleApplyAllSafeFixes = () => {
    setCurrentText(result.autoCleanedText);
    setResult(checkMedicalSpelling(result.autoCleanedText));
  };

  const handleConfirmAndSave = () => {
    onApplyCleanedText(currentText);
    setAppliedFeedback(true);
    setTimeout(() => {
      setAppliedFeedback(false);
      onClose();
    }, 1000);
  };

  const pendingSuggestions = result.suggestions.filter(
    (s) => !dismissedSuggestions.has(s.id) && !s.canAutoApply
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] text-xs">
        {/* Header */}
        <div className="bg-[#0F4C5C] text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-300" />
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                Corrector Ortográfico Médico & Detector de Duplicados
              </h3>
              <p className="text-[11px] text-teal-100">
                Hospital Regional Dr. Ángel María Gatón — Requisitos 18, 19 y 20
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
          {/* Safe corrections status */}
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold text-emerald-950 block">Corrección Segura Automática</span>
                <p className="text-emerald-800 text-[11px]">
                  Limpia espacios dobles, mayúsculas iniciales y tildes médicas sin alterar números, dosis ni unidades.
                </p>
              </div>
            </div>
            {currentText !== result.autoCleanedText && (
              <button
                type="button"
                onClick={handleApplyAllSafeFixes}
                className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-[11px] whitespace-nowrap active:scale-95 shadow-xs"
              >
                Aplicar Corrección Segura
              </button>
            )}
          </div>

          {/* Clinical Suggestions (¿QUIERE CAMBIAR...?) */}
          {pendingSuggestions.length > 0 && (
            <div className="space-y-2">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Sugerencias Clínicas Que Requieren Aprobación ({pendingSuggestions.length}):</span>
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {pendingSuggestions.map((sug) => (
                  <div
                    key={sug.id}
                    className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-900">
                          {sug.category === 'duplicate_phrase' ? '¿ELIMINAR DUPLICACIÓN?' : '¿QUIERE CAMBIAR?'}
                        </span>
                        <span className="bg-amber-100 text-amber-900 font-extrabold px-1.5 py-0.5 rounded text-[10px]">
                          {sug.original}
                        </span>
                        {sug.category !== 'duplicate_phrase' && (
                          <>
                            <ArrowRight className="w-3.5 h-3.5 text-amber-700" />
                            <span className="bg-emerald-100 text-emerald-900 font-extrabold px-1.5 py-0.5 rounded text-[10px]">
                              {sug.suggested}
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-slate-600 text-[11px]">{sug.reason}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDismissSuggestion(sug.id)}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded-lg text-[11px] font-bold"
                      >
                        Conservar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplySingleSuggestion(sug)}
                        className="px-3 py-1 bg-[#0F4C5C] hover:bg-petrol-800 text-white rounded-lg text-[11px] font-bold shadow-xs active:scale-95"
                      >
                        {sug.category === 'duplicate_phrase' ? 'Eliminar Copia' : 'Cambiar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Textarea Preview */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">
              Texto Resultante ({fieldLabel}):
            </label>
            <textarea
              rows={6}
              value={currentText}
              onChange={(e) => {
                setCurrentText(e.target.value);
                setResult(checkMedicalSpelling(e.target.value));
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-600 font-sans"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 italic">
            * Ningún dato clínico se modifica sin tu consentimiento.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white text-slate-700 rounded-xl font-bold border border-slate-200 hover:bg-slate-50 text-xs"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmAndSave}
              className="px-5 py-2 bg-[#0F4C5C] hover:bg-petrol-800 text-white rounded-xl font-bold text-xs shadow-md active:scale-95 flex items-center gap-1.5"
            >
              {appliedFeedback ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>¡TEXTO ACTUALIZADO!</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>APLICAR AL DOCUMENTO</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
