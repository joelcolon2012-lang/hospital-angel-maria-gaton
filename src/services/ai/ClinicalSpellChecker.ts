/**
 * ClinicalSpellChecker: Spanish Medical Lexicon & Duplicate Detector
 * Hospital Regional Dr. Ángel María Gatón — Dr. Joel Colón
 *
 * Requirements (Phases 11 & 16; Sections 18, 19, 20):
 * - Detects typographical and spelling mistakes in Spanish medical documentation.
 * - Categorizes into:
 *   1. "CORRECCIÓN SEGURA" (safe auto-cleaning: accents, double spaces, repeated articles, sentence capitalization).
 *   2. "SUGERENCIA CLÍNICA" (requires physician confirmation: "¿QUIERE CAMBIAR...?").
 * - STRICT CLINICAL RULE:
 *   - NEVER alter numeric values, dosages, or units!
 *   - NEVER modify proper names silently.
 * - Detects repeated clinical phrases (e.g. "adecuada mecánica ventilatoria...").
 */

export interface ClinicalSpellingSuggestion {
  id: string;
  original: string;
  suggested: string;
  reason: string;
  category: 'safe_fix' | 'clinical_suggestion' | 'duplicate_phrase';
  canAutoApply: boolean;
}

export interface SpellCheckResult {
  originalText: string;
  autoCleanedText: string; // Safe fixes applied (accents, double spaces, safe duplicate words)
  suggestions: ClinicalSpellingSuggestion[];
  hasRepeatedPhrases: boolean;
  repeatedPhrases: string[];
}

// 1. DICCIONARIO DE SUGERENCIAS FARMACOLÓGICAS (¿QUIERE CAMBIAR...?)
export const CLINICAL_DRUG_SUGGESTIONS: Record<string, { correct: string; brandOrGeneric: string }> = {
  amolodipina: { correct: 'amlodipina', brandOrGeneric: 'Amlodipina (Antagonista de canales de calcio)' },
  amlodipino: { correct: 'amlodipina', brandOrGeneric: 'Amlodipina' },
  bidesonide: { correct: 'budesonida', brandOrGeneric: 'Budesonida (Corticoide inhalado)' },
  budesonid: { correct: 'budesonida', brandOrGeneric: 'Budesonida' },
  ipatropio: { correct: 'ipratropio', brandOrGeneric: 'Bromuro de ipratropio' },
  ipratopio: { correct: 'ipratropio', brandOrGeneric: 'Bromuro de ipratropio' },
  ceftriaxonaa: { correct: 'ceftriaxona', brandOrGeneric: 'Ceftriaxona (Cefalosporina 3ra gen)' },
  ceftriasona: { correct: 'ceftriaxona', brandOrGeneric: 'Ceftriaxona' },
  ceftriaxone: { correct: 'ceftriaxona', brandOrGeneric: 'Ceftriaxona' },
  ciprofloxacina: { correct: 'ciprofloxacino', brandOrGeneric: 'Ciprofloxacino (Quinolona)' },
  ciprofloxasina: { correct: 'ciprofloxacino', brandOrGeneric: 'Ciprofloxacino' },
  claritromisina: { correct: 'claritromicina', brandOrGeneric: 'Claritromicina (Macrólido)' },
  azitromisina: { correct: 'azitromicina', brandOrGeneric: 'Azitromicina' },
  vancomisina: { correct: 'vancomicina', brandOrGeneric: 'Vancomicina (Glicopéptido)' },
  metronidazol: { correct: 'metronidazol', brandOrGeneric: 'Metronidazol' },
  metronidasol: { correct: 'metronidazol', brandOrGeneric: 'Metronidazol' },
  furosemidaa: { correct: 'furosemida', brandOrGeneric: 'Furosemida (Diurético del asa)' },
  furosemid: { correct: 'furosemida', brandOrGeneric: 'Furosemida' },
  espironolactonaa: { correct: 'espironolactona', brandOrGeneric: 'Espironolactona' },
  enoxaparine: { correct: 'enoxaparina', brandOrGeneric: 'Enoxaparina (HBPM)' },
  enoxaparinaa: { correct: 'enoxaparina', brandOrGeneric: 'Enoxaparina' },
  atorvastatine: { correct: 'atorvastatina', brandOrGeneric: 'Atorvastatina (Estatina)' },
  losartan: { correct: 'losartán', brandOrGeneric: 'Losartán (ARA-II)' },
  valsartan: { correct: 'valsartán', brandOrGeneric: 'Valsartán' },
  enalapril: { correct: 'enalapril', brandOrGeneric: 'Enalapril (IECA)' },
  hidroclorotiazida: { correct: 'hidroclorotiazida', brandOrGeneric: 'Hidroclorotiazida' },
  hidroclorotiasida: { correct: 'hidroclorotiazida', brandOrGeneric: 'Hidroclorotiazida' },
  insulinaa: { correct: 'insulina', brandOrGeneric: 'Insulina' },
  levotiroxinaa: { correct: 'levotiroxina', brandOrGeneric: 'Levotiroxina' },
  levotirosina: { correct: 'levotiroxina', brandOrGeneric: 'Levotiroxina' },
  omeprasol: { correct: 'omeprazol', brandOrGeneric: 'Omeprazol (IBP)' },
  pantoprasol: { correct: 'pantoprazol', brandOrGeneric: 'Pantoprazol' },
  paracetamol: { correct: 'paracetamol', brandOrGeneric: 'Paracetamol / Acetaminofén' },
  acetaminofen: { correct: 'acetaminofén', brandOrGeneric: 'Acetaminofén' },
};

// 2. CORRECCIONES SEGURAS DE TILDES Y TÉRMINOS CLÍNICOS EXACTOS (SIN ALTERAR VALORES NI DOSIS)
export const SAFE_MEDICAL_CORRECTIONS: Record<string, string> = {
  // Semiología y Examen Físico
  eupneico: 'eupneico',
  ritmico: 'rítmico',
  ritmicos: 'rítmicos',
  aritmico: 'arrítmico',
  aritmicos: 'arrítmicos',
  normofonetico: 'normofonético',
  normofoneticos: 'normofonéticos',
  isquemico: 'isquémico',
  isquémica: 'isquémica',
  cianotico: 'cianótico',
  cianotica: 'cianótica',
  icterico: 'ictérico',
  icterica: 'ictérica',
  palpacion: 'palpación',
  auscultacion: 'auscultación',
  inspeccion: 'inspección',
  percusion: 'percusión',
  simetrico: 'simétrico',
  simetrica: 'simétrica',
  asimetrico: 'asimétrico',
  asimetrica: 'asimétrica',
  meningeo: 'meníngeo',
  meningeos: 'meníngeos',
  fovea: 'fóvea',
  neurologico: 'neurológico',
  neurologica: 'neurológica',
  cardiovascular: 'cardiovascular',
  respiratorio: 'respiratorio',
  abdominal: 'abdominal',
  hematologico: 'hematológico',

  // Diagnósticos y Patologías
  hipertension: 'hipertensión',
  neumonia: 'neumonía',
  diuretico: 'diurético',
  farmaco: 'fármaco',
  farmacos: 'fármacos',
  cronico: 'crónico',
  cronica: 'crónica',
  medico: 'médico',
  medica: 'médica',
  quirurgico: 'quirúrgico',
  quirurgica: 'quirúrgica',
  vomitos: 'vómitos',
  nauseas: 'náuseas',
  cefalea: 'cefalea',
  edema: 'edema',
  sindrome: 'síndrome',
  diagnostico: 'diagnóstico',
  terapeutico: 'terapéutico',
  terapeutica: 'terapéutica',
};

/**
 * Detecta frases clínicas duplicadas de 3 o más palabras repetidas en el texto
 */
export function findRepeatedPhrases(text: string): string[] {
  if (!text || text.length < 20) return [];

  const sentences = text
    .split(/[.\n;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  const repeated: string[] = [];
  const seen = new Set<string>();

  for (const s of sentences) {
    const norm = s.toLowerCase().replace(/\s+/g, ' ');
    if (seen.has(norm)) {
      if (!repeated.includes(s)) {
        repeated.push(s);
      }
    } else {
      seen.add(norm);
    }
  }

  // Búsqueda de n-gramas comunes (3 a 5 palabras repetidas en el mismo texto)
  const words = text.split(/\s+/);
  if (words.length >= 6) {
    for (let i = 0; i < words.length - 3; i++) {
      const phrase = words.slice(i, i + 3).join(' ').toLowerCase();
      // Solo frases con contenido clínico significativo
      if (
        phrase.length > 12 &&
        !phrase.match(/^(el paciente|en el|de la|y se|se realiza)$/i)
      ) {
        const regex = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        const matches = text.match(regex);
        if (matches && matches.length >= 2 && !repeated.some((r) => r.toLowerCase().includes(phrase))) {
          repeated.push(matches[0]);
        }
      }
    }
  }

  return repeated;
}

/**
 * Ejecuta análisis ortográfico médico y detección de duplicados
 */
export function checkMedicalSpelling(text: string): SpellCheckResult {
  if (!text) {
    return {
      originalText: '',
      autoCleanedText: '',
      suggestions: [],
      hasRepeatedPhrases: false,
      repeatedPhrases: [],
    };
  }

  const suggestions: ClinicalSpellingSuggestion[] = [];
  let cleaned = text;

  // 1. Limpieza segura: Espacios dobles
  cleaned = cleaned.replace(/[ \t]{2,}/g, ' ');

  // 2. Limpieza segura: Duplicación accidental de palabras cortas ("el el", "de de", "la la")
  cleaned = cleaned.replace(/\b(el|la|los|las|de|del|en|y|o|que|con|por)\s+\1\b/gi, (match, word) => {
    suggestions.push({
      id: `dup-word-${word}-${Math.random()}`,
      original: match,
      suggested: word,
      reason: `Duplicación accidental de palabra conectora '${match}'.`,
      category: 'safe_fix',
      canAutoApply: true,
    });
    return word;
  });

  // 3. Reemplazos ortográficos seguros (tildes de términos médicos conocidos)
  for (const [key, val] of Object.entries(SAFE_MEDICAL_CORRECTIONS)) {
    const regex = new RegExp(`\\b${key}\\b`, 'gi');
    cleaned = cleaned.replace(regex, (match) => {
      // Si la palabra original empezaba con mayúscula, preservar mayúscula
      const replacement =
        match[0] === match[0].toUpperCase()
          ? val.charAt(0).toUpperCase() + val.slice(1)
          : val;
      return replacement;
    });
  }

  // 4. Mayúscula inicial tras punto y seguido
  cleaned = cleaned.replace(/(^|[.!?]\s+)([a-zñáéíóú])/g, (_, prefix, letter) => {
    return prefix + letter.toUpperCase();
  });

  // 5. Sugerencias clínicas de fármacos mal escritos (¿QUIERE CAMBIAR...?)
  // NUNCA modifica automáticamente ni toca números o dosis
  const words = text.split(/[\s,.;:()]+/);
  for (const word of words) {
    const normWord = word.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (CLINICAL_DRUG_SUGGESTIONS[normWord]) {
      const match = CLINICAL_DRUG_SUGGESTIONS[normWord];
      const isAlreadyCorrect = word.toLowerCase() === match.correct.toLowerCase();
      if (!isAlreadyCorrect) {
        suggestions.push({
          id: `drug-${word}-${Math.random()}`,
          original: word,
          suggested: match.correct,
          reason: `Posible error en fármaco: '${word}'. Sugerencia: '${match.correct}' (${match.brandOrGeneric}).`,
          category: 'clinical_suggestion',
          canAutoApply: false, // Requiere aprobación del médico
        });
      }
    }
  }

  // 6. Detección de frases repetidas
  const repeatedPhrases = findRepeatedPhrases(cleaned);
  repeatedPhrases.forEach((phrase) => {
    suggestions.push({
      id: `phrase-dup-${Math.random()}`,
      original: phrase,
      suggested: `[Eliminar duplicado]`,
      reason: `Frase clínica duplicada en el texto: "${phrase}"`,
      category: 'duplicate_phrase',
      canAutoApply: false,
    });
  });

  return {
    originalText: text,
    autoCleanedText: cleaned,
    suggestions,
    hasRepeatedPhrases: repeatedPhrases.length > 0,
    repeatedPhrases,
  };
}

/**
 * Elimina de manera segura las frases duplicadas de un texto clínico
 */
export function removeDuplicatePhrase(text: string, phraseToRemove: string): string {
  if (!text || !phraseToRemove) return text;

  // Busca la segunda ocurrencia de la frase y la elimina
  const lowerText = text.toLowerCase();
  const lowerPhrase = phraseToRemove.toLowerCase().trim();

  const firstIdx = lowerText.indexOf(lowerPhrase);
  if (firstIdx === -1) return text;

  const secondIdx = lowerText.indexOf(lowerPhrase, firstIdx + lowerPhrase.length);
  if (secondIdx === -1) return text;

  const before = text.substring(0, secondIdx);
  const after = text.substring(secondIdx + phraseToRemove.length);

  // Limpieza de puntuaciones sobrantes resultantes
  let result = before + after;
  result = result.replace(/,\s*,/g, ',');
  result = result.replace(/\.\s*\./g, '.');
  result = result.replace(/[ \t]{2,}/g, ' ');

  return result.trim();
}
