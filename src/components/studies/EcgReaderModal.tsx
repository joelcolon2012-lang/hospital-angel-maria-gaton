import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Images, X, Loader2, AlertTriangle, HeartPulse, CheckCircle2, ZoomIn } from 'lucide-react';
import type { MedicalStudy } from '../../types';
import { readEcg, EcgResult } from '../../services/ecg/ecgReader';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientAge?: number;
  patientSex?: string;
  onSave: (study: Partial<MedicalStudy>) => void;
}

export const EcgReaderModal: React.FC<Props> = ({ isOpen, onClose, patientId, patientAge, patientSex, onSave }) => {
  const [file, setFile] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState('');
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<EcgResult | null>(null);
  const [report, setReport] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [big, setBig] = useState(false);
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const reset = () => {
    setFile(null);
    setLocalPreview('');
    setResult(null);
    setReport('');
    setConfirmed(false);
    setError('');
    setBig(false);
  };
  const close = () => {
    reset();
    onClose();
  };

  const pick = (list: FileList | null) => {
    const f = list?.[0];
    if (!f) return;
    reset();
    setFile(f);
    if (f.type.startsWith('image/')) setLocalPreview(URL.createObjectURL(f));
    if (camRef.current) camRef.current.value = '';
    if (galRef.current) galRef.current.value = '';
  };

  const analyze = async () => {
    if (!file) return;
    setError('');
    setLoading('Analizando…');
    try {
      const r = await readEcg(file, { age: patientAge, sex: patientSex }, setLoading);
      setResult(r);
      setReport(r.report);
    } catch (e: any) {
      setError(e?.message || 'No se pudo analizar el electrocardiograma.');
    } finally {
      setLoading('');
    }
  };

  const save = () => {
    if (!result || !report.trim() || !confirmed) return;
    const now = new Date().toISOString();
    onSave({
      patientId,
      category: 'Electrocardiograma',
      title: 'Electrocardiograma de 12 derivaciones',
      anatomicalRegion: 'Corazón',
      description: 'Lectura asistida por IA, revisada y confirmada por el médico.',
      preliminaryInterpretation: result.report,
      officialResult: report.trim().toUpperCase(),
      status: 'Informado',
      tags: ['ECG', 'IA revisada'],
      imageDataUrl: result.preview || undefined,
      sourceFileName: file?.name,
      createdAt: now,
      createdBy: 'Lectura de ECG'
    });
    close();
  };

  const r = result?.reading;
  const photo = result?.preview || localPreview;
  const cell = (label: string, value: any, unit = '') => (
    <div className="rounded-xl border border-slate-200 bg-white px-2 py-1.5">
      <div className="text-[9px] font-black uppercase text-slate-400">{label}</div>
      <div className="text-sm font-black text-slate-800">{value !== null && value !== undefined && value !== '' ? `${value}${unit}` : '—'}</div>
    </div>
  );

  const modal = (
    <div className="fixed inset-0 z-[85] bg-slate-900/60 flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" data-testid="ecg-modal">
      <div className="bg-white w-full sm:max-w-3xl h-[100dvh] sm:h-auto sm:max-h-[94vh] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-[#0F4C5C] text-white shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <HeartPulse size={20} className="text-rose-300 shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm font-black uppercase tracking-wide">Lectura de electrocardiograma</h3>
              <p className="text-[11px] text-white/80">Apoyo con IA. El informe se guarda solo cuando usted lo revisa y confirma.</p>
            </div>
          </div>
          <button type="button" onClick={close} className="p-2 rounded-lg hover:bg-white/15" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 text-xs">
          {!result && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" disabled={!!loading} onClick={() => camRef.current?.click()} className="flex flex-col items-center gap-1.5 py-5 rounded-2xl border-2 border-[#0F4C5C] bg-[#0F4C5C]/5 text-[#0F4C5C] font-black">
                  <Camera size={26} /> Tomar foto del ECG
                </button>
                <button type="button" disabled={!!loading} onClick={() => galRef.current?.click()} className="flex flex-col items-center gap-1.5 py-5 rounded-2xl border-2 border-slate-300 text-slate-700 font-black">
                  <Images size={26} /> Galería o PDF
                </button>
              </div>
              <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => pick(e.target.files)} />
              <input ref={galRef} type="file" accept="image/*,.heic,.heif,.pdf" className="hidden" onChange={(e) => pick(e.target.files)} data-testid="ecg-file" />
              {file && (
                <div className="space-y-2">
                  {localPreview ? <img src={localPreview} alt="ECG" className="w-full max-h-64 object-contain rounded-xl border border-slate-200 bg-white" /> : <p className="font-bold text-slate-600">{file.name}</p>}
                  <button type="button" disabled={!!loading} onClick={analyze} className="w-full py-3 rounded-xl bg-[#0F4C5C] text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60" data-testid="ecg-analyze">
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <HeartPulse size={16} />} {loading || 'Analizar electrocardiograma'}
                  </button>
                </div>
              )}
              <p className="text-[11px] text-slate-500 leading-snug">
                Consejo: foto de frente, con el papel plano, buena luz y las 12 derivaciones completas. Si el equipo imprimió FC, PR, QRS, QT/QTc o su interpretación, la app los usa primero.
              </p>
            </>
          )}

          {error && (
            <div className="flex gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700" data-testid="ecg-error">
              <AlertTriangle size={16} className="shrink-0" /> <span>{error}</span>
            </div>
          )}

          {result && r && (
            <>
              {result.alerts.length > 0 && (
                <div className="p-3 rounded-xl bg-red-600 text-white space-y-1" data-testid="ecg-alerts">
                  <div className="font-black uppercase flex items-center gap-1.5">
                    <AlertTriangle size={16} /> Alerta — confirme de inmediato con el trazado
                  </div>
                  {result.alerts.map((a, i) => (
                    <div key={i}>• {a}</div>
                  ))}
                </div>
              )}
              {result.discrepancies.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-900 space-y-1" data-testid="ecg-discrepancies">
                  <div className="font-black">Las dos lecturas no coinciden en:</div>
                  {result.discrepancies.map((d, i) => (
                    <div key={i}>• {d}</div>
                  ))}
                  <div className="text-[11px]">Revise esos puntos directamente en el trazado antes de confirmar.</div>
                </div>
              )}
              {result.warnings.map((w, i) => (
                <div key={i} className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                  {w}
                </div>
              ))}

              <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-3">
                {photo ? (
                  <button type="button" onClick={() => setBig(true)} className="relative rounded-xl overflow-hidden border border-slate-200 bg-white h-40 sm:h-full">
                    <img src={photo} alt="Trazado" className="w-full h-full object-contain" />
                    <span className="absolute bottom-1 right-1 bg-black/60 text-white rounded p-0.5">
                      <ZoomIn size={12} />
                    </span>
                  </button>
                ) : (
                  <div className="rounded-xl border border-slate-200 p-3 text-slate-500">{file?.name}</div>
                )}
                <div className="space-y-2">
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5" data-testid="ecg-values">
                    {cell('Ritmo', r.rhythm)}
                    {cell('FC', r.heartRate, ' lpm')}
                    {cell('Eje', r.axis)}
                    {cell('PR', r.prMs, ' ms')}
                    {cell('QRS', r.qrsMs, ' ms')}
                    {cell('QT', r.qtMs, ' ms')}
                    {cell('QTc', r.qtcMs, ' ms')}
                    {cell('Confianza', r.confidence)}
                  </div>
                  {r.printedValues?.machineText && (
                    <div className="text-[11px] text-slate-600">
                      <b>Interpretación impresa por el equipo:</b> {r.printedValues.machineText}
                    </div>
                  )}
                  {(r.findings || []).length > 0 && (
                    <ul className="list-disc pl-4 text-[11px] text-slate-700 space-y-0.5">
                      {(r.findings || []).map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="ecg-report" className="font-black text-[#0F4C5C] uppercase text-[11px]">
                  Informe (edítelo si hace falta)
                </label>
                <textarea id="ecg-report" value={report} onChange={(e) => setReport(e.target.value)} rows={7} className="w-full border border-slate-300 rounded-xl p-3 text-[12px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/30" data-testid="ecg-report" />
                <p className="text-[10px] text-slate-500">Al confirmar se guarda en Estudios & ECG y aparece en la nota de ingreso y en la de recibimiento en sala.</p>
              </div>
              <label className="flex items-start gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input type="checkbox" className="mt-0.5 w-4 h-4 accent-[#0F4C5C]" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} data-testid="ecg-confirm" />
                <span className="font-bold text-slate-700">Revisé el trazado y confirmo este informe.</span>
              </label>
            </>
          )}
        </div>

        {result && (
          <div className="shrink-0 flex items-center justify-between gap-2 px-3 sm:px-4 py-3 border-t border-slate-200 bg-slate-50" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
            <button type="button" onClick={reset} className="px-3 py-2 rounded-xl bg-white border border-slate-200 font-black text-slate-600 text-xs">
              Otro ECG
            </button>
            <button type="button" disabled={!confirmed || !report.trim()} onClick={save} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F4C5C] text-white font-black text-xs disabled:opacity-40" data-testid="ecg-save">
              <CheckCircle2 size={14} /> Guardar informe
            </button>
          </div>
        )}
      </div>
      {big && photo && (
        <div className="fixed inset-0 z-[95] bg-black/90 flex flex-col" onClick={() => setBig(false)}>
          <div className="flex justify-end p-2">
            <button type="button" onClick={() => setBig(false)} className="text-white p-2" aria-label="Cerrar">
              <X size={22} />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-2" onClick={(e) => e.stopPropagation()}>
            <img src={photo} alt="Trazado ampliado" className="max-w-none w-[220%] sm:w-full h-auto" />
          </div>
        </div>
      )}
    </div>
  );
  return createPortal(modal, document.body);
};

export default EcgReaderModal;
