/**
 * Lector inteligente de notas e historias clínicas
 * -------------------------------------------------
 * Recibe el TEXTO de cualquier nota (emergencia, recibimiento en sala, historia
 * clínica, evolución, nota de otro hospital…) y lo distribuye por acápites:
 * identificación (nombre, edad, sexo, cédula, expediente, sala/cama), motivo de
 * consulta, historia de la enfermedad actual, antecedentes, signos vitales,
 * examen físico, laboratorios, imágenes, diagnósticos y plan.
 *
 * Reglas:
 *  - NUNCA inventa: si un dato no está en el texto, queda vacío.
 *  - Tolera acentos o su ausencia, mayúsculas/minúsculas, títulos con o sin
 *    dos puntos, abreviaturas (MC, HEA, APP, EF, SV, DX…), viñetas y
 *    numeraciones, y el formato narrativo de las notas del hospital
 *    ("SE TRATA DE PACIENTE MASCULINO DE 68 AÑOS…").
 *  - Valida rangos fisiológicos: un valor imposible no se importa y se avisa.
 *  - Cada dato indica de dónde salió (acápite con título = ALTA, deducido del
 *    texto narrativo = MEDIA) para que el médico lo revise.
 */

export type Confidence = 'ALTA' | 'MEDIA';

export interface ParsedVitals {
  systolicBP?: number;
  diastolicBP?: number;
  heartRate?: number;
  respiratoryRate?: number;
  temperature?: number;
  oxygenSaturation?: number;
  bloodGlucose?: number;
  glasgowTotal?: number;
  weight?: number;
  height?: number;
}

export interface ParsedExam {
  general?: string;
  head?: string;
  eyes?: string;
  ears?: string;
  nose?: string;
  mouth?: string;
  neck?: string;
  thorax?: string;
  lungs?: string;
  heart?: string;
  abdominal?: string;
  genitals?: string;
  rectal?: string;
  skin?: string;
  upperExtremities?: string;
  lowerExtremities?: string;
  extremities?: string;
  neurological?: string;
  /** Texto completo del acápite de examen físico (por si no trae sub-apartados) */
  full?: string;
}

export interface ParsedNote {
  identification: {
    fullName?: string;
    age?: number;
    ageText?: string;
    sex?: 'M' | 'F';
    idDocument?: string;
    medicalRecordNumber?: string;
    location?: string;
    date?: string;
  };
  reasonForConsultation?: string;
  chiefComplaints: string[];
  currentIllness?: string;
  antecedents: {
    general?: string;
    pathological?: string;
    surgical?: string;
    allergic?: string;
    allergiesNegated?: boolean;
    allergyList: string[];
    medications?: string;
    toxic?: string;
    family?: string;
    obGyn?: string;
    transfusional?: string;
    traumatic?: string;
    hospitalizations?: string;
  };
  systemsReview?: string;
  vitals: ParsedVitals;
  physicalExam: ParsedExam;
  labs?: string;
  imaging?: string;
  diagnoses: string[];
  plan?: string;
  /** Origen de cada dato: 'ALTA' (acápite con título) o 'MEDIA' (deducido) */
  confidence: Record<string, Confidence>;
  /** Acápites reconocidos en el documento, en orden */
  sectionsFound: string[];
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Normalización (misma longitud que el original para poder recortar el texto real)
// ---------------------------------------------------------------------------
export function foldChar(ch: string): string {
  const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const up = base.toUpperCase();
  return up.length === 1 ? up : ch.toUpperCase().length === 1 ? ch.toUpperCase() : ch;
}

export function fold(text: string): string {
  let out = '';
  for (const ch of text) {
    const f = foldChar(ch);
    // Mantener 1 unidad UTF-16 por carácter del original
    out += ch.length === 1 && f.length === 1 ? f : ch;
  }
  return out;
}

export function cleanSourceText(raw: string): string {
  return String(raw || '')
    .replace(/\r\n?/g, '\n')
    .replace(/ /g, ' ')
    .replace(/[​‎‏﻿]/g, '')
    .replace(/\t+/g, ' ')
    .replace(/[ \f\v]+\n/g, '\n')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[‐‑‒–—]/g, '-')
    .replace(/\n{3,}/g, '\n\n');
}

const tidy = (s?: string): string | undefined => {
  if (!s) return undefined;
  const t = s
    .replace(/^[\s:.\-–,;]+/, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[\s,;:]+$/, '')
    .trim();
  return t.length ? t : undefined;
};

// ---------------------------------------------------------------------------
// Diccionario de acápites (sin acentos, en mayúsculas)
// ---------------------------------------------------------------------------
type SectionKey =
  | 'identification' | 'reason' | 'hea' | 'antecedents' | 'pathological' | 'surgical' | 'allergic'
  | 'medications' | 'toxic' | 'family' | 'obgyn' | 'transfusional' | 'traumatic' | 'hospitalizations'
  | 'systems' | 'vitals' | 'exam' | 'labs' | 'imaging' | 'diagnoses' | 'plan' | 'end' | 'noteTitle';

const SECTIONS: Array<{ key: SectionKey; titles: string[]; abbr?: string[] }> = [
  { key: 'noteTitle', titles: ['NOTA DE INGRESO EMERGENCIA', 'NOTA DE INGRESO A EMERGENCIA', 'NOTA DE INGRESO', 'NOTA DE RECIBIMIENTO EN SALA', 'NOTA DE TRASLADO A SALA', 'NOTA DE EVOLUCION', 'HISTORIA CLINICA DE PLANTA', 'HISTORIA CLINICA', 'ORDEN MEDICA'] },
  { key: 'identification', titles: ['DATOS DE IDENTIFICACION', 'FICHA DE IDENTIFICACION', 'DATOS GENERALES', 'DATOS DEL PACIENTE', 'IDENTIFICACION', 'FILIACION'] },
  { key: 'reason', titles: ['MOTIVOS DE CONSULTA', 'MOTIVO DE LA CONSULTA', 'MOTIVO DE CONSULTA', 'MOTIVO CONSULTA', 'MOTIVO DE INGRESO', 'CAUSA DE INGRESO', 'SINTOMA PRINCIPAL', 'QUEJA PRINCIPAL'], abbr: ['MC', 'M.C.', 'M/C'] },
  { key: 'hea', titles: ['HISTORIA DE LA ENFERMEDAD ACTUAL', 'HISTORIA DE ENFERMEDAD ACTUAL', 'HISTORIA DE LA ENFERMEDAD', 'HISTORIA DEL PADECIMIENTO ACTUAL', 'ENFERMEDAD ACTUAL', 'PADECIMIENTO ACTUAL', 'CUADRO CLINICO ACTUAL', 'RESUMEN CLINICO'], abbr: ['HEA', 'HDA', 'H.E.A.', 'H.D.A.', 'HPI'] },
  { key: 'pathological', titles: ['ANTECEDENTES PERSONALES PATOLOGICOS', 'ANTECEDENTES PATOLOGICOS PERSONALES', 'ANTECEDENTES PERSONALES PATOLOGICOS Y NO PATOLOGICOS', 'ANTECEDENTES PATOLOGICOS', 'ANTECEDENTES MORBIDOS', 'ANTECEDENTES MEDICOS', 'PATOLOGICOS', 'MORBIDOS'], abbr: ['APP', 'A.P.P.'] },
  { key: 'surgical', titles: ['ANTECEDENTES QUIRURGICOS', 'CIRUGIAS PREVIAS', 'QUIRURGICOS'], abbr: ['AQX', 'APQ', 'A.Q.'] },
  { key: 'allergic', titles: ['ANTECEDENTES ALERGICOS', 'ALERGIAS CONOCIDAS', 'ALERGICOS', 'ALERGIAS', 'ALERGIA'] },
  { key: 'medications', titles: ['MEDICAMENTOS DE USO HABITUAL', 'MEDICAMENTOS HABITUALES', 'MEDICACION HABITUAL', 'TRATAMIENTO HABITUAL', 'MEDICACION ACTUAL', 'MEDICAMENTOS ACTUALES', 'MEDICAMENTOS', 'FARMACOS'] },
  { key: 'toxic', titles: ['HABITOS TOXICOS', 'ANTECEDENTES TOXICOS', 'ANTECEDENTES NO PATOLOGICOS', 'HABITOS', 'TOXICOS'] },
  { key: 'family', titles: ['ANTECEDENTES HEREDOFAMILIARES', 'ANTECEDENTES HEREDO-FAMILIARES', 'ANTECEDENTES FAMILIARES', 'HEREDOFAMILIARES', 'FAMILIARES'], abbr: ['AHF'] },
  { key: 'obgyn', titles: ['ANTECEDENTES GINECO-OBSTETRICOS', 'ANTECEDENTES GINECOOBSTETRICOS', 'ANTECEDENTES GINECO OBSTETRICOS', 'ANTECEDENTES GINECOLOGICOS', 'GINECO-OBSTETRICOS', 'GINECOOBSTETRICOS', 'GINECO OBSTETRICOS', 'GINECOLOGICOS'], abbr: ['AGO', 'A.G.O.'] },
  { key: 'transfusional', titles: ['ANTECEDENTES TRANSFUSIONALES', 'TRANSFUSIONALES', 'TRANSFUSIONES'] },
  { key: 'traumatic', titles: ['ANTECEDENTES TRAUMATICOS', 'TRAUMATICOS', 'TRAUMATISMOS'] },
  { key: 'hospitalizations', titles: ['HOSPITALIZACIONES PREVIAS', 'HOSPITALIZACIONES'] },
  { key: 'antecedents', titles: ['ANTECEDENTES PERSONALES', 'ANTECEDENTES'] },
  { key: 'systems', titles: ['REVISION POR APARATOS Y SISTEMAS', 'INTERROGATORIO POR APARATOS Y SISTEMAS', 'REVISION POR SISTEMAS', 'REVISION DE SISTEMAS', 'REVISION DE APARATOS Y SISTEMAS'], abbr: ['RXS', 'RPS', 'RAS'] },
  { key: 'vitals', titles: ['SIGNOS VITALES', 'CONSTANTES VITALES', 'TOMA DE SIGNOS VITALES'], abbr: ['SV', 'S.V.', 'SSVV'] },
  { key: 'exam', titles: ['EN CUANTO AL EXAMEN FISICO', 'AL EXAMEN FISICO', 'EXAMEN FISICO DE INGRESO', 'EXAMEN FISICO GENERAL', 'EXAMEN FISICO', 'EXPLORACION FISICA', 'EXAMEN FISICO:'], abbr: ['EF', 'E.F.', 'EXF'] },
  { key: 'labs', titles: ['ESTUDIOS DE LABORATORIO', 'RESULTADOS DE LABORATORIO', 'LABORATORIOS', 'LABORATORIO', 'ANALITICAS', 'PARACLINICOS', 'PARACLINICA'], abbr: ['LABS'] },
  { key: 'imaging', titles: ['ESTUDIOS DE IMAGEN', 'ESTUDIOS DE IMAGENES', 'ESTUDIOS COMPLEMENTARIOS', 'IMAGENOLOGIA', 'IMAGENES', 'RADIOLOGIA'] },
  { key: 'diagnoses', titles: ['IMPRESIONES DIAGNOSTICAS', 'IMPRESION DIAGNOSTICA', 'DIAGNOSTICOS DE INGRESO', 'DIAGNOSTICO DE INGRESO', 'DIAGNOSTICOS PRESUNTIVOS', 'DIAGNOSTICO PRESUNTIVO', 'DIAGNOSTICOS DIFERENCIALES', 'SIGUIENTES DIAGNOSTICOS', 'DIAGNOSTICOS DE', 'DIAGNOSTICOS', 'DIAGNOSTICO', 'IMPRESION CLINICA'], abbr: ['IDX', 'DX'] },
  { key: 'plan', titles: ['EN CUANTO AL MANEJO', 'PLAN DIAGNOSTICO Y TERAPEUTICO', 'PLAN DE MANEJO', 'PLAN DE TRATAMIENTO', 'PLAN TERAPEUTICO', 'PLAN DE ACCION', 'PLAN', 'CONDUCTA A SEGUIR', 'CONDUCTA', 'MANEJO', 'TRATAMIENTO', 'INDICACIONES MEDICAS', 'INDICACIONES', 'ORDENES MEDICAS'] },
  { key: 'end', titles: ['FIRMA Y SELLO', 'FIRMA DEL MEDICO', 'MEDICO TRATANTE', 'ATENTAMENTE', 'ELABORADO POR'] }
];

// Acápites que pueden aparecer en medio de una oración (sólo si van seguidos de ":")
const INLINE_OK = new Set<SectionKey>(['exam', 'diagnoses', 'plan', 'vitals', 'reason', 'hea']);

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');

interface HeaderHit {
  key: SectionKey;
  start: number; // inicio de la línea del título (incluye viñeta o numeración)
  bodyStart: number; // inicio del contenido
}

function findHeaders(folded: string): HeaderHit[] {
  const hits: HeaderHit[] = [];
  const all: Array<{ key: SectionKey; title: string; abbr: boolean }> = [];
  for (const s of SECTIONS) {
    for (const t of s.titles) all.push({ key: s.key, title: t.replace(/:$/, ''), abbr: false });
    for (const a of s.abbr || []) all.push({ key: s.key, title: a, abbr: true });
  }
  all.sort((a, b) => b.title.length - a.title.length);
  const alt = all.map((x) => escapeRe(x.title).replace(/\\?-| /g, '[\\s\\-]+')).join('|');
  // Título al inicio de línea (con viñeta o número opcional) o después de un punto,
  // seguido de ":" "-" "." o fin de línea.
  const re = new RegExp(
    `(^|\\n|[.;]\\s+|\\s)((?:[\\-•*·▪►>]|\\d{1,2}[.)]|[IVX]{1,5}[.)\\-]|[A-H][.)])?\\s*)(${alt})(\\s*(?::|\\.-|-(?=\\s)|\\n|$))`,
    'g'
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(folded))) {
    const lead = m[1];
    const title = m[3];
    const delim = m[4];
    const titleNorm = title.replace(/[\s\-]+/g, ' ').trim();
    const def = all.find((x) => x.title.replace(/[\s\-]+/g, ' ') === titleNorm);
    if (!def) continue;
    const start = m.index + lead.length;
    const atLineStart = lead === '' || lead.includes('\n');
    const afterSentence = /[.;]/.test(lead);
    const hasColon = /:|\.-/.test(delim);
    const lineEnd = delim.includes('\n') || m.index + m[0].length >= folded.length;
    let accept = false;
    if (def.abbr) {
      accept = hasColon && (atLineStart || afterSentence);
    } else if (atLineStart) {
      // Al inicio de línea: con ":" o si el título ocupa la línea entera
      accept = hasColon || lineEnd || /-/.test(delim);
    } else if (afterSentence) {
      accept = hasColon;
    } else {
      accept = hasColon && INLINE_OK.has(def.key);
    }
    if (!accept) continue;
    // Evitar falsos títulos: "SIN ANTECEDENTES:" dentro de frase ya se filtra; "PACIENTE:" no es título
    hits.push({ key: def.key, start, bodyStart: m.index + m[0].length });
    re.lastIndex = m.index + m[0].length;
  }
  return hits.sort((a, b) => a.start - b.start);
}

// ---------------------------------------------------------------------------
// Utilidades de extracción
// ---------------------------------------------------------------------------
function titleCaseName(s: string): string {
  const small = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'da', 'dos', 'van', 'von']);
  return s
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => (i > 0 && small.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

function firstMatch(folded: string, original: string, re: RegExp): { value: string; index: number } | null {
  let rx: RegExp;
  try {
    rx = new RegExp(re.source, re.flags.replace(/[gd]/g, '') + 'd');
  } catch {
    rx = new RegExp(re.source, re.flags.replace(/g/g, ''));
  }
  const m: any = rx.exec(folded);
  if (!m) return null;
  const g = m[1] !== undefined ? 1 : 0;
  const offset = m.indices ? m.indices[g][0] : m.index + m[0].indexOf(m[g]);
  return { value: original.substr(offset, m[g].length), index: offset };
}

function splitList(text: string): string[] {
  let t = text.replace(/\r/g, '');
  const lines = t.split('\n').map((l) => l.trim()).filter(Boolean);
  let items: string[];
  if (lines.length > 1) {
    items = lines;
  } else {
    const one = lines[0] || '';
    // "1. X 2. Y 3. Z" o "1) X, 2) Y"
    const numbered = one.split(/(?:^|\s)(?=\d{1,2}\s*[.)-]\s+\S)/).map((s) => s.trim()).filter(Boolean);
    if (numbered.length > 1) items = numbered;
    else if (/;/.test(one)) items = one.split(';');
    else items = [one];
  }
  return items
    .map((l) => l.replace(/^\s*(?:[\-•*·▪►>]+|\(?\d{1,2}\s*[.)\-]|[a-z]\))\s*/i, '').trim())
    .map((l) => l.replace(/[.;,]+$/, '').trim())
    .filter((l) => l.length >= 3 && !/^(DR|DRA)\.?\s/i.test(l) && !/^(FIRMA|SELLO|EXEQ)/i.test(fold(l)));
}

/** Quita frases de enlace que quedan al final de un acápite ("…POR LO QUE SE DEJA CON") */
function trimConnectors(body: string): string {
  const f = fold(body);
  const m = /(?:[.,;]\s*|\s)(?:POR\s+LO\s+QUE|LA\s+MISMA\s+CUENTA\s+CON|CON\s+LOS\s+SIGUIENTES|SE\s+DEJA\s+CON|QUEDANDO\s+CON)[^.]*$/.exec(f.trimEnd());
  let out = m ? body.slice(0, m.index + 1) : body;
  // Firma del médico al final del documento
  out = out.replace(/\n\s*(?:DR|DRA)\.?\s+[^\n]*(?:\n[^\n]*)?$/i, '').replace(/\n\s*(?:EXEQ|FIRMA|SELLO)[^\n]*$/i, '');
  return out;
}

/** "6 HORAS DE EVOLUCIÓN CARACTERIZADO POR DISNEA…" -> "DISNEA…" */
function stripEvolution(s: string): string {
  const f = fold(s);
  const m = /^(?:UN\s+|UNA\s+)?(?:CUADRO\s+(?:CLINICO\s+)?(?:DE\s+)?)?(?:\d+|UN|UNA|DOS|TRES|VARIOS|VARIAS)\s+(?:HORAS?|DIAS?|SEMANAS?|MESES|MES|ANOS?)\s+DE\s+EVOLUCION\s*,?\s*(?:CARACTERIZAD[OA]\s+POR\s+|CONSISTENTE\s+EN\s+|DADO\s+POR\s+)?/.exec(f);
  return m ? s.slice(m[0].length) : s;
}

// ---------------------------------------------------------------------------
// Signos vitales
// ---------------------------------------------------------------------------
function num(s?: string): number | undefined {
  if (!s) return undefined;
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

function parseVitals(folded: string, warnings: string[]): ParsedVitals {
  const v: ParsedVitals = {};
  const NB = '(?<![A-Z0-9])';
  const get = (re: RegExp) => re.exec(folded);

  const bp = get(new RegExp(`${NB}(?:T\\s*\\/\\s*A|TA|P\\s*\\/\\s*A|PA|PRESION\\s+ARTERIAL|PRESION|TENSION\\s+ARTERIAL)\\s*[:=]?\\s*(\\d{2,3})\\s*[\\/\\\\]\\s*(\\d{2,3})`));
  if (bp) {
    const s = +bp[1];
    const d = +bp[2];
    if (s >= 50 && s <= 300 && d >= 20 && d <= 200 && s > d) {
      v.systolicBP = s;
      v.diastolicBP = d;
    } else warnings.push(`Presión arterial ${s}/${d} fuera de rango: no se importó.`);
  }
  const range = (label: string, re: RegExp, min: number, max: number, key: keyof ParsedVitals) => {
    const m = get(re);
    if (!m) return;
    const n = num(m[1]);
    if (n === undefined) return;
    if (n >= min && n <= max) (v as any)[key] = n;
    else warnings.push(`${label} ${m[1]} fuera de rango: no se importó.`);
  };
  range('Frecuencia cardíaca', new RegExp(`${NB}(?:FC|F\\.C\\.|FRECUENCIA\\s+CARDIACA|PULSO)\\s*[:=]?\\s*(\\d{2,3})`), 20, 250, 'heartRate');
  range('Frecuencia respiratoria', new RegExp(`${NB}(?:FR|F\\.R\\.|FRECUENCIA\\s+RESPIRATORIA)\\s*[:=]?\\s*(\\d{1,2})`), 4, 70, 'respiratoryRate');
  range('Temperatura', new RegExp(`${NB}(?:T°|TEMP(?:ERATURA)?(?:\\s+AXILAR)?|T\\.?\\s*AX(?:ILAR)?)\\s*[:=]?\\s*(\\d{2}(?:[.,]\\d{1,2})?)`), 30, 44, 'temperature');
  if (v.temperature === undefined) {
    const t = get(new RegExp(`${NB}T(?:\\s*[:=]\\s*|\\s+)(3\\d[.,]\\d|4[0-3][.,]\\d|3\\d(?=\\s*°))`));
    if (t) v.temperature = num(t[1]);
  }
  range('Saturación de oxígeno', new RegExp(`${NB}(?:SATURACION(?:\\s+DE)?(?:\\s+O2|\\s+OXIGENO)?|SAT(?:\\s*O2)?|SPO2|SATO2|SO2)\\s*[:=]?\\s*(\\d{2,3})\\s*%?`), 40, 100, 'oxygenSaturation');
  range('Glicemia', new RegExp(`${NB}(?:GLICEMIA|GLUCEMIA|GLUCOSA\\s+CAPILAR|GLUCOMETRIA|HGT|DEXTROSTIX)(?:\\s+CAPILAR)?\\s*[:=]?\\s*(\\d{2,3})`), 10, 900, 'bloodGlucose');
  range('Glasgow', new RegExp(`GLASGOW(?:\\s+DE)?\\s*[:=]?\\s*(\\d{1,2})(?:\\s*\\/\\s*15)?`), 3, 15, 'glasgowTotal');
  range('Peso', new RegExp(`${NB}PESO\\s*[:=]?\\s*(\\d{1,3}(?:[.,]\\d)?)\\s*(?:KG|KILOS)?`), 1, 400, 'weight');
  const talla = get(new RegExp(`${NB}(?:TALLA|ESTATURA)\\s*[:=]?\\s*(\\d(?:[.,]\\d{1,2})|\\d{2,3})\\s*(M|CM|MTS?)?`));
  if (talla) {
    let h = num(talla[1]);
    if (h !== undefined) {
      if (h < 3) h = Math.round(h * 100);
      if (h >= 30 && h <= 250) v.height = h;
    }
  }
  return v;
}

// ---------------------------------------------------------------------------
// Examen físico por sistemas
// ---------------------------------------------------------------------------
const EXAM_PARTS: Array<{ key: keyof ParsedExam; titles: string[] }> = [
  { key: 'general', titles: ['ASPECTO GENERAL', 'ESTADO GENERAL', 'CONDICIONES GENERALES', 'GENERAL', 'HABITUS EXTERIOR'] },
  { key: 'skin', titles: ['PIEL Y FANERAS', 'PIEL Y ANEXOS', 'PIEL Y MUCOSAS', 'TEGUMENTOS', 'PIEL'] },
  { key: 'head', titles: ['CABEZA Y CUELLO', 'CABEZA', 'CRANEO', 'CARA'] },
  { key: 'eyes', titles: ['OJOS', 'PUPILAS'] },
  { key: 'ears', titles: ['OIDOS', 'ORL'] },
  { key: 'nose', titles: ['NARIZ', 'FOSAS NASALES'] },
  { key: 'mouth', titles: ['BOCA', 'CAVIDAD ORAL', 'OROFARINGE'] },
  { key: 'neck', titles: ['CUELLO'] },
  { key: 'thorax', titles: ['TORAX', 'TORAX ANTERIOR'] },
  { key: 'lungs', titles: ['CAMPOS PULMONARES', 'APARATO RESPIRATORIO', 'RESPIRATORIO', 'PULMONES', 'PULMONAR', 'CARDIOPULMONAR'] },
  { key: 'heart', titles: ['RUIDOS CARDIACOS', 'APARATO CARDIOVASCULAR', 'CARDIOVASCULAR', 'CORAZON', 'CARDIACO', 'PRECORDIO'] },
  { key: 'abdominal', titles: ['ABDOMEN', 'ABDOMINAL'] },
  { key: 'genitals', titles: ['GENITOURINARIO', 'GENITALES EXTERNOS', 'GENITALES'] },
  { key: 'rectal', titles: ['TACTO RECTAL'] },
  { key: 'upperExtremities', titles: ['EXTREMIDADES SUPERIORES', 'MIEMBROS SUPERIORES', 'MMSS'] },
  { key: 'lowerExtremities', titles: ['EXTREMIDADES INFERIORES', 'MIEMBROS INFERIORES', 'MMII'] },
  { key: 'extremities', titles: ['EXTREMIDADES', 'MIEMBROS'] },
  { key: 'neurological', titles: ['EXAMEN NEUROLOGICO', 'NEUROLOGICO', 'NEUROLOGICA', 'NEURO', 'SNC', 'ESTADO MENTAL'] }
];

function parseExam(text: string): ParsedExam {
  const out: ParsedExam = { full: tidy(text) };
  const folded = fold(text);
  const all: Array<{ key: keyof ParsedExam; title: string }> = [];
  for (const p of EXAM_PARTS) for (const t of p.titles) all.push({ key: p.key, title: t });
  all.sort((a, b) => b.title.length - a.title.length);
  const alt = all.map((x) => escapeRe(x.title).replace(/ /g, '\\s+')).join('|');
  const re = new RegExp(`(^|\\n|[.;,]\\s*|\\s)(?:[\\-•*]\\s*)?(${alt})\\s*(?::|\\.-|-\\s)`, 'g');
  const hits: Array<{ key: keyof ParsedExam; start: number; body: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(folded))) {
    const title = m[2].replace(/\s+/g, ' ');
    const def = all.find((x) => x.title === title);
    if (!def) continue;
    hits.push({ key: def.key, start: m.index + m[1].length, body: m.index + m[0].length });
  }
  for (let i = 0; i < hits.length; i++) {
    const h = hits[i];
    const end = i + 1 < hits.length ? hits[i + 1].start : text.length;
    const val = tidy(text.slice(h.body, end));
    if (val && !(out as any)[h.key]) (out as any)[h.key] = val;
  }
  // Texto antes del primer sub-apartado = estado general (si no hay uno explícito)
  if (hits.length && !out.general) {
    const pre = tidy(text.slice(0, hits[0].start));
    if (pre && pre.length > 3) out.general = pre;
  }
  if (!hits.length && out.full) out.general = out.full;
  return out;
}

// ---------------------------------------------------------------------------
// Lectura principal
// ---------------------------------------------------------------------------
export function parseClinicalNote(rawText: string): ParsedNote {
  const text = cleanSourceText(rawText);
  const folded = fold(text);
  // Texto "corrido": une los renglones partidos por el ancho de página (PDF, Word con ajuste),
  // cambiando el salto por un espacio (misma longitud, así las posiciones siguen alineadas).
  const flow = text.replace(/([^\n.:;])\n(?![ \t]*\n)(?![ \t]*(?:\d{1,2}[.)\-]\s|[-•*·]\s|[A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ .\/]{1,45}:))/g, '$1 ');
  const flowFolded = fold(flow);
  const warnings: string[] = [];
  const confidence: Record<string, Confidence> = {};
  const note: ParsedNote = {
    identification: {},
    chiefComplaints: [],
    antecedents: { allergyList: [] },
    vitals: {},
    physicalExam: {},
    diagnoses: [],
    confidence,
    sectionsFound: [],
    warnings
  };

  if (text.replace(/\s/g, '').length < 20) {
    warnings.push('El archivo no contiene texto legible. Si es un PDF escaneado o una foto, use la opción de foto con IA o pegue el texto.');
    return note;
  }

  // 1) Cortar por acápites
  const hits = findHeaders(folded);
  const sections: Partial<Record<SectionKey, string>> = {};
  for (let i = 0; i < hits.length; i++) {
    const h = hits[i];
    const end = i + 1 < hits.length ? hits[i + 1].start : text.length;
    const body = trimConnectors(text.slice(h.bodyStart, end));
    if (h.key === 'end') continue;
    if (h.key === 'noteTitle') {
      // El texto bajo el título de la nota (NOMBRE, EDAD…) se trata como identificación
      sections.identification = `${sections.identification || ''}\n${body}`;
      continue;
    }
    // Si el mismo acápite aparece dos veces, se unen
    sections[h.key] = sections[h.key] ? `${sections[h.key]}\n${body}` : body;
    if (!note.sectionsFound.includes(h.key)) note.sectionsFound.push(h.key);
  }
  // El bloque antes del primer acápite suele ser la identificación (y la narrativa en notas cortas)
  const preamble = text.slice(0, hits.length ? hits[0].start : Math.min(text.length, 600));
  const sec = (k: SectionKey) => tidy(sections[k]);
  const set = <K extends string>(path: K, value: any, conf: Confidence) => {
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length)) return;
    confidence[path] = conf;
    return value;
  };

  // 2) Identificación: se busca en el encabezado / acápite de identificación y, si no, en todo el texto
  const idZoneText = [preamble, sections.identification || ''].join('\n');
  const zones = [idZoneText, text];
  const findIn = (re: RegExp): { value: string; zone: number } | null => {
    for (let z = 0; z < zones.length; z++) {
      const r = firstMatch(fold(zones[z]), zones[z], new RegExp(re.source, re.flags.replace('g', '')));
      if (r) return { value: r.value, zone: z };
    }
    return null;
  };

  const STOP = '(?=\\s*(?:[.,;|\\n]|\\bEDAD\\b|\\bSEXO\\b|\\bCEDULA\\b|\\bC\\.I\\.|\\bEXP(?:EDIENTE)?\\b|\\bRECORD\\b|\\bFECHA\\b|\\bSALA\\b|\\bCAMA\\b|\\bHAB(?:ITACION)?\\b|\\bNSS\\b|\\bEMERG(?:ENCIA)?\\b|\\bCUBICULO\\b|\\bAREA\\b|\\bNACIONALIDAD\\b|\\bDIRECCION\\b|\\d|$))';
  const name = findIn(new RegExp(`(?:NOMBRES?\\s+Y\\s+APELLIDOS|NOMBRE\\s+COMPLETO|NOMBRE\\s+DEL\\s+PACIENTE|NOMBRE|PACIENTE)\\s*[:\\-]\\s*([A-ZÑ][A-ZÑ'\\s]{3,80}?)${STOP}`));
  if (name) {
    const n = name.value.replace(/\s+/g, ' ').trim();
    const words = n.split(' ');
    const bad = /^(SE TRATA|MASCULINO|FEMENIN|DE \d|NO |SIN )/i.test(fold(n));
    if (words.length >= 2 && words.length <= 7 && !bad) {
      note.identification.fullName = set('identification.fullName', titleCaseName(n), 'ALTA');
    }
  }

  const ageExplicit = findIn(/\bEDAD\s*[:\-]?\s*(\d{1,3}\s*(?:ANOS|A\b|MESES|DIAS)?)/);
  const ageNarr = findIn(/\b(?:DE|CON)\s+(\d{1,3}\s*(?:ANOS|MESES|DIAS))\s+DE\s+EDAD/);
  const ageAny = ageExplicit || ageNarr || findIn(/\b(?:PACIENTE|MASCULINO|FEMENIN[OA])\s+(?:[A-Z]+\s+){0,2}DE\s+(\d{1,3}\s*ANOS)/);
  if (ageAny) {
    const raw = fold(ageAny.value);
    const n = parseInt(raw, 10);
    const unit = /MES/.test(raw) ? 'meses' : /DIA/.test(raw) ? 'días' : 'años';
    const years = unit === 'años' ? n : unit === 'meses' ? Math.floor(n / 12) : 0;
    if (Number.isFinite(n) && years >= 0 && years <= 120) {
      note.identification.age = set('identification.age', years, ageExplicit ? 'ALTA' : 'MEDIA');
      note.identification.ageText = unit === 'años' ? `${n} AÑOS` : `${n} ${unit.toUpperCase()}`;
    } else warnings.push(`Edad "${ageAny.value}" no válida: no se importó.`);
  }

  const sexExplicit = findIn(/\b(?:SEXO|GENERO)\s*[:\-]?\s*(MASCULINO|FEMENINO|FEMENINA|HOMBRE|MUJER|M|F)\b/);
  const sexNarr = findIn(/\bPACIENTE\s+(MASCULINO|FEMENINO|FEMENINA)\b/) || findIn(/\b(MASCULINO|FEMENINA|FEMENINO)\s+DE\s+\d{1,3}\s+ANOS/);
  const sx = sexExplicit || sexNarr;
  if (sx) {
    const s = fold(sx.value);
    note.identification.sex = set('identification.sex', s.startsWith('F') || s.startsWith('MUJ') ? 'F' : 'M', sexExplicit ? 'ALTA' : 'MEDIA');
  }

  const ced = findIn(/\b(?:CEDULA(?:\s+DE\s+IDENTIDAD)?|CED\.?|C\.I\.?|DNI|DOCUMENTO(?:\s+DE\s+IDENTIDAD)?)\s*(?:NO\.?|#)?\s*[:#\-]?\s*(\d{3}-?\d{7}-?\d|\d{11}|\d{6,12})/);
  if (ced) note.identification.idDocument = set('identification.idDocument', ced.value.trim(), 'ALTA');

  const exp = findIn(/\b(?:NO\.?\s*(?:DE\s+)?EXPEDIENTE|EXPEDIENTE|NO\.?\s*(?:DE\s+)?RECORD|RECORD|HISTORIA\s+CLINICA\s*(?:NO\.?|#)|H\.?C\.?\s*(?:NO\.?|#)|NSS)\s*[:#\-]\s*([A-Z0-9][A-Z0-9\-\/]{2,20})/);
  if (exp) note.identification.medicalRecordNumber = set('identification.medicalRecordNumber', exp.value.trim(), 'ALTA');

  // Sala / cama / cubículo (se prefiere lo más específico)
  const loc =
    findIn(/\b((?:SALA|CAMA|HABITACION|HAB\.)\s*(?:[:#]\s*[A-Z0-9][A-Z0-9\-\/]*|\d[A-Z0-9\-\/]*)(?:\s*,?\s*CAMA\s*[:#]?\s*[A-Z0-9\-]+)?)/) ||
    findIn(/\b((?:CUBICULO|CUB\.)\s*[:#\-]?\s*[A-Z0-9][A-Z0-9\-]*)/) ||
    findIn(/\b((?:AREA|SERVICIO|EMERG(?:ENCIA)?)\s*[:\-]\s*[A-Z0-9][A-Z0-9 \-\/]{1,30}?)(?=\s*(?:[,.;\n]|\bFECHA\b|\bHORA\b|$))/);
  if (loc) {
    const l = loc.value.replace(/\s*[:#]\s*/, ' ').replace(/\s+/g, ' ').trim();
    note.identification.location = set('identification.location', l.toUpperCase(), 'ALTA');
  }

  const date = findIn(/\bFECHA(?:\s+DE\s+INGRESO)?\s*[:\-]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/);
  if (date) note.identification.date = set('identification.date', date.value, 'ALTA');

  // 3) Motivo de consulta
  const reason = sec('reason');
  if (reason) {
    note.chiefComplaints = splitList(reason).slice(0, 10);
    const joined = note.chiefComplaints.length > 1 ? note.chiefComplaints.join(', ') : reason;
    note.reasonForConsultation = set('reasonForConsultation', joined, 'ALTA');
  } else {
    const r =
      firstMatch(flowFolded, flow, /\b(?:ACUDE|ACUDIENDO|CONSULTA|ES\s+TRAID[OA]|ES\s+LLEVAD[OA]|INGRESA|ASISTE|PROCEDENTE)\s+(?:[A-Z]+\s+){0,4}?POR\s+(?:PRESENTAR\s+|CUADRO\s+(?:CLINICO\s+)?(?:DE\s+|CARACTERIZADO\s+POR\s+)?)?([^.\n]{3,180})/) ||
      firstMatch(flowFolded, flow, /\bREFIERE\s+(?:CUADRO\s+(?:CLINICO\s+)?(?:DE\s+)?)?([^.\n]{3,160}?)(?=,\s*MOTIVO\s+POR\s+(?:EL|LOS|LO)\s+CUAL|\.|\n)/) ||
      firstMatch(flowFolded, flow, /\bCUADRO\s+(?:CLINICO\s+)?(?:COMPATIBLE\s+CON|CARACTERIZADO\s+POR|DE)\s*,?\s*([^.\n]{3,400}?)(?=,\s*(?:MOTIVO|ASOCIADO|AUNADO|POR\s+LO\s+QUE|QUE\s+MOTIVA)|\.|\n)/);
    if (r) {
      let v = tidy(stripEvolution(r.value));
      if (v && v.length > 180) v = v.slice(0, v.lastIndexOf(',', 180) > 40 ? v.lastIndexOf(',', 180) : 180).trim();
      if (v) {
        note.reasonForConsultation = set('reasonForConsultation', v, 'MEDIA');
        note.chiefComplaints = [v];
      }
    }
  }

  // 4) Historia de la enfermedad actual
  const hea = sec('hea');
  if (hea) note.currentIllness = set('currentIllness', hea, 'ALTA');
  else {
    const se = firstMatch(flowFolded, flow, /((?:SE\s+TRATA\s+DE|SE\s+RECIBE\s+(?:EN\s+SALA\s+)?|PACIENTE\s+(?:MASCULINO|FEMENIN[OA]))[\s\S]{20,3000}?)(?=\n\s*\n|\n[A-Z ]{6,}:|EN\s+CUANTO\s+AL\s+EXAMEN|EXAMEN\s+FISICO\s*:|SIGNOS\s+VITALES\s*:|ACTUALMENTE\s+PACIENTE|$)/);
    if (se) note.currentIllness = set('currentIllness', tidy(se.value), 'MEDIA');
  }

  // 5) Antecedentes
  const A = note.antecedents;
  const antGeneral = sec('antecedents');
  if (antGeneral) A.general = set('antecedents.general', antGeneral, 'ALTA');
  // Dentro de "ANTECEDENTES:" puede haber sub-apartados sin salto de línea
  const antZone = [sections.antecedents, sections.pathological, sections.surgical, sections.allergic, sections.toxic, sections.family]
    .filter(Boolean)
    .join('\n');
  A.pathological = set('antecedents.pathological', sec('pathological'), 'ALTA');
  A.surgical = set('antecedents.surgical', sec('surgical'), 'ALTA');
  A.allergic = set('antecedents.allergic', sec('allergic'), 'ALTA');
  A.medications = set('antecedents.medications', sec('medications'), 'ALTA');
  A.toxic = set('antecedents.toxic', sec('toxic'), 'ALTA');
  A.family = set('antecedents.family', sec('family'), 'ALTA');
  A.obGyn = set('antecedents.obGyn', sec('obgyn'), 'ALTA');
  A.transfusional = set('antecedents.transfusional', sec('transfusional'), 'ALTA');
  A.traumatic = set('antecedents.traumatic', sec('traumatic'), 'ALTA');
  A.hospitalizations = set('antecedents.hospitalizations', sec('hospitalizations'), 'ALTA');

  // Narrativa ("CON ANTECEDENTES MÓRBIDOS CONOCIDOS DE HTA, DM2..., ALERGIAS NEGADAS")
  const narrativeZone = [note.currentIllness || '', antGeneral || '', antZone].join('\n');
  const nz = fold(narrativeZone);
  const grab = (re: RegExp) => {
    const r = firstMatch(nz, narrativeZone, re);
    return r ? tidy(r.value) : undefined;
  };
  if (!A.pathological) {
    if (/\bSIN\s+ANTECEDENTES\s+(?:MORBIDOS|PATOLOGICOS)(?:\s+CONOCIDOS)?|ANTECEDENTES\s+(?:MORBIDOS|PATOLOGICOS)\s+NEGADOS/.test(nz)) {
      A.pathological = set('antecedents.pathological', 'NEGADOS', 'MEDIA');
    } else {
      const p = grab(/\bANTECEDENTES\s+(?:PERSONALES\s+)?(?:MORBIDOS|PATOLOGICOS|MEDICOS)(?:\s+CONOCIDOS)?\s+(?:DE\s+)?([\s\S]{3,400}?)(?=,\s*(?:ANTECEDENTES|HABITOS|ALERGIAS|SIN\s+ALERGIAS|NIEGA|QUIEN|REFIERE|ACUDE|PROCEDENTE|EN\s+TRATAMIENTO|TRATAD[OA]\s+CON)|\.\s|\.$|\n)/);
      if (p && !/^(Y\s|,)/.test(p)) A.pathological = set('antecedents.pathological', p, 'MEDIA');
    }
  }
  if (!A.surgical) {
    if (/\b(?:ANTECEDENTES\s+)?QUIRURGICOS\s+NEGADOS|NIEGA\s+(?:ANTECEDENTES\s+)?QUIRURGICOS|SIN\s+ANTECEDENTES\s+QUIRURGICOS/.test(nz)) A.surgical = set('antecedents.surgical', 'NEGADOS', 'MEDIA');
    else {
      const q = grab(/\bANTECEDENTES\s+QUIRURGICOS\s+(?:DE\s+|:\s*)?([\s\S]{3,200}?)(?=,\s*(?:ANTECEDENTES|HABITOS|ALERGIAS|NIEGA|QUIEN)|\.\s|\.$|\n)/);
      if (q) A.surgical = set('antecedents.surgical', q, 'MEDIA');
    }
  }
  if (!A.toxic) {
    if (/\bHABITOS\s+TOXICOS\s+NEGADOS|NIEGA\s+HABITOS\s+TOXICOS|SIN\s+HABITOS\s+TOXICOS/.test(nz)) A.toxic = set('antecedents.toxic', 'NEGADOS', 'MEDIA');
    else {
      const t = grab(/\bHABITOS\s+TOXICOS\s*(?::|DE)?\s*([\s\S]{3,160}?)(?=,\s*(?:ANTECEDENTES|ALERGIAS|NIEGA|QUIEN)|\.\s|\.$|\n)/);
      if (t) A.toxic = set('antecedents.toxic', t, 'MEDIA');
    }
  }
  // Alergias
  const allergyText = A.allergic || grab(/\bALERGI(?:AS|CO)S?\s+(?:A\s+|CONOCIDAS\s+A\s+|:\s*)([\s\S]{2,160}?)(?=,\s*(?:ANTECEDENTES|HABITOS|QUIEN|REFIERE|PROCEDENTE|ACUDE|MOTIVO|CON\s|EN\s+TRATAMIENTO)|\.\s|\.$|\n)/);
  const allergyNegated =
    /\b(?:ALERGIAS?\s+(?:MEDICAMENTOSAS\s+)?NEGADAS?|NIEGA\s+ALERGIAS|SIN\s+ALERGIAS|NO\s+REFIERE\s+ALERGIAS|NIEGA\s+ALERGIA|ALERGIAS?\s*:\s*(?:NEGADAS?|NINGUNA|NO\s+CONOCIDAS|NIEGA|NO)\b)/.test(fold([allergyText || '', narrativeZone, sections.allergic || ''].join(' ')));
  const textSaysNone = allergyText ? /^(NEGAD|NINGUN|NO\b|NIEGA)/.test(fold(allergyText)) : false;
  if (allergyText && !textSaysNone) {
    A.allergic = set('antecedents.allergic', allergyText, confidence['antecedents.allergic'] || 'MEDIA');
    A.allergyList = allergyText
      .split(/[,;\n]|\sY\s/i)
      .map((x) => x.replace(/^(A|AL|LA|LOS|LAS)\s+/i, '').trim())
      .filter((x) => x.length > 1 && !/^(NEGAD|NINGUN|NO\b|NIEGA)/.test(fold(x)))
      .slice(0, 12);
  } else if (allergyNegated || textSaysNone) {
    A.allergiesNegated = true;
    A.allergic = set('antecedents.allergic', 'NEGADAS', confidence['antecedents.allergic'] || 'MEDIA');
  }
  if (!A.medications) {
    const m = grab(/\b(?:EN\s+TRATAMIENTO\s+CON|TRATAMIENTO\s+HABITUAL\s+CON|MEDICADO\s+CON|USA|TOMA)\s+([\s\S]{3,250}?)(?=,\s*(?:ANTECEDENTES|HABITOS|ALERGIAS|NIEGA|QUIEN|REFIERE)|\.\s|\.$|\n)/);
    if (m) A.medications = set('antecedents.medications', m, 'MEDIA');
  }

  note.systemsReview = set('systemsReview', sec('systems'), 'ALTA');

  // 6) Signos vitales: primero en su acápite, luego en examen, luego en todo el texto
  const vitalZones = [sections.vitals, sections.exam, text].filter(Boolean) as string[];
  const vitWarn: string[] = [];
  for (const z of vitalZones) {
    const v = parseVitals(fold(z), vitWarn);
    for (const [k, val] of Object.entries(v)) {
      if ((note.vitals as any)[k] === undefined && val !== undefined) {
        (note.vitals as any)[k] = val;
        confidence[`vitals.${k}`] = z === sections.vitals ? 'ALTA' : 'MEDIA';
      }
    }
  }
  for (const w of vitWarn) if (!warnings.includes(w)) warnings.push(w);

  // 7) Examen físico
  let examText = sections.exam;
  if (!examText) {
    // Formato del hospital: "ACTUALMENTE PACIENTE ..., EN CUANTO AL EXAMEN FÍSICO: ..."
    const e = firstMatch(folded, text, /(?:EXAMEN\s+FISICO|EXPLORACION\s+FISICA)\s*[:\-]?\s*([\s\S]{10,4000}?)(?=\n\s*\n|POR\s+LO\s+QUE|LA\s+MISMA\s+CUENTA|CUENTA\s+CON\s+(?:LOS\s+)?(?:SIGUIENTES\s+)?DIAGNOSTICOS|DIAGNOSTICOS?\s*:|$)/);
    if (e) examText = e.value;
  }
  if (examText) {
    const ex = parseExam(examText);
    for (const [k, val] of Object.entries(ex)) {
      if (val) confidence[`physicalExam.${k}`] = sections.exam ? 'ALTA' : 'MEDIA';
    }
    note.physicalExam = ex;
  }

  if (!note.physicalExam.general) {
    const g = firstMatch(folded, text, /\b(?:ACTUALMENTE\s+PACIENTE|AL\s+MOMENTO\s+DEL\s+(?:RECIBIMIENTO|EXAMEN)\s+SE\s+ENCUENTRA|PACIENTE\s+SE\s+ENCUENTRA)\s+([^.\n]{3,220}?)(?=,\s*MANEJANDO|,\s*CON\s+SIGNOS|\.|\n)/);
    if (g) {
      const v = tidy(g.value);
      if (v) {
        note.physicalExam.general = v;
        confidence['physicalExam.general'] = 'MEDIA';
      }
    }
  }
  // Exámenes de laboratorio mencionados en la narrativa ("PARACLÍNICAS QUE REPORTAN: …")
  let labsText = sec('labs');
  if (!labsText) {
    const l = firstMatch(folded, text, /(?:PARACLINICAS|PARACLINICOS|ANALITICAS|LABORATORIOS)(?:\s+QUE\s+REPORTAN|\s+DISPONIBLES)[ \t]*:?[ \t]*([^\n]{3,600}?)(?=\.\s+(?:POR\s+LO\s+QUE|EN\s+CUANTO|LA\s+MISMA|POR\s+LO\s+CUAL)|\.\s*$|\n)/);
    if (l && !/^POR\s+LO\s+QUE/.test(fold(l.value))) {
      labsText = tidy(l.value);
      if (labsText) confidence['labs'] = 'MEDIA';
    }
  } else confidence['labs'] = 'ALTA';
  note.labs = labsText;
  // No dejar la narrativa de laboratorios dentro del examen físico
  for (const k of Object.keys(note.physicalExam) as Array<keyof ParsedExam>) {
    const val = note.physicalExam[k];
    if (!val) continue;
    const cut = /(?:\.\s*|\s)(?:S?EL\s+MISMO\s+LLEGA\s+CON|S?LA\s+MISMA\s+(?:CUENTA|LLEGA)\s+CON|CUENTA\s+CON\s+UNAS|LLEGA\s+CON\s+UNAS|CON\s+UNAS\s+(?:ULTIMAS\s+)?(?:PARACLINICAS|ANALITICAS)|PARACLINICAS\s+QUE\s+REPORTAN|ANALITICAS\s+QUE\s+REPORTAN|POR\s+LO\s+QUE\s+(?:SE\s+DEJA|LA\s+MISMA|EL\s+MISMO))/.exec(fold(val));
    if (cut) note.physicalExam[k] = tidy(val.slice(0, cut.index + 1));
  }
  note.imaging = set('imaging', sec('imaging'), 'ALTA');

  // 8) Diagnósticos
  let dxText = sections.diagnoses;
  if (!dxText) {
    const d = firstMatch(folded, text, /(?:DIAGNOSTICOS?\s+DE|SIGUIENTES\s+DIAGNOSTICOS|IMPRESION\s+DIAGNOSTICA)\s*[:\-]?\s*([\s\S]{3,1500}?)(?=\n\s*\n|EN\s+CUANTO\s+AL\s+MANEJO|PLAN\s*:|$)/);
    if (d) dxText = d.value;
  }
  if (dxText) {
    const raw = splitList(trimConnectors(dxText));
    const list: string[] = [];
    for (const d of raw) {
      // Un párrafo largo o una indicación ya no es un diagnóstico: termina la lista
      if (d.length > 160 || /^(PLAN|MANEJO|EN CUANTO|SEGUN|SE INDICA|SE DECIDE|SE SOLICITA|SE INICIA|CONTINUAR)/.test(fold(d))) break;
      list.push(d);
    }
    const seen = new Set<string>();
    note.diagnoses = list.filter((d) => {
      const k = fold(d);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).slice(0, 20);
    if (note.diagnoses.length) confidence['diagnoses'] = sections.diagnoses ? 'ALTA' : 'MEDIA';
  }

  note.plan = set('plan', sec('plan'), 'ALTA');

  // 9) Avisos útiles
  if (!note.sectionsFound.length && !note.currentIllness) {
    warnings.push('No se reconocieron acápites en el documento. Revise y complete manualmente los datos.');
  }
  if (!note.identification.fullName) warnings.push('No se encontró el nombre del paciente en el documento.');
  if (!note.diagnoses.length) warnings.push('No se encontraron diagnósticos en el documento.');
  return note;
}
