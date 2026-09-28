/// <reference types="vite/client" />
/**
 * Lectura de reportes de laboratorio desde fotos, PDF o texto — SIN inventar valores.
 *
 * - Archivos con texto (PDF digital, Word, .txt): se lee el texto del archivo y se interpreta
 *   con el lector determinista (no interviene la IA).
 * - Fotos y PDF escaneados: la IA solo TRANSCRIBE. Se hacen dos lecturas independientes
 *   (tabla y renglones) y el programa compara cada valor:
 *     · si ambas lecturas coinciden -> "verificado por doble lectura"
 *     · si no coinciden o solo una lo vio -> se marca para revisar y NO se preselecciona
 * - Si la IA no responde, se avisa. Nunca se rellenan valores de ejemplo.
 */
import { geminiService } from '../ai/geminiService';
import { extractTextFromClinicalFile } from '../clinicalImport/fileText';
import { parseLabText, ParsedLabValue } from './labReportParser';

export type LabReadStatus = 'archivo' | 'coincide' | 'difiere' | 'una_lectura' | 'ilegible' | 'revisar';

export interface LabReadItem extends ParsedLabValue {
  status: LabReadStatus;
  altValue?: string; // valor de la otra lectura cuando no coinciden
  preselect: boolean;
}

export interface LabReadResult {
  items: LabReadItem[];
  method: string;
  warnings: string[];
  readings: string[]; // textos transcritos (para mostrar al médico)
  previews: string[]; // miniaturas de las fotos (data URL)
}

const PROMPT_TABLE = `Eres transcriptor de un laboratorio clínico. Copia EXACTAMENTE los resultados de este reporte.
Escribe UNA línea por cada análisis con este formato:
NOMBRE DEL ANÁLISIS | RESULTADO | UNIDAD | VALORES DE REFERENCIA
Reglas obligatorias:
- Copia el nombre y el resultado tal como están impresos: mismos dígitos, mismos decimales, misma coma o punto.
- No calcules, no redondees, no conviertas unidades, no interpretes y no agregues análisis que no aparezcan.
- Si un resultado no se lee con total seguridad escribe ILEGIBLE en la columna RESULTADO.
- Si una columna no existe en el reporte déjala vacía.
- No escribas títulos, explicaciones ni comentarios: solo las líneas de resultados.`;

const PROMPT_LINES = `Lee este reporte de laboratorio y escribe cada resultado en su propia línea con el formato:
NOMBRE: RESULTADO UNIDAD
Copia cada número exactamente como está impreso (mismos dígitos y decimales). No calcules, no conviertas unidades,
no completes análisis que no aparezcan y no agregues comentarios. Si un número no se lee con seguridad escribe ILEGIBLE.`;

export function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Reduce la foto (celular: 12 MP) a un tamaño nítido para leer, en JPEG. */
export async function prepareImage(file: File): Promise<{ data: string; mime: string; preview: string }> {
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const maxSide = 2400;
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    const dataUrl = c.toDataURL('image/jpeg', 0.9);
    return { data: dataUrl.split(',')[1], mime: 'image/jpeg', preview: dataUrl };
  } catch {
    // HEIC en navegadores que no lo muestran: se envía tal cual (la IA sí lo lee)
    const data = toBase64(await file.arrayBuffer());
    return { data, mime: file.type || 'image/heic', preview: '' };
  }
}

async function aiTranscribe(prompt: string, data: string, mime: string): Promise<string> {
  const res = await geminiService.generateContent({
    contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: mime, data } }] }],
    generationConfig: { temperature: 0, maxOutputTokens: 8000 }
  } as any);
  if (!res.success || !res.text || !res.text.trim()) throw new Error(res.error || 'La IA no devolvió texto');
  return res.text.replace(/```[a-z]*\n?/gi, '').trim();
}

const same = (a: ParsedLabValue, b: ParsedLabValue) => {
  if (a.num !== undefined && b.num !== undefined) return a.num === b.num && a.value.replace(/[\d.]/g, '') === b.value.replace(/[\d.]/g, '');
  return a.value === b.value;
};

/** Compara dos lecturas independientes y marca cada valor. */
export function crossCheck(a: ParsedLabValue[], b: ParsedLabValue[] | null): LabReadItem[] {
  const out: LabReadItem[] = [];
  const bMap = new Map((b || []).map((x) => [x.key, x]));
  const used = new Set<string>();
  for (const x of a) {
    const y = bMap.get(x.key);
    used.add(x.key);
    let status: LabReadStatus;
    let altValue: string | undefined;
    if (x.illegible) status = 'ilegible';
    else if (!b) status = 'una_lectura';
    else if (!y) status = 'una_lectura';
    else if (y.illegible) {
      status = 'difiere';
      altValue = 'ILEGIBLE';
    } else if (same(x, y)) status = 'coincide';
    else {
      status = 'difiere';
      altValue = y.value;
    }
    if (status !== 'ilegible' && x.implausible) status = status === 'difiere' ? 'difiere' : 'revisar';
    out.push({ ...x, status, altValue, preselect: status === 'coincide' });
  }
  // Valores que solo vio la segunda lectura: se muestran para revisar, sin preseleccionar
  for (const y of b || []) {
    if (used.has(y.key)) continue;
    out.push({ ...y, status: y.illegible ? 'ilegible' : 'una_lectura', preselect: false });
  }
  return out;
}

export function readLabText(text: string, method = 'Texto pegado'): LabReadResult {
  const parsed = parseLabText(text);
  const items: LabReadItem[] = parsed.map((p) => ({
    ...p,
    status: p.illegible ? 'ilegible' : p.implausible ? 'revisar' : 'archivo',
    preselect: !p.illegible && !p.implausible
  }));
  const warnings: string[] = [];
  if (!items.length) warnings.push('No se reconoció ningún resultado en el texto. Revise que tenga el nombre del análisis y su valor (ej.: "Hemoglobina 11.2").');
  return { items, method, warnings, readings: [text], previews: [] };
}

const isImage = (f: File) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif|bmp|gif)$/i.test(f.name);
const isPdf = (f: File) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);

/**
 * Lee uno o varios archivos (varias fotos = varias páginas del mismo reporte).
 */
export async function readLabFiles(files: File[], onProgress?: (msg: string) => void): Promise<LabReadResult> {
  const warnings: string[] = [];
  const previews: string[] = [];
  const textParts: string[] = [];
  const aiA: string[] = [];
  const aiB: string[] = [];
  let aiUsed = false;
  let aiFailed = false;

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const label = files.length > 1 ? ` (${i + 1} de ${files.length})` : '';
    if (f.size > 25 * 1024 * 1024) {
      warnings.push(`${f.name}: supera 25 MB y no se leyó.`);
      continue;
    }
    let payload: { data: string; mime: string } | null = null;
    if (isImage(f)) {
      onProgress?.(`Preparando la foto${label}…`);
      const img = await prepareImage(f);
      if (img.preview) previews.push(img.preview);
      payload = { data: img.data, mime: img.mime };
    } else {
      onProgress?.(`Leyendo ${f.name}${label}…`);
      if (isPdf(f)) {
        // PDF digital: texto directo. PDF escaneado: se transcribe como foto.
        const r = await extractTextFromClinicalFile(f);
        if (r.method === 'PDF con texto' && r.text.replace(/\s/g, '').length >= 80) {
          textParts.push(r.text);
          continue;
        }
        payload = { data: toBase64(await f.arrayBuffer()), mime: 'application/pdf' };
      } else {
        const r = await extractTextFromClinicalFile(f);
        warnings.push(...r.warnings.map((w) => `${f.name}: ${w}`));
        if (r.text.trim()) textParts.push(r.text);
        continue;
      }
    }
    if (payload) {
      aiUsed = true;
      onProgress?.(`Transcribiendo${label}: doble lectura para comparar cada valor…`);
      const [a, b] = await Promise.allSettled([aiTranscribe(PROMPT_TABLE, payload.data, payload.mime), aiTranscribe(PROMPT_LINES, payload.data, payload.mime)]);
      if (a.status === 'fulfilled') aiA.push(a.value);
      if (b.status === 'fulfilled') aiB.push(b.value);
      if (a.status === 'rejected' && b.status === 'rejected') {
        aiFailed = true;
        const why = (a.reason && a.reason.message) || '';
        warnings.push(`${f.name}: no se pudo transcribir (${why || 'sin conexión o IA no disponible'}). No se llenó ningún valor.`);
      } else if (a.status === 'rejected' || b.status === 'rejected') {
        warnings.push(`${f.name}: solo se hizo una lectura; revise cada valor contra la foto.`);
      }
    }
  }

  const fromText = textParts.length ? parseLabText(textParts.join('\n')) : [];
  let items: LabReadItem[] = fromText.map((p) => ({
    ...p,
    status: p.illegible ? 'ilegible' : p.implausible ? 'revisar' : 'archivo',
    preselect: !p.illegible && !p.implausible
  }));

  if (aiA.length || aiB.length) {
    const A = parseLabText((aiA.length ? aiA : aiB).join('\n'));
    const B = aiA.length && aiB.length ? parseLabText(aiB.join('\n')) : null;
    const known = new Set(items.map((x) => x.key));
    items = items.concat(crossCheck(A, B).filter((x) => !known.has(x.key)));
  }

  const method = aiUsed ? (textParts.length ? 'Archivo + foto (IA, doble lectura)' : 'Foto (IA, doble lectura)') : 'Texto del archivo';
  if (!items.length && !aiFailed) warnings.push('No se reconoció ningún resultado. Revise que la foto sea nítida y muestre los valores, o pegue el texto.');
  if (items.some((x) => x.status === 'difiere')) warnings.push('Hay valores en los que las dos lecturas no coinciden: están en rojo y no se guardan hasta que usted los confirme.');
  return { items, method, warnings, readings: [...textParts, ...aiA, ...aiB], previews };
}

export const LAB_FILE_ACCEPT = 'image/*,.heic,.heif,.pdf,.docx,.doc,.txt,.rtf';
