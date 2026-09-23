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

  // SIGNOS VITALES (Formato real estricto, sin inventar glicemia)
  const vitalsRes = formatClinicalVitals(v, true);
  out += `${vitalsRes.summaryLine}\n\n`;

  // MEDICACIÓN
  out += `MEDICACIÓN:\n`;
  let medIndex = 1;

  if (solutionOrders.length > 0 || medicationOrders.length > 0) {
    solutionOrders.forEach((s) => {
      const dose = s.dose ? s.dose.toUpperCase() : '';
      const freq = s.frequency ? s.frequency.toUpperCase() : '';
      const route = s.route ? s.route.toUpperCase() : 'EV';
      out += `${medIndex++}. ${s.name.toUpperCase()} ${dose} ${freq} ${route}`.trim() + `\n`;
    });
    medicationOrders.forEach((m) => {
      const dose = m.dose ? m.dose.toUpperCase() : '';
      const freq = m.frequency ? m.frequency.toUpperCase() : '';
      const route = m.route ? m.route.toUpperCase() : 'EV';
      out += `${medIndex++}. ${m.name.toUpperCase()} ${dose} ${freq} ${route}`.trim() + `\n`;
    });
  } else {
    out += ` PENDIENTE DE ESQUEMA FARMACOLÓGICO / SIN ÓRDENES ACTIVAS REGISTRADAS\n`;
  }
  out += `\n`;

  // PARACLÍNICOS, IMÁGENES E INTERCONSULTAS
  out += `PARACLÍNICOS: HEMOGRAMA, UREA, CREATININA, BUN, PERFIL LIPÍDICO, AMILASA, LIPASA, TGO, TGP, ALBUMINA, PROTEÍNAS TOTALES, ELECTROLITOS SÉRICOS (NA, K, CL), GASOMETRÍA ARTERIAL, TIEMPOS DE COAGULACIÓN (TP, TTP, INR), TROPONINAS, HIV, VDRL, HEPATITIS B, HEPATITIS C, EXAMEN GENERAL DE ORINA.\n\n`;
  out += `IMÁGENES: RADIOGRAFÍA DE TÓRAX (PA), TOMOGRAFÍA AXIAL COMPUTARIZADA (TAC) DE CRÁNEO SIMPLE/CONTRASTADA, ELECTROCARDIOGRAMA (EKG 12 DERIVACIONES), ECOGRAFÍA ABDOMINAL/RENAL, ECOCARDIOGRAMA TRANSTORÁCICO.\n\n`;
  out += `INTERCONSULTAS: CARDIOLOGÍA, NEFROLOGÍA, NEUROLOGÍA, CIRUGÍA GENERAL, MEDICINA INTERNA, CUIDADOS INTENSIVOS (UCI), INFECTOLOGÍA.\n\n`;
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

/**
 * Genera la NOTA DE EVOLUCIÓN CLÍNICA con el Sistema SOAP Oficial
 * Orden estricto solicitado:
 * 1. Logo y Encabezado Institucional
 * 2. Desarrollo estilo SOAP
 * 3. Estado Actual y Signos Vitales
 * 4. Plan Terapéutico y Conducta
 * 5. Examen Físico (Pre-cargable de Historia Clínica)
 * 6. Diagnósticos Nosológicos e Impresión Clínica
 * 7. Firma Oficial
 */
export function generateOfficialSoapEvolutionNote(
  patient: Patient,
  evolution: {
    timestamp?: string;
    doctorName?: string;
    vitalSignsSummary?: string;
    subjective?: string;
    objective?: string;
    analysis?: string;
    plan?: string;
    clinicalChanges?: string;
    newResults?: string;
    problemReevaluation?: string;
    updatedDiagnoses?: string;
    conduct?: string;
    physicalExamPreloaded?: string;
  }
): string {
  const { dateStr, timeStr } = getFormattedDateTime(evolution.timestamp);
  const v = patient.vitals || {};
  const docName = evolution.doctorName || patient.attendingDoctor || 'Dr. Joel Colón';

  let out = `             :HOSPITAL\n`;
  out += `          H  DR. ÁNGEL MARÍA GATÓN\n\n`;
  out += `                  NOTA DE EVOLUCIÓN CLÍNICA (MÉTODO S.O.A.P.)\n\n`;
  out += `PACIENTE: ${patient.fullName.toUpperCase()}  |  EDAD: ${patient.age || '--'} AÑOS  |  CAMA/CUBÍCULO: ${patient.cubicle}\n`;
  out += `CÉDULA/EXP: ${patient.medicalRecordNumber || patient.idDocument || 'S/N'}  |  FECHA: ${dateStr}  |  HORA: ${timeStr}\n`;
  out += `MÉDICO TRATANTE: ${docName.toUpperCase()}\n`;
  out += `--------------------------------------------------------------------------------\n\n`;

  // 1. DESARROLLO ESTILO SOAP
  out += `1. DESARROLLO CLÍNICO INTEGRAL (S.O.A.P.):\n\n`;

  // S - SUBJETIVO
  const subjText = evolution.subjective || evolution.clinicalChanges || 'Paciente refiere estabilidad clínica, adecuada tolerancia a la vía oral y descanso nocturno conservado, sin nuevas quejas sintomáticas.';
  out += `[S] SUBJETIVO:\n${subjText.trim()}\n\n`;

  // O - OBJETIVO
  out += `[O] OBJETIVO:\n`;
  const vitalsText = evolution.vitalSignsSummary || formatClinicalVitals(v).text;
  out += `• Constantes Vitales: ${vitalsText}\n`;
  if (evolution.newResults && evolution.newResults.trim()) {
    out += `• Paraclínicos & Resultados Recientes: ${evolution.newResults.trim()}\n`;
  }
  if (evolution.objective && evolution.objective.trim()) {
    out += `• Hallazgos Objetivos Relevantes: ${evolution.objective.trim()}\n`;
  }
  out += `\n`;

  // A - ANÁLISIS
  const analysisText = evolution.analysis || evolution.problemReevaluation || 'Paciente con evolución clínica favorable y respuesta adecuada al esquema terapéutico instaurado. Parámetros hemodinámicos y ventilatorios compensados.';
  out += `[A] ANÁLISIS (REEVALUACIÓN CLÍNICA DE PROBLEMAS):\n${analysisText.trim()}\n\n`;

  // P - PLAN
  const planText = evolution.plan || evolution.conduct || 'Continuar esquema de hidratación y medicación actual, vigilancia estricta de patrón respiratorio y signos de alarma. Control en próximo pase de visita.';
  out += `[P] PLAN TERAPÉUTICO Y METAS DEL DÍA:\n${planText.trim()}\n\n`;

  out += `--------------------------------------------------------------------------------\n`;

  // 2. ESTADO ACTUAL Y SIGNOS VITALES
  out += `2. ESTADO ACTUAL Y CONSTANTES VITALES DETALLADAS:\n`;
  const tas = v.systolicBP || '--';
  const tad = v.diastolicBP || '--';
  const fc = v.heartRate || '--';
  const fr = v.respiratoryRate || '--';
  const sat = v.oxygenSaturation || '--';
  const temp = v.temperature || '--';
  const glic = v.bloodGlucose ? `${v.bloodGlucose} mg/dL` : '______';
  const pain = v.painScale !== undefined && v.painScale !== null ? `${v.painScale}/10` : '--/10';

  out += `• Estado General: ${(patient.clinicalHistory?.physicalExam?.general || 'ALERTA, CONSCIENTE, ORIENTADO EN SUS TRES ESFERAS').toUpperCase()}\n`;
  out += `• TA: ${tas}/${tad} mmHg  |  FC: ${fc} lpm  |  FR: ${fr} rpm  |  SpO2: ${sat}%  |  Temp: ${temp} °C  |  Glicemia: ${glic}  |  Dolor (EVA): ${pain}\n\n`;

  // 3. PLAN TERAPÉUTICO Y CONDUCTA
  out += `3. PLAN TERAPÉUTICO Y CONDUCTA MÉDICA:\n`;
  out += `• ${planText.trim().replace(/\n+/g, '\n• ')}\n\n`;

  // 4. EXAMEN FÍSICO (PRE-CARGABLE DE LA HISTORIA CLÍNICA)
  out += `4. REEVALUACIÓN DE EXAMEN FÍSICO REGIONAL:\n`;
  const peText = evolution.physicalExamPreloaded || (patient.clinicalHistory?.physicalExam ? formatPhysicalExamSummary(patient.clinicalHistory.physicalExam) : 'Examen físico dentro de límites normales, sin focalización neurológica ni signos de irritación peritoneal.');
  out += `${peText.trim()}\n\n`;

  // 5. DIAGNÓSTICOS CLÍNICOS E IMPRESIÓN DIAGNÓSTICA
  out += `5. DIAGNÓSTICOS CLÍNICOS (INGRESO & REEVALUACIÓN):\n`;
  const rawDiag = evolution.updatedDiagnoses || patient.clinicalHistory?.clinicalImpression || patient.chiefComplaint || 'EN ESTUDIO CLÍNICO';
  const { scales, diagnoses } = extractScalesAndDiagnoses(rawDiag);
  const diagList = diagnoses.length > 0 ? diagnoses : [rawDiag];

  diagList.forEach((d, idx) => {
    out += `• ${idx + 1}. ${d.toUpperCase()}\n`;
  });
  if (scales.length > 0) {
    out += `• Escalas Clínicas Registradas: ${scales.join(', ')}\n`;
  }
  out += `\n`;

  out += `--------------------------------------------------------------------------------\n`;
  out += `FIRMA MÉDICA OFICIAL:\n`;
  out += `${docName.toUpperCase()}\n`;
  out += `ESPECIALISTA EN MEDICINA INTERNA / EMERGENCIOLOGÍA\n`;
  out += `${patient.clinicalHistory?.reasonForConsultation ? 'EXEQ. OFICIAL DE LEY' : 'REPÚBLICA DOMINICANA'}\n`;

  return normalizeMedicalText(out);
}

function formatPhysicalExamSummary(pe: any): string {
  const parts: string[] = [];
  if (pe.general) parts.push(`General: ${pe.general}`);
  if (pe.head) parts.push(`Cabeza: ${pe.head}`);
  if (pe.eyes) parts.push(`Ojos: ${pe.eyes}`);
  if (pe.neck) parts.push(`Cuello: ${pe.neck}`);
  if (pe.thorax || pe.respiratory) parts.push(`Tórax y Pulmones: ${pe.thorax || pe.respiratory}`);
  if (pe.cardiovascular) parts.push(`Cardiovascular: ${pe.cardiovascular}`);
  if (pe.abdominal) parts.push(`Abdomen: ${pe.abdominal}`);
  if (pe.upperExtremities) parts.push(`Ext. Superiores: ${pe.upperExtremities}`);
  if (pe.lowerExtremities) parts.push(`Ext. Inferiores: ${pe.lowerExtremities}`);
  if (pe.neurological) parts.push(`Neurológico: ${pe.neurological}`);
  if (pe.skin) parts.push(`Piel: ${pe.skin}`);

  if (parts.length > 0) return parts.join('. ') + '.';
  return pe.general || 'Examen físico basal dentro de límites normales.';
}

