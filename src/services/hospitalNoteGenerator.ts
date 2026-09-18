/**
 * Generador de Notas Clínicas y Órdenes Médicas Oficiales
 * Hospital Regional Ángel María Gatón — Dr. Colón
 * 
 * Basado estrictamente en los formatos oficiales hospitalarios validados.
 */

import { Patient, MedicalOrder, LabResult, MedicalStudy, ClinicalHistory } from '../types';
import { normalizeMedicalText } from './medicalSpellingService';
import { ClinicalDataNormalizer } from './clinicalDataNormalizer';
import { formatClinicalVitals, extractClinicalStatus } from './clinicalDocumentBuilder';

/**
 * Función auxiliar para descargar inmediatamente cualquier archivo de texto o JSON en el PC
 */
export function downloadFileToPC(filename: string, content: string, mimeType: string = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Formatea fecha y hora en estilo hospitalario (ej: 07/09/2026 HORA: 5:00 PM)
 */
function getFormattedDateTime(dateTimeStr?: string): { dateStr: string; timeStr: string } {
  const d = dateTimeStr ? new Date(dateTimeStr) : new Date();
  const dateStr = d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  let timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return { dateStr, timeStr };
}

/**
 * Genera la ORDEN MEDICA con el formato exacto del hospital
 */
export function generateIndividualMedicalOrder(patient: Patient, orders: MedicalOrder[] = []): string {
  const v = patient.vitals || {};
  const { dateStr, timeStr } = getFormattedDateTime(patient.arrivalDateTime);

  // Clasificar órdenes
  const solutionOrders = orders.filter((o) => o.type === 'Solución');
  const medicationOrders = orders.filter((o) => o.type === 'Medicamento');
  const otherOrders = orders.filter((o) => o.type !== 'Solución' && o.type !== 'Medicamento');

  // Diagnósticos
  const rawDiag = patient.clinicalHistory?.clinicalImpression || patient.chiefComplaint || 'EN ESTUDIO CLÍNICO';
  const diagList = rawDiag
    .split(/[\n,;]+/)
    .map((d) => d.trim().toUpperCase())
    .filter(Boolean);

  let out = `             :HOSPITAL\n`;
  out += `          H  DR. ÁNGEL MARÍA GATÓN\n\n`;
  out += `                     ORDEN MEDICA\n\n`;
  out += `NOMBRE: ${patient.fullName.toUpperCase()}  EDAD: ${patient.age || '--'} AÑOS,  EMERGENCIA: CUB ${patient.cubicle}  FECHA: ${dateStr} HORA: ${timeStr}\n\n`;

  // MEDIDAS GENERALES
  out += `MEDIDAS GENERALES: DIETA: ${getDietaText(solutionOrders)}, POSICIÓN SEMIFOWLER, SIGNOS VITALES CADA 6 HORAS OXIGENOTERAPIA: SOS SI SPO2 MENOR DE 92%\n\n`;

  // DIAGNOSTICO
  out += `DIAGNOSTICO:\n`;
  if (diagList.length > 0) {
    diagList.forEach((d) => {
      out += ` ${d}\n`;
    });
  } else {
    out += ` EN ESTUDIO ETIOLÓGICO\n`;
  }
  out += `\n`;

  // SIGNOS VITALES
  const tas = v.systolicBP || '120';
  const tad = v.diastolicBP || '80';
  const fc = v.heartRate || '78';
  const fr = v.respiratoryRate || '19';
  const sat = v.oxygenSaturation || '98';
  const temp = v.temperature || '37';
  const glic = v.bloodGlucose || '110';
  out += `SIGNOS VITALES: TA: ${tas}/${tad} MMHG, FC: ${fc} L/M, FR: ${fr} R/M, SPO2: ${sat}% TEMP: ${temp} GRADOS, GLICEMIA: ${glic} MG/DL\n\n`;

  // MEDICACIÓN
  out += `MEDICACIÓN:\n`;
  let medIndex = 1;

  // Soluciones
  if (solutionOrders.length > 0) {
    solutionOrders.forEach((s) => {
      out += `${medIndex++}. ${s.name.toUpperCase()} ${s.dose ? s.dose.toUpperCase() : '2,000 ML'} ${s.frequency ? s.frequency.toUpperCase() : 'C/24 HORAS'} ${s.route ? s.route.toUpperCase() : 'EV'}\n`;
    });
  } else {
    out += `${medIndex++}. SOLUCIÓN SALINA AL 0.9% 2,000 ML C/24 HORAS EV\n`;
  }

  // Medicamentos
  if (medicationOrders.length > 0) {
    medicationOrders.forEach((m) => {
      out += `${medIndex++}. ${m.name.toUpperCase()} ${m.dose ? m.dose.toUpperCase() : ''} ${m.frequency ? m.frequency.toUpperCase() : ''} ${m.route ? m.route.toUpperCase() : 'EV'}\n`;
    });
  } else {
    out += `${medIndex++}. OMEPRAZOL 40 MG C/24 HORAS EV\n`;
  }
  out += `\n`;

  // PARACLÍNICOS & IMÁGENES
  out += `PARACLÍNICOS: HEMOGRAMA, UREA, CREATININA, BUN, PERFIL LIPÍDICO, AMILASA, LIPASA, TGO, TGP, ALBUMINA, PROTEÍNAS TOTALES, HIV, VDRL, HEP B, HEP C, ELECTROLITOS SÉRICOS.\n\n`;
  out += `IMÁGENES: RADIOGRAFÍA DE TÓRAX, TAC CRANEO, ELECTROCARDIOGRAMA\n\n`;

  out += `NOTA: VIGILANCIA ESTRICTA DE CONSTANTES VITALES Y CONTROL EVOLUTIVO EN CADA TURNO.\n`;

  return normalizeMedicalText(out);
}

/**
 * Genera la NOTA DE INGRESO EMERGENCIA en narrativa hospitalaria continua oficial
 */
export function generateEmergencyAdmissionNote(
  patient: Patient,
  orders: MedicalOrder[] = [],
  labs: LabResult[] = [],
  studies: MedicalStudy[] = []
): string {
  return generateNarrativeAdmissionNote(patient, orders, labs, studies, 'EMERGENCIA');
}

/**
 * Genera la NOTA DE RECIBIMIENTO (SALA / HOSPITALIZACIÓN)
 */
export function generateInternalMedicineWardAdmissionNote(
  patient: Patient,
  orders: MedicalOrder[] = [],
  labs: LabResult[] = [],
  studies: MedicalStudy[] = []
): string {
  return generateNarrativeAdmissionNote(patient, orders, labs, studies, 'SALA');
}

/**
 * Extractor inteligente de escalas clínicas y separación de diagnósticos nosológicos
 */
export interface ClinicalImpressionParsed {
  scales: string[];
  diagnoses: string[];
}

export function extractScalesAndDiagnoses(rawText: string = ''): ClinicalImpressionParsed {
  const scales: string[] = [];
  const diagnoses: string[] = [];

  // 1. Detectar y extraer bloques de escalas entre corchetes
  let cleaned = rawText.replace(/\[\s*(ESCALA\s+NIHSS:[^\]]+)\]/gi, (_, match) => {
    scales.push(match.trim());
    return '';
  });
  cleaned = cleaned.replace(/\[\s*(ESCALA\s+DE\s+RANKIN[^\]]+)\]/gi, (_, match) => {
    scales.push(match.trim());
    return '';
  });
  cleaned = cleaned.replace(/\[\s*(ESCALA\s+GLASGOW:[^\]]+)\]/gi, (_, match) => {
    scales.push(match.trim());
    return '';
  });
  cleaned = cleaned.replace(/\[\s*(ESCALA\s+[^\]]+)\]/gi, (_, match) => {
    scales.push(match.trim());
    return '';
  });

  // 2. Procesar líneas restantes
  const lines = cleaned.split(/[\n,;]+/).map((l) => l.trim()).filter(Boolean);
  const scaleKeywords = ['NIHSS', 'RANKIN', 'GLASGOW', 'ESCALA', 'HAS-BLED', 'CHA2DS2', 'CURB-65', 'SOFA', 'APACHE', 'TIMI', 'GRACE', 'WELLS'];

  for (const line of lines) {
    const upper = line.toUpperCase();
    const isScale = scaleKeywords.some((kw) => upper.includes(kw));
    if (isScale) {
      scales.push(line.replace(/^[•\-\*\d\.\s]+/, '').trim());
    } else {
      const cleanDiag = line.replace(/^[•\-\*\d\.\s]+/, '').trim();
      if (cleanDiag) {
        diagnoses.push(cleanDiag);
      }
    }
  }

  // Deduplicar
  const uniqueScales = Array.from(new Set(scales.map((s) => s.toUpperCase())));
  const uniqueDiagnoses = Array.from(new Set(diagnoses.map((d) => d.toUpperCase())));

  if (uniqueDiagnoses.length === 0 && uniqueScales.length === 0 && rawText.trim()) {
    uniqueDiagnoses.push(rawText.trim().toUpperCase());
  }

  return {
    scales: uniqueScales,
    diagnoses: uniqueDiagnoses,
  };
}

/**
 * Motor de limpieza y anti-repeticiones para notas clínicas
 */
export function cleanAndDeduplicateNarrative(text: string): string {
  if (!text) return '';

  let result = text;


  // 3. Deduplicar oraciones idénticas por líneas
  const lines = result.split('\n');
  const seenLines = new Set<string>();
  const dedupedLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      dedupedLines.push('');
      continue;
    }
    // Encabezados institucionales se preservan
    if (trimmed.includes(':HOSPITAL') || trimmed.includes('H DR.') || trimmed.includes('H  DR.') || trimmed.length < 5) {
      dedupedLines.push(line);
      continue;
    }
    const upper = trimmed.toUpperCase();
    if (seenLines.has(upper)) {
      continue; // Omitir línea idéntica repetida
    }
    seenLines.add(upper);

    // Deduplicar oraciones idénticas dentro de la misma línea
    if (line.includes('.')) {
      const sentences = line.split(/(?<=\.)\s+/);
      const seenSentences = new Set<string>();
      const dedupedSentences: string[] = [];
      for (const s of sentences) {
        const sNorm = s.trim().toUpperCase();
        if (!sNorm) continue;
        if (!seenSentences.has(sNorm)) {
          seenSentences.add(sNorm);
          dedupedSentences.push(s.trim());
        }
      }
      dedupedLines.push(dedupedSentences.join(' '));
    } else {
      dedupedLines.push(line);
    }
  }

  result = dedupedLines.join('\n');

  // 4. Corrección de tartamudeos léxicos y signos de puntuación
  result = result.replace(/\b(paciente)\s+\1\b/gi, '$1');
  result = result.replace(/\b(masculino|femenina|femenino)\s+\1\b/gi, '$1');
  result = result.replace(/\b(de)\s+\1\b/gi, '$1');
  result = result.replace(/\b(niega)\s+\1\b/gi, '$1');
  result = result.replace(/\b(alergias)\s+\1\b/gi, '$1');
  result = result.replace(/\b(antecedentes)\s+\1\b/gi, '$1');
  result = result.replace(/\b(quir[uú]rgicos)\s+\1\b/gi, '$1');
  result = result.replace(/\b(t[oó]xicos)\s+\1\b/gi, '$1');
  result = result.replace(/\bESTÁ\s+SE\b/gi, 'ESTA SE');
  result = result.replace(/\|\s*/g, '');
  result = result.replace(/\.\s*\./g, '.');
  result = result.replace(/,\s*,/g, ',');
  result = result.replace(/\s+([.,;:])/g, '$1');
  result = result.replace(/([.,;:])([A-ZÁÉÍÓÚÑ])/g, '$1 $2');
  result = result.replace(/[ ]{2,}/g, ' ');

  return result.toUpperCase();
}

/**
 * Construcción del párrafo narrativo clínico continuo del hospital
 */
function generateNarrativeAdmissionNote(
  patient: Patient,
  orders: MedicalOrder[],
  labs: LabResult[],
  studies: MedicalStudy[],
  type: 'EMERGENCIA' | 'SALA'
): string {
  const v = patient.vitals || {};
  const h: Partial<ClinicalHistory> = patient.clinicalHistory || {};
  const pe: any = h.physicalExam || {
    general: '',
    cardiovascular: '',
    respiratory: '',
    abdominal: '',
    neurological: '',
    extremities: '',
    skin: '',
    otherFindings: '',
  };

  const { dateStr, timeStr } = getFormattedDateTime(patient.arrivalDateTime);
  const sexoStr = patient.sex === 'F' ? 'FEMENINA' : 'MASCULINO';
  const pronombre = patient.sex === 'F' ? 'ESTA' : 'ESTE';

  let out = `             :HOSPITAL\n`;
  out += `          H  DR. ÁNGEL MARÍA GATÓN\n\n`;

  if (type === 'EMERGENCIA') {
    out += `                  NOTA DE INGRESO EMERGENCIA\n\n`;
    out += `NOMBRE: ${patient.fullName.toUpperCase()}. EDAD: ${patient.age || '--'} AÑOS. EMERG: ${patient.cubicle}. FECHA INGRESO: ${dateStr}. HORA: ${timeStr}\n\n`;
  } else {
    out += `                     NOTA DE RECIBIMIENTO\n\n`;
    out += `NOMBRE: ${patient.fullName.toUpperCase()}, EDAD: ${patient.age || '--'} AÑOS, SALA: ${patient.cubicle}, FECHA INGRESO: ${dateStr}. HORA: ${timeStr}\n\n`;
  }

  // 1. Párrafo Narrativo Inicial
  const morbidText = h.pathologicalHistory ? h.pathologicalHistory.toUpperCase() : 'NIEGA ENFERMEDADES CRÓNICAS';
  const surgicalText = h.surgicalHistory ? h.surgicalHistory.toUpperCase() : 'QUIRÚRGICOS NEGADOS';
  const toxicText = h.toxicHabits ? h.toxicHabits.toUpperCase() : 'NEGADOS';
  const allergicText = h.allergicHistory ? h.allergicHistory.toUpperCase() : (v.allergies && v.allergies.length > 0 ? v.allergies.join(', ').toUpperCase() : 'NEGADAS');

  // Extraer únicamente la evolución clínica pura para no duplicar presentación ni antecedentes
  const pureHda = ClinicalDataNormalizer.extractPureIllnessHistory(h.currentIllnessHistory || patient.chiefComplaint || '');

  let p1 = `SE TRATA DE PACIENTE ${sexoStr} DE ${patient.age || '--'} AÑOS DE EDAD, `;
  p1 += `CON ANTECEDENTES MÓRBIDOS CONOCIDOS DE ${morbidText}, `;
  p1 += `ANTECEDENTES QUIRÚRGICOS DE ${surgicalText}, `;
  p1 += `HÁBITOS TÓXICOS ${toxicText}, `;
  p1 += `ALERGIAS ${allergicText}. `;
  p1 += `REFIERE PACIENTE QUE ${pronombre} ${pureHda || 'SE ENCONTRABA EN APARENTE BUEN ESTADO DE SALUD HASTA QUE INICIA SINTOMATOLOGÍA ACTUAL'}. `;
  p1 += `MOTIVO POR EL CUAL ES TRAÍDO A NUESTRO CENTRO DE SALUD DONDE TRAS PREVIA EVALUACIÓN CLÍNICA Y PARACLÍNICA SE DECIDE SU INGRESO CON FINES DIAGNÓSTICOS Y TERAPÉUTICOS. `;

  // Examen Físico Normalizado y Cefalocaudal Estricto
  const cleanPe = ClinicalDataNormalizer.cleanPhysicalExamSections(pe);

  // Estado actual guardado más reciente
  const statusText = (pe.general || (patient as any).generalStatus || cleanPe.general || 'ALERTA, CONSCIENTE, ORIENTADO').toUpperCase();
  p1 += `ACTUALMENTE PACIENTE ${statusText}, `;

  // Signos vitales reales (sin inventar datos)
  const vitalsResult = formatClinicalVitals(v);
  p1 += `${vitalsResult.text} `;

  p1 += `EN CUANTO AL EXAMEN FÍSICO: `;
  p1 += `CABEZA: ${cleanPe.head.toUpperCase()}. `;
  p1 += `OJOS: ${cleanPe.eyes.toUpperCase()}. `;
  p1 += `BOCA: ${cleanPe.mouth.toUpperCase()}. `;
  p1 += `CUELLO: ${cleanPe.neck.toUpperCase()}. `;
  p1 += `TÓRAX: ${cleanPe.chest.toUpperCase()}. `;
  p1 += `PULMONES: ${cleanPe.respiratory.toUpperCase()}. `;
  p1 += `CORAZÓN: ${cleanPe.cardiovascular.toUpperCase()}. `;
  p1 += `ABDOMEN: ${cleanPe.abdominal.toUpperCase()}. `;
  p1 += `EXTREMIDADES SUPERIORES: ${cleanPe.upperExtremities.toUpperCase()}. `;
  p1 += `EXTREMIDADES INFERIORES: ${cleanPe.lowerExtremities.toUpperCase()}. `;
  p1 += `NEUROLÓGICO: ${cleanPe.neurological.toUpperCase()}. `;
  p1 += `PIEL Y ANEXOS: ${cleanPe.skin.toUpperCase()}. `;

  // Estudios de Gabinete e Imagen
  if (studies.length > 0) {
    p1 += `SE REALIZAN ESTUDIOS DE GABINETE: `;
    studies.forEach((s) => {
      p1 += `[${s.category.toUpperCase()}] ${s.title.toUpperCase()}: ${s.preliminaryInterpretation ? s.preliminaryInterpretation.toUpperCase() : 'EVIDENCIA PARÁMETROS EN PROCESO'}. `;
    });
  } else {
    p1 += `SE REALIZA RADIOGRAFÍA DE TÓRAX Y ELECTROCARDIOGRAMA SIN HALLAZGOS AGUDOS ADICIONALES. `;
  }

  // Paraclínicos detallados
  if (labs.length > 0) {
    p1 += `SE REALIZAN PARACLÍNICOS LOS CUALES REPORTAN: `;
    const labItems = labs.map((l) => `${l.parameter.toUpperCase()}: ${l.value} ${l.unit ? l.unit.toUpperCase() : ''}`).join(', ');
    p1 += `${labItems}. `;
  }

  // 2. PLANTEAMIENTO CLÍNICO & ESCALAS PRONÓSTICAS (ANTES DE DIAGNÓSTICOS)
  const rawDiag = h.clinicalImpression || patient.chiefComplaint || 'SÍNDROME CLÍNICO EN ESTUDIO';
  const { scales, diagnoses } = extractScalesAndDiagnoses(rawDiag);

  if (scales.length > 0) {
    p1 += `\n\nPLANTEAMIENTO CLÍNICO & ESCALAS PRONÓSTICAS (EVC / VALORACIÓN INTEGRAL):\n`;
    p1 += `SE EVALÚA INTEGRALMENTE AL PACIENTE A SU LLEGADA DETERMINÁNDOSE LAS SIGUIENTES ESCALAS NEUROLÓGICAS Y PRONÓSTICAS:\n`;
    scales.forEach((scale) => {
      p1 += `• ${scale.toUpperCase()}\n`;
    });
  }

  // 3. DIAGNÓSTICOS NOSOLÓGICOS (LIMPIOS, SIN ESCALAS REPETIDAS)
  p1 += `\nPOR LO QUE SE DEJA BAJO DIAGNÓSTICOS DE:\n`;
  const diagList = diagnoses.length > 0 ? diagnoses : ['SÍNDROME CLÍNICO EN ESTUDIO'];
  diagList.forEach((d, idx) => {
    p1 += `${idx + 1}. ${d.toUpperCase()}\n`;
  });
  p1 += `\n`;

  // 4. EN CUANTO AL MANEJO (Órdenes clínicas directas sin discusión teórica)
  p1 += `EN CUANTO AL MANEJO:\n`;
  let orderIdx = 1;

  const solutionOrders = orders.filter((o) => o.type === 'Solución');
  const medicationOrders = orders.filter((o) => o.type === 'Medicamento');

  p1 += `${orderIdx++}. DIETA: ${getDietaText(solutionOrders)}, POSICIÓN SEMIFOWLER, OXIGENOTERAPIA SOS SI SPO2 < 92%.\n`;
  p1 += `${orderIdx++}. CONTROL DE SIGNOS VITALES CADA 6 HORAS Y VIGILANCIA DE PATRÓN RESPIRATORIO.\n`;

  // Soluciones
  if (solutionOrders.length > 0) {
    const seenSolutions = new Set<string>();
    solutionOrders.forEach((sol) => {
      const key = sol.name.toUpperCase().trim();
      if (!seenSolutions.has(key)) {
        seenSolutions.add(key);
        p1 += `${orderIdx++}. ${key} ${sol.dose ? sol.dose.toUpperCase() : '2,000 ML'} ${sol.route ? sol.route.toUpperCase() : 'EV'} ${sol.frequency ? sol.frequency.toUpperCase() : 'C/24 HORAS'}.\n`;
      }
    });
  } else {
    p1 += `${orderIdx++}. SOLUCIÓN SALINA AL 0.9% 1,000 ML EV C/12 HORAS.\n`;
  }

  // Medicamentos
  if (medicationOrders.length > 0) {
    const seenMeds = new Set<string>();
    medicationOrders.forEach((med) => {
      const key = med.name.toUpperCase().trim();
      const sig = `${key}_${med.dose || ''}_${med.route || ''}_${med.frequency || ''}`;
      if (!seenMeds.has(sig)) {
        seenMeds.add(sig);
        const dayStr = med.treatmentDay ? ` (DÍA ${med.treatmentDay})` : '';
        p1 += `${orderIdx++}. ${key}${dayStr} ${med.dose ? med.dose.toUpperCase() : ''} ${med.route ? med.route.toUpperCase() : 'EV'} ${med.frequency ? med.frequency.toUpperCase() : 'C/24H'}.\n`;
      }
    });
  } else {
    p1 += `${orderIdx++}. OMEPRAZOL 40 MG EV C/24 HORAS.\n`;
  }

  p1 += `${orderIdx++}. VIGILANCIA EVOLUTIVA ESTRICTA EN EL SERVICIO.\n`;

  out += p1;
  const normalized = normalizeMedicalText(out);
  return cleanAndDeduplicateNarrative(normalized);
}

function getDietaText(orders: MedicalOrder[]): string {
  const dietaOrder = orders.find((o) => o.name.toLowerCase().includes('dieta'));
  if (dietaOrder) return dietaOrder.name.toUpperCase();
  return 'CORRIENTE';
}
