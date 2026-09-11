import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  RotateCcw,
  Check,
  Stethoscope,
  Sparkles,
} from 'lucide-react';
import {
  OFFICIAL_16_SYSTEMS,
  getCustomNormalPhysicalExam,
  saveCustomNormalPhysicalExam,
} from '../../services/clinicalNormalTemplateService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const CustomNormalExamModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [examData, setExamData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getCustomNormalPhysicalExam().then((data) => {
        setExamData(data);
        setLoading(false);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (id: string, val: string) => {
    setExamData((prev) => ({ ...prev, [id]: val }));
  };

  const handleSave = async () => {
    await saveCustomNormalPhysicalExam(examData);
    setSavedSuccess(true);
    if (onSaved) onSaved();
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleResetDefaults = () => {
    if (confirm('¿Deseas restablecer todos los sistemas a los textos normales predeterminados del hospital?')) {
      const defaults: Record<string, string> = {};
      OFFICIAL_16_SYSTEMS.forEach((s) => {
        defaults[s.id] = s.defaultNormal;
      });
      setExamData(defaults);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#0F4C5C] px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Stethoscope className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">
                CONFIGURACIÓN → MI EXAMEN FÍSICO NORMAL
              </h3>
              <p className="text-xs text-teal-100 font-medium">
                Personaliza los 16 sistemas cefalocaudales. Al presionar "Cargar Examen Físico Normal", el sistema completará estos textos automáticamente.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Banner */}
        <div className="bg-teal-50 border-b border-teal-200 px-6 py-2.5 flex items-center justify-between text-xs text-teal-900 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-700 shrink-0" />
            <span>
              Tórax, Pulmones, Corazón y Cabeza cuentan con secciones completamente independientes según el protocolo oficial.
            </span>
          </div>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-800 hover:text-teal-950 underline cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Restablecer predeterminados</span>
          </button>
        </div>

        {/* Scrollable System Fields */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500 font-medium">
              Cargando plantilla de examen físico normal...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {OFFICIAL_16_SYSTEMS.map((sys) => (
                <div
                  key={sys.id}
                  className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 block">
                      {sys.name}
                    </label>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-600">
                      {sys.category}
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={examData[sys.id] || ''}
                    onChange={(e) => handleChange(sys.id, e.target.value)}
                    placeholder={`Texto normal para ${sys.name}...`}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:border-[#0F4C5C] focus:ring-1 focus:ring-[#0F4C5C] outline-none resize-none transition-all"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between shrink-0">
          <p className="text-xs text-slate-500 font-medium">
            Los cambios se guardan de forma central y se sincronizan en todos sus dispositivos.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={savedSuccess}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-black shadow-md transition-all cursor-pointer active:scale-95 ${
                savedSuccess ? 'bg-emerald-600' : 'bg-[#0F4C5C] hover:bg-[#134E5E]'
              }`}
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>¡GUARDADO CON ÉXITO!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-emerald-300" />
                  <span>GUARDAR COMO MI EXAMEN NORMAL</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
