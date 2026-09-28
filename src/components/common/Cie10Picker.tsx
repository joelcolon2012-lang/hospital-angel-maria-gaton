import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Loader2, Plus } from 'lucide-react';
import { loadCie10, searchCie10, isCie10Loaded, Cie10Entry } from '../../services/cie10/cie10Service';

export interface Cie10Pick {
  name: string; // texto del diagnóstico que se guarda
  code?: string;
  description?: string;
}

interface Props {
  onSelect: (pick: Cie10Pick) => void;
  placeholder?: string;
  initialQuery?: string;
  /** Permite agregar un diagnóstico escrito a mano sin código */
  allowFreeText?: boolean;
  autoFocus?: boolean;
  /** Mantener el texto después de elegir (por defecto se limpia) */
  keepText?: boolean;
  compact?: boolean;
  testId?: string;
}

/**
 * Lista desplegable de diagnósticos CIE-10 con búsqueda por código, abreviatura o palabras.
 * La lista se muestra debajo del cuadro (no flota), así funciona igual en celular y dentro de ventanas.
 */
export const Cie10Picker: React.FC<Props> = ({ onSelect, placeholder = 'Buscar diagnóstico CIE-10 (ej. neumonía, J18, HTA)…', initialQuery = '', allowFreeText = true, autoFocus, keepText, compact, testId = 'cie10' }) => {
  const [q, setQ] = useState(initialQuery);
  const [open, setOpen] = useState(Boolean(autoFocus));
  const [ready, setReady] = useState(isCie10Loaded());
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!ready && open) loadCie10().then(() => setReady(true)).catch(() => setReady(false));
  }, [open, ready]);
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const results = useMemo(() => searchCie10(q, 25), [q, ready]);
  useEffect(() => setActive(0), [q]);

  const choose = (e: Cie10Entry) => {
    onSelect({ name: e.description, code: e.code, description: e.description });
    if (!keepText) setQ('');
    setOpen(false);
  };
  const chooseFree = () => {
    const t = q.trim();
    if (!t) return;
    onSelect({ name: t });
    if (!keepText) setQ('');
    setOpen(false);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && results[active]) choose(results[active]);
      else if (allowFreeText) chooseFree();
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="w-full" data-testid={`${testId}-picker`}>
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input
          ref={inputRef}
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          onKeyDown={onKey}
          placeholder={placeholder}
          className={`w-full bg-white border border-slate-300 rounded-xl pl-8 pr-8 ${compact ? 'py-1.5 text-xs' : 'py-2 text-xs sm:text-sm'} font-semibold focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/30`}
          data-testid={`${testId}-input`}
          autoComplete="off"
        />
        {open && !ready && q.trim() && <Loader2 className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin" />}
      </div>
      {open && (
        <div className="mt-1 border border-slate-200 rounded-xl bg-white shadow-sm max-h-64 overflow-y-auto" data-testid={`${testId}-results`}>
          {!q.trim() && <div className="px-3 py-1.5 text-[10px] font-black uppercase text-slate-400 bg-slate-50">Frecuentes en emergencia y medicina interna</div>}
          {results.map((r, i) => (
            <button
              key={r.code}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(r)}
              className={`w-full text-left px-3 py-2 flex items-start gap-2 text-xs border-b border-slate-100 last:border-b-0 ${i === active ? 'bg-teal-50' : 'hover:bg-slate-50'}`}
              data-testid={`${testId}-option-${r.code}`}
            >
              <span className="shrink-0 font-mono font-black text-[#0F4C5C] bg-[#0F4C5C]/10 rounded px-1.5 py-0.5 text-[11px]">{r.code}</span>
              <span className="text-slate-800 font-semibold leading-snug">{r.description}</span>
            </button>
          ))}
          {q.trim() && !results.length && ready && <div className="px-3 py-2 text-xs text-slate-500">Sin coincidencias en CIE-10.</div>}
          {allowFreeText && q.trim() && (
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={chooseFree} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 border-t border-slate-200" data-testid={`${testId}-free`}>
              <Plus className="w-3.5 h-3.5" /> Usar “{q.trim()}” sin código
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Cie10Picker;
