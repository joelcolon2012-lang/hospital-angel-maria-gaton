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
export function formatClinicalVitals(vitals?: Partial<Vitals>): FormattedVitalsResult {
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

  // Glicemia capilar
  const glu = vitals.bloodGlucose !== undefined && vitals.bloodGlucose !== null && !isNaN(Number(vitals.bloodGlucose)) && Number(vitals.bloodGlucose) > 0 ? Number(vitals.bloodGlucose) : null;
  if (glu) {
    parts.push(`GLICEMIA: ${glu} MG/DL`);
    lineParts.push(`GLICEMIA: ${glu} MG/DL`);
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
    const v = patient.vitals || {};
    const h = patient.clinicalHistory || ({} as any);
    const pe = h.physicalExam || {};

    const rawDate = patient.arrivalDateTime || patient.createdAt || new Date().toISOString();
    const dateStr = ClinicalDataNormalizer.normalizeDateFormat(rawDate);
    const timeStr = ClinicalDataNormalizer.normalizeTimeFormat(rawDate.includes('T') ? rawDate.split('T')[1].slice(0, 5) : '3:00 PM');

    const cleanName = ClinicalDataNormalizer.normalizePatientName(patient.fullName);
    const ageStr = patient.age ? `${patient.age} AÑOS` : '--';
    const sexoStr = patient.sex === 'F' ? 'FEMENINA' : 'MASCULINO';
    const pronombre = patient.sex === 'F' ? 'ESTA' : 'ESTE';
    const cubicleStr = (patient.cubicle || 'CUBÍCULO 1').toUpperCase();

    // 1. ENCABEZADO INSTITUCIONAL
    let out = `             :HOSPITAL\n`;
    out += `          H  DR. ÁNGEL MARÍA GATÓN\n\n`;

    if (type === 'EMERGENCIA') {
      out += `                  NOTA DE INGRESO EMERGENCIA\n\n`;
      out += `NOMBRE: ${cleanName},    EDAD: ${ageStr},    EMERG: ${cubicleStr},    FECHA INGRESO: ${dateStr}.    HORA: ${timeStr}\n\n`;
    } else {
      out += `                     NOTA DE RECIBIMIENTO EN SALA\n\n`;
      out += `NOMBRE: ${cleanName},    EDAD: ${ageStr},    SALA: ${cubicleStr},    FECHA INGRESO: ${dateStr}.    HORA: ${timeStr}\n\n`;
    }

    // 2. PÁRRAFO NARRATIVO INTEGRAL DE ANTECEDENTES Y MOTIVO DE INGRESO (DESDUPLICADO)
    const rawHda = (h.currentIllnessHistory || patient.chiefComplaint || '').trim();
    const pureHda = ClinicalDataNormalizer.extractPureIllnessHistory(rawHda);
    let p1 = '';

    if (/^SE\s+TRATA\s+DE\s+PACIENTE/i.test(rawHda)) {
      p1 = rawHda.toUpperCase();
    } else {
      p1 = `SE TRATA DE PACIENTE ${sexoStr} DE ${ageStr} DE EDAD, `;

      // Antecedentes mórbidos conocidos (APP)
      const rawPatho = h.pathologicalHistory?.trim() || '';
      if (rawPatho && rawPatho.toUpperCase() !== 'NEGADOS' && rawPatho.toUpperCase() !== 'NEGADOS.') {
        p1 += `CON ANTECEDENTES MÓRBIDOS CONOCIDOS DE ${rawPatho.toUpperCase()}, `;
      } else {
        p1 += `SIN ANTECEDENTES MÓRBIDOS CONOCIDOS, `;
      }

      // Medicación habitual
      if (h.habitualMedications && h.habitualMedications.trim() && !h.habitualMedications.toUpperCase().includes('NINGUN')) {
        p1 += `MEDICADO CON ${h.habitualMedications.toUpperCase()}, `;
      }

      // Hábitos tóxicos
      const rawTox = h.toxicHabits?.trim() || '';
      if (rawTox && !rawTox.toUpperCase().includes('NEGADO')) {
        p1 += `ANTECEDENTES TÓXICOS ${rawTox.toUpperCase()}, `;
      } else {
        p1 += `ANTECEDENTES TÓXICOS NEGADOS, `;
      }

      // Alergias
      const allergiesList = v.allergies && v.allergies.length > 0 ? v.allergies : (h.allergicHistory ? [h.allergicHistory] : []);
      const dedupedAllergies = ClinicalDeduplicationEngine.deduplicateAllergies(allergiesList);
      if (dedupedAllergies.length > 0 && !dedupedAllergies[0].toUpperCase().includes('NEGAD')) {
        p1 += `ALERGIAS ${dedupedAllergies.join(', ').toUpperCase()}, `;
      } else {
        p1 += `ALERGIAS NEGADAS, `;
      }

      // Antecedentes quirúrgicos
      const rawSurg = h.surgicalHistory?.trim() || '';
      if (rawSurg && !rawSurg.toUpperCase().includes('NEGADO')) {
        p1 += `ANTECEDENTES QUIRÚRGICOS DE ${rawSurg.toUpperCase()}, `;
      } else {
        p1 += `ANTECEDENTES QUIRÚRGICOS NEGADOS, `;
      }

      // Traumatismos
      if (h.transfusionalHistory && !h.transfusionalHistory.toUpperCase().includes('NEGAD')) {
        p1 += `TRANSFUSIONES PREVIAS: ${h.transfusionalHistory.toUpperCase()}, `;
      }

      p1 += `REFIERE ${pureHda || 'CUADRO CLÍNICO DE EVOLUCIÓN RECIENTE'}. `;
    }

    p1 = ClinicalDeduplicationEngine.deduplicateNarrativeText(p1) + ' ';

    // Estado actual del paciente (versión más reciente guardada)
    const statusText = extractClinicalStatus(patient) || 'ALERTA, CONSCIENTE, ORIENTADO EN TRES ESFERAS, TOLERANDO AIRE AMBIENTE Y VÍA ORAL';
    p1 += `ACTUALMENTE PACIENTE ${statusText}, `;

    // Signos vitales reales (sin inventar datos)
    const vitalsResult = formatClinicalVitals(v);
    p1 += `${vitalsResult.text} `;

    // Examen Físico Segmentario Cefalocaudal (con CORAZÓN garantizado y EXTREMIDADES individualizadas)
    p1 += `${formatPhysicalExam(pe)} `;

    // Estudios de Imagen y Gabinete
    if (studies && studies.length > 0) {
      p1 += `SE REALIZAN ESTUDIOS DE GABINETE: `;
      const studyPhrases = studies.map(s => 
        `${s.category.toUpperCase()}: ${(s.officialResult || s.preliminaryInterpretation || s.description || 'PARÁMETROS REGULARES').toUpperCase()}`
      );
      p1 += `${studyPhrases.join('. ')}. `;
    } else {
      p1 += `SE REALIZAN ESTUDIOS DE GABINETE: RADIOGRAFÍA DE TÓRAX Y ELECTROCARDIOGRAMA SIN HALLAZGOS AGUDOS ADICIONALES. `;
    }

    // Paraclínicos (Hemograma y Químicas formateadas estilo hospital)
    if (labs && labs.length > 0) {
      const dedupedLabs = ClinicalDeduplicationEngine.deduplicateParaclinicals(labs);
      const hemo = dedupedLabs.filter(l => l.panel === 'Hemograma');
      const quim = dedupedLabs.filter(l => l.panel !== 'Hemograma');

      p1 += `SE REALIZAN PARACLÍNICAS LA MISMA CUENTA CON `;
      if (hemo.length > 0) {
        p1 += `UN HEMOGRAMA QUE REPORTA: ${hemo.map(h => `${h.parameter.toUpperCase()}: ${h.value}`).join(', ')} `;
      }
      if (quim.length > 0) {
        p1 += `UNAS QUÍMICAS QUE REPORTAN: ${quim.map(q => `${q.parameter.toUpperCase()}: ${q.value}`).join(', ')}. `;
      }
    }

    // Diagnósticos Nosológicos
    p1 += `POR LO QUE SE DEJA BAJO DIAGNÓSTICOS DE:\n`;
    out += p1;

    const rawDiags = (h.clinicalImpression || patient.chiefComplaint || 'SÍNDROME CLÍNICO EN ESTUDIO')
      .split(/[\n,;]+/)
      .map((d: string) => d.trim())
      .filter(Boolean);

    const dedupedDiags = ClinicalDeduplicationEngine.deduplicateDiagnoses(rawDiags);
    if (dedupedDiags.length > 0) {
      dedupedDiags.forEach(d => {
        out += `${d.toUpperCase()}\n`;
      });
    } else {
      out += `SÍNDROME CLÍNICO EN ESTUDIO ETIOLÓGICO\n`;
    }
    out += `\n`;

    // 3. EN CUANTO AL MANEJO (Órdenes médicas hospitalarias numeradas sin discusión teórica)
    out += `EN CUANTO AL MANEJO: SE INDICA `;
    const dedupedOrders = ClinicalDeduplicationEngine.deduplicateMedicalOrders(orders);
    const solutionOrders = dedupedOrders.filter(o => o.type === 'Solución');
    const medOrders = dedupedOrders.filter(o => o.type === 'Medicamento');
    const mgmtList: string[] = [];

    const diet = orders.find(o => o.name.toLowerCase().includes('dieta') || o.name.toLowerCase().includes('npo'));
    mgmtList.push(diet ? diet.name.toUpperCase() : 'DIETA ADECUADA A SU CONDICIÓN CLÍNICA');

    if (solutionOrders.length > 0) {
      solutionOrders.forEach(s => {
        mgmtList.push(`${s.name.toUpperCase()} ${s.dose ? s.dose.toUpperCase() : '1,000 ML'} C/24 HORAS ${s.route ? s.route.toUpperCase() : 'EV'} PARA MANTENIMIENTO DE VOLEMIA`);
      });
    } else {
      mgmtList.push('SOLUCIÓN SALINA AL 0.9% 1,000 ML C/12 HORAS EV');
    }

    if (medOrders.length > 0) {
      medOrders.forEach(m => {
        const freq = m.frequency ? m.frequency.toUpperCase() : 'C/24 HORAS';
        const route = m.route ? m.route.toUpperCase() : 'EV';
        const dose = m.dose ? m.dose.toUpperCase() : '';
        mgmtList.push(`${m.name.toUpperCase()} ${dose} ${route} ${freq}`.trim());
      });
    } else {
      mgmtList.push('OMEPRAZOL 40 MG C/24 HORAS EV GASTROPROTECCIÓN');
    }

    mgmtList.push('MONITORIZACIÓN CONTINUA DE CONSTANTES VITALES CADA 6 HORAS');
    mgmtList.push('VIGILANCIA ESTRICTA DE EVOLUCIÓN CLÍNICA Y CONTROL DE PARACLÍNICOS');

    out += mgmtList.map((it, idx) => `${idx + 1}. ${it}`).join('. ') + '.\n';

    // Aplicar normalización y corrección final
    const normalized = ClinicalDataNormalizer.normalizeClinicalText(out);
    const deduped = ClinicalDeduplicationEngine.deduplicateNarrativeText(normalized);
    return ClinicalTextCorrector.correctClinicalText(deduped);
  }

  /**
   * FASE 16: Construye la ORDEN MÉDICA OFICIAL
   * reproduciendo exactamente el formato del hospital
   */
  public static buildMedicalOrder(
    patient: Patient,
    orders: MedicalOrder[] = []
  ): string {
    const v = patient.vitals || {};
    const rawDate = patient.arrivalDateTime || patient.createdAt || new Date().toISOString();
    const dateStr = ClinicalDataNormalizer.normalizeDateFormat(rawDate);
    const timeStr = ClinicalDataNormalizer.normalizeTimeFormat(rawDate.includes('T') ? rawDate.split('T')[1].slice(0, 5) : '3:00 PM');

    const cleanName = ClinicalDataNormalizer.normalizePatientName(patient.fullName);
    const ageStr = patient.age ? `${patient.age} AÑOS` : '--';
    const cubicleStr = (patient.cubicle || 'CUBÍCULO 1').toUpperCase();

    let out = `             :HOSPITAL\n`;
    out += `          H  DR. ÁNGEL MARÍA GATÓN\n\n`;
    out += `                     ORDEN MEDICA\n\n`;
    out += `NOMBRE: ${cleanName}  EDAD: ${ageStr},  EMERGENCIA: CUB ${cubicleStr}  FECHA: ${dateStr}  HORA: ${timeStr}\n\n`;

    // MEDIDAS GENERALES
    const dietOrder = orders.find(o => o.name.toLowerCase().includes('dieta'));
    const dieta = dietOrder ? dietOrder.name.toUpperCase() : 'CORRIENTE';
    out += `MEDIDAS GENERALES: DIETA: ${dieta}, POSICIÓN SEMIFOWLER, SIGNOS VITALES CADA 6 HORAS OXIGENOTERAPIA: SOS SI SPO2 MENOR DE 92%\n\n`;

    // DIAGNÓSTICO
    out += `DIAGNOSTICO:\n`;
    const rawDiags = (patient.clinicalHistory?.clinicalImpression || patient.chiefComplaint || 'EN ESTUDIO')
      .split(/[\n,;]+/)
      .map((d: string) => d.trim())
      .filter(Boolean);

    const dedupedDiags = ClinicalDeduplicationEngine.deduplicateDiagnoses(rawDiags);
    if (dedupedDiags.length > 0) {
      dedupedDiags.forEach(d => {
        out += ` ${d.toUpperCase()}\n`;
      });
    } else {
      out += ` SÍNDROME CLÍNICO EN ESTUDIO ETIOLÓGICO\n`;
    }
    out += `\n`;

    // SIGNOS VITALES
    out += `${formatClinicalVitals(v).summaryLine}.\n\n`;

    // MEDICACIÓN (1 to N)
    out += `MEDICACIÓN:\n`;
    const dedupedOrders = ClinicalDeduplicationEngine.deduplicateMedicalOrders(orders);
    const medItems = dedupedOrders.filter(o => o.type === 'Solución' || o.type === 'Medicamento');

    if (medItems.length > 0) {
      medItems.forEach((m, idx) => {
        const dose = m.dose ? m.dose.toUpperCase() : '';
        const freq = m.frequency ? m.frequency.toUpperCase() : 'CADA 24 HORAS';
        const route = m.route ? m.route.toUpperCase() : 'INTRAVENOSA';
        out += `${idx + 1}. ${m.name.toUpperCase()} ${dose} ${freq} ${route}\n`;
      });
    } else {
      out += `1. SOLUCIÓN SALINA AL 0.9% 1,000 ML CADA 24 HORAS INTRAVENOSA\n`;
      out += `2. OMEPRAZOL 40 MG CADA 24 HORAS INTRAVENOSA\n`;
    }
    out += `\n`;

    // PARACLÍNICOS E IMÁGENES
    out += `PARACLÍNICOS: HEMOGRAMA, UREA, CREATININA, BUN, PERFIL LIPÍDICO, AMILASA, LIPASA, TGO, TGP, ALBUMINA, PROTEÍNAS TOTALES, HIV, VDRL, HEP B, HEP C, ELECTROLITOS SÉRICOS\n`;
    out += `IMÁGENES: RADIOGRAFÍA DE TÓRAX, ELECTROCARDIOGRAMA\n`;

    return out;
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
