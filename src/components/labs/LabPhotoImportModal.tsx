import React, { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Images, X, Loader2, AlertTriangle, CheckCircle2, Copy, Check, ClipboardPaste, Trash2, ChevronDown, ChevronRight, Sparkles, ZoomIn } from 'lucide-react';
import type { LabResult, LabPanel } from '../../types';
import { readLabFiles, readLabText, LabReadItem, LabReadResult, LAB_FILE_ACCEPT } from '../../services/labs/labPhotoReader';
import { flagFor, plausibilityFor, HEMOGRAM_ORDER, LAB_CATALOG } from '../../services/labs/labReportParser';
import { interpretHemogram, interpretChemistry } from '../../services/ai/ClinicalLabInterpreter';
import type { LabParameterDetection } from '../../services/ai/VisionLabParser';

export type LabImportFocus = 'hemograma' | 'quimica' | 'todos';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientAge?: number;
  patientSex?: string;
  focus?: LabImportFocus;
  onSaveLabs: (labs: Partial<LabResult>[]) => void;
  onAddInterpretationToEvolution?: (interpretation: string) => void;
}

type Row = LabReadItem & { edited?: boolean };

const STATUS: Record<string, { text: string; cls: string; tip: string }> = {
  archivo: { text: 'Del archivo', cls: 'bg-emerald-100 text-emerald-800', tip: 'Leído directamente del texto del archivo' },
  coincide: { text: 'Doble lectura ✓', cls: 'bg-emerald-100 text-emerald-800', tip: 'Las dos lecturas independientes dieron el mismo valor' },
  difiere: { text: 'No coinciden', cls: 'bg-red-100 text-red-700', tip: 'Las dos lecturas dieron valores distintos: compare con la foto' },
  una_lectura: { text: 'Revise', cls: 'bg-amber-100 text-amber-800', tip: 'Solo una lectura vio este valor: compárelo con la foto' },
  ilegible: { text: 'Ilegible', cls: 'bg-slate-200 text-slate-600', tip: 'No se lee con seguridad en la foto' },
  revisar: { text: 'Valor imposible', cls: 'bg-red-100 text-red-700', tip: 'No es un valor fisiológicamente posible para esa unidad' },
  editado: { text: 'Editado', cls: 'bg-sky-100 text-sky-800', tip: 'Valor escrito o corregido por usted' }
};

const PANEL_ORDER: LabPanel[] = ['Hemograma', 'Química', 'Función Renal', 'Función Hepática', 'Electrolitos', 'Gases Arteriales', 'Marcadores Cardiacos', 'Coagulación', 'Orina', 'Otros'];
const CATALOG_INDEX = new Map(LAB_CATALOG.map((d, i) => [d.key, i]));

export const LabPhotoImportModal: React.FC<Props> = ({ isOpen, onClose, patientId, patientAge, patientSex, focus = 'todos', onSaveLabs, onAddInterpretationToEvolution }) => {
  const [tab, setTab] = useState<'foto' | 'texto'>('foto');
  const [pending, setPending] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  const [pasteText, setPasteText] = useState('');
  const [loading, setLoading] = useState('');
  const [result, setResult] = useState<LabReadResult | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [showReadings, setShowReadings] = useState(false);
  const [bigPhoto, setBigPhoto] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);

  const title = focus === 'hemograma' ? 'Hemograma desde foto o archivo' : focus === 'quimica' ? 'Químicas y electrolitos desde foto o archivo' : 'Paraclínicos desde foto, archivo o texto';

  const orderedRows = useMemo(() => {
    const idx = (r: Row) => {
      const h = HEMOGRAM_ORDER.indexOf(r.key);
      const panelRank = PANEL_ORDER.indexOf(r.panel as LabPanel);
      const focusBoost = focus === 'hemograma' ? (r.panel === 'Hemograma' ? -1000 : 0) : focus === 'quimica' ? (r.panel !== 'Hemograma' ? -1000 : 0) : 0;
      return focusBoost + (panelRank < 0 ? 99 : panelRank) * 100 + (h >= 0 ? h : CATALOG_INDEX.get(r.key) ?? 99);
    };
    return [...rows].sort((a, b) => idx(a) - idx(b));
  }, [rows, focus]);

  if (!isOpen) return null;

  const resetAll = () => {
    setPending([]);
    setPendingPreviews([]);
    setResult(null);
    setRows([]);
    setSelected({});
    setError('');
    setShowReadings(false);
    setBigPhoto(null);
    setSaved(false);
  };
  const close = () => {
    resetAll();
    setPasteText('');
    setTab('foto');
    onClose();
  };

  const load = (r: LabReadResult) => {
    setResult(r);
    setRows(r.items);
    const sel: Record<string, boolean> = {};
    r.items.forEach((it) => (sel[it.key] = it.preselect));
    setSelected(sel);
    if (!r.items.length) setError(r.warnings.join(' ') || 'No se reconocieron resultados.');
  };

  const addFiles = (list: FileList | null) => {
    if (!list || !list.length) return;
    const files = Array.from(list);
    setError('');
    setPending((p) => [...p, ...files]);
    files.forEach((f) => {
      if (f.type.startsWith('image/')) {
        const url = URL.createObjectURL(f);
        setPendingPreviews((p) => [...p, url]);
      } else setPendingPreviews((p) => [...p, '']);
    });
    if (camRef.current) camRef.current.value = '';
    if (galRef.current) galRef.current.value = '';
  };

  const removePending = (i: number) => {
    setPending((p) => p.filter((_, j) => j !== i));
    setPendingPreviews((p) => p.filter((_, j) => j !== i));
  };

  const readPending = async () => {
    if (!pending.length) return;
    setError('');
    setLoading('Leyendo…');
    try {
      const r = await readLabFiles(pending, (m) => setLoading(m));
      load(r);
    } catch (e: any) {
      setError(`No se pudo leer: ${e?.message || 'error desconocido'}. No se llenó ningún valor.`);
    } finally {
      setLoading('');
    }
  };

  const readPaste = () => {
    setError('');
    if (pasteText.trim().length < 3) {
      setError('Pegue o escriba los resultados (ej.: "Hemoglobina 11.2, Creatinina 1.8").');
      return;
    }
    load(readLabText(pasteText));
  };

  const updateRow = (key: string, patch: Partial<Row>) => {
    setRows((rs) =>
      rs.map((r) => {
        if (r.key !== key) return r;
        const n = { ...r, ...patch };
        if (patch.value !== undefined) {
          n.value = patch.value.trim();
          n.edited = true;
          n.status = 'coincide';
          n.illegible = !n.value;
          n.flag = flagFor(n.key, n.value, n.ref);
          n.implausible = plausibilityFor(n.key, n.value, n.unit);
        }
        return n;
      })
    );
    if (patch.value !== undefined) setSelected((s) => ({ ...s, [key]: Boolean(patch.value && patch.value.trim()) }));
  };

  const chosen = orderedRows.filter((r) => selected[r.key] && r.value && !r.illegible);

  const horizontal = () => {
    if (focus === 'hemograma') return chosen.filter((r) => r.panel === 'Hemograma').map((r) => `${r.key}: ${r.value}`).join(' | ');
    return chosen.map((r) => `${r.key.startsWith('X:') ? r.label : r.key}: ${r.value}${r.unit ? ` ${r.unit}` : ''}`).join(' | ');
  };

  const toDetections = (panelFilter: (r: Row) => boolean): LabParameterDetection[] =>
    chosen.filter(panelFilter).map((r) => ({
      key: r.key,
      label: r.label,
      value: r.value,
      unit: r.unit,
      referenceRange: r.ref,
      confidence: 'alta',
      flag: r.flag,
      isIdentified: true
    }));

  const interpretation = (() => {
    if (!chosen.length || focus === 'todos') return null;
    const ctx = { age: patientAge, sex: patientSex };
    try {
      return focus === 'hemograma' ? interpretHemogram(toDetections((r) => r.panel === 'Hemograma'), ctx) : interpretChemistry(toDetections((r) => r.panel !== 'Hemograma'), ctx);
    } catch {
      return null;
    }
  })();

  const save = () => {
    if (!chosen.length) return;
    const ts = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const fromPhoto = result?.method?.includes('IA');
    const labs: Partial<LabResult>[] = chosen.map((r) => {
      const n = parseFloat(r.value.replace(/^[<>≤≥]=?/, ''));
      return {
        patientId,
        panel: r.panel,
        parameter: r.label,
        value: r.value,
        numericValue: Number.isFinite(n) ? n : undefined,
        unit: r.unit,
        referenceRange: r.ref,
        flag: r.flag,
        timestamp: ts,
        source: fromPhoto ? 'foto_vision' : 'adjunto'
      };
    });
    onSaveLabs(labs);
    setSaved(true);
    setTimeout(close, 900);
  };

  const needsReview = rows.filter((r) => r.status === 'difiere' || r.status === 'revisar' || r.status === 'una_lectura').length;
  const photos = result?.previews.length ? result.previews : pendingPreviews.filter(Boolean);

  const modal = (
    <div className="fixed inset-0 z-[80] bg-slate-900/60 flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" data-testid="lab-import-modal">
      <div className="bg-white w-full sm:max-w-4xl h-[100dvh] sm:h-auto sm:max-h-[94vh] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-[#0F4C5C] text-white shrink-0">
          <div className="min-w-0">
            <h3 className="text-sm font-black uppercase tracking-wide truncate">{title}</h3>
            <p className="text-[11px] text-white/80">La app solo copia lo que está escrito. Usted confirma cada valor antes de guardar.</p>
          </div>
          <button type="button" onClick={close} className="p-2 rounded-lg hover:bg-white/15" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 text-xs">
          {!result && (
            <>
              <div className="flex gap-2">
                <button type="button" onClick={() => setTab('foto')} className={`flex-1 py-2 rounded-xl font-black ${tab === 'foto' ? 'bg-[#0F4C5C] text-white' : 'bg-slate-100 text-slate-600'}`}>
                  Foto o archivo
                </button>
                <button type="button" onClick={() => setTab('texto')} className={`flex-1 py-2 rounded-xl font-black flex items-center justify-center gap-1 ${tab === 'texto' ? 'bg-[#0F4C5C] text-white' : 'bg-slate-100 text-slate-600'}`} data-testid="lab-tab-text">
                  <ClipboardPaste size={14} /> Pegar texto
                </button>
              </div>

              {tab === 'foto' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" disabled={!!loading} onClick={() => camRef.current?.click()} className="flex flex-col items-center justify-center gap-1.5 py-5 rounded-2xl border-2 border-[#0F4C5C] bg-[#0F4C5C]/5 text-[#0F4C5C] font-black active:scale-95" data-testid="lab-camera">
                      <Camera size={26} />
                      Tomar foto
                      <span className="text-[10px] font-semibold text-slate-500">con la cámara del celular</span>
                    </button>
                    <button type="button" disabled={!!loading} onClick={() => galRef.current?.click()} className="flex flex-col items-center justify-center gap-1.5 py-5 rounded-2xl border-2 border-slate-300 text-slate-700 font-black active:scale-95">
                      <Images size={26} />
                      Galería o archivos
                      <span className="text-[10px] font-semibold text-slate-500">fotos, PDF, Word</span>
                    </button>
                  </div>
                  <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => addFiles(e.target.files)} />
                  <input ref={galRef} type="file" accept={LAB_FILE_ACCEPT} multiple className="hidden" onChange={(e) => addFiles(e.target.files)} data-testid="lab-file-input" />

                  {pending.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {pending.map((f, i) => (
                          <div key={i} className="relative shrink-0 w-24 h-28 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                            {pendingPreviews[i] ? <img src={pendingPreviews[i]} alt={`Página ${i + 1}`} className="w-full h-full object-cover" /> : <span className="text-[10px] font-bold text-slate-500 p-1 text-center break-all">{f.name}</span>}
                            <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] text-center font-bold">Pág. {i + 1}</span>
                            {!loading && (
                              <button type="button" onClick={() => removePending(i)} className="absolute top-1 right-1 bg-white/90 rounded-full p-1" aria-label="Quitar">
                                <Trash2 size={12} className="text-red-600" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="text-[11px] text-slate-500">¿El reporte tiene más de una hoja? Toque “Tomar foto” otra vez para agregar la siguiente página.</p>
                      <button type="button" disabled={!!loading} onClick={readPending} className="w-full py-3 rounded-xl bg-[#0F4C5C] text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60" data-testid="lab-read">
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        {loading || `Leer ${pending.length} página${pending.length === 1 ? '' : 's'}`}
                      </button>
                    </div>
                  )}
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Consejo: foto de frente, con buena luz y que se vean completos los nombres y los números. En fotos y PDF escaneados la IA hace dos lecturas separadas y la app compara cada valor.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} rows={8} className="w-full border border-slate-300 rounded-xl p-3 font-mono text-[12px] focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/30" placeholder={'Pegue o escriba los resultados, por ejemplo:\nHemoglobina 11.2 g/dL\nLeucocitos 14.5\nCreatinina 1.8 mg/dL\nSodio 131, Potasio 5.4'} data-testid="lab-paste" />
                  <button type="button" onClick={readPaste} className="w-full py-2.5 rounded-xl bg-[#0F4C5C] text-white font-black" data-testid="lab-paste-read">
                    Reconocer valores
                  </button>
                </div>
              )}
            </>
          )}

          {error && (
            <div className="flex gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700" data-testid="lab-error">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-1 rounded-lg bg-slate-100 font-bold text-slate-700">{result.method}</span>
                <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold">{rows.length} resultados encontrados</span>
                {needsReview > 0 && <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-800 font-bold">{needsReview} para revisar</span>}
                <button type="button" onClick={resetAll} className="ml-auto px-2 py-1 rounded-lg font-bold text-slate-600 hover:bg-slate-100">
                  Otra foto
                </button>
              </div>

              {photos.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1" data-testid="lab-photos">
                  {photos.map((src, i) => (
                    <button key={i} type="button" onClick={() => setBigPhoto(src)} className="relative shrink-0 w-28 h-32 rounded-xl overflow-hidden border border-slate-200">
                      <img src={src} alt={`Foto ${i + 1}`} className="w-full h-full object-contain bg-white" />
                      <span className="absolute bottom-1 right-1 bg-black/60 text-white rounded p-0.5">
                        <ZoomIn size={12} />
                      </span>
                    </button>
                  ))}
                  <p className="self-center text-[11px] text-slate-500 min-w-[140px]">Toque la foto para ampliarla y comparar cada número.</p>
                </div>
              )}

              {result.warnings.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 space-y-1" data-testid="lab-warnings">
                  {result.warnings.map((w, i) => (
                    <div key={i} className="flex gap-1.5">
                      <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {rows.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-50 font-black text-[#0F4C5C] uppercase text-[11px]">
                    <span>Valores leídos</span>
                    <div className="flex gap-3 normal-case">
                      <button type="button" className="hover:underline" onClick={() => setSelected(Object.fromEntries(rows.map((r) => [r.key, Boolean(r.value && !r.illegible)])))}>
                        Marcar todos
                      </button>
                      <button type="button" className="text-slate-500 hover:underline" onClick={() => setSelected({})}>
                        Ninguno
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {orderedRows.map((r) => {
                      const st = STATUS[r.edited ? 'editado' : r.status] || STATUS.una_lectura;
                      const danger = !r.edited && (r.status === 'difiere' || r.status === 'revisar');
                      return (
                        <div key={r.key} className={`px-3 py-2 ${danger ? 'bg-red-50/60' : selected[r.key] ? 'bg-emerald-50/40' : ''}`} data-testid={`lab-row-${r.key}`}>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" className="w-4 h-4 accent-[#0F4C5C] shrink-0" checked={!!selected[r.key]} disabled={!r.value || r.illegible} onChange={() => setSelected((s) => ({ ...s, [r.key]: !s[r.key] }))} aria-label={`Guardar ${r.label}`} />
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-slate-800 truncate">{r.label}</div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {r.panel} · Ref: {r.ref || '—'}
                              </div>
                            </div>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={r.value}
                              onChange={(e) => updateRow(r.key, { value: e.target.value })}
                              placeholder="—"
                              className={`w-20 text-right font-black text-sm px-2 py-1.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/30 ${danger ? 'border-red-300' : 'border-slate-300'}`}
                              data-testid={`lab-value-${r.key}`}
                            />
                            <span className="w-14 text-[10px] text-slate-500 truncate">{r.unit}</span>
                          </div>
                          <div className="mt-1 pl-6 flex flex-wrap items-center gap-1.5">
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${st.cls}`} title={st.tip}>
                              {st.text}
                            </span>
                            {r.value && !r.illegible && r.flag !== 'normal' && (
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${r.flag === 'critico' ? 'bg-red-600 text-white' : 'bg-amber-100 text-amber-800'}`}>{r.flag}</span>
                            )}
                            {!r.edited && r.status === 'difiere' && (
                              <span className="text-[10px] text-red-700">
                                Lectura 1: <b>{r.value || '—'}</b> ·{' '}
                                <button type="button" className="underline font-bold" onClick={() => r.altValue && r.altValue !== 'ILEGIBLE' && updateRow(r.key, { value: r.altValue })}>
                                  Lectura 2: {r.altValue}
                                </button>{' '}
                                → escriba el valor correcto de la foto
                              </span>
                            )}
                            {r.implausible && <span className="text-[10px] text-red-700">{r.implausible}</span>}
                            {r.sourceLine && <span className="text-[10px] text-slate-400 font-mono truncate max-w-full">“{r.sourceLine.slice(0, 90)}”</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {chosen.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">Formato horizontal (solo lo marcado)</span>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          if (!navigator.clipboard) throw new Error('Portapapeles no disponible');
                          await navigator.clipboard.writeText(horizontal());
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1500);
                        } catch {
                          setError('No se pudo copiar. Seleccione el texto del resultado y cópielo manualmente.');
                        }
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 font-bold"
                    >
                      {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />} {copied ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                  <div className="bg-slate-900 text-emerald-300 font-mono text-[11px] p-2 rounded-xl overflow-x-auto" data-testid="lab-horizontal">
                    {horizontal()}
                  </div>
                </div>
              )}

              {interpretation && (
                <div className="bg-slate-900 text-white p-3 rounded-xl space-y-1">
                  <div className="text-[10px] text-amber-300 font-bold">APOYO AUTOMÁTICO — REQUIERE REVISIÓN MÉDICA</div>
                  <div className="font-bold text-emerald-200">{interpretation.summary}</div>
                  {onAddInterpretationToEvolution && (
                    <button type="button" onClick={() => onAddInterpretationToEvolution(interpretation.summary)} className="text-[11px] font-bold text-teal-200 underline">
                      + Insertar en la nota de evolución
                    </button>
                  )}
                </div>
              )}

              {result.readings.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <button type="button" onClick={() => setShowReadings((v) => !v)} className="w-full flex items-center gap-1 px-3 py-2 bg-slate-50 font-bold text-slate-600">
                    {showReadings ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Texto transcrito
                  </button>
                  {showReadings && (
                    <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                      {result.readings.map((t, i) => (
                        <pre key={i} className="whitespace-pre-wrap font-mono text-[10px] text-slate-700 bg-slate-50 rounded-lg p-2">
                          {t}
                        </pre>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {result && (
          <div className="shrink-0 flex items-center justify-between gap-2 px-3 sm:px-4 py-3 border-t border-slate-200 bg-slate-50" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
            <span className="text-[11px] text-slate-600">
              <CheckCircle2 size={12} className="inline mr-1 text-emerald-600" />
              {chosen.length} para guardar
            </span>
            <div className="flex gap-2">
              <button type="button" onClick={close} className="px-3 py-2 rounded-xl bg-white border border-slate-200 font-black text-slate-600">
                Cancelar
              </button>
              <button type="button" disabled={!chosen.length || saved} onClick={save} className="px-4 py-2 rounded-xl bg-[#0F4C5C] text-white font-black disabled:opacity-40" data-testid="lab-save">
                {saved ? '¡Guardado!' : 'Confirmar y guardar'}
              </button>
            </div>
          </div>
        )}
      </div>

      {bigPhoto && (
        <div className="fixed inset-0 z-[90] bg-black/90 flex flex-col" onClick={() => setBigPhoto(null)}>
          <div className="flex justify-end p-2">
            <button type="button" onClick={() => setBigPhoto(null)} className="text-white p-2" aria-label="Cerrar foto">
              <X size={22} />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-2" onClick={(e) => e.stopPropagation()}>
            <img src={bigPhoto} alt="Foto del reporte" className="max-w-none w-[160%] sm:w-full h-auto mx-auto" />
          </div>
        </div>
      )}
    </div>
  );
  // Portal: por encima de la barra inferior del celular y de cualquier panel
  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal;
};

export default LabPhotoImportModal;
