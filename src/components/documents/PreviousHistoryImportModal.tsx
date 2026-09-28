import React, { useMemo, useRef, useState } from 'react';
import { Patient, StructuredDiagnosis } from '../../types';
import {
  extractTextWithDetails,
  parseClinicalText,
  applyParsedHistoryToPatient,
  nameMatchesPatient,
  ParsedHistoryData
} from '../../services/historyImportService';
import { CLINICAL_FILE_ACCEPT } from '../../services/clinicalImport/fileText';
import {
  X,
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ClipboardPaste,
  Loader2,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  RotateCcw
} from 'lucide-react';

interface PreviousHistoryImportModalProps {
  patient: Patient;
  isOpen: boolean;
  onClose: () => void;
  onApplyHistory: (updatedPatient: Patient) => void;
}

type Kind = 'text' | 'long' | 'number' | 'sex' | 'bp';
interface FieldDef {
  key: string; // clave de selección (la que entiende applyParsedHistoryToPatient)
  label: string;
  kind: Kind;
  path: string; // ruta dentro de ParsedHistoryData
  current?: (p: Patient) => string | number | undefined;
}
interface GroupDef {
  id: string;
  title: string;
  fields: FieldDef[];
}

const ch = (p: Patient) => (p.clinicalHistory || {}) as any;
const pe = (p: Patient) => (ch(p).physicalExam || {}) as any;

const GROUPS: GroupDef[] = [
  {
    id: 'id',
    title: 'Identificación',
    fields: [
      { key: 'patientInfo.fullName', label: 'Nombre', kind: 'text', path: 'patientInfo.fullName', current: (p) => p.fullName },
      { key: 'patientInfo.age', label: 'Edad (años)', kind: 'number', path: 'patientInfo.age', current: (p) => p.age },
      { key: 'patientInfo.sex', label: 'Sexo', kind: 'sex', path: 'patientInfo.sex', current: (p) => p.sex },
      { key: 'patientInfo.idDocument', label: 'Cédula', kind: 'text', path: 'patientInfo.idDocument', current: (p) => p.idDocument },
      { key: 'patientInfo.medicalRecordNumber', label: 'Expediente', kind: 'text', path: 'patientInfo.medicalRecordNumber', current: (p) => p.medicalRecordNumber },
      { key: 'patientInfo.cubicle', label: 'Sala / Cama / Cubículo', kind: 'text', path: 'patientInfo.cubicle', current: (p) => p.cubicle }
    ]
  },
  {
    id: 'mc',
    title: 'Motivo de consulta e HEA',
    fields: [
      { key: 'reasonForConsultation', label: 'Motivo de consulta', kind: 'long', path: 'reasonForConsultation', current: (p) => ch(p).reasonForConsultation || p.chiefComplaint },
      { key: 'currentIllnessHistory', label: 'Historia de la enfermedad actual', kind: 'long', path: 'currentIllnessHistory', current: (p) => ch(p).currentIllnessHistory }
    ]
  },
  {
    id: 'ant',
    title: 'Antecedentes',
    fields: [
      { key: 'pathologicalHistory', label: 'Personales patológicos', kind: 'long', path: 'pathologicalHistory', current: (p) => ch(p).pathologicalHistory },
      { key: 'surgicalHistory', label: 'Quirúrgicos', kind: 'long', path: 'surgicalHistory', current: (p) => ch(p).surgicalHistory },
      { key: 'allergicHistory', label: 'Alérgicos', kind: 'long', path: 'allergicHistory', current: (p) => ch(p).allergicHistory },
      { key: 'habitualMedications', label: 'Medicamentos habituales', kind: 'long', path: 'habitualMedications', current: (p) => ch(p).habitualMedications },
      { key: 'toxicHabits', label: 'Tóxicos / hábitos', kind: 'long', path: 'toxicHabits', current: (p) => ch(p).toxicHabits },
      { key: 'familyHistory', label: 'Familiares', kind: 'long', path: 'familyHistory', current: (p) => ch(p).familyHistory },
      { key: 'obGynHistory', label: 'Gineco-obstétricos', kind: 'long', path: 'obGynHistory', current: (p) => ch(p).obGynHistory },
      { key: 'transfusionalHistory', label: 'Transfusionales', kind: 'long', path: 'transfusionalHistory', current: (p) => ch(p).transfusionalHistory },
      { key: 'systemsReview', label: 'Revisión por sistemas', kind: 'long', path: 'systemsReview', current: (p) => ch(p).systemsReview }
    ]
  },
  {
    id: 'sv',
    title: 'Signos vitales',
    fields: [
      { key: 'vitals.systolicBP', label: 'Presión arterial (mmHg)', kind: 'bp', path: 'vitals.systolicBP' },
      { key: 'vitals.heartRate', label: 'Frecuencia cardíaca (lpm)', kind: 'number', path: 'vitals.heartRate', current: (p) => p.vitals?.heartRate },
      { key: 'vitals.respiratoryRate', label: 'Frecuencia respiratoria (rpm)', kind: 'number', path: 'vitals.respiratoryRate', current: (p) => p.vitals?.respiratoryRate },
      { key: 'vitals.temperature', label: 'Temperatura (°C)', kind: 'number', path: 'vitals.temperature', current: (p) => p.vitals?.temperature },
      { key: 'vitals.oxygenSaturation', label: 'SatO₂ (%)', kind: 'number', path: 'vitals.oxygenSaturation', current: (p) => p.vitals?.oxygenSaturation },
      { key: 'vitals.bloodGlucose', label: 'Glucemia (mg/dL)', kind: 'number', path: 'vitals.bloodGlucose', current: (p) => p.vitals?.bloodGlucose },
      { key: 'vitals.glasgowTotal', label: 'Glasgow', kind: 'number', path: 'vitals.glasgowTotal', current: (p) => p.vitals?.glasgowTotal },
      { key: 'vitals.weight', label: 'Peso (kg)', kind: 'number', path: 'vitals.weight', current: (p) => p.vitals?.weight },
      { key: 'vitals.height', label: 'Talla (cm)', kind: 'number', path: 'vitals.height', current: (p) => p.vitals?.height }
    ]
  },
  {
    id: 'ef',
    title: 'Examen físico',
    fields: (
      [
        ['general', 'Estado general'],
        ['head', 'Cabeza'],
        ['eyes', 'Ojos'],
        ['ears', 'Oídos'],
        ['nose', 'Nariz'],
        ['mouth', 'Boca'],
        ['neck', 'Cuello'],
        ['thorax', 'Tórax'],
        ['lungs', 'Pulmones'],
        ['heart', 'Corazón'],
        ['abdominal', 'Abdomen'],
        ['genitals', 'Genitales'],
        ['rectalExam', 'Tacto rectal'],
        ['skin', 'Piel y anexos'],
        ['upperExtremities', 'Extremidades superiores'],
        ['lowerExtremities', 'Extremidades inferiores'],
        ['extremities', 'Extremidades (general)'],
        ['neurological', 'Neurológico']
      ] as Array<[string, string]>
    ).map(([k, label]) => ({
      key: `physicalExam.${k}`,
      label,
      kind: 'long' as Kind,
      path: `physicalExam.${k}`,
      current: (p: Patient) => pe(p)[k]
    }))
  },
  {
    id: 'plan',
    title: 'Plan',
    fields: [{ key: 'diagnosticAndTherapeuticPlan', label: 'Plan diagnóstico y terapéutico', kind: 'long', path: 'diagnosticAndTherapeuticPlan', current: (p) => ch(p).diagnosticAndTherapeuticPlan }]
  }
];

function getPath(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function setPath(obj: any, path: string, value: any): any {
  const keys = path.split('.');
  const copy = { ...obj };
  let cur = copy;
  for (let i = 0; i < keys.length - 1; i++) {
    cur[keys[i]] = { ...(cur[keys[i]] || {}) };
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
  return copy;
}
const filled = (v: any) => (typeof v === 'number' ? Number.isFinite(v) : typeof v === 'string' ? v.trim().length > 0 : false);
const isEmpty = (v: any) => !filled(v);

export const PreviousHistoryImportModal: React.FC<PreviousHistoryImportModalProps> = ({ patient, isOpen, onClose, onApplyHistory }) => {
  const [tab, setTab] = useState<'file' | 'paste'>('file');
  const [pasteText, setPasteText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState('');
  const [data, setData] = useState<ParsedHistoryData | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [diagText, setDiagText] = useState('');
  const [nameOk, setNameOk] = useState(false);
  const [error, setError] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showRaw, setShowRaw] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const mismatch = useMemo(() => (data ? !nameMatchesPatient(data.patientInfo?.fullName, patient.fullName) : false), [data, patient.fullName]);

  if (!isOpen) return null;

  const reset = () => {
    setData(null);
    setSelected({});
    setDiagText('');
    setNameOk(false);
    setError('');
    setShowRaw(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const close = () => {
    reset();
    setPasteText('');
    setTab('file');
    onClose();
  };

  const load = (parsed: ParsedHistoryData) => {
    const sel: Record<string, boolean> = {};
    for (const g of GROUPS) {
      for (const f of g.fields) {
        const v = getPath(parsed, f.path);
        if (!filled(v)) continue;
        if (g.id === 'id') {
          // Identificación: solo se propone si el expediente no la tiene (no se cambia el nombre sin querer)
          const cur = f.current?.(patient);
          sel[f.key] = f.key === 'patientInfo.sex' ? !cur || cur === 'Otro' : isEmpty(cur);
        } else sel[f.key] = true;
      }
    }
    const diags = (parsed.diagnosesList || []).map((d) => d.name);
    if (diags.length) sel['diagnosesList'] = true;
    setDiagText(diags.join('\n'));
    setSelected(sel);
    setNameOk(false);
    setData(parsed);
    if (!Object.values(sel).some(Boolean) && !diags.length) {
      setError('No se encontraron acápites reconocibles en el documento. Revise el texto original abajo o pegue la nota manualmente.');
    }
  };

  const processFile = async (file: File) => {
    setError('');
    setLoading(true);
    setLoadMsg(/\.(pdf|jpe?g|png|webp|heic|heif)$/i.test(file.name) || file.type.startsWith('image/') ? 'Leyendo el documento (si es escaneado o foto, la IA lo transcribe)…' : 'Leyendo el documento…');
    try {
      const r = await extractTextWithDetails(file);
      if (!r.text || r.text.trim().length < 10) {
        setError(r.warnings.join(' ') || 'El archivo no contiene texto legible.');
        return;
      }
      load(parseClinicalText(r.text, file.name, r.method, r.warnings));
    } catch (e: any) {
      setError(`No se pudo procesar el archivo: ${e?.message || 'error desconocido'}. Puede copiar y pegar el texto de la nota.`);
    } finally {
      setLoading(false);
    }
  };

  const processPaste = () => {
    setError('');
    if (pasteText.trim().length < 10) {
      setError('Pegue el texto completo de la nota o historia clínica.');
      return;
    }
    load(parseClinicalText(pasteText, 'nota-pegada.txt', 'Texto pegado'));
  };

  const edit = (path: string, value: any, key: string) => {
    if (!data) return;
    setData(setPath(data, path, value));
    setSelected((s) => ({ ...s, [key]: filled(value) }));
  };

  const toggle = (key: string) => setSelected((s) => ({ ...s, [key]: !s[key] }));

  const selectAllIn = (g: GroupDef, value: boolean) =>
    setSelected((s) => {
      const n = { ...s };
      for (const f of g.fields) if (filled(getPath(data, f.path))) n[f.key] = value;
      return n;
    });

  const diagLines = diagText
    .split('\n')
    .map((l) => l.replace(/^\s*(\d+[.)-]|[-•*])\s*/, '').trim())
    .filter(Boolean);

  const selectedCount = Object.entries(selected).filter(([k, v]) => v && (k !== 'diagnosesList' || diagLines.length)).length;
  const canApply = !!data && selectedCount > 0 && (!mismatch || nameOk);

  const apply = () => {
    if (!data || !canApply) return;
    const now = Date.now();
    const diagnosesList: StructuredDiagnosis[] = diagLines.map((name, i) => ({
      id: `diag-import-${now}-${i}`,
      name,
      status: 'Probable',
      type: i === 0 ? 'Primario' : 'Secundario',
      orderIndex: i
    } as StructuredDiagnosis));
    const finalData: ParsedHistoryData = { ...data, diagnosesList };
    try {
      const updated = applyParsedHistoryToPatient(patient, finalData, selected);
      onApplyHistory(updated);
      close();
    } catch (e: any) {
      setError(`No se pudo aplicar: ${e?.message || 'error desconocido'}`);
    }
  };

  const badge = (key: string) => {
    const c = data?.confidence?.[key];
    if (!c) return null;
    return c === 'ALTA' ? (
      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700" title="Tomado de un acápite con su título">ACÁPITE</span>
    ) : (
      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-700" title="Deducido de la redacción: verifique">DEDUCIDO</span>
    );
  };

  const renderInput = (f: FieldDef) => {
    const v = getPath(data, f.path);
    const base = 'w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/30 bg-white';
    if (f.kind === 'long') {
      return (
        <textarea
          className={`${base} min-h-[52px] resize-y`}
          rows={Math.min(6, Math.max(2, Math.ceil(String(v || '').length / 90)))}
          value={v || ''}
          onChange={(e) => edit(f.path, e.target.value, f.key)}
          placeholder="(no encontrado en el documento)"
        />
      );
    }
    if (f.kind === 'sex') {
      return (
        <select className={base} value={v || ''} onChange={(e) => edit(f.path, e.target.value || undefined, f.key)}>
          <option value="">(no encontrado)</option>
          <option value="M">Masculino</option>
          <option value="F">Femenino</option>
        </select>
      );
    }
    if (f.kind === 'number') {
      return (
        <input
          type="number"
          step="any"
          className={base}
          value={typeof v === 'number' ? v : ''}
          onChange={(e) => edit(f.path, e.target.value === '' ? undefined : Number(e.target.value), f.key)}
          placeholder="—"
        />
      );
    }
    if (f.kind === 'bp') {
      const d = data?.vitals?.diastolicBP;
      return (
        <div className="flex items-center gap-1">
          <input
            type="number"
            className={base}
            value={typeof v === 'number' ? v : ''}
            onChange={(e) => edit('vitals.systolicBP', e.target.value === '' ? undefined : Number(e.target.value), f.key)}
            placeholder="Sistólica"
          />
          <span className="text-slate-400 font-bold">/</span>
          <input
            type="number"
            className={base}
            value={typeof d === 'number' ? d : ''}
            onChange={(e) => data && setData(setPath(data, 'vitals.diastolicBP', e.target.value === '' ? undefined : Number(e.target.value)))}
            placeholder="Diastólica"
          />
        </div>
      );
    }
    return <input type="text" className={base} value={v || ''} onChange={(e) => edit(f.path, e.target.value, f.key)} placeholder="(no encontrado en el documento)" />;
  };

  const currentText = (f: FieldDef): string => {
    if (f.kind === 'bp') {
      const s = patient.vitals?.systolicBP;
      const d = patient.vitals?.diastolicBP;
      return s ? `${s}/${d ?? '?'}` : '';
    }
    const c = f.current?.(patient);
    if (c == null) return '';
    if (f.kind === 'sex') return c === 'M' ? 'Masculino' : c === 'F' ? 'Femenino' : '';
    return String(c);
  };

  const renderGroup = (g: GroupDef) => {
    const present = g.fields.filter((f) => filled(getPath(data, f.path)));
    const hidden = g.fields.length - present.length;
    const isCol = collapsed[g.id];
    const [showEmpty, setShowEmptyKey] = [collapsed[`${g.id}:empty`], `${g.id}:empty`];
    const list = showEmpty ? g.fields : present;
    return (
      <div key={g.id} className="border border-slate-200 rounded-xl overflow-hidden" data-testid={`import-group-${g.id}`}>
        <div className="flex items-center justify-between bg-slate-50 px-3 py-2">
          <button type="button" className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-[#0F4C5C]" onClick={() => setCollapsed((c) => ({ ...c, [g.id]: !c[g.id] }))}>
            {isCol ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            {g.title}
            <span className="ml-1 text-[10px] font-bold text-slate-500 normal-case">
              {present.length} encontrado{present.length === 1 ? '' : 's'}
            </span>
          </button>
          {present.length > 0 && (
            <div className="flex gap-2 text-[10px] font-bold">
              <button type="button" className="text-[#0F4C5C] hover:underline" onClick={() => selectAllIn(g, true)}>
                Todos
              </button>
              <button type="button" className="text-slate-500 hover:underline" onClick={() => selectAllIn(g, false)}>
                Ninguno
              </button>
            </div>
          )}
        </div>
        {!isCol && (
          <div className="divide-y divide-slate-100">
            {list.length === 0 && <p className="px-3 py-2 text-[11px] text-slate-400 italic">Este acápite no aparece en el documento.</p>}
            {list.map((f) => {
              const v = getPath(data, f.path);
              const cur = currentText(f);
              const has = filled(v);
              return (
                <div key={f.key} className={`grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-1.5 sm:gap-3 px-3 py-2 ${selected[f.key] ? 'bg-emerald-50/40' : ''}`} data-testid={`import-field-${f.key}`}>
                  <label className="flex items-start gap-2 cursor-pointer select-none pt-1">
                    <input type="checkbox" className="mt-0.5 accent-[#0F4C5C]" checked={!!selected[f.key]} disabled={!has} onChange={() => toggle(f.key)} />
                    <span className="text-[11px] font-bold text-slate-700 leading-tight">
                      {f.label}
                      <span className="block mt-0.5">{badge(f.key)}</span>
                    </span>
                  </label>
                  <div className="min-w-0">
                    {renderInput(f)}
                    {cur && has && selected[f.key] && cur.trim() !== String(v).trim() && (
                      <p className="mt-1 text-[10px] text-amber-700">
                        Reemplazará lo actual: <span className="font-semibold">{cur.length > 120 ? `${cur.slice(0, 120)}…` : cur}</span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            {hidden > 0 && (
              <button type="button" className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:bg-slate-50" onClick={() => setCollapsed((c) => ({ ...c, [setShowEmptyKey]: !c[setShowEmptyKey] }))}>
                {showEmpty ? 'Ocultar campos vacíos' : `+ ${hidden} campo${hidden === 1 ? '' : 's'} no encontrado${hidden === 1 ? '' : 's'} (llenar a mano)`}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/60 flex items-center justify-center p-2 sm:p-4" role="dialog" aria-modal="true" data-testid="history-import-modal">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden">
        {/* Encabezado */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0F4C5C] text-white">
          <div className="min-w-0">
            <h2 className="text-sm font-black uppercase tracking-wide">Importar nota / historia clínica</h2>
            <p className="text-[11px] text-white/80 truncate">
              Paciente: <span className="font-bold">{patient.fullName}</span>
              {patient.cubicle ? ` · ${patient.cubicle}` : ''}
            </p>
          </div>
          <button type="button" onClick={close} className="p-1.5 rounded-lg hover:bg-white/15" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {!data && (
            <>
              <div className="flex gap-2">
                <button type="button" onClick={() => setTab('file')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black ${tab === 'file' ? 'bg-[#0F4C5C] text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <Upload size={14} /> Subir archivo
                </button>
                <button type="button" onClick={() => setTab('paste')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black ${tab === 'paste' ? 'bg-[#0F4C5C] text-white' : 'bg-slate-100 text-slate-600'}`} data-testid="import-tab-paste">
                  <ClipboardPaste size={14} /> Pegar texto
                </button>
              </div>

              {tab === 'file' ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f && !loading) processFile(f);
                  }}
                  onClick={() => !loading && fileRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${dragOver ? 'border-[#0F4C5C] bg-[#0F4C5C]/5' : 'border-slate-300 hover:border-[#0F4C5C]/60'}`}
                >
                  {loading ? (
                    <div className="flex flex-col items-center gap-2 text-[#0F4C5C]">
                      <Loader2 className="animate-spin" size={28} />
                      <p className="text-xs font-bold">{loadMsg}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-600">
                      <FileText size={30} className="text-[#0F4C5C]" />
                      <p className="text-sm font-black">Toque para elegir o arrastre el archivo aquí</p>
                      <p className="text-[11px] text-slate-500">Word (.docx / .doc), PDF (con texto o escaneado), foto de la nota (JPG, PNG, HEIC), RTF o texto.</p>
                    </div>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept={CLINICAL_FILE_ACCEPT}
                    className="hidden"
                    data-testid="import-file-input"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) processFile(f);
                    }}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    className="w-full min-h-[260px] border border-slate-200 rounded-xl p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/30"
                    placeholder={'Pegue aquí la nota completa. Ejemplo:\nNOMBRE: …  EDAD: …  SALA: …\nMOTIVO DE CONSULTA: …\nHISTORIA DE LA ENFERMEDAD ACTUAL: …\nANTECEDENTES: …\nSIGNOS VITALES: TA 120/80 FC 80 …\nEXAMEN FÍSICO: …\nDIAGNÓSTICOS: 1. …'}
                    data-testid="import-paste-text"
                  />
                  <button type="button" onClick={processPaste} className="w-full py-2.5 rounded-xl bg-[#0F4C5C] text-white text-xs font-black" data-testid="import-paste-analyze">
                    Analizar y distribuir por acápites
                  </button>
                </div>
              )}
              <p className="text-[11px] text-slate-500 leading-snug">
                El programa separa la nota por acápites (nombre, edad, sala, motivo, HEA, antecedentes, signos vitales, examen físico y diagnósticos). Usted revisa y elige qué se guarda: nada se inventa y nada se borra.
              </p>
            </>
          )}

          {error && (
            <div className="flex gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs" data-testid="import-error">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {data && (
            <>
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="px-2 py-1 rounded-lg bg-slate-100 font-bold text-slate-700">{data.sourceFileName}</span>
                {data.extractionMethod && <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600">{data.extractionMethod}</span>}
                <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold">{(data.sectionsFound || []).length} acápites reconocidos</span>
                <button type="button" onClick={reset} className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg text-slate-600 hover:bg-slate-100 font-bold">
                  <RotateCcw size={12} /> Otro documento
                </button>
              </div>

              {mismatch && (
                <div className="p-3 rounded-xl bg-red-50 border-2 border-red-300 text-red-800 text-xs space-y-2" data-testid="import-name-mismatch">
                  <div className="flex gap-2 font-bold">
                    <ShieldAlert size={16} className="shrink-0" />
                    <span>
                      El nombre del documento ({data.patientInfo?.fullName}) no coincide con el paciente abierto ({patient.fullName}).
                    </span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="accent-red-700" checked={nameOk} onChange={(e) => setNameOk(e.target.checked)} data-testid="import-name-confirm" />
                    Confirmo que esta nota pertenece a este paciente.
                  </label>
                </div>
              )}

              {(data.warnings || []).length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] space-y-1" data-testid="import-warnings">
                  {(data.warnings || []).map((w, i) => (
                    <div key={i} className="flex gap-1.5">
                      <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {GROUPS.slice(0, 4).map(renderGroup)}
              {renderGroup(GROUPS[4])}

              {/* Diagnósticos */}
              <div className="border border-slate-200 rounded-xl overflow-hidden" data-testid="import-group-dx">
                <div className="flex items-center justify-between bg-slate-50 px-3 py-2">
                  <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-[#0F4C5C] cursor-pointer">
                    <input type="checkbox" className="accent-[#0F4C5C]" checked={!!selected['diagnosesList']} disabled={!diagLines.length} onChange={() => toggle('diagnosesList')} />
                    Diagnósticos
                    <span className="text-[10px] font-bold text-slate-500 normal-case">{diagLines.length} (uno por línea)</span>
                  </label>
                  {badge('diagnosesList')}
                </div>
                <div className="p-3">
                  <textarea
                    className="w-full min-h-[80px] border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/30"
                    value={diagText}
                    onChange={(e) => {
                      setDiagText(e.target.value);
                      if (e.target.value.trim()) setSelected((s) => ({ ...s, diagnosesList: true }));
                    }}
                    placeholder="(no se encontraron diagnósticos; escríbalos uno por línea)"
                    data-testid="import-diagnoses"
                  />
                  <p className="mt-1 text-[10px] text-slate-500">Se agregan a la lista del paciente sin duplicar los que ya tiene.</p>
                </div>
              </div>

              {renderGroup(GROUPS[5])}

              {(data.labsText || data.imagingText) && (
                <div className="border border-slate-200 rounded-xl p-3 space-y-1" data-testid="import-labs">
                  <p className="text-[11px] font-black uppercase text-[#0F4C5C]">Paraclínicos en el documento</p>
                  {data.labsText && <p className="text-[11px] text-slate-700 whitespace-pre-wrap">{data.labsText}</p>}
                  {data.imagingText && <p className="text-[11px] text-slate-700 whitespace-pre-wrap">{data.imagingText}</p>}
                  <p className="text-[10px] text-slate-500">Quedan guardados junto al documento fuente del paciente.</p>
                </div>
              )}

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button type="button" onClick={() => setShowRaw((v) => !v)} className="w-full flex items-center gap-1.5 px-3 py-2 bg-slate-50 text-[11px] font-black uppercase text-slate-600">
                  {showRaw ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Texto original del documento
                </button>
                {showRaw && <pre className="p-3 text-[10px] text-slate-700 whitespace-pre-wrap max-h-64 overflow-y-auto font-mono">{data.rawText}</pre>}
              </div>
            </>
          )}
        </div>

        {data && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 px-4 py-3 border-t border-slate-200 bg-slate-50">
            <p className="text-[11px] text-slate-600">
              <CheckCircle2 size={12} className="inline mr-1 text-emerald-600" />
              {selectedCount} campo{selectedCount === 1 ? '' : 's'} marcado{selectedCount === 1 ? '' : 's'} para guardar
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={close} className="px-4 py-2 rounded-xl text-xs font-black text-slate-600 bg-white border border-slate-200">
                Cancelar
              </button>
              <button
                type="button"
                onClick={apply}
                disabled={!canApply}
                className="px-4 py-2 rounded-xl text-xs font-black text-white bg-[#0F4C5C] disabled:opacity-40 disabled:cursor-not-allowed"
                data-testid="import-apply"
              >
                Guardar en el expediente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviousHistoryImportModal;
