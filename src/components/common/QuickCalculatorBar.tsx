import React, { useState } from 'react';
import { Calculator, Search, X, CheckCircle2, ChevronRight } from 'lucide-react';
import {
  calculateCKDEPI,
  calculateMAP,
  calculateAnionGap,
  calculateCorrectedCalcium,
  calculateCorrectedSodium,
  calculateFreeWaterDeficit,
  calculateQTc,
  CLINICAL_SCALES,
} from '../../services/clinicalCalculators';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickCalculatorBar: React.FC<Props> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTool, setActiveTool] = useState<string | null>(null);

  // States for calculators
  // CKD-EPI
  const [cr, setCr] = useState<number>(1.1);
  const [age, setAge] = useState<number>(65);
  const [isFemale, setIsFemale] = useState<boolean>(false);

  // PAM
  const [tas, setTas] = useState<number>(120);
  const [tad, setTad] = useState<number>(80);

  // Anion Gap
  const [na, setNa] = useState<number>(140);
  const [cl, setCl] = useState<number>(102);
  const [hco3, setHco3] = useState<number>(24);
  const [alb, setAlb] = useState<number>(4.0);

  // Ca corregido
  const [ca, setCa] = useState<number>(8.0);

  // Na corregido
  const [gluc, setGluc] = useState<number>(300);

  // QTc
  const [qt, setQt] = useState<number>(420);
  const [fc, setFc] = useState<number>(75);

  // Scales checklist
  const [selectedScaleItems, setSelectedScaleItems] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const toolsList = [
    { id: 'ckdepi', name: 'Tasa de Filtración Glomerular (CKD-EPI 2021)', tags: 'renal funcion creatinina gfr tfg kdigo' },
    { id: 'map', name: 'Presión Arterial Media (PAM)', tags: 'pam tension arterial presion shock sepsis resucitacion' },
    { id: 'aniongap', name: 'Anion Gap y Delta-Delta (Brecha Aniónica)', tags: 'gasometria cetoacidosis acidosis lactica brecha' },
    { id: 'cacorregido', name: 'Calcio Corregido por Albúmina', tags: 'calcio electrolitos albumina hipocalcemia hipercalcemia' },
    { id: 'nacorregido', name: 'Sodio Corregido por Hiperglicemia (Katz)', tags: 'sodio glucosa cetoacidosis hiperosmolar' },
    { id: 'qtc', name: 'Intervalo QTc Corregido (Bazett)', tags: 'ecg electrocardiograma arritmia torsades qt' },
    ...CLINICAL_SCALES.map((s) => ({ id: `scale_${s.id}`, name: s.name, tags: s.associatedDiagnoses.join(' ') + ' escala score' })),
  ];

  const filteredTools = toolsList.filter((t) =>
    searchTerm === '' || t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.tags.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeScaleObj = activeTool?.startsWith('scale_')
    ? CLINICAL_SCALES.find((s) => `scale_${s.id}` === activeTool)
    : null;

  const toggleScaleItem = (itemId: string) => {
    setSelectedScaleItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const currentScaleScore = activeScaleObj
    ? activeScaleObj.items.reduce((acc, item) => (selectedScaleItems[item.id] ? acc + item.points : acc), 0)
    : 0;

  const scaleInterpretation = activeScaleObj ? activeScaleObj.interpret(currentScaleScore) : null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#0F4C5C] text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-teal-300" />
            <h3 className="font-bold text-base sm:text-lg">Cálculos Rápidos & Escalas Médicas</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-teal-100 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-3.5 border-b border-slate-100 bg-slate-50">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar cálculo o escala (ej: CKD-EPI, PAM, CURB-65, Wells, Anion Gap, Sepsis)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-600"
            />
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-4 flex-1 space-y-4">
          {!activeTool ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredTools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => {
                    setActiveTool(tool.id);
                    setSelectedScaleItems({});
                  }}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 text-left transition-all group"
                >
                  <span className="text-xs sm:text-sm font-semibold text-slate-700 group-hover:text-teal-900">
                    {tool.name}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 shrink-0" />
                </button>
              ))}
            </div>
          ) : (
            <div>
              <button
                onClick={() => setActiveTool(null)}
                className="text-xs font-semibold text-teal-700 hover:text-teal-900 mb-3 inline-flex items-center gap-1"
              >
                ← Volver al buscador
              </button>

              {/* 1. CKD-EPI */}
              {activeTool === 'ckdepi' && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-800 text-sm">Filtrado Glomerular (CKD-EPI 2021)</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-slate-600 font-medium">Creatinina (mg/dL)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={cr}
                        onChange={(e) => setCr(parseFloat(e.target.value) || 0)}
                        className="w-full mt-1 p-2 bg-white border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-600 font-medium">Edad (años)</label>
                      <input
                        type="number"
                        value={age}
                        onChange={(e) => setAge(parseInt(e.target.value) || 0)}
                        className="w-full mt-1 p-2 bg-white border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-600 font-medium">Sexo biológico</label>
                      <select
                        value={isFemale ? 'f' : 'm'}
                        onChange={(e) => setIsFemale(e.target.value === 'f')}
                        className="w-full mt-1 p-2 bg-white border border-slate-300 rounded-lg text-sm"
                      >
                        <option value="m">Masculino</option>
                        <option value="f">Femenino</option>
                      </select>
                    </div>
                  </div>
                  {(() => {
                    const res = calculateCKDEPI(cr, age, isFemale);
                    return (
                      <div className="mt-3 p-3 bg-teal-50 border border-teal-200 rounded-xl">
                        <div className="text-lg font-black text-teal-900">{res.score}</div>
                        <div className="text-xs font-semibold text-teal-800 mt-0.5">{res.interpretation}</div>
                        <div className="text-xs text-slate-600 mt-1">{res.recommendation}</div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* 2. PAM */}
              {activeTool === 'map' && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-800 text-sm">Presión Arterial Media (PAM)</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-600 font-medium">TAS (Sistólica mmHg)</label>
                      <input
                        type="number"
                        value={tas}
                        onChange={(e) => setTas(parseInt(e.target.value) || 0)}
                        className="w-full mt-1 p-2 bg-white border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-600 font-medium">TAD (Diastólica mmHg)</label>
                      <input
                        type="number"
                        value={tad}
                        onChange={(e) => setTad(parseInt(e.target.value) || 0)}
                        className="w-full mt-1 p-2 bg-white border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  {(() => {
                    const res = calculateMAP(tas, tad);
                    return (
                      <div className="mt-3 p-3 bg-teal-50 border border-teal-200 rounded-xl">
                        <div className="text-lg font-black text-teal-900">{res.score}</div>
                        <div className="text-xs font-semibold text-teal-800 mt-0.5">{res.interpretation}</div>
                        <div className="text-xs text-slate-600 mt-1">{res.recommendation}</div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* 3. Anion Gap */}
              {activeTool === 'aniongap' && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-800 text-sm">Anion Gap y Brecha Aniónica</h4>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="text-xs text-slate-600 font-medium">Na (mEq/L)</label>
                      <input
                        type="number"
                        value={na}
                        onChange={(e) => setNa(parseFloat(e.target.value) || 0)}
                        className="w-full mt-1 p-2 bg-white border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-600 font-medium">Cl (mEq/L)</label>
                      <input
                        type="number"
                        value={cl}
                        onChange={(e) => setCl(parseFloat(e.target.value) || 0)}
                        className="w-full mt-1 p-2 bg-white border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-600 font-medium">HCO3 (mEq/L)</label>
                      <input
                        type="number"
                        value={hco3}
                        onChange={(e) => setHco3(parseFloat(e.target.value) || 0)}
                        className="w-full mt-1 p-2 bg-white border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-600 font-medium">Albúmina (g/dL)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={alb}
                        onChange={(e) => setAlb(parseFloat(e.target.value) || 0)}
                        className="w-full mt-1 p-2 bg-white border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  {(() => {
                    const res = calculateAnionGap(na, cl, hco3, alb);
                    return (
                      <div className="mt-3 p-3 bg-teal-50 border border-teal-200 rounded-xl">
                        <div className="text-lg font-black text-teal-900">{res.score}</div>
                        <div className="text-xs font-semibold text-teal-800 mt-0.5">{res.interpretation}</div>
                        <div className="text-xs text-slate-600 mt-1">{res.recommendation}</div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* 4. Calcio Corregido */}
              {activeTool === 'cacorregido' && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-800 text-sm">Calcio Corregido por Albúmina</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-600 font-medium">Calcio sérico (mg/dL)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={ca}
                        onChange={(e) => setCa(parseFloat(e.target.value) || 0)}
                        className="w-full mt-1 p-2 bg-white border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-600 font-medium">Albúmina sérica (g/dL)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={alb}
                        onChange={(e) => setAlb(parseFloat(e.target.value) || 0)}
                        className="w-full mt-1 p-2 bg-white border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  {(() => {
                    const res = calculateCorrectedCalcium(ca, alb);
                    return (
                      <div className="mt-3 p-3 bg-teal-50 border border-teal-200 rounded-xl">
                        <div className="text-lg font-black text-teal-900">{res.score}</div>
                        <div className="text-xs font-semibold text-teal-800 mt-0.5">{res.interpretation}</div>
                        <div className="text-xs text-slate-600 mt-1">{res.recommendation}</div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* 5. Na Corregido */}
              {activeTool === 'nacorregido' && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-800 text-sm">Sodio Corregido por Hiperglicemia</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-600 font-medium">Sodio medido (mEq/L)</label>
                      <input
                        type="number"
                        value={na}
                        onChange={(e) => setNa(parseFloat(e.target.value) || 0)}
                        className="w-full mt-1 p-2 bg-white border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-600 font-medium">Glucemia (mg/dL)</label>
                      <input
                        type="number"
                        value={gluc}
                        onChange={(e) => setGluc(parseFloat(e.target.value) || 0)}
                        className="w-full mt-1 p-2 bg-white border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  {(() => {
                    const res = calculateCorrectedSodium(na, gluc);
                    return (
                      <div className="mt-3 p-3 bg-teal-50 border border-teal-200 rounded-xl">
                        <div className="text-lg font-black text-teal-900">{res.score}</div>
                        <div className="text-xs font-semibold text-teal-800 mt-0.5">{res.interpretation}</div>
                        <div className="text-xs text-slate-600 mt-1">{res.recommendation}</div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* 6. QTc */}
              {activeTool === 'qtc' && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-800 text-sm">Intervalo QTc Corregido (Bazett)</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-600 font-medium">QT medido (ms)</label>
                      <input
                        type="number"
                        value={qt}
                        onChange={(e) => setQt(parseInt(e.target.value) || 0)}
                        className="w-full mt-1 p-2 bg-white border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-600 font-medium">Frecuencia Cardíaca (lpm)</label>
                      <input
                        type="number"
                        value={fc}
                        onChange={(e) => setFc(parseInt(e.target.value) || 0)}
                        className="w-full mt-1 p-2 bg-white border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  {(() => {
                    const res = calculateQTc(qt, fc);
                    return (
                      <div className="mt-3 p-3 bg-teal-50 border border-teal-200 rounded-xl">
                        <div className="text-lg font-black text-teal-900">{res.score}</div>
                        <div className="text-xs font-semibold text-teal-800 mt-0.5">{res.interpretation}</div>
                        <div className="text-xs text-slate-600 mt-1">{res.recommendation}</div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* 7. Escala Clínica Seleccionada */}
              {activeScaleObj && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="border-b border-slate-200 pb-2">
                    <h4 className="font-bold text-slate-800 text-sm">{activeScaleObj.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{activeScaleObj.description}</p>
                  </div>

                  <div className="space-y-1.5 my-3">
                    {activeScaleObj.items.map((item) => {
                      const isChecked = !!selectedScaleItems[item.id];
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleScaleItem(item.id)}
                          className={`w-full flex items-start gap-2.5 p-2 rounded-lg text-left text-xs transition-colors border ${
                            isChecked
                              ? 'bg-teal-50 border-teal-300 text-teal-900 font-medium'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/70'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 mt-0.5 rounded flex items-center justify-center border shrink-0 ${
                              isChecked ? 'bg-teal-600 border-teal-700 text-white' : 'border-slate-300'
                            }`}
                          >
                            {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </div>
                          <span className="flex-1">{item.label}</span>
                          <span className="font-mono text-[11px] font-bold text-slate-500 shrink-0">
                            +{item.points} pt
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {scaleInterpretation && (
                    <div
                      className={`p-3 rounded-xl border ${
                        scaleInterpretation.level === 'rojo'
                          ? 'bg-rose-50 border-rose-200 text-rose-950'
                          : scaleInterpretation.level === 'amarillo'
                          ? 'bg-amber-50 border-amber-200 text-amber-950'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      }`}
                    >
                      <div className="text-sm font-black">{scaleInterpretation.risk}</div>
                      <div className="text-xs mt-1 leading-relaxed opacity-90">
                        {scaleInterpretation.recommendation}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
