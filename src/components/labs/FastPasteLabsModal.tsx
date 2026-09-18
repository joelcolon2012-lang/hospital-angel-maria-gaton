import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Sparkles, 
  Check, 
  Trash2, 
  Copy, 
  AlertCircle, 
  TestTube2, 
  Clock, 
  Calendar,
  Layers,
  ArrowRight,
  Plus
} from 'lucide-react';
import { LabResult, LabPanel, LabFlag } from '../../types';
import { ParaclinicalParser, ParsedLabItem } from '../../services/paraclinicalParser';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  onSaveLabs: (labs: Partial<LabResult>[]) => void;
}

const TEMPLATE_EXAMPLES = [
  {
    name: 'Hemograma + Química',
    text: 'GB: 11.8, HB: 9.2, HCT: 28.5, PLT: 420, GLIC: 145, UREA: 42, CREAT: 1.6'
  },
  {
    name: 'Perfil Renal + Electrolitos',
    text: 'CREAT: 2.8, BUN: 45, UREA: 96, NA: 131, K: 5.6, CL: 98'
  },
  {
    name: 'Coagulación + Hepático',
    text: 'TP: 15.8, INR: 1.42, TPT: 37.0, TGO: 82, TGP: 94, BT: 2.1, BD: 1.5, ALB: 2.9'
  },
  {
    name: 'Gases Arteriales',
    text: 'PH: 7.28, PCO2: 29, PO2: 82, HCO3: 13.5, LACT: 3.8'
  },
  {
    name: 'Marcadores Cardíacos',
    text: 'TROPONINA: 1.45, CPK: 340, CK-MB: 48, PRO-BNP: 2100'
  }
];

export const FastPasteLabsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  patientId,
  onSaveLabs,
}) => {
  const [inputText, setInputText] = useState('');
  const [labItems, setLabItems] = useState<ParsedLabItem[]>([]);
  const [timestamp, setTimestamp] = useState(() => new Date().toISOString().slice(0, 16).replace('T', ' '));
  const [successBanner, setSuccessBanner] = useState(false);

  // Recalcular cuando cambia inputText
  useEffect(() => {
    if (!inputText.trim()) {
      setLabItems([]);
      return;
    }
    const parsed = ParaclinicalParser.parsePastedLabs(inputText);
    setLabItems(parsed);
  }, [inputText]);

  if (!isOpen) return null;

  const handleUpdateItem = (id: string, field: keyof ParsedLabItem, value: any) => {
    setLabItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleRemoveItem = (id: string) => {
    setLabItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSaveAll = () => {
    if (labItems.length === 0) return;

    const formattedLabs: Partial<LabResult>[] = labItems.map(item => ({
      patientId,
      panel: item.panel,
      parameter: item.parameter,
      value: item.value,
      unit: item.unit,
      referenceRange: item.referenceRange || 'Estándar',
      flag: item.flag || 'normal',
      timestamp,
      source: 'manual'
    }));

    onSaveLabs(formattedLabs);
    setSuccessBanner(true);
    setTimeout(() => {
      setSuccessBanner(false);
      onClose();
      setInputText('');
      setLabItems([]);
    }, 1200);
  };

  // Agrupar por panel para visualización clínica
  const groupedByPanel = labItems.reduce((acc, item) => {
    if (!acc[item.panel]) acc[item.panel] = [];
    acc[item.panel].push(item);
    return acc;
  }, {} as Record<string, ParsedLabItem[]>);

  const getFlagBadge = (flag: LabFlag) => {
    switch (flag) {
      case 'alto':
        return <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">ALTO</span>;
      case 'bajo':
        return <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-300">BAJO</span>;
      case 'critico':
        return <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-300 animate-pulse">CRÍTICO</span>;
      default:
        return <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">NORMAL</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-teal-700 to-slate-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-600/50 rounded-xl border border-teal-400/30">
              <Sparkles className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <h2 className="font-black text-base tracking-tight flex items-center gap-2">
                Pegado Rápido Inteligente de Paraclínicos
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-400 text-teal-950">
                  Fase 11 & 12
                </span>
              </h2>
              <p className="text-xs text-teal-100/90 font-medium">
                Pega cualquier texto, reporte de WhatsApp o lista con comas/dos puntos y el sistema lo detectará automáticamente.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-teal-200 hover:text-white hover:bg-teal-600/40 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success alert */}
        {successBanner && (
          <div className="bg-emerald-600 text-white p-3 flex items-center justify-center gap-2 font-bold text-sm">
            <Check className="w-5 h-5" />
            {labItems.length} Paraclínicos guardados exitosamente en el expediente
          </div>
        )}

        {/* Body content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* Quick templates */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span>Plantillas rápidas frecuentes:</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_EXAMPLES.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setInputText(tmpl.text)}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-300 border border-slate-200 text-slate-700 transition"
                >
                  + {tmpl.name}
                </button>
              ))}
            </div>
          </div>

          {/* Input Textarea & Timestamp controls */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <TestTube2 className="w-4 h-4 text-teal-600" />
                Texto copiado de resultados:
              </label>
              <div className="flex items-center gap-2 text-xs">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500 font-medium">Fecha/Hora toma:</span>
                <input
                  type="text"
                  value={timestamp}
                  onChange={(e) => setTimestamp(e.target.value)}
                  className="px-2 py-0.5 text-xs rounded border border-slate-300 font-mono text-slate-700 focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ejemplo: GB 11.12, HB 8.4, HCT 24.9, PLT 443, GLIC 185, UREA 48, CREAT 2.1, NA 132, K 5.4, TP 15.2, INR 1.35..."
              rows={3}
              className="w-full text-xs sm:text-sm font-mono p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent text-slate-900 bg-slate-50/50"
            />
          </div>

          {/* Extracted items section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-teal-600" />
                  Parámetros Clínicos Identificados
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-200">
                  {labItems.length} detectados
                </span>
              </div>
              {labItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setInputText(''); setLabItems([]); }}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpiar todo
                </button>
              )}
            </div>

            {labItems.length === 0 ? (
              <div className="text-center py-8 px-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/60">
                <TestTube2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">
                  No hay resultados ingresados todavía
                </p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-md mx-auto">
                  Pega los resultados de laboratorio en el cuadro de texto superior o haz clic en cualquiera de las plantillas rápidas.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedByPanel).map(([panelName, items]) => (
                  <div key={panelName} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-slate-100/90 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                        {panelName}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {items.length} {items.length === 1 ? 'parámetro' : 'parámetros'}
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="p-2.5 sm:px-3 sm:py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-teal-50/30 transition text-xs"
                        >
                          <div className="flex-1 min-w-[180px]">
                            <span className="font-bold text-slate-800">{item.parameter}</span>
                            <div className="text-[11px] text-slate-400">
                              Ref: {item.referenceRange}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Value editor */}
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={item.value}
                                onChange={(e) => handleUpdateItem(item.id, 'value', e.target.value)}
                                className="w-20 px-2 py-1 text-right font-black font-mono text-slate-900 bg-white border border-slate-300 rounded focus:border-teal-600 focus:outline-none"
                              />
                              <span className="text-xs font-semibold text-slate-500 min-w-[40px]">
                                {item.unit}
                              </span>
                            </div>

                            {/* Flag badge */}
                            <div className="min-w-[70px] text-center">
                              {getFlagBadge(item.flag)}
                            </div>

                            {/* Delete button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition"
                              title="Eliminar parámetro"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            {labItems.length > 0 ? (
              <span className="text-teal-700 font-semibold">
                ✓ {labItems.length} listos para archivar en el expediente
              </span>
            ) : (
              'Ingresa valores para habilitar el guardado'
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={labItems.length === 0}
              onClick={handleSaveAll}
              className={`px-4 py-1.5 text-xs font-black text-white rounded-xl shadow-sm flex items-center gap-1.5 transition ${
                labItems.length > 0
                  ? 'bg-teal-700 hover:bg-teal-800 cursor-pointer'
                  : 'bg-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              <Check className="w-4 h-4" />
              Guardar {labItems.length} Paraclínicos en Expediente
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
