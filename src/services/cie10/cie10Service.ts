/**
 * CIE-10 (Clasificación Internacional de Enfermedades, 10.ª revisión) — búsqueda en español.
 * El catálogo completo (~14 000 códigos) se carga bajo demanda la primera vez que se busca.
 */

export interface Cie10Entry {
  code: string; // "J18.9"
  description: string; // "Neumonía, no especificada"
}

export const foldText = (s: string) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase();

/** Diagnósticos frecuentes en Emergencia y Medicina Interna (se muestran sin escribir nada). */
export const FREQUENT_CIE10: Cie10Entry[] = [
  { code: 'I10', description: 'Hipertensión esencial (primaria)' },
  { code: 'E11.9', description: 'Diabetes mellitus tipo 2 sin complicaciones' },
  { code: 'J18.9', description: 'Neumonía, no especificada' },
  { code: 'I50.0', description: 'Insuficiencia cardíaca congestiva' },
  { code: 'I63.9', description: 'Infarto cerebral, no especificado' },
  { code: 'I64', description: 'Accidente vascular encefálico agudo, no especificado como hemorrágico o isquémico' },
  { code: 'I21.9', description: 'Infarto agudo del miocardio, sin otra especificación' },
  { code: 'I20.0', description: 'Angina inestable' },
  { code: 'N39.0', description: 'Infección de vías urinarias, sitio no especificado' },
  { code: 'N17.9', description: 'Insuficiencia renal aguda, no especificada' },
  { code: 'N18.9', description: 'Insuficiencia renal crónica, no especificada' },
  { code: 'J44.1', description: 'EPOC con exacerbación aguda, no especificada' },
  { code: 'J45.9', description: 'Asma, no especificada' },
  { code: 'A41.9', description: 'Septicemia, no especificada' },
  { code: 'A09', description: 'Diarrea y gastroenteritis de presunto origen infeccioso' },
  { code: 'E11.1', description: 'Diabetes mellitus tipo 2 con cetoacidosis' },
  { code: 'E87.1', description: 'Hiposmolaridad e hiponatremia' },
  { code: 'E87.5', description: 'Hiperpotasemia' },
  { code: 'D64.9', description: 'Anemia de tipo no especificado' },
  { code: 'K92.2', description: 'Hemorragia gastrointestinal, no especificada' },
  { code: 'I48', description: 'Fibrilación y aleteo auricular' },
  { code: 'I26.9', description: 'Embolia pulmonar sin mención de corazón pulmonar agudo' },
  { code: 'I80.2', description: 'Flebitis y tromboflebitis de otros vasos profundos de los miembros inferiores' },
  { code: 'L03.1', description: 'Celulitis de otras partes de los miembros' },
  { code: 'R55', description: 'Síncope y colapso' },
  { code: 'G40.9', description: 'Epilepsia, tipo no especificado' },
  { code: 'K85.9', description: 'Pancreatitis aguda, no especificada' },
  { code: 'K80.2', description: 'Cálculo de la vesícula biliar sin colecistitis' },
  { code: 'K35.8', description: 'Apendicitis aguda, otras y las no especificadas' },
  { code: 'U07.1', description: 'COVID-19, virus identificado' },
  { code: 'A90', description: 'Fiebre del dengue [dengue clásico]' },
  { code: 'A27.9', description: 'Leptospirosis, no especificada' },
  { code: 'E86', description: 'Depleción del volumen (deshidratación)' },
  { code: 'I16.1', description: 'Emergencia hipertensiva' }
];

const FREQ_CODES = new Set(FREQUENT_CIE10.map((e) => e.code));

/** Abreviaturas usadas en la guardia -> códigos. */
const SYNONYMS: Record<string, string[]> = {
  HTA: ['I10'],
  'CRISIS HIPERTENSIVA': ['I16.9', 'I16.0', 'I16.1'],
  DM: ['E11.9', 'E10.9'],
  DM2: ['E11.9'],
  DM1: ['E10.9'],
  CAD: ['E11.1', 'E10.1'],
  CETOACIDOSIS: ['E11.1', 'E10.1'],
  ICC: ['I50.0', 'I50.9'],
  IC: ['I50.9'],
  IAM: ['I21.9'],
  IAMCEST: ['I21.3', 'I21.0', 'I21.1'],
  IAMSEST: ['I21.4'],
  SCA: ['I24.9', 'I20.0', 'I21.9'],
  EVC: ['I64', 'I63.9', 'I61.9'],
  ACV: ['I64', 'I63.9', 'I61.9'],
  ICTUS: ['I64', 'I63.9'],
  AIT: ['G45.9'],
  IVU: ['N39.0'],
  ITU: ['N39.0'],
  ERC: ['N18.9'],
  IRC: ['N18.9'],
  LRA: ['N17.9'],
  IRA: ['N17.9', 'J96.0'],
  EPOC: ['J44.9', 'J44.1'],
  NAC: ['J18.9'],
  TEP: ['I26.9'],
  TVP: ['I80.2'],
  HDA: ['K92.2', 'K92.0'],
  HDB: ['K92.2'],
  FA: ['I48'],
  TB: ['A16.9'],
  TBP: ['A16.2'],
  VIH: ['B24'],
  COVID: ['U07.1', 'U07.2'],
  DENGUE: ['A90', 'A91'],
  SEPSIS: ['A41.9'],
  CHOQUE: ['R57.9'],
  SHOCK: ['R57.9', 'R57.1', 'R57.0'],
  HIPONATREMIA: ['E87.1'],
  HIPERPOTASEMIA: ['E87.5'],
  HIPERKALEMIA: ['E87.5'],
  HIPOPOTASEMIA: ['E87.6'],
  HIPOKALEMIA: ['E87.6'],
  HIPOGLICEMIA: ['E16.2'],
  HIPOGLUCEMIA: ['E16.2'],
  ANEMIA: ['D64.9'],
  OBESIDAD: ['E66.9'],
  CIRROSIS: ['K74.6'],
  PANCREATITIS: ['K85.9']
};

let cache: Cie10Entry[] | null = null;
let folded: string[] = [];
let loading: Promise<Cie10Entry[]> | null = null;

/** Carga el catálogo completo (una sola vez). */
export function loadCie10(): Promise<Cie10Entry[]> {
  if (cache) return Promise.resolve(cache);
  if (!loading) {
    loading = import('../../data/cie10Data').then((m) => {
      const raw: string = (m as any).default || '';
      cache = raw.split('\n').map((line) => {
        const i = line.indexOf('\t');
        return { code: line.slice(0, i), description: line.slice(i + 1) };
      });
      folded = cache.map((e) => foldText(`${e.description}`));
      return cache;
    });
  }
  return loading;
}

export function isCie10Loaded() {
  return Boolean(cache);
}

const normCode = (s: string) => {
  const t = foldText(s).replace(/[^A-Z0-9]/g, '');
  if (!/^[A-Z]\d{1,2}[0-9A-Z]?$/.test(t)) return '';
  return t.length > 3 ? `${t.slice(0, 3)}.${t.slice(3)}` : t;
};

export function getByCode(code: string): Cie10Entry | undefined {
  const c = normCode(code);
  if (!c) return undefined;
  return (cache || FREQUENT_CIE10).find((e) => e.code === c) || FREQUENT_CIE10.find((e) => e.code === c);
}

/**
 * Busca por código ("J18", "J189"), abreviatura ("NAC", "HTA") o palabras ("neumonia lobar").
 */
export function searchCie10(query: string, limit = 30): Cie10Entry[] {
  const q = foldText(query).trim();
  const list = cache || FREQUENT_CIE10;
  const fl = cache ? folded : FREQUENT_CIE10.map((e) => foldText(e.description));
  if (!q) return FREQUENT_CIE10.slice(0, limit);
  const scored: Array<{ e: Cie10Entry; s: number }> = [];
  const seen = new Set<string>();
  const push = (e: Cie10Entry | undefined, s: number) => {
    if (!e || seen.has(e.code)) return;
    seen.add(e.code);
    scored.push({ e, s });
  };

  // 1) Código
  const code = normCode(q);
  if (code) {
    const bare = code.replace('.', '');
    list.forEach((e) => {
      const ec = e.code.replace('.', '');
      if (ec === bare) push(e, 1000);
      else if (ec.startsWith(bare)) push(e, 900 - ec.length);
    });
  }
  // 2) Abreviaturas
  for (const [abbr, codes] of Object.entries(SYNONYMS)) {
    if (q === abbr || (q.length >= 4 && abbr.startsWith(q))) codes.forEach((c, i) => push(getByCode(c), 800 - i));
  }
  // 3) Palabras (todas deben aparecer)
  const tokens = q.split(/[\s,.;/()-]+/).filter((t) => t.length >= 2);
  if (tokens.length) {
    for (let i = 0; i < list.length; i++) {
      const d = fl[i];
      let ok = true;
      let score = 0;
      for (const t of tokens) {
        const pos = d.indexOf(t);
        if (pos < 0) {
          ok = false;
          break;
        }
        score += pos === 0 ? 30 : /\s/.test(d[pos - 1] || ' ') ? 20 : 5;
      }
      if (!ok) continue;
      // Preferir descripciones cortas y códigos de 4 caracteres (más específicos)
      score += Math.max(0, 60 - d.length / 3) + (list[i].code.includes('.') ? 5 : 0);
      if (d.startsWith(q)) score += 50;
      const c0 = list[i].code[0];
      if (FREQ_CODES.has(list[i].code)) score += 40;
      // Perinatales / obstétricos / congénitos solo arriba si la búsqueda los menciona
      if ((c0 === 'P' && !/NEONAT|RECIEN NACIDO|FETO|PERINATAL/.test(q)) || (c0 === 'O' && !/EMBARAZ|PARTO|PUERPER|GESTAC|OBSTETR|ABORTO/.test(q)) || (c0 === 'Q' && !/CONGENIT|MALFORM/.test(q))) score -= 45;
      push(list[i], score);
    }
  }
  return scored
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.e);
}

/**
 * Sugiere un código para un diagnóstico escrito a mano (solo como sugerencia; el médico decide).
 * Devuelve undefined si no hay una coincidencia clara.
 */
export function suggestCode(name: string): Cie10Entry | undefined {
  const q = foldText(name).replace(/\(.*?\)/g, ' ').replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!q) return undefined;
  const direct = SYNONYMS[q];
  if (direct) return getByCode(direct[0]);
  const words = q.split(' ').filter((w) => w.length > 3 && !['AGUDA', 'AGUDO', 'CRONICA', 'CRONICO', 'SEVERA', 'SEVERO', 'LEVE', 'MODERADA', 'MODERADO', 'DESCOMPENSADA', 'DESCOMPENSADO', 'PROBABLE', 'DESCARTAR', 'ESTADIO', 'GRADO', 'TIPO'].includes(w));
  if (!words.length) return undefined;
  const res = searchCie10(words.slice(0, 3).join(' '), 1);
  return res[0];
}

/** Capítulo CIE-10 (para estadísticas). */
export function cie10Chapter(code?: string): string {
  const c = foldText(code || '');
  if (!c) return 'Sin código';
  const L = c[0];
  const n = parseInt(c.slice(1, 3), 10);
  if (L === 'A' || L === 'B') return 'I. Infecciosas y parasitarias';
  if (L === 'C' || (L === 'D' && n <= 48)) return 'II. Neoplasias';
  if (L === 'D') return 'III. Sangre e inmunidad';
  if (L === 'E') return 'IV. Endocrinas y metabólicas';
  if (L === 'F') return 'V. Mentales y del comportamiento';
  if (L === 'G') return 'VI. Sistema nervioso';
  if (L === 'H') return n <= 59 ? 'VII. Ojo' : 'VIII. Oído';
  if (L === 'I') return 'IX. Circulatorio';
  if (L === 'J') return 'X. Respiratorio';
  if (L === 'K') return 'XI. Digestivo';
  if (L === 'L') return 'XII. Piel';
  if (L === 'M') return 'XIII. Osteomuscular';
  if (L === 'N') return 'XIV. Genitourinario';
  if (L === 'O') return 'XV. Embarazo, parto y puerperio';
  if (L === 'P') return 'XVI. Perinatal';
  if (L === 'Q') return 'XVII. Malformaciones congénitas';
  if (L === 'R') return 'XVIII. Síntomas y signos';
  if (L === 'S' || L === 'T') return 'XIX. Traumatismos y envenenamientos';
  if (L === 'V' || L === 'W' || L === 'X' || L === 'Y') return 'XX. Causas externas';
  if (L === 'Z') return 'XXI. Factores que influyen en la salud';
  if (L === 'U') return 'XXII. Códigos especiales (COVID-19)';
  return 'Otro';
}
