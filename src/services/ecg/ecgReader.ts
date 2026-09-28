/**
 * Lectura asistida de electrocardiogramas (foto o PDF).
 *
 * Seguridad clínica:
 * - La IA analiza el trazado DOS veces por separado; el programa compara ritmo, frecuencia,
 *   elevación del ST y alertas. Si no coinciden, se avisa en rojo.
 * - Se prefieren los valores IMPRESOS por el electrocardiógrafo (FC, PR, QRS, QT/QTc, eje).
 * - Lo que no se puede medir queda vacío: nunca se rellena con valores normales.
 * - El informe solo se guarda cuando el médico lo revisa, lo corrige si hace falta y lo confirma.
 */
import { geminiService } from '../ai/geminiService';
import { prepareImage, toBase64 } from '../labs/labPhotoReader';

export interface EcgReading {
  quality?: string;
  limitations?: string;
  printedValues?: { fc?: number | null; pr?: number | null; qrs?: number | null; qt?: number | null; qtc?: number | null; axis?: string | number | null; machineText?: string | null };
  heartRate?: number | null;
  rhythm?: string | null;
  regular?: boolean | null;
  axis?: string | null;
  prMs?: number | null;
  qrsMs?: number | null;
  qtMs?: number | null;
  qtcMs?: number | null;
  pWaves?: string | null;
  conduction?: string | null;
  stSegment?: string | null;
  stElevationLeads?: string[];
  stDepressionLeads?: string[];
  tWaves?: string | null;
  pathologicQ?: string[];
  hypertrophy?: string | null;
  findings?: string[];
  conclusions?: string[];
  criticalAlert?: string | null;
  confidence?: string | null;
}

export interface EcgResult {
  reading: EcgReading; // valores consolidados (lectura 1 + valores impresos)
  second?: EcgReading | null;
  discrepancies: string[];
  alerts: string[];
  report: string; // informe propuesto (editable por el médico)
  preview: string; // miniatura del trazado
  warnings: string[];
}

const PROMPT = (ctx: string) => `Eres cardiólogo y médico de emergencias. Analiza este ELECTROCARDIOGRAMA ${ctx}.
Reglas obligatorias:
- Basa todo SOLO en lo que se ve en el trazado. No inventes. Si algo no se puede medir o no se ve con seguridad, usa null.
- Si el equipo imprimió valores (FC, PR, QRS, QT/QTc, eje) o una interpretación automática, cópialos EXACTOS en "valores_impresos".
- Mide intervalos en milisegundos. Indica las derivaciones exactas de cualquier elevación o descenso del ST.
- Si el trazado es de mala calidad, dilo en "limitaciones".
Devuelve EXCLUSIVAMENTE este JSON:
{
 "calidad": "buena|regular|mala",
 "limitaciones": null o texto,
 "valores_impresos": {"fc": null, "pr": null, "qrs": null, "qt": null, "qtc": null, "eje": null, "texto_equipo": null},
 "frecuencia_cardiaca": null o número,
 "ritmo": null o texto (ej. "sinusal", "fibrilación auricular", "flutter auricular", "taquicardia supraventricular", "taquicardia ventricular", "ritmo de marcapasos"),
 "regular": null o true/false,
 "eje": null o texto (normal, desviado a la izquierda, desviado a la derecha, extremo),
 "pr_ms": null, "qrs_ms": null, "qt_ms": null, "qtc_ms": null,
 "ondas_p": null o texto,
 "conduccion": null o texto (bloqueos AV, de rama, fasciculares, preexcitación),
 "segmento_st": null o texto,
 "elevacion_st_derivaciones": [],
 "descenso_st_derivaciones": [],
 "ondas_t": null o texto,
 "ondas_q_patologicas": [],
 "hipertrofia": null o texto,
 "hallazgos": ["hallazgo 1", "..."],
 "conclusion": ["diagnóstico electrocardiográfico 1", "..."],
 "alerta_critica": null o texto (IAMCEST, TV, FV, bloqueo AV completo, QTc > 500 ms, hiperpotasemia, etc.),
 "confianza": "alta|media|baja"
}`;

const num = (v: any): number | null => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const arr = (v: any): string[] => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : []);
const txt = (v: any): string | null => {
  const t = v == null ? '' : String(v).trim();
  return t && !/^null$/i.test(t) ? t : null;
};

function parseJson(text: string): any {
  const clean = text.replace(/```(?:json)?/gi, '').trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  return JSON.parse(start >= 0 && end > start ? clean.slice(start, end + 1) : clean);
}

function toReading(j: any): EcgReading {
  const pv = j?.valores_impresos || {};
  return {
    quality: txt(j?.calidad) || undefined,
    limitations: txt(j?.limitaciones) || undefined,
    printedValues: { fc: num(pv.fc), pr: num(pv.pr), qrs: num(pv.qrs), qt: num(pv.qt), qtc: num(pv.qtc), axis: txt(pv.eje), machineText: txt(pv.texto_equipo) },
    heartRate: num(j?.frecuencia_cardiaca),
    rhythm: txt(j?.ritmo),
    regular: typeof j?.regular === 'boolean' ? j.regular : null,
    axis: txt(j?.eje),
    prMs: num(j?.pr_ms),
    qrsMs: num(j?.qrs_ms),
    qtMs: num(j?.qt_ms),
    qtcMs: num(j?.qtc_ms),
    pWaves: txt(j?.ondas_p),
    conduction: txt(j?.conduccion),
    stSegment: txt(j?.segmento_st),
    stElevationLeads: arr(j?.elevacion_st_derivaciones),
    stDepressionLeads: arr(j?.descenso_st_derivaciones),
    tWaves: txt(j?.ondas_t),
    pathologicQ: arr(j?.ondas_q_patologicas),
    hypertrophy: txt(j?.hipertrofia),
    findings: arr(j?.hallazgos),
    conclusions: arr(j?.conclusion),
    criticalAlert: txt(j?.alerta_critica),
    confidence: txt(j?.confianza)
  };
}

const fold = (s?: string | null) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase();

function rhythmKey(r?: string | null): string {
  const f = fold(r);
  if (!f) return '';
  if (/FIBRILACION VENTRICULAR/.test(f)) return 'FV';
  if (/TAQUICARDIA VENTRICULAR/.test(f)) return 'TV';
  if (/FIBRILACION AURICULAR/.test(f)) return 'FA';
  if (/FLUTTER/.test(f)) return 'FLUTTER';
  if (/MARCAPASO/.test(f)) return 'MARCAPASOS';
  if (/SUPRAVENTRICULAR|TSV|NODAL|UNION/.test(f)) return 'TSV';
  if (/SINUSAL/.test(f)) return 'SINUSAL';
  return f.slice(0, 20);
}

/** Aplica los valores impresos por el equipo (más fiables que la estimación visual). */
function consolidate(r: EcgReading): EcgReading {
  const pv = r.printedValues || {};
  const out: EcgReading = { ...r };
  if (pv.fc) out.heartRate = pv.fc;
  if (pv.pr) out.prMs = pv.pr;
  if (pv.qrs) out.qrsMs = pv.qrs;
  if (pv.qt) out.qtMs = pv.qt;
  if (pv.qtc) out.qtcMs = pv.qtc;
  // QTc por Bazett si hay QT y FC pero no QTc
  if (!out.qtcMs && out.qtMs && out.heartRate && out.heartRate > 20) {
    const rr = 60 / out.heartRate;
    out.qtcMs = Math.round(out.qtMs / Math.sqrt(rr));
  }
  return out;
}

export function compareReadings(a: EcgReading, b: EcgReading | null): string[] {
  if (!b) return [];
  const d: string[] = [];
  const ra = rhythmKey(a.rhythm);
  const rb = rhythmKey(b.rhythm);
  if (ra && rb && ra !== rb) d.push(`Ritmo: lectura 1 "${a.rhythm}" · lectura 2 "${b.rhythm}"`);
  if (a.heartRate && b.heartRate && Math.abs(a.heartRate - b.heartRate) > Math.max(10, a.heartRate * 0.15)) d.push(`Frecuencia: ${a.heartRate} vs ${b.heartRate} lpm`);
  const sa = (a.stElevationLeads || []).length > 0;
  const sb = (b.stElevationLeads || []).length > 0;
  if (sa !== sb) d.push(`Elevación del ST: ${sa ? (a.stElevationLeads || []).join(', ') : 'no'} vs ${sb ? (b.stElevationLeads || []).join(', ') : 'no'}`);
  if (Boolean(a.criticalAlert) !== Boolean(b.criticalAlert)) d.push(`Alerta crítica: "${a.criticalAlert || 'ninguna'}" vs "${b.criticalAlert || 'ninguna'}"`);
  if (a.qtcMs && b.qtcMs && Math.abs(a.qtcMs - b.qtcMs) > 40) d.push(`QTc: ${a.qtcMs} vs ${b.qtcMs} ms`);
  return d;
}

/** Alertas calculadas por el programa (independientes de la IA). */
export function computeAlerts(r: EcgReading): string[] {
  const out: string[] = [];
  if (r.criticalAlert) out.push(r.criticalAlert);
  if ((r.stElevationLeads || []).length >= 2) out.push(`Elevación del ST en ${(r.stElevationLeads || []).join(', ')}: descartar IAMCEST de inmediato.`);
  if (r.heartRate && r.heartRate < 40) out.push(`Bradicardia extrema (${r.heartRate} lpm).`);
  if (r.heartRate && r.heartRate > 150) out.push(`Taquicardia > 150 lpm (${r.heartRate} lpm).`);
  if (r.qtcMs && r.qtcMs >= 500) out.push(`QTc prolongado (${r.qtcMs} ms): riesgo de arritmia ventricular.`);
  const rk = rhythmKey(r.rhythm);
  if (rk === 'TV' || rk === 'FV') out.push(`Ritmo ${r.rhythm}: emergencia.`);
  if (/BLOQUEO AV (COMPLETO|DE TERCER|3)|TERCER GRADO/.test(fold(r.conduction))) out.push('Bloqueo AV completo.');
  return Array.from(new Set(out));
}

/** Informe formal propuesto (el médico lo revisa y edita antes de guardar). */
export function buildEcgReport(r: EcgReading): string {
  const up = (s?: string | null) => String(s || '').trim().toUpperCase().replace(/\.+$/, '');
  const parts: string[] = [];
  const main: string[] = [];
  if (r.rhythm) main.push(`RITMO ${up(r.rhythm)}${r.regular === false ? ' IRREGULAR' : r.regular === true ? ' REGULAR' : ''}`);
  if (r.heartRate) main.push(`FC ${r.heartRate} LPM`);
  if (r.axis) main.push(`EJE ${up(r.axis)}`);
  if (r.prMs) main.push(`PR ${r.prMs} MS`);
  if (r.qrsMs) main.push(`QRS ${r.qrsMs} MS`);
  if (r.qtMs) main.push(`QT ${r.qtMs} MS`);
  if (r.qtcMs) main.push(`QTC ${r.qtcMs} MS`);
  if (main.length) parts.push(main.join(', '));
  if (r.pWaves) parts.push(`ONDAS P: ${up(r.pWaves)}`);
  if (r.conduction) parts.push(`CONDUCCIÓN: ${up(r.conduction)}`);
  if ((r.stElevationLeads || []).length) parts.push(`ELEVACIÓN DEL ST EN ${(r.stElevationLeads || []).map(up).join(', ')}`);
  if ((r.stDepressionLeads || []).length) parts.push(`DESCENSO DEL ST EN ${(r.stDepressionLeads || []).map(up).join(', ')}`);
  if (r.stSegment && !(r.stElevationLeads || []).length && !(r.stDepressionLeads || []).length) parts.push(`SEGMENTO ST: ${up(r.stSegment)}`);
  if (r.tWaves) parts.push(`ONDAS T: ${up(r.tWaves)}`);
  if ((r.pathologicQ || []).length) parts.push(`ONDAS Q PATOLÓGICAS EN ${(r.pathologicQ || []).map(up).join(', ')}`);
  if (r.hypertrophy) parts.push(`${up(r.hypertrophy)}`);
  let report = parts.length ? `${parts.join('. ')}.` : '';
  const concl = (r.conclusions || []).map(up).filter(Boolean);
  if (concl.length) report += `${report ? ' ' : ''}CONCLUSIÓN: ${concl.join('; ')}.`;
  if (r.limitations) report += ` LIMITACIONES DEL TRAZADO: ${up(r.limitations)}.`;
  return report.trim();
}

/** Copia más liviana del trazado para guardar en el expediente. */
async function shrinkDataUrl(src: string, maxSide: number, quality: number): Promise<string> {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = src;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', quality);
  } catch {
    return src;
  }
}

async function analyze(data: string, mime: string, ctx: string): Promise<EcgReading> {
  const res = await geminiService.generateContent({
    contents: [{ parts: [{ text: PROMPT(ctx) }, { inlineData: { mimeType: mime, data } }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 4000, responseMimeType: 'application/json' }
  } as any);
  if (!res.success || !res.text) throw new Error(res.error || 'La IA no respondió');
  return toReading(parseJson(res.text));
}

export async function readEcg(file: File, patient?: { age?: number; sex?: string }, onProgress?: (m: string) => void): Promise<EcgResult> {
  const warnings: string[] = [];
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  onProgress?.('Preparando el trazado…');
  let data: string;
  let mime: string;
  let preview = '';
  if (isPdf) {
    data = toBase64(await file.arrayBuffer());
    mime = 'application/pdf';
  } else {
    const img = await prepareImage(file);
    data = img.data;
    mime = img.mime;
    preview = img.preview ? await shrinkDataUrl(img.preview, 1600, 0.75) : '';
  }
  const ctx = [patient?.age ? `de un paciente de ${patient.age} años` : '', patient?.sex === 'F' ? 'sexo femenino' : patient?.sex === 'M' ? 'sexo masculino' : ''].filter(Boolean).join(', ');
  onProgress?.('Analizando el electrocardiograma (dos lecturas independientes)…');
  const [a, b] = await Promise.allSettled([analyze(data, mime, ctx), analyze(data, mime, ctx)]);
  if (a.status === 'rejected' && b.status === 'rejected') {
    throw new Error(`No se pudo analizar el ECG (${(a.reason && a.reason.message) || 'sin conexión o IA no disponible'}). No se generó ningún informe.`);
  }
  const first = consolidate(a.status === 'fulfilled' ? a.value : (b as PromiseFulfilledResult<EcgReading>).value);
  const second = a.status === 'fulfilled' && b.status === 'fulfilled' ? consolidate(b.value) : null;
  if (!second) warnings.push('Solo se completó una lectura: revise el trazado con especial cuidado.');
  if (first.quality && /mala/i.test(first.quality)) warnings.push('La IA considera que la calidad del trazado es mala: tome otra foto de frente, con buena luz y sin sombras.');
  if (first.confidence && /baja/i.test(first.confidence)) warnings.push('Confianza baja en la lectura.');
  const discrepancies = compareReadings(first, second);
  const alerts = computeAlerts(first);
  return { reading: first, second, discrepancies, alerts, report: buildEcgReport(first), preview, warnings };
}
