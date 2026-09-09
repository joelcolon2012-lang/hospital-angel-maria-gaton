/**
 * Servicio de Corrección Ortográfica y Normalización de Texto Médico
 * Hospital Regional Ángel María Gatón — Dr. Colón
 */

const MEDICAL_DICTIONARY_REPLACEMENTS: Record<string, string> = {
  // Acentos y términos comunes de examen físico
  'eupneico': 'eupneico',
  'eupneica': 'eupneica',
  'afebril': 'afebril',
  'normocoloreado': 'normocoloreado',
  'normocoloreada': 'normocoloreada',
  'ritmicos': 'rítmicos',
  'ritmico': 'rítmico',
  'normofoneticos': 'normofonéticos',
  'normofonetico': 'normofonético',
  'estertores': 'estertores',
  'crepitantes': 'crepitantes',
  'sibilancias': 'sibilancias',
  'roncus': 'roncus',
  'vesicular': 'vesicular',
  'peritoneal': 'peritoneal',
  'meningeos': 'meníngeos',
  'meningeo': 'meníngeo',
  'hepatomegalia': 'hepatomegalia',
  'esplenomegalia': 'esplenomegalia',
  'isquemia': 'isquemia',
  'isquemico': 'isquémico',
  'isquemica': 'isquémica',
  'cianosis': 'cianosis',
  'ictericia': 'ictericia',
  'palpacion': 'palpación',
  'auscultacion': 'auscultación',
  'inspeccion': 'inspección',
  'percusion': 'percusión',
  'extremidades': 'extremidades',
  'simetricas': 'simétricas',
  'simetrico': 'simétrico',
  'asimetrico': 'asimétrico',
  'edema': 'edema',
  'fovea': 'fóvea',
  'pulsos': 'pulsos',
  'cardiovascular': 'cardiovascular',
  'neurologico': 'neurológico',
  'neurologica': 'neurológica',
  'respiratorio': 'respiratorio',
  'abdominal': 'abdominal',
  'hematologico': 'hematológico',

  // Diagnósticos y antecedentes
  'hipertension': 'hipertensión',
  'arterial': 'arterial',
  'hta': 'Hipertensión Arterial (HTA)',
  'dm': 'Diabetes Mellitus (DM)',
  'dm2': 'Diabetes Mellitus tipo 2 (DM2)',
  'diabetes': 'diabetes',
  'mellitus': 'mellitus',
  'neumonia': 'neumonía',
  'falla cardiaca': 'falla cardíaca',
  'insuficiencia cardiaca': 'insuficiencia cardíaca',
  'insuficiencia renal': 'insuficiencia renal',
  'enfermedad renal cronica': 'enfermedad renal crónica',
  'erc': 'Enfermedad Renal Crónica (ERC)',
  'epoc': 'EPOC (Enfermedad Pulmonar Obstructiva Crónica)',
  'acv': 'Accidente Cerebrovascular (ACV)',
  'ait': 'Ataque Isquémico Transitorio (AIT)',
  'sca': 'Síndrome Coronario Agudo (SCA)',
  'iam': 'Infarto Agudo de Miocardio (IAM)',
  'tep': 'Tromboembolismo Pulmonar (TEP)',
  'tvp': 'Trombosis Venosa Profunda (TVP)',
  'fa': 'Fibrilación Auricular (FA)',
  'taquicardia': 'taquicardia',
  'bradicardia': 'bradicardia',
  'disnea': 'disnea',
  'ortopnea': 'ortopnea',
  'cefalea': 'cefalea',
  'vomitos': 'vómitos',
  'nauseas': 'náuseas',
  'diarrea': 'diarrea',
  'sindrome': 'síndrome',
  'diagnostico': 'diagnóstico',
  'terapeutico': 'terapéutico',
  'terapeutica': 'terapéutica',
  'farmaco': 'fármaco',
  'farmacos': 'fármacos',
  'cronico': 'crónico',
  'cronica': 'crónica',
  'agudo': 'agudo',
  'aguda': 'aguda',
  'clinico': 'clínico',
  'clinica': 'clínica',
  'medico': 'médico',
  'medica': 'médica',
  'quirurgico': 'quirúrgico',
  'quirurgica': 'quirúrgica',
};

/**
 * Normaliza un texto clínico:
 * - Corrige tildes y términos clínicos mal digitados
 * - Ajusta mayúsculas al inicio de oraciones
 * - Limpia espacios dobles y signos de puntuación irregulares
 */
export function normalizeMedicalText(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // 1. Reemplazos de palabras según el diccionario
  for (const [key, val] of Object.entries(MEDICAL_DICTIONARY_REPLACEMENTS)) {
    const regex = new RegExp(`\\b${key}\\b`, 'gi');
    cleaned = cleaned.replace(regex, (match) => {
      // Si la palabra original empezaba con mayúscula, preservar mayúscula
      if (match[0] === match[0].toUpperCase()) {
        return val.charAt(0).toUpperCase() + val.slice(1);
      }
      return val;
    });
  }

  // 2. Limpieza de espacios redundantes
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  cleaned = cleaned.replace(/\s+([.,;:])/g, '$1');

  // 3. Mayúscula tras punto y seguido
  cleaned = cleaned.replace(/(^|[.!?]\s+)([a-zñáéíóú])/g, (_, prefix, letter) => {
    return prefix + letter.toUpperCase();
  });

  return cleaned.trim();
}
