import React, { useState } from 'react';
import { X, CheckCheck, SpellCheck, Check } from 'lucide-react';
import { SpellingCorrectionProposal } from '../../types';

interface SpellingReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposals: SpellingCorrectionProposal[];
  onApplyCorrections: (acceptedProposals: SpellingCorrectionProposal[]) => void;
}

export const SpellingReviewModal: React.FC<SpellingReviewModalProps> = ({
  isOpen,
  onClose,
  proposals,
  onApplyCorrections
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(proposals.map(p => p.id)));

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(proposals.map(p => p.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleApply = () => {
    const accepted = proposals.filter(p => selectedIds.has(p.id));
    onApplyCorrections(accepted);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-teal-50/80 border-b border-teal-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20">
              <SpellCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Corrector Ortográfico Médico</h3>
              <p className="text-xs text-slate-500">
                {proposals.length === 0 
                  ? 'No se detectaron errores ortográficos' 
                  : `Se identificaron ${proposals.length} sugerencias de corrección gramatical y tildes`}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action bar */}
        {proposals.length > 0 && (
          <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">
              {selectedIds.size} de {proposals.length} seleccionadas
            </span>
            <div className="flex space-x-3">
              <button 
                onClick={handleSelectAll} 
                className="text-teal-700 hover:text-teal-800 font-semibold hover:underline"
              >
                Seleccionar Todas
              </button>
              <span className="text-slate-300">|</span>
              <button 
                onClick={handleDeselectAll} 
                className="text-slate-500 hover:text-slate-700 font-semibold hover:underline"
              >
                Deseleccionar
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {proposals.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-800">¡Ortografía Impecable!</h4>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                No se encontraron omisiones de tildes ni errores de concordancia médica en los apartados redactados.
              </p>
            </div>
          ) : (
            proposals.map(p => {
              const isSelected = selectedIds.has(p.id);
              return (
                <div 
                  key={p.id}
                  onClick={() => toggleSelect(p.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected 
                      ? 'bg-teal-50/50 border-teal-300 shadow-sm' 
                      : 'bg-white border-slate-200 hover:border-slate-300 opacity-70'
                  }`}
                >
                  <div className="flex-1 pr-4">
                    <div className="flex items-center space-x-3 mb-1.5">
                      <span className="line-through text-red-600 font-bold text-sm bg-red-50 px-2 py-0.5 rounded border border-red-200">
                        {p.originalWord}
                      </span>
                      <span className="text-slate-400 font-bold">&rarr;</span>
                      <span className="text-teal-800 font-bold text-sm bg-teal-100 px-2 py-0.5 rounded border border-teal-200">
                        {p.proposedWord}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 italic">
                      {p.contextSnippet}
                    </p>
                  </div>
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-colors ${
                    isSelected ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-300 bg-white'
                  }`}>
                    {isSelected && <Check className="w-4 h-4" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-sm font-semibold transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleApply}
            disabled={selectedIds.size === 0}
            className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-teal-600/20 disabled:opacity-50 flex items-center gap-2"
          >
            <CheckCheck className="w-4 h-4" />
            Aplicar Correcciones ({selectedIds.size})
          </button>
        </div>

      </div>
    </div>
  );
};
