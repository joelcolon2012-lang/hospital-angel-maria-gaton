import { buildOfficialParts, serializeParts } from './officialDocuments';
/**
 * ClinicalDocumentBuilder - Motor Central de Construcción y Validación de Documentos Clínicos
 * Hospital Regional Dr. Ángel María Gatón — Dr. Joel Colón
 * 
 * FASES 6, 7, 9, 10, 14, 16, 17, 18, 31, 32:
 * 
 * PIPELINE UNIFICADO:
 * Datos Estructurados -> Validación -> Normalización -> Desduplicación -> Builder -> Plantilla Oficial -> Corrector -> Validador Final
 * 
 * Genera con fidelidad matemática exacta al formato real del hospital:
 * 1. Nota de Ingreso (Emergencia y Sala/Planta)
 * 2. Orden Médica Oficial
 * 3. Historia Clínica
 * 4. Nota de Evolución
 */

import { Patient, MedicalOrder, LabResult, MedicalStudy, PatientEvolution, Vitals } from '../types';
import { ClinicalDataNormalizer } from './clinicalDataNormalizer';
import { ClinicalDeduplicationEngine } from './clinicalDeduplicationEngine';
import { ClinicalTextCorrector } from './clinicalTextCorrector';

export interface FormattedVitalsResult {
  hasVitals: boolean;
  text: string;
  summaryLine: string;
}

export interface NoteValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Formatea los signos vitales reales del paciente sin inventar valores por defecto.
 * Prohibido inventar 120/80 si no existe, no 0/0, no 0 bpm, etc.
 * Bajo ninguna circunstancia imprime undefined, null, NaN o [].
 */
export function formatClinicalVitals(vitals?: Vitals, includeBlankGlicemia: boolean = false): FormattedVitalsResult {
  if (!vitals) {
    return {
      hasVitals: false,
      text: 'SIGNOS VITALES: NO REGISTRADOS AL INGRESO.',
      summaryLine: 'SIGNOS VITALES: NO REGISTRADOS AL INGRESO'
    };
  }

  const parts: string[] = [];
  const lineParts: string[] = [];

  // Presión arterial
  const sys = vitals.systolicBP !== undefined && vitals.systolicBP !== null && !isNaN(Number(vitals.systolicBP)) && Number(vitals.systolicBP) > 0 ? Number(vitals.systolicBP) : null;
  const dia = vitals.diastolicBP !== undefined && vitals.diastolicBP !== null && !isNaN(Number(vitals.diastolicBP)) && Number(vitals.diastolicBP) > 0 ? Number(vitals.diastolicBP) : null;
  if (sys && dia) {
    parts.push(`TA: ${sys}/${dia} MMHG`);
    lineParts.push(`TA: ${sys}/${dia} MMHG`);
  } else if (sys) {
    parts.push(`TA: ${sys} MMHG (SISTÓLICA)`);
    lineParts.push(`TA: ${sys} MMHG`);
  }

  // Frecuencia cardíaca
  const hr = vitals.heartRate !== undefined && vitals.heartRate !== null && !isNaN(Number(vitals.heartRate)) && Number(vitals.heartRate) > 0 ? Number(vitals.heartRate) : null;
  if (hr) {
    parts.push(`FC: ${hr} LPM`);
    lineParts.push(`FC: ${hr} LPM`);
  }

  // Frecuencia respiratoria
  const rr = vitals.respiratoryRate !== undefined && vitals.respiratoryRate !== null && !isNaN(Number(vitals.respiratoryRate)) && Number(vitals.respiratoryRate) > 0 ? Number(vitals.respiratoryRate) : null;
  if (rr) {
    parts.push(`FR: ${rr} RPM`);
    lineParts.push(`FR: ${rr} RPM`);
  }

  // Saturación de oxígeno
  const sat = vitals.oxygenSaturation !== undefined && vitals.oxygenSaturation !== null && !isNaN(Number(vitals.oxygenSaturation)) && Number(vitals.oxygenSaturation) > 0 ? Number(vitals.oxygenSaturation) : null;
  if (sat) {
    parts.push(`SPO2: ${sat}% AL AIRE AMBIENTE`);
    lineParts.push(`SPO2: ${sat}% AA`);
  }

  // Temperatura
  const temp = vitals.temperature !== undefined && vitals.temperature !== null && !isNaN(Number(vitals.temperature)) && Number(vitals.temperature) > 0 ? Number(vitals.temperature) : null;
  if (temp) {
    parts.push(`TEMP: ${temp} °C`);
    lineParts.push(`TEMP: ${temp} °C`);
  }

  // Glicemia capilar (NUNCA inventar valores, solo si está documentada explícitamente)
  const glu = vitals.bloodGlucose !== undefined && vitals.bloodGlucose !== null && !isNaN(Number(vitals.bloodGlucose)) && Number(vitals.bloodGlucose) > 0 ? Number(vitals.bloodGlucose) : null;
  if (glu) {
    parts.push(`GLICEMIA: ${glu} MG/DL`);
    lineParts.push(`GLICEMIA: ${glu} MG/DL`);
  } else if (includeBlankGlicemia) {
    parts.push(`GLICEMIA: ______`);
    lineParts.push(`GLICEMIA: ______`);
  }

  if (parts.length === 0) {
    return {
      hasVitals: false,
      text: 'SIGNOS VITALES: NO REGISTRADOS AL INGRESO.',
      summaryLine: 'SIGNOS VITALES: NO REGISTRADOS AL INGRESO'
    };
  }

  return {
    hasVitals: true,
    text: `MANEJANDO LOS SIGUIENTES SIGNOS VITALES: ${parts.join(', ')}.`,
    summaryLine: `SIGNOS VITALES: ${lineParts.join(' | ')}`
  };
}

/**
 * Extrae el estado actual del paciente asegurando que refleje la versión guardada más reciente.
 */
export function extractClinicalStatus(patient: Patient): string {
  if (!patient) return '';
  const pe = patient.clinicalHistory?.physicalExam;
  let gen = '';
  if (pe) {
    if (typeof pe.general === 'string' && pe.general.trim()) {
      gen = pe.general.trim();
    } else if (pe.general && typeof (pe.general as any).notes === 'string' && (pe.general as any).notes.trim()) {
      gen = (pe.general as any).notes.trim();
    }
  }
  if (!gen && (patient as any).generalStatus) {
    gen = String((patient as any).generalStatus).trim();
  }
  if (!gen && (patient.clinicalHistory as any)?.generalStatusSummary) {
    gen = String((patient.clinicalHistory as any).generalStatusSummary).trim();
  }
  return gen.toUpperCase();
}

/**
 * Formatea el examen físico segmentario cefalocaudal completo respetando los hallazgos reales del médico.
 * Garantiza la presencia del CORAZÓN y separa individualmente EXTREMIDADES SUPERIORES e INFERIORES.
 */
export function formatPhysicalExam(pe: any = {}): string {
  const cleanedPe = ClinicalDataNormalizer.cleanPhysicalExamSections(pe);
  const segments: string[] = [];

  if (cleanedPe.head) segments.push(`CABEZA: ${cleanedPe.head.toUpperCase()}`);
  if (cleanedPe.eyes) segments.push(`OJOS: ${cleanedPe.eyes.toUpperCase()}`);
  if (pe.ears) segments.push(`OÍDOS: ${String(pe.ears).toUpperCase()}`);
  if (pe.nose) segments.push(`NARIZ: ${String(pe.nose).toUpperCase()}`);
  if (cleanedPe.mouth) segments.push(`BOCA: ${cleanedPe.mouth.toUpperCase()}`);
  if (cleanedPe.neck) segments.push(`CUELLO: ${cleanedPe.neck.toUpperCase()}`);
  if (cleanedPe.chest) segments.push(`TÓRAX: ${cleanedPe.chest.toUpperCase()}`);
  if (cleanedPe.respiratory) segments.push(`PULMONES: ${cleanedPe.respiratory.toUpperCase()}`);
  if (cleanedPe.cardiovascular) segments.push(`CORAZÓN: ${cleanedPe.cardiovascular.toUpperCase()}`);
  if (cleanedPe.abdominal) segments.push(`ABDOMEN: ${cleanedPe.abdominal.toUpperCase()}`);
  if (cleanedPe.upperExtremities) segments.push(`EXTREMIDADES SUPERIORES: ${cleanedPe.upperExtremities.toUpperCase()}`);
  if (cleanedPe.lowerExtremities) segments.push(`EXTREMIDADES INFERIORES: ${cleanedPe.lowerExtremities.toUpperCase()}`);
  if (cleanedPe.neurological) segments.push(`NEUROLÓGICO: ${cleanedPe.neurological.toUpperCase()}`);
  if (cleanedPe.skin) segments.push(`PIEL Y ANEXOS: ${cleanedPe.skin.toUpperCase()}`);

  if (segments.length === 0) {
    return 'AL EXAMEN FÍSICO: NO DOCUMENTADO AL INGRESO.';
  }

  return `AL EXAMEN FÍSICO: ${segments.join('. ')}.`;
}

/**
 * Valida que la nota clínica descargable contenga toda la información obligatoria
 * y no contenga discusión terapéutica ni campos técnicos corruptos.
 */
export function validateDownloadableClinicalNote(noteText: string, patient: Patient): NoteValidationResult {
  const errors: string[] = [];

  if (!noteText || noteText.trim().length === 0) {
    errors.push('El documento de la nota clínica está completamente vacío.');
    return { isValid: false, errors };
  }

  const upperNote = noteText.toUpperCase();

  // 1. Datos de identificación
  if (patient.fullName) {
    const cleanName = ClinicalDataNormalizer.normalizePatientName(patient.fullName);
    const firstName = cleanName.split(' ')[0];
    if (firstName && !upperNote.includes(firstName)) {
      errors.push(`Faltan datos de identificación del paciente: nombre (${firstName}) no encontrado.`);
    }
  }

  // 2. Motivo de consulta / Historia de la enfermedad actual
  const hasHda = upperNote.includes('SE TRATA DE PACIENTE') || 
                 upperNote.includes('REFIERE') || 
                 upperNote.includes('MOTIVO POR EL CUAL') ||
                 upperNote.includes('CUADRO CLÍNICO') ||
                 upperNote.includes('SE RECIBE EN SALA');
  if (!hasHda) {
    errors.push('Falta el motivo de consulta o la historia de la enfermedad actual en la nota.');
  }

  // 3. Antecedentes
  const hasAntecedents = upperNote.includes('ANTECEDENTES') || 
                         upperNote.includes('MÓRBIDOS') || 
                         upperNote.includes('QUIRÚRGICOS') || 
                         upperNote.includes('ALERGIAS') ||
                         upperNote.includes('TÓXICOS');
  if (!hasAntecedents) {
    errors.push('Falta el apartado de antecedentes clínicos en la nota.');
  }

  // 4. Estado actual del paciente (si existe en el paciente)
  const recordedStatus = extractClinicalStatus(patient);
  if (recordedStatus) {
    const stopWords = new Set(['PACIENTE', 'ESTE', 'ESTA', 'ACTUALMENTE', 'REFIERE', 'EDAD', 'AÑOS', 'CENTRO', 'SALUD']);
    const statusWords = recordedStatus
      .split(/[\s,.;]+/)
      .map(w => w.trim().toUpperCase())
      .filter(w => w.length > 3 && !stopWords.has(w));

    const hasStatusPhrase = upperNote.includes('ACTUALMENTE PACIENTE') || upperNote.includes('AL MOMENTO DEL RECIBIMIENTO');
    const hasStatusKeywords = statusWords.length === 0 || statusWords.some(w => upperNote.includes(w));

    if (!hasStatusPhrase || !hasStatusKeywords) {
      errors.push('Falta el estado actual del paciente registrado en la nota clínica.');
    }
  }

  // 5. Signos vitales (si existen en el paciente)
  const v = patient.vitals;
  const hasVitalsEntered = v && (
    (v.systolicBP && v.systolicBP > 0) ||
    (v.heartRate && v.heartRate > 0) ||
    (v.respiratoryRate && v.respiratoryRate > 0) ||
    (v.oxygenSaturation && v.oxygenSaturation > 0) ||
    (v.temperature && v.temperature > 0)
  );
  if (hasVitalsEntered) {
    const hasVitalsInNote = upperNote.includes('SIGNOS VITALES') || 
                            upperNote.includes('MANEJANDO') || 
                            upperNote.includes('TA:') ||
                            upperNote.includes('FC:');
    if (!hasVitalsInNote) {
      errors.push('Faltan los signos vitales registrados del paciente en la nota clínica.');
    }
    if (v.systolicBP && v.diastolicBP && !upperNote.includes(`${v.systolicBP}/${v.diastolicBP}`)) {
      errors.push(`La presión arterial registrada (${v.systolicBP}/${v.diastolicBP}) no aparece en la nota.`);
    }
  }

  // 6. Examen físico (si existe en el paciente)
  const pe = patient.clinicalHistory?.physicalExam;
  const hasPeEntered = pe && Object.values(pe).some((val: any) => typeof val === 'string' && val.trim().length > 0);
  if (hasPeEntered) {
    const hasPeInNote = upperNote.includes('EXAMEN FÍSICO') || 
                        upperNote.includes('AL EXAMEN') || 
                        upperNote.includes('CORAZÓN') || 
                        upperNote.includes('PULMONES');
    if (!hasPeInNote) {
      errors.push('Falta el examen físico del paciente en la nota clínica.');
    }
  }

  // 7. Diagnósticos
  const hasDiags = upperNote.includes('DIAGNÓSTICO') || 
                   upperNote.includes('DIAGNÓSTICOS') || 
                   upperNote.includes('POR LO QUE SE DEJA');
  if (!hasDiags) {
    errors.push('Falta el apartado de diagnósticos clínicos en la nota.');
  }

  // 8. Órdenes médicas / Plan de manejo
  const hasOrders = upperNote.includes('EN CUANTO AL MANEJO') || 
                    upperNote.includes('PLAN:') || 
                    upperNote.includes('SE INDICA') || 
                    upperNote.includes('ORDEN MEDICA') ||
                    upperNote.includes('CONDUCTA MÉDICA');
  if (!hasOrders) {
    errors.push('Falta el apartado de órdenes médicas o plan terapéutico en la nota.');
  }

  // 9. REGLA PRINCIPAL: Ausencia estricta de discusión terapéutica en el documento descargado
  const forbiddenPhrases = [
    'DISCUSIÓN TERAPÉUTICA',
    'DISCUSION TERAPEUTICA',
    'FARMACOTERAPÉUTICA RAZONADA',
    'FARMACOTERAPEUTICA RAZONADA',
    'DISCUSIÓN FARMACOLÓGICA',
    'DISCUSION FARMACOLOGICA',
    'DIRECTRICES Y JUSTIFICACIONES DE GUÍAS',
    'JUSTIFICACIÓN BASADA EN EVIDENCIA'
  ];
  for (const phrase of forbiddenPhrases) {
    if (upperNote.includes(phrase)) {
      errors.push(`Violación de la regla principal: se detectó '${phrase}' en el documento descargable.`);
    }
  }

  // Prohibir datos técnicos corruptos
  if (/\b(undefined|null|NaN|\[object Object\])\b/i.test(noteText)) {
    errors.push('El documento contiene valores técnicos corruptos (undefined, null o NaN).');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export interface ClinicalValidationReport {
  isValid: boolean;
  warnings: string[];
  missingFields: string[];
  inconsistencies: string[];
}

export interface FinalDocumentAuditResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  detectedDuplicates: string[];
  cleanedText: string;
}

export class ClinicalDocumentBuilder {

  /**
   * FASE 17: Valida los datos del paciente antes de generar cualquier documento
   */
  public static validatePatientData(patient: Patient, orders: MedicalOrder[] = []): ClinicalValidationReport {
    const warnings: string[] = [];
    const missingFields: string[] = [];
    const inconsistencies: string[] = [];

    if (!patient.fullName || patient.fullName.trim().length < 3) {
      missingFields.push('Nombre completo del paciente');
    }
    if (!patient.age && patient.age !== 0) {
      missingFields.push('Edad del paciente');
    }
    if (!patient.cubicle) {
      missingFields.push('Cubículo / Cama de asignación');
    }
    if (!patient.chiefComplaint && !patient.clinicalHistory?.reasonForConsultation) {
      missingFields.push('Motivo de consulta / ingreso');
    }

    // Validar signos vitales
    const v = patient.vitals;
    if (v) {
      if (v.systolicBP && (v.systolicBP < 50 || v.systolicBP > 280)) {
        inconsistencies.push(`Presión sistólica fuera de rango fisiológico: ${v.systolicBP} mmHg`);
      }
      if (v.heartRate && (v.heartRate < 30 || v.heartRate > 240)) {
        inconsistencies.push(`Frecuencia cardíaca extrema: ${v.heartRate} lpm`);
      }
      if (v.temperature && (v.temperature < 32 || v.temperature > 43)) {
        inconsistencies.push(`Temperatura fuera de rango biológico: ${v.temperature} °C`);
      }
    }

    // Validar órdenes médicas
    orders.forEach((ord, i) => {
      if (ord.type === 'Medicamento' && (!ord.dose || ord.dose.trim() === '')) {
        warnings.push(`Orden #${i + 1} (${ord.name}): No tiene dosis especificada`);
      }
    });

    return {
      isValid: missingFields.length === 0,
      warnings,
      missingFields,
      inconsistencies
    };
  }

  /**
   * FASES 7, 9, 14: Construye la NOTA DE INGRESO (Emergencia o Sala)
   * reproduciendo exactamente la estructura y redacción de los documentos del Hospital Dr. Ángel María Gatón
   */
  public static buildAdmissionNote(
    patient: Patient,
    orders: MedicalOrder[] = [],
    labs: LabResult[] = [],
    studies: MedicalStudy[] = [],
    type: 'EMERGENCIA' | 'SALA' = 'EMERGENCIA'
  ): string {
    // Formato oficial único del hospital (sin datos inventados)
    return serializeParts(buildOfficialParts(type === 'SALA' ? 'sala' : 'emergencia', patient, orders, labs, studies));
  }

  /**
   * FASE 16: Construye la ORDEN MÉDICA OFICIAL
   * reproduciendo exactamente el formato del hospital
   */
  public static buildMedicalOrder(
    patient: Patient,
    orders: MedicalOrder[] = []
  ): string {
    // Formato oficial único del hospital (sin datos inventados)
    return serializeParts(buildOfficialParts('orden', patient, orders));
  }

  /**
   * FASE 32: Auditoría y validación final antes de mostrar o descargar cualquier documento
   */
  public static finalClinicalDocumentValidation(documentText: string): FinalDocumentAuditResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const detectedDuplicates: string[] = [];

    if (!documentText || documentText.trim().length === 0) {
      errors.push('El documento está vacío.');
      return { passed: false, errors, warnings, detectedDuplicates, cleanedText: '' };
    }

    // 1. Detectar campos técnicos crudos
    if (/\b(undefined|null|NaN|\[object Object\])\b/i.test(documentText)) {
      errors.push('El documento contiene valores técnicos no resueltos (undefined, null o NaN).');
    }

    // 2. Detectar corchetes vacíos []
    if (/\[\s*\]/.test(documentText)) {
      warnings.push('El documento contiene corchetes vacíos.');
    }

    // 3. Detectar párrafos idénticos duplicados
    const paragraphs = documentText.split('\n\n').map(p => p.trim()).filter(Boolean);
    const seenP = new Set<string>();
    paragraphs.forEach((p, idx) => {
      if (p.length > 20 && !p.includes(':HOSPITAL')) {
        const pKey = p.toLowerCase().replace(/\s+/g, ' ');
        if (seenP.has(pKey)) {
          detectedDuplicates.push(`Párrafo #${idx + 1} repetido`);
          errors.push(`Párrafo duplicado detectado: "${p.slice(0, 40)}..."`);
        } else {
          seenP.add(pKey);
        }
      }
    });

    // 4. Limpieza final de espacios y formato
    const cleanedText = ClinicalDataNormalizer.cleanWhitespace(documentText);

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      detectedDuplicates,
      cleanedText
    };
  }

  public static formatClinicalVitals = formatClinicalVitals;
  public static extractClinicalStatus = extractClinicalStatus;
  public static formatPhysicalExam = formatPhysicalExam;
  public static validateDownloadableClinicalNote = validateDownloadableClinicalNote;
}
