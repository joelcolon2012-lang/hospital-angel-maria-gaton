/**
 * Abreviaturas de diagnósticos → nombre completo, para los documentos oficiales.
 * Sólo se expanden siglas de significado único en medicina interna; las ambiguas
 * (p. ej. IRA: renal o respiratoria) se dejan como están para no cambiar el sentido.
 * Los nombres propios de escalas/guías (AHA, NYHA, KDIGO, GOLD…) no se tocan.
 */
const L = 'A-ZÁÉÍÓÚÑÜ0-9';
/** Límite de palabra que respeta tildes (\b de JS trata Á, Í… como separadores). */
const w = (src: string) => new RegExp(src.replace(/\\b/g, '').replace(/^/, `(?<![${L}])(?:`).replace(/$/, `)(?![${L}])`), 'g');

const ABBREVIATIONS: Array<[RegExp, string]> = ([

  // Orden: primero las más largas para no romperlas
  [/\bHTAS\b/g, 'HIPERTENSIÓN ARTERIAL SISTÉMICA'],
  [/\bHTA\b/g, 'HIPERTENSIÓN ARTERIAL'],
  [/\bDM\s*(?:T(?:IPO)?\s*)?2\b/g, 'DIABETES MELLITUS TIPO 2'],
  [/\bDM\s*(?:T(?:IPO)?\s*)?1\b/g, 'DIABETES MELLITUS TIPO 1'],
  [/\bDM\b/g, 'DIABETES MELLITUS'],
  [/\bNAC\b/g, 'NEUMONÍA ADQUIRIDA EN LA COMUNIDAD'],
  [/\bNIH\b/g, 'NEUMONÍA INTRAHOSPITALARIA'],
  [/\bNAV\b/g, 'NEUMONÍA ASOCIADA A VENTILACIÓN MECÁNICA'],
  [/\bICFEP\b/g, 'INSUFICIENCIA CARDÍACA CON FRACCIÓN DE EYECCIÓN PRESERVADA'],
  [/\bICFER\b/g, 'INSUFICIENCIA CARDÍACA CON FRACCIÓN DE EYECCIÓN REDUCIDA'],
  [/\bICC\b/g, 'INSUFICIENCIA CARDÍACA CONGESTIVA'],
  [/\bIC\b/g, 'INSUFICIENCIA CARDÍACA'],
  [/\bIAMCEST\b/g, 'INFARTO AGUDO DE MIOCARDIO CON ELEVACIÓN DEL SEGMENTO ST'],
  [/\bIAMSEST\b/g, 'INFARTO AGUDO DE MIOCARDIO SIN ELEVACIÓN DEL SEGMENTO ST'],
  [/\bIAM\b/g, 'INFARTO AGUDO DE MIOCARDIO'],
  [/\bSCACEST\b/g, 'SÍNDROME CORONARIO AGUDO CON ELEVACIÓN DEL SEGMENTO ST'],
  [/\bSCASEST\b/g, 'SÍNDROME CORONARIO AGUDO SIN ELEVACIÓN DEL SEGMENTO ST'],
  [/\bSCA\b/g, 'SÍNDROME CORONARIO AGUDO'],
  [/\bEVC\b/g, 'EVENTO CEREBROVASCULAR'],
  [/\bECV\b/g, 'ENFERMEDAD CEREBROVASCULAR'],
  [/\bACV\b/g, 'ACCIDENTE CEREBROVASCULAR'],
  [/\bAIT\b/g, 'ATAQUE ISQUÉMICO TRANSITORIO'],
  [/\bHSA\b/g, 'HEMORRAGIA SUBARACNOIDEA'],
  [/\bTCE\b/g, 'TRAUMATISMO CRANEOENCEFÁLICO'],
  [/\bIVU\b/g, 'INFECCIÓN DE VÍAS URINARIAS'],
  [/\bITU\b/g, 'INFECCIÓN DEL TRACTO URINARIO'],
  [/\bLRA\b/g, 'LESIÓN RENAL AGUDA'],
  [/\bERC\b/g, 'ENFERMEDAD RENAL CRÓNICA'],
  [/\bIRC\b/g, 'INSUFICIENCIA RENAL CRÓNICA'],
  [/\bEPOC\b/g, 'ENFERMEDAD PULMONAR OBSTRUCTIVA CRÓNICA'],
  [/\bSDRA\b/g, 'SÍNDROME DE DIFICULTAD RESPIRATORIA AGUDA'],
  [/\bEAP\b/g, 'EDEMA AGUDO DE PULMÓN'],
  [/\bTEP\b/g, 'TROMBOEMBOLISMO PULMONAR'],
  [/\bTVP\b/g, 'TROMBOSIS VENOSA PROFUNDA'],
  [/\bHDA\b/g, 'HEMORRAGIA DIGESTIVA ALTA'],
  [/\bHDB\b/g, 'HEMORRAGIA DIGESTIVA BAJA'],
  [/\bFA\s*RVR\b|\bFARVR\b/g, 'FIBRILACIÓN AURICULAR CON RESPUESTA VENTRICULAR RÁPIDA'],
  [/\bFA\b/g, 'FIBRILACIÓN AURICULAR'],
  [/\bCAD\b/g, 'CETOACIDOSIS DIABÉTICA'],
  [/\bEHH\b/g, 'ESTADO HIPERGLUCÉMICO HIPEROSMOLAR'],
  [/\bDHE\b/g, 'DESEQUILIBRIO HIDROELECTROLÍTICO'],
  [/\bERGE\b/g, 'ENFERMEDAD POR REFLUJO GASTROESOFÁGICO'],
  [/\bHBP\b/g, 'HIPERPLASIA PROSTÁTICA BENIGNA'],
  [/\bLES\b/g, 'LUPUS ERITEMATOSO SISTÉMICO'],
  [/\bTBP\b/g, 'TUBERCULOSIS PULMONAR'],
  [/\bTB\b/g, 'TUBERCULOSIS'],
  [/\bSIDA\b/g, 'SÍNDROME DE INMUNODEFICIENCIA ADQUIRIDA'],
  [/\bVIH\b/g, 'VIRUS DE LA INMUNODEFICIENCIA HUMANA'],
  [/\bDNT\b/g, 'DESNUTRICIÓN'],
  [/\bIRAB\b/g, 'INFECCIÓN RESPIRATORIA AGUDA BAJA'],
  [/\bCOVID\b(?!-19)/g, 'COVID-19']
] as Array<[RegExp, string]>).map(([re, full]) => [w(re.source), full]);

/** Siglas que se expanden (para pruebas y para avisar al médico). */
export const EXPANDABLE_ABBREVIATIONS = ABBREVIATIONS.map(([re]) => re.source);

/** Reemplaza las siglas por el nombre completo (texto en MAYÚSCULAS). */
export function expandDiagnosisAbbreviations(text: string): string {
  let out = String(text || '').toUpperCase();
  for (const [re, full] of ABBREVIATIONS) out = out.replace(re, full);
  return out.replace(/\s{2,}/g, ' ').trim();
}

const hasAbbrev = (s: string) => ABBREVIATIONS.some(([re]) => new RegExp(re.source).test(s.toUpperCase()));

/**
 * Separa renglones que traen varios diagnósticos juntos ("HTA, DM2" o "HTA + DM2" o "HTA / DM2").
 * Las comas sólo se usan como separador cuando cada parte es una sigla conocida o un
 * diagnóstico corto, para no partir nombres CIE-10 como "NEUMONÍA, NO ESPECIFICADA".
 */
export function splitDiagnosisLine(line: string): string[] {
  const t = String(line || '').trim();
  if (!t) return [];
  const byStrong = t.split(/\s*;\s*|\s+\+\s+|\s+\/\s+/).map((s) => s.trim()).filter(Boolean);
  const out: string[] = [];
  for (const piece of byStrong) {
    const commas = piece.split(/\s*,\s*/).map((s) => s.trim()).filter(Boolean);
    const qualifier = /^(NO\s|SIN\s|CON\s|DEBIDO|POR\s|SECUNDARI|ASOCIAD|NO ESPECIFICAD|NCOP|ESTADIO|GRADO|TIPO|CLASE|DE\s|DEL\s|EN\s|Y\s)/i;
    const splittable = commas.length > 1 && commas.every((c) => !qualifier.test(c) && (hasAbbrev(c) || c.split(/\s+/).length <= 4)) && commas.some(hasAbbrev);
    out.push(...(splittable ? commas : [piece]));
  }
  return out;
}

/** Lista final de la orden: un diagnóstico por renglón, sin siglas y sin repetidos, en el mismo orden de prioridad. */
export function normalizeOrderDiagnoses(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    for (const part of splitDiagnosisLine(raw)) {
      const full = expandDiagnosisAbbreviations(part.replace(/^\s*(?:\d{1,2}[.)-]|[•●▪◦\-*])\s*/, ''));
      const key = full.normalize('NFD').replace(/[̀-ͯ]/g, '');
      if (full && !seen.has(key)) {
        seen.add(key);
        out.push(full);
      }
    }
  }
  return out;
}
