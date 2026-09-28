import React, { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, Trash2, Tag } from 'lucide-react';
import type { StructuredDiagnosis } from '../../types';
import { Cie10Picker } from './Cie10Picker';
import { loadCie10, suggestCode, Cie10Entry } from '../../services/cie10/cie10Service';

interface Props {
  diagnoses: StructuredDiagnosis[];
  onChange: (list: StructuredDiagnosis[]) => void;
  /** Mostrar el estado (Probable / Confirmado / A descartar) */
  showStatus?: boolean;
  testId?: string;
}

const newId = () => `dx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

export function renumber(list: StructuredDiagnosis[]): StructuredDiagnosis[] {
  return list.map((d, i) => ({ ...d, orderIndex: i, type: i === 0 ? 'Primario' : 'Secundario' }));
}

/** Lista de diagnósticos con código CIE-10: agregar, editar, ordenar y codificar los que no tienen código. */
export const DiagnosisListEditor: React.FC<Props> = ({ diagnoses, onChange, showStatus = true, testId = 'dx' }) => {
  const [coding, setCoding] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, Cie10Entry | undefined>>({});

  // Sugerencias de código para diagnósticos escritos a mano
  useEffect(() => {
    const uncoded = diagnoses.filter((d) => !d.cie10Code && d.name.trim());
    if (!uncoded.length) return;
    let alive = true;
    loadCie10().then(() => {
      if (!alive) return;
      const s: Record<string, Cie10Entry | undefined> = {};
      uncoded.forEach((d) => (s[d.id] = suggestCode(d.name)));
      setSuggestions(s);
    });
    return () => {
      alive = false;
    };
  }, [diagnoses.map((d) => `${d.id}:${d.name}:${d.cie10Code || ''}`).join('|')]);

  const set = (list: StructuredDiagnosis[]) => onChange(renumber(list));
  const update = (id: string, patch: Partial<StructuredDiagnosis>) => set(diagnoses.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= diagnoses.length) return;
    const l = [...diagnoses];
    [l[i], l[j]] = [l[j], l[i]];
    set(l);
  };

  return (
    <div className="space-y-2" data-testid={`${testId}-editor`}>
      {diagnoses.length > 0 && (
        <ol className="space-y-1.5">
          {diagnoses.map((d, i) => {
            const sug = suggestions[d.id];
            return (
              <li key={d.id} className="border border-slate-200 rounded-xl bg-white p-2 space-y-1.5" data-testid={`${testId}-item`}>
                <div className="flex items-start gap-2">
                  <span className="text-[11px] font-black text-slate-500 pt-1.5 w-4 text-right">{i + 1}.</span>
                  <div className="flex-1 min-w-0 space-y-1">
                    <input
                      type="text"
                      value={d.name}
                      onChange={(e) => update(d.id, { name: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/30"
                      data-testid={`${testId}-name-${i}`}
                    />
                    <div className="flex flex-wrap items-center gap-1.5">
                      {d.cie10Code ? (
                        <button type="button" onClick={() => setCoding(coding === d.id ? null : d.id)} className="font-mono text-[10px] font-black text-[#0F4C5C] bg-[#0F4C5C]/10 rounded px-1.5 py-0.5" title={d.cie10Description || 'Cambiar código'} data-testid={`${testId}-code-${i}`}>
                          CIE-10 {d.cie10Code}
                        </button>
                      ) : (
                        <>
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">Sin código CIE-10</span>
                          {sug && (
                            <button type="button" onClick={() => update(d.id, { cie10Code: sug.code, cie10Description: sug.description })} className="text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200 rounded px-1.5 py-0.5" title={sug.description} data-testid={`${testId}-suggest-${i}`}>
                              ¿{sug.code} · {sug.description.length > 40 ? `${sug.description.slice(0, 40)}…` : sug.description}?
                            </button>
                          )}
                          <button type="button" onClick={() => setCoding(coding === d.id ? null : d.id)} className="text-[10px] font-bold text-slate-600 underline flex items-center gap-0.5">
                            <Tag className="w-3 h-3" /> Buscar código
                          </button>
                        </>
                      )}
                      {showStatus && (
                        <select value={d.status} onChange={(e) => update(d.id, { status: e.target.value as any })} className="text-[10px] font-bold border border-slate-200 rounded px-1 py-0.5 bg-white">
                          <option value="Probable">Probable</option>
                          <option value="Confirmado">Confirmado</option>
                          <option value="A descartar">A descartar</option>
                        </select>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="p-1 rounded hover:bg-slate-100 disabled:opacity-30" aria-label="Subir">
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === diagnoses.length - 1} className="p-1 rounded hover:bg-slate-100 disabled:opacity-30" aria-label="Bajar">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button type="button" onClick={() => set(diagnoses.filter((x) => x.id !== d.id))} className="p-1 rounded text-red-600 hover:bg-red-50" aria-label="Quitar diagnóstico" data-testid={`${testId}-remove-${i}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {coding === d.id && (
                  <div className="pl-6">
                    <Cie10Picker
                      compact
                      autoFocus
                      allowFreeText={false}
                      initialQuery={d.cie10Code ? '' : d.name}
                      placeholder="Buscar el código para este diagnóstico…"
                      testId={`${testId}-code-picker`}
                      onSelect={(p) => {
                        update(d.id, { cie10Code: p.code, cie10Description: p.description });
                        setCoding(null);
                      }}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
      <Cie10Picker
        testId={testId}
        onSelect={(p) =>
          set([
            ...diagnoses,
            { id: newId(), name: p.name.toUpperCase(), status: 'Probable', type: 'Secundario', orderIndex: diagnoses.length, cie10Code: p.code, cie10Description: p.description }
          ])
        }
      />
    </div>
  );
};

export default DiagnosisListEditor;
