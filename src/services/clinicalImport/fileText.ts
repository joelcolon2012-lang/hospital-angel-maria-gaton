/// <reference types="vite/client" />
/**
 * Lectura del TEXTO de archivos clínicos externos.
 * Formatos: Word (.docx y .doc antiguo), PDF (con texto o escaneado), texto
 * (.txt/.csv/.md en UTF-8 o Windows-1252), RTF, HTML y fotos (JPG/PNG/HEIC/WEBP).
 * - PDF con texto: se lee página por página con PDF.js (antes se perdía casi todo).
 * - PDF escaneado y fotos: transcripción con IA (Gemini, desde el servidor).
 * Nunca lanza error por un formato raro: devuelve el texto que pudo y avisos claros.
 */
import { geminiService } from '../ai/geminiService';

export interface ExtractedText {
  text: string;
  fileType: string;
  method: string;
  warnings: string[];
}

const MAX_BYTES = 25 * 1024 * 1024;

const OCR_PROMPT =
  'Eres transcriptor clínico hospitalario. Transcribe con fidelidad absoluta TODO el texto visible de este documento médico ' +
  '(nota de emergencia, historia clínica, evolución u orden). Conserva los títulos de cada acápite (NOMBRE, EDAD, SALA, MOTIVO DE CONSULTA, ' +
  'HISTORIA DE LA ENFERMEDAD ACTUAL, ANTECEDENTES, SIGNOS VITALES, EXAMEN FÍSICO, DIAGNÓSTICOS, PLAN) y los saltos de línea. ' +
  'No resumas, no corrijas y no inventes nada. Si una palabra es ilegible escribe [ILEGIBLE].';

function extOf(name: string): string {
  return (name.split('.').pop() || '').toLowerCase();
}

function decodeBest(buf: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^﻿/, '');
  } catch {
    try {
      return new TextDecoder('windows-1252').decode(buf);
    } catch {
      return new TextDecoder('iso-8859-1').decode(buf);
    }
  }
}

/** RTF -> texto (quita controles, respeta \par y los acentos \'e1 y \uNNNN). */
export function rtfToText(rtf: string): string {
  let s = rtf;
  // Quitar grupos de metadatos que no son texto
  s = s.replace(/\{\\\*[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, '');
  s = s.replace(/\{\\(?:fonttbl|colortbl|stylesheet|info|pict|header|footer)[\s\S]*?\}\s*\}/g, '');
  s = s.replace(/\\par[d]?\b ?/g, '\n').replace(/\\line\b ?/g, '\n').replace(/\\tab\b ?/g, ' ').replace(/\\cell\b ?/g, ' | ').replace(/\\row\b ?/g, '\n');
  s = s.replace(/\\'([0-9a-fA-F]{2})/g, (_m, h) => new TextDecoder('windows-1252').decode(new Uint8Array([parseInt(h, 16)])));
  s = s.replace(/\\u(-?\d+)\??/g, (_m, n) => String.fromCharCode((+n + 65536) % 65536));
  s = s.replace(/\\[a-zA-Z]+-?\d* ?/g, '').replace(/\\([{}\\])/g, '$1').replace(/[{}]/g, '');
  return s.replace(/\n{3,}/g, '\n\n').trim();
}

/** Word 97-2003 (.doc): recupera el texto legible del archivo binario. */
function docBinaryToText(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  const pick = (decoded: string) =>
    (decoded.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9°%.,;:()\/\-+ \r\n]{6,}/g) || [])
      .map((x) => x.trim())
      .filter((x) => /[A-Za-zÁÉÍÓÚÑáéíóúñ]{3,}/.test(x))
      .join('\n');
  const utf16 = pick(new TextDecoder('utf-16le').decode(bytes));
  const ansi = pick(new TextDecoder('windows-1252').decode(bytes));
  const best = utf16.length > ansi.length ? utf16 : ansi;
  return best.replace(/\r/g, '\n').replace(/\n{3,}/g, '\n\n');
}

async function readPdf(buf: ArrayBuffer): Promise<string> {
  const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf.mjs');
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    const worker: any = await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url');
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  }
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise;
  const pages: string[] = [];
  const max = Math.min(doc.numPages, 40);
  for (let p = 1; p <= max; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    // Reconstruir líneas por posición vertical
    const rows = new Map<number, Array<{ x: number; s: string }>>();
    for (const it of content.items as any[]) {
      if (!it || typeof it.str !== 'string') continue;
      const y = Math.round(it.transform[5] / 3) * 3;
      const x = it.transform[4];
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y)!.push({ x, s: it.str });
    }
    const lines = [...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, parts]) =>
        parts
          .sort((a, b) => a.x - b.x)
          .map((q) => q.s)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()
      )
      .filter(Boolean);
    pages.push(lines.join('\n'));
  }
  try {
    await doc.destroy();
  } catch {}
  return pages.join('\n\n');
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(bin);
}

/** Reduce fotos grandes antes de enviarlas a la IA (más rápido y sin límite de tamaño). */
async function shrinkImage(file: File): Promise<{ data: string; mime: string }> {
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const maxSide = 2000;
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    const dataUrl = c.toDataURL('image/jpeg', 0.85);
    return { data: dataUrl.split(',')[1], mime: 'image/jpeg' };
  } catch {
    return { data: toBase64(await file.arrayBuffer()), mime: file.type || 'image/jpeg' };
  }
}

async function transcribeWithAI(data: string, mime: string): Promise<string | null> {
  const res = await geminiService.generateContent({
    contents: [{ parts: [{ text: OCR_PROMPT }, { inlineData: { mimeType: mime, data } }] }] as any,
    generationConfig: { temperature: 0.1, maxOutputTokens: 8000 }
  } as any);
  if (res.success && res.text && res.text.trim().length > 20) return res.text;
  return null;
}

export async function extractTextFromClinicalFile(file: File): Promise<ExtractedText> {
  const warnings: string[] = [];
  const ext = extOf(file.name);
  const mime = (file.type || '').toLowerCase();
  if (file.size > MAX_BYTES) {
    return { text: '', fileType: ext, method: 'ninguno', warnings: ['El archivo supera 25 MB. Use una versión más liviana o copie y pegue el texto.'] };
  }
  const buf = await file.arrayBuffer();

  try {
    // Word moderno
    if (ext === 'docx' || mime.includes('officedocument.wordprocessingml')) {
      const mammoth: any = await import('mammoth');
      const r = await mammoth.extractRawText({ arrayBuffer: buf });
      return { text: r.value || '', fileType: 'docx', method: 'Word (.docx)', warnings };
    }
    // Word 97-2003
    if (ext === 'doc' || mime === 'application/msword') {
      // Algunos ".doc" son en realidad .docx o RTF renombrados
      const head = new Uint8Array(buf.slice(0, 5));
      if (head[0] === 0x50 && head[1] === 0x4b) {
        const mammoth: any = await import('mammoth');
        const r = await mammoth.extractRawText({ arrayBuffer: buf });
        return { text: r.value || '', fileType: 'docx', method: 'Word (.docx)', warnings };
      }
      const asText = decodeBest(buf);
      if (asText.startsWith('{\\rtf')) return { text: rtfToText(asText), fileType: 'rtf', method: 'RTF', warnings };
      warnings.push('Archivo Word antiguo (.doc): se recuperó el texto, pero conviene revisar cada acápite. Si puede, guárdelo como .docx.');
      return { text: docBinaryToText(buf), fileType: 'doc', method: 'Word 97-2003 (.doc)', warnings };
    }
    // PDF
    if (ext === 'pdf' || mime === 'application/pdf') {
      let text = '';
      try {
        text = await readPdf(buf);
      } catch (err) {
        warnings.push('No se pudo leer el texto del PDF directamente.');
      }
      if (text.replace(/\s/g, '').length >= 80) return { text, fileType: 'pdf', method: 'PDF con texto', warnings };
      // PDF escaneado: transcribir con IA
      if (buf.byteLength <= 15 * 1024 * 1024) {
        const ai = await transcribeWithAI(toBase64(buf), 'application/pdf').catch(() => null);
        if (ai) {
          warnings.push('PDF escaneado: el texto se transcribió con IA. Revise cada dato antes de guardar.');
          return { text: ai, fileType: 'pdf', method: 'PDF escaneado + IA', warnings };
        }
      }
      warnings.push('El PDF parece escaneado (imagen) y no se pudo transcribir. Pegue el texto o suba una foto nítida con conexión.');
      return { text, fileType: 'pdf', method: 'PDF', warnings };
    }
    // Fotos
    if (/^(jpe?g|png|webp|heic|heif|bmp|gif)$/.test(ext) || mime.startsWith('image/')) {
      const { data, mime: m } = await shrinkImage(file);
      const ai = await transcribeWithAI(data, m).catch(() => null);
      if (ai) {
        warnings.push('Foto transcrita con IA: revise cada dato antes de guardar.');
        return { text: ai, fileType: ext || 'img', method: 'Foto + IA', warnings };
      }
      warnings.push('No se pudo leer la foto (se necesita conexión y la IA activa). Pegue el texto de la nota.');
      return { text: '', fileType: ext || 'img', method: 'Foto', warnings };
    }
    const raw = decodeBest(buf);
    if (ext === 'rtf' || raw.startsWith('{\\rtf')) return { text: rtfToText(raw), fileType: 'rtf', method: 'RTF', warnings };
    if (ext === 'html' || ext === 'htm' || /^\s*<(!doctype|html)/i.test(raw)) {
      const doc = new DOMParser().parseFromString(raw.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|tr|li|h\d)>/gi, '\n'), 'text/html');
      return { text: doc.body?.textContent || '', fileType: 'html', method: 'HTML', warnings };
    }
    return { text: raw, fileType: ext || 'txt', method: 'Texto', warnings };
  } catch (err: any) {
    warnings.push(`No se pudo leer el archivo (${err?.message || 'formato no reconocido'}). Pegue el texto de la nota.`);
    return { text: '', fileType: ext, method: 'error', warnings };
  }
}

export const CLINICAL_FILE_ACCEPT =
  '.docx,.doc,.pdf,.txt,.rtf,.htm,.html,.csv,.md,.jpg,.jpeg,.png,.webp,.heic,.heif,image/*,application/pdf';
