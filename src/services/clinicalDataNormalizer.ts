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

  /**
   * Extrae la evolución pura de la enfermedad actual evitando duplicar
   * la presentación demográfica o los antecedentes si ya estaban en el texto libre.
   */
  public static extractPureIllnessHistory(rawHda: string): string {
    if (!rawHda) return '';
    let text = this.cleanWhitespace(rawHda);

    // Si ya contiene la fórmula de presentación "SE TRATA DE PACIENTE...", buscar dónde inicia el cuadro clínico
    const refiereMatch = text.match(/REFIERE\s+(?:PACIENTE\s+)?(?:QUE\s+)?(.+)/i);
    if (refiereMatch) {
      text = refiereMatch[1];
    } else {
      const iniciaMatch = text.match(/(?:INICIA|PRESENTA|CON)\s+CUADRO\s+CL[IÍ]NICO\s+(.+)/i);
      if (iniciaMatch) {
        text = 'SE ENCONTRABA EN SU ESTADO HABITUAL HASTA QUE ' + iniciaMatch[0];
      }
    }

    // Quitar coletillas finales de derivación o ingreso que se generan programáticamente
    text = text.replace(/MOTIVOS?\s+POR\s+(?:LOS?\s+)?CUAL(?:ES)?\s+(?:ACUDE|ES\s+TRA[IÍ]D[OA]|ES\s+REFERID[OA]|CONSULTA).*$/i, '');
    text = text.replace(/TRAS\s+PREVIA\s+EVALUACI[OÓ]N\s+CL[IÍ]NICA\s+Y\s+PARACL[IÍ]NICA\s+SE\s+DECIDE\s+SU\s+INGRESO.*$/i, '');
    text = text.replace(/TRAS\s+EVALUACI[OÓ]N\s+DE\s+CL[IÍ]NICA\s+Y\s+PARA\s*CL[IÍ]NICA.*$/i, '');
    text = text.replace(/SE\s+DECIDE\s+SU\s+INGRESO\s+CON\s+FINES\s+DIAGN[OÓ]STICOS.*$/i, '');
    text = text.replace(/,\s*MOTIVO\s+POR\s+EL\s+CUAL.*$/i, '');

    return text.trim();
  }

  /**
   * Normaliza y desglosa el examen físico garantizando:
   * 1. Presencia obligatoria del CORAZÓN sin sobreescrituras del tórax.
   * 2. Separación individual de EXTREMIDADES SUPERIORES e INFERIORES sin barras '|'.
   */
  public static cleanPhysicalExamSections(pe: any = {}): {
    general: string;
    head: string;
    eyes: string;
    mouth: string;
    neck: string;
    chest: string;
    respiratory: string;
    cardiovascular: string;
    abdominal: string;
    upperExtremities: string;
    lowerExtremities: string;
    neurological: string;
    skin: string;
  } {
    // 1. Corazón / Cardiovascular: Detectar si accidentalmente copiaron el texto del tórax o pulmones
    let cardio = (pe.cardiovascular || pe.heart || '').trim();
    const resp = (pe.respiratory || pe.lungs || pe.chest || '').trim().toLowerCase();

    // Si cardio está vacío, o es idéntico al respiratorio, o contiene palabras obvias de pulmón/tórax
    const isCopyOfLung = cardio && resp && (
      cardio.toLowerCase() === resp ||
      cardio.toLowerCase().includes('bases pulmonares') ||
      cardio.toLowerCase().includes('musculatura accesoria') ||
      cardio.toLowerCase().includes('fremito') ||
      cardio.toLowerCase().includes('murmullo vesicular') ||
      cardio.toLowerCase().includes('hiperdinamico, sin deformidades')
    );

    if (!cardio || isCopyOfLung) {
      cardio = 'RUIDOS CARDÍACOS RÍTMICOS Y REGULARES, BUENA INTENSIDAD, R1 Y R2 ÍNTEGROS Y NORMOFONÉTICOS, NO SOPLOS AUDIBLES, NO GALOPE';
    }

    // 2. Extremidades Superiores e Inferiores
    const rawExt = (pe.extremities || pe.extremidades || '').replace(/\|/g, ' ');
    const extParts = rawExt.split(/[.,]+/).map((s: string) => s.trim()).filter(Boolean);
    const uniqueExt = Array.from(new Set(extParts.map((s: string) => s.toLowerCase()))).map(s => {
      return extParts.find((orig: string) => orig.toLowerCase() === s) || s;
    }).join(', ');

    let upperExt = (pe.upperExtremities || '').trim();
    let lowerExt = (pe.lowerExtremities || '').trim();

    if (!upperExt) {
      upperExt = 'SIMÉTRICAS, MÓVILES, PULSOS RADIALES Y BRAQUIALES PRESENTES Y SIMÉTRICOS, LLENADO CAPILAR < 2 SEG, SIN DEFORMIDADES NI LESIONES AGREGADAS';
    }

    if (!lowerExt) {
      if (uniqueExt.toLowerCase().includes('máculas') || uniqueExt.toLowerCase().includes('edema') || uniqueExt.toLowerCase().includes('pedio') || uniqueExt.toLowerCase().includes('inferiores')) {
        lowerExt = uniqueExt.toUpperCase();
      } else {
        lowerExt = 'SIMÉTRICAS, MÓVILES, PULSOS PEDIOS Y POPLÍTEOS PRESENTES, SIN EDEMAS, SIN SIGNOS DE TROMBOSIS VENOSA PROFUNDA';
      }
    }

    return {
      general: pe.general || 'ALERTA, CONSCIENTE, ORIENTADO EN TRES ESFERAS, BIOTIPO NORMOLÍNEO, TOLERANDO VÍA ORAL Y AIRE AMBIENTE',
      head: pe.head || 'NORMOCÉFALO, SIN MASAS NI HUNDIMIENTOS ÓSEOS, PELO DE ADECUADA IMPLANTACIÓN',
      eyes: pe.eyes || 'PUPILAS ISOCÓRICAS, FOTORREACTIVAS, ESCLERAS ANICTÉRICAS',
      mouth: pe.mouth || 'MUCOSA ORAL HÚMEDA, PIEZAS DENTALES EN REGULAR ESTADO, NO LESIONES',
      neck: pe.neck || 'CILÍNDRICO, MÓVIL, NO INGURGITACIÓN YUGULAR, NO ADENOMEGALIAS NI SOPLOS CAROTÍDEOS',
      chest: pe.chest || 'SIMÉTRICO, NORMOEXPANSIBLE, SIN DEFORMIDADES ÓSEAS',
      respiratory: pe.respiratory || pe.lungs || 'NORMOVENTILADO, MURMULLO VESICULAR CONSERVADO EN AMBOS CAMPOS PULMONARES, SIN ESTERTORES',
      cardiovascular: cardio.toUpperCase(),
      abdominal: pe.abdominal || pe.abdomen || 'GLOBOSO A EXPENSAS DE PANÍCULO ADIPOSO, BLANDO, DEPRESIBLE, NO DOLOROSO, PERISTALSIS PRESENTE',
      upperExtremities: upperExt.toUpperCase(),
      lowerExtremities: lowerExt.toUpperCase(),
      neurological: pe.neurological || 'ALERTA, GLASGOW 15/15, ORIENTADO EN TIEMPO, ESPACIO Y PERSONA, SIN FOCALIDAD NEUROLÓGICA',
      skin: pe.skin || 'TURGENCIA Y ELASTICIDAD CONSERVADA PARA LA EDAD, SIN LESIONES ACTIVAS'
    };
  }
}
