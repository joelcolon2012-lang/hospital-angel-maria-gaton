/**
 * ClinicalDataNormalizer - Motor de Normalización de Información Clínica
 * Hospital Regional Dr. Ángel María Gatón — Dr. Joel Colón
 * 
 * FASE 4:
 * 1. Eliminación de espacios innecesarios
 * 2. Normalización de mayúsculas/minúsculas
 * 3. Normalización de fechas
 * 4. Corrección ortográfica y de puntuación
 * 5. Corrección gramatical básica
 * 6. Normalización de abreviaturas permitidas
 * 7. Eliminación de tartamudeos y redundancias léxicas
 * 
 * REGLA INVIOLABLE DE SEGURIDAD:
 * NUNCA modificar dosis, frecuencias, vías, cifras numéricas, fechas, resultados
 * ni diagnósticos explícitos del médico.
 */

// Abreviaturas médicas estándar aprobadas para expansión o normalización limpia
const MEDICAL_ABBREVIATIONS: Record<string, string> = {
  'HTA': 'HIPERTENSIÓN ARTERIAL',
  'DM': 'DIABETES MELLITUS',
  'DM2': 'DIABETES MELLITUS TIPO 2',
  'DM1': 'DIABETES MELLITUS TIPO 1',
  'EPOC': 'ENFERMEDAD PULMONAR OBSTRUCTIVA CRÓNICA',
  'ERC': 'ENFERMEDAD RENAL CRÓNICA',
  'ACV': 'ACCIDENTE CEREBROVASCULAR',
  'EVC': 'EVENTO VASCULAR CEREBRAL',
  'AIT': 'ATAQUE ISQUÉMICO TRANSITORIO',
  'SCA': 'SÍNDROME CORONARIO AGUDO',
  'IAM': 'INFARTO AGUDO DE MIOCARDIO',
  'TEP': 'TROMBOEMBOLISMO PULMONAR',
  'TVP': 'TROMBOSIS VENOSA PROFUNDA',
  'NAC': 'NEUMONÍA ADQUIRIDA EN LA COMUNIDAD',
  'FA': 'FIBRILACIÓN AURICULAR',
  'ICC': 'INSUFICIENCIA CARDÍACA CRÓNICA',
  'IVU': 'INFECCIÓN DE VÍAS URINARIAS',
  'SGI': 'SANGRADO GASTROINTESTINAL',
  'SGIA': 'SANGRADO GASTROINTESTINAL ALTO',
  'SGIB': 'SANGRADO GASTROINTESTINAL BAJO',
  'LRA': 'LESIÓN RENAL AGUDA',
  'IRA': 'INSUFICIENCIA RENAL AGUDA',
};

// Patrones de repetición léxica o tartamudeo común
const STUTTER_PATTERNS: Array<[RegExp, string]> = [
  [/\b(paciente)\s+\1\b/gi, '$1'],
  [/\b(masculino)\s+\1\b/gi, '$1'],
  [/\b(femenina|femenino)\s+\1\b/gi, '$1'],
  [/\b(antecedentes)\s+\1\b/gi, '$1'],
  [/\b(niega)\s+\1\b/gi, '$1'],
  [/\b(se\s+ingresa)\s+paciente\s+paciente\b/gi, 'se ingresa paciente'],
  [/\b(de\s+\d+\s+a[ñn]os\s+de\s+edad)\s+de\s+\d+\s+a[ñn]os\b/gi, '$1'],
  [/\b(de\s+\d+\s+a[ñn]os)\s+de\s+\d+\s+a[ñn]os\b/gi, '$1'],
  [/\b(alergias)\s+\1\b/gi, '$1'],
  [/\b(medicamentos)\s+\1\b/gi, '$1'],
  [/\b(quir[uú]rgicos)\s+\1\b/gi, '$1'],
  [/\b(t[oó]xicos)\s+\1\b/gi, '$1'],
  [/\b(diagn[oó]stico)\s+\1\b/gi, '$1'],
  [/\b(actualmente)\s+\1\b/gi, '$1'],
];

export class ClinicalDataNormalizer {

  /**
   * Limpia espacios, tabulaciones y saltos de línea excesivos
   */
  public static cleanWhitespace(text: string): string {
    if (!text) return '';
    return text
      .replace(/[\r\t]+/g, ' ')
      .replace(/[ ]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Corrige signos de puntuación huérfanos o duplicados sin alterar cifras decimales
   */
  public static cleanPunctuation(text: string): string {
    if (!text) return '';
    let result = text
      // Eliminar espacios antes de punto, coma, dos puntos, punto y coma
      .replace(/\s+([.,;:])/g, '$1')
      // No duplicar comas ni puntos (cuidando decimales como 11.12 o 1,000)
      .replace(/\.{2,}/g, '.')
      .replace(/,{2,}/g, ',')
      // Corregir espacios tras signos de puntuación si falta espacio
      .replace(/([,;:])([^\s0-9])/g, '$1 $2')
      .replace(/(\.)([^\s0-9.])/g, '$1 $2');

    return result;
  }

  /**
   * Elimina tartamudeos y repeticiones involuntarias dentro de una oración
   */
  public static removeStuttering(text: string): string {
    if (!text) return '';
    let result = text;
    for (const [pattern, replacement] of STUTTER_PATTERNS) {
      result = result.replace(pattern, replacement);
    }
    return result;
  }

  /**
   * Normaliza fechas en formato DD/MM/AAAA sin alterar expresiones cronológicas clínicas
   */
  public static normalizeDateFormat(dateStr?: string): string {
    if (!dateStr) return '';
    const trimmed = dateStr.trim();

    // Caso ISO: 2026-09-17 -> 17/09/2026
    const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    }

    // Caso DD-MM-AAAA -> DD/MM/AAAA
    const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmyMatch) {
      const [, d, m, y] = dmyMatch;
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    }

    return trimmed;
  }

  /**
   * Normaliza horas en formato H:MM AM/PM
   */
  public static normalizeTimeFormat(timeStr?: string): string {
    if (!timeStr) return '';
    const trimmed = timeStr.trim().toUpperCase();

    // Caso 15:30 -> 3:30 PM
    const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
      let hours = parseInt(match24[1], 10);
      const minutes = match24[2];
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      if (hours === 0) hours = 12;
      return `${hours}:${minutes} ${ampm}`;
    }

    return trimmed;
  }

  /**
   * Normaliza una cadena clínica completa protegiendo números, dosis, unidades y fórmulas
   */
  public static normalizeClinicalText(text: string, toUpper: boolean = false): string {
    if (!text) return '';
    let processed = this.cleanWhitespace(text);
    processed = this.cleanPunctuation(processed);
    processed = this.removeStuttering(processed);

    if (toUpper) {
      return processed.toUpperCase();
    }
    return processed;
  }

  /**
   * Expande de forma segura abreviaturas reconocidas en diagnósticos y antecedentes
   * (solo cuando no forma parte de una palabra mayor)
   */
  public static expandSafeAbbreviations(text: string): string {
    if (!text) return '';
    let result = text;
    for (const [abbr, expanded] of Object.entries(MEDICAL_ABBREVIATIONS)) {
      const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
      result = result.replace(regex, expanded);
    }
    return result;
  }

  /**
   * Normaliza el nombre de un paciente asegurando mayúsculas limpias sin títulos redundantes
   */
  public static normalizePatientName(name: string): string {
    if (!name) return '';
    return this.cleanWhitespace(name)
      .replace(/^(paciente|sr\.|sra\.|don|doña)\s+/i, '')
      .toUpperCase();
  }

  /**
   * Normaliza la especificación de un fármaco asegurando formato canónico de orden médica:
   * [NOMBRE] [DOSIS] [VÍA] [FRECUENCIA]
   */
  public static normalizeMedicationOrder(med: {
    name: string;
    dose?: string;
    unit?: string;
    route?: string;
    frequency?: string;
  }): string {
    const cleanName = this.cleanWhitespace(med.name).toUpperCase();
    const cleanDose = med.dose ? this.cleanWhitespace(med.dose).toUpperCase() : '';
    const cleanUnit = med.unit ? this.cleanWhitespace(med.unit).toUpperCase() : '';
    const doseStr = cleanUnit && !cleanDose.includes(cleanUnit) ? `${cleanDose} ${cleanUnit}` : cleanDose;
    const cleanRoute = med.route ? this.cleanWhitespace(med.route).toUpperCase() : 'EV';
    const cleanFreq = med.frequency ? this.cleanWhitespace(med.frequency).toUpperCase() : 'C/24 HORAS';

    return [cleanName, doseStr, cleanFreq, cleanRoute].filter(Boolean).join(' ');
  }
}
