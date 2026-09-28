import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ClipboardPaste, Save, Trash2, MessageSquareText } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialText?: string;
  onSave: (text: string) => Promise<void> | void;
}

/**
 * Discusión terapéutica de la NOTA DE INGRESO EMERGENCIA.
 * El programa no escribe nada después de los diagnósticos: lo que el médico escriba (o pegue)
 * aquí es lo único que aparece en ese acápite.
 */
export const TherapeuticDiscussionDialog: React.FC<Props> = ({ isOpen, onClose, initialText = '', onSave }) => {
  const [text, setText] = useState(initialText);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setText(initialText || '');
      setMsg('');
    }
  }, [isOpen, initialText]);

  if (!isOpen) return null;

  const paste = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip) setText((t) => (t.trim() ? `${t.trim()}\n\n${clip.trim()}` : clip.trim()));
    } catch {
      setMsg('El navegador no permitió leer el portapapeles: mantenga presionado dentro del cuadro y elija "Pegar".');
    }
  };

  const save = async (value: string) => {
    setSaving(true);
    try {
      await onSave(value.trim());
      onClose();
    } catch (e: any) {
      setMsg(`No se pudo guardar: ${e?.message || 'error'}`);
    } finally {
      setSaving(false);
    }
  };

  const dialog = (
    <div className="fixed inset-0 z-[130] bg-slate-900/60 flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" data-testid="discussion-dialog">
      <div className="bg-white w-full sm:max-w-2xl h-[92dvh] sm:h-auto sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-[#0F4C5C] text-white shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <MessageSquareText size={18} />
            <div className="min-w-0">
              <h3 className="text-sm font-black uppercase tracking-wide">Discusión terapéutica</h3>
              <p className="text-[11px] text-white/80">Se imprime justo después de los diagnósticos en la nota de ingreso de emergencia.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/15" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="discussion-text" className="text-xs font-bold text-slate-700">
              Escriba o pegue la discusión (un párrafo por bloque)
            </label>
            <button type="button" onClick={paste} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-xs font-bold text-slate-700">
              <ClipboardPaste size={13} /> Pegar
            </button>
          </div>
          <textarea
            id="discussion-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={14}
            className="w-full border border-slate-300 rounded-xl p-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/30"
            placeholder="Ej.: EN CUANTO AL MANEJO: EN NUESTRO PACIENTE SE INDICA…"
            data-testid="discussion-text"
          />
          <p className="text-[11px] text-slate-500">Si lo deja vacío, la nota termina en los diagnósticos. El texto se guarda en el expediente y se usa en la vista previa, el Word, el PDF y la impresión.</p>
          {msg && <p className="text-[11px] text-red-600">{msg}</p>}
        </div>
        <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-t border-slate-200 bg-slate-50" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <button type="button" disabled={saving || !initialText} onClick={() => save('')} className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-black text-red-700 bg-white border border-red-200 disabled:opacity-40">
            <Trash2 size={13} /> Quitar discusión
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-3 py-2 rounded-xl text-xs font-black text-slate-600 bg-white border border-slate-200">
              Cancelar
            </button>
            <button type="button" disabled={saving} onClick={() => save(text)} className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-black text-white bg-[#0F4C5C] disabled:opacity-50" data-testid="discussion-save">
              <Save size={13} /> {saving ? 'Guardando…' : 'Guardar en la nota'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
  return createPortal(dialog, document.body);
};

export default TherapeuticDiscussionDialog;
