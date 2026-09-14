import React from 'react';
import { X, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { PendingFieldItem } from '../../types';

interface PendingFieldsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingFields: PendingFieldItem[];
  onNavigateToSection: (sectionId: string) => void;
}

export const PendingFieldsModal: React.FC<PendingFieldsModalProps> = ({
  isOpen,
  onClose,
  pendingFields,
  onNavigateToSection
}) => {
  if (!isOpen) return null;

  // Agrupar por sección
  const grouped = pendingFields.reduce((acc, item) => {
    if (!acc[item.sectionTitle]) acc[item.sectionTitle] = [];
    acc[item.sectionTitle].push(item);
    return acc;
  }, {} as Record<string, PendingFieldItem[]>);

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Checklist de Campos Pendientes</h3>
              <p className="text-xs text-slate-500">
                {pendingFields.length === 0 
                  ? 'Todos los campos requeridos han sido completados' 
                  : `Se identificaron ${pendingFields.length} campos por documentar`}
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {pendingFields.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-800">¡Historia Clínica Completa!</h4>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                No existen campos clínicos pendientes. El expediente cuenta con todos los datos necesarios para su revisión y oficialización.
              </p>
            </div>
          ) : (
            Object.entries(grouped).map(([sectionTitle, items]) => (
              <div key={sectionTitle} className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/80">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-700 tracking-wider uppercase flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    {sectionTitle}
                  </h4>
                  <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                    {items.length} {items.length === 1 ? 'pendiente' : 'pendientes'}
                  </span>
                </div>
                <div className="space-y-2 mt-3">
                  {items.map(it => (
                    <div 
                      key={it.id}
                      className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200/60 hover:border-teal-400 transition-colors group cursor-pointer"
                      onClick={() => {
                        onNavigateToSection(it.sectionId);
                        onClose();
                      }}
                    >
                      <span className="text-sm font-medium text-slate-700">{it.fieldName}</span>
                      <button className="text-xs text-teal-600 font-semibold group-hover:text-teal-700 flex items-center gap-1">
                        Completar <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
};
