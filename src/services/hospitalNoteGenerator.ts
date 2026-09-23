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
import { generateTherapeuticDiscussionForOrders } from './therapeuticDiscussionService';

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

  // Dieta
  const dietaOrder = orders.find((o) => o.name.toLowerCase().includes('dieta'));
  const dietaStr = dietaOrder ? dietaOrder.name.toUpperCase() : 'CORRIENTE';

  // Diagnósticos
  const rawDiag = (patient.diagnosesList && patient.diagnosesList.length > 0)
    ? patient.diagnosesList.map((d) => d.name).join('\n')
    : (patient.clinicalHistory?.clinicalImpression || patient.chiefComplaint || 'EN ESTUDIO CLÍNICO');
  const { diagnoses } = extractScalesAndDiagnoses(rawDiag);
  const diagList = diagnoses.length > 0 ? diagnoses : [rawDiag];

  let out = `             :HOSPITAL\n`;
  out += `          H  DR. ÁNGEL MARÍA GATÓN\n\n`;
  out += `                     ORDEN MEDICA\n\n`;
  out += `NOMBRE: ${patient.fullName.toUpperCase()} EDAD: ${patient.age ? `${patient.age} AÑOS.` : '--'} SALA: ${patient.cubicle ? patient.cubicle.toUpperCase() : 'CUBÍCULO 1'} FECHA: ${dateStr} HORA: ${timeStr}\n\n`;

  // MEDIDAS GENERALES
  if (patient.generalMeasures && patient.generalMeasures.trim()) {
    const gm = patient.generalMeasures.trim().toUpperCase();
    out += gm.startsWith('MEDIDAS GENERALES:') ? `${gm}\n\n` : `MEDIDAS GENERALES: ${gm}\n\n`;
  } else {
    out += `MEDIDAS GENERALES: DIETA ${dietaStr.replace(/^DIETA\s+/i, '')}, POSICION SEMI FOWLER, MONITORIZACIÓN DE SIGNOS VITALES CADA 6 HORAS, BARANDAS EN ALTO.\n\n`;
  }

  // DIAGNÓSTICOS
  out += `DIAGNÓSTICOS:\n`;
  diagList.forEach((d) => {
    out += `${d.trim().toUpperCase()}\n`;
  });
  out += `\n`;

  // SIGNOS VITALES
  const vitalsRes = formatClinicalVitals(v);
  out += `${vitalsRes.summaryLine}\n\n`;

  // MEDICACIÓN Y SOLUCIONES
  out += `MEDICACIÓN Y SOLUCIONES:\n`;
  const allMeds = [...solutionOrders, ...medicationOrders, ...otherOrders];
  if (allMeds.length > 0) {
    allMeds.forEach((m) => {
      const name = m.name.toUpperCase();
      const dose = m.dose ? m.dose.toUpperCase() : '';
      const freq = m.frequency ? m.frequency.toUpperCase() : '';
      const route = m.route ? m.route.toUpperCase() : '';
      const obs = m.notes ? ` ${m.notes.toUpperCase()}` : '';
      const line = `• ${name} ${dose} ${freq} ${route}${obs}`.trim().replace(/\s+/g, ' ');
      out += `${line}\n`;
    });
  } else {
    out += `• PENDIENTE DE ESQUEMA FARMACOLÓGICO / SIN ÓRDENES ACTIVAS REGISTRADAS\n`;
  }
  out += `\n`;

  // PARACLINICOS
  if (patient.requestedParaclinics && patient.requestedParaclinics.length > 0) {
    out += `PARACLINICOS: ${patient.requestedParaclinics.join(', ').toUpperCase()}\n`;
  } else {
    out += `PARACLINICOS: HEMOGRAMA, TIPIFICACION, UREA, CREATININA, BUN, ELECTROLITOS, PROTEINA TOTALES, PERFIL LIPIDICO, AMILASA, LIPASA, HIV, HEP B, HEP C , VDRL, AMILASA, LIPASA, ALBUMINA, EXAMEN DE ORINA, RADIOGRAFIA DE TORAX TP, TPT, INR\n`;
  }

  // IMÁGENES (si fueron seleccionadas)
  if (patient.requestedImaging && patient.requestedImaging.length > 0) {
    out += `\nIMAGENES: ${patient.requestedImaging.join(', ').toUpperCase()}\n`;
  }

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

  // Deduplicar oraciones idénticas por líneas
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

  // Corrección de tartamudeos léxicos y signos de puntuación
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
  const pe: any = h.physicalExam || {};

  const { dateStr, timeStr } = getFormattedDateTime(patient.arrivalDateTime);
  const sexoStr = patient.sex === 'F' ? 'FEMENINA' : 'MASCULINO';
  const pronombre = patient.sex === 'F' ? 'ESTA' : 'ESTE';

  let out = `             :HOSPITAL\n`;
  out += `          H  DR. ÁNGEL MARÍA GATÓN\n\n`;

  const title = type === 'EMERGENCIA' ? 'NOTA DE INGRESO EN EMERGENCIA' : 'NOTA DE RECIBIMIENTO EN SALA';
  out += `                  ${title}\n\n`;
  out += `NOMBRE: ${patient.fullName.toUpperCase()} EDAD: ${patient.age ? `${patient.age} AÑOS.` : '--'} SALA: ${patient.cubicle ? patient.cubicle.toUpperCase() : 'CUBÍCULO 1'} FECHA: ${dateStr} HORA: ${timeStr}\n\n`;

  // 1. Párrafo Narrativo Inicial
  const morbidText = h.pathologicalHistory ? h.pathologicalHistory.toUpperCase() : 'NIEGA ENFERMEDADES CRÓNICAS';
  const habitualMedText = h.habitualMedications ? `, MEDICADO CON ${h.habitualMedications.toUpperCase()}` : '';
  const surgicalText = h.surgicalHistory ? h.surgicalHistory.toUpperCase() : 'QUIRÚRGICOS NEGADOS';
  const toxicText = h.toxicHabits ? h.toxicHabits.toUpperCase() : 'NEGADOS';
  const allergicText = h.allergicHistory ? h.allergicHistory.toUpperCase() : (v.allergies && v.allergies.length > 0 ? v.allergies.join(', ').toUpperCase() : 'NEGADAS');

  const pureHda = ClinicalDataNormalizer.extractPureIllnessHistory(h.currentIllnessHistory || patient.chiefComplaint || '');

  let p1 = `SE TRATA DE PACIENTE ${sexoStr} DE ${patient.age || '--'} AÑOS DE EDAD CON ANTECEDENTES MORBIDOS CONOCIDOS DE ${morbidText}${habitualMedText}, ANTECEDENTES QUIRÚRGICOS DE ${surgicalText}, HÁBITOS TÓXICOS ${toxicText}, ALERGIAS ${allergicText}. REFIERE PACIENTE QUE ${pronombre} SE ENCONTRABA EN APARENTE BUEN CONTROL DE SUS COMORBILIDADES HASTA ${pureHda || 'QUE INICIA CUADRO CLÍNICO ACTUAL'}, MOTIVOS POR LOS CUALES ACUDE A NUESTRO CENTRO DE SALUD TRAS PREVIA EVALUACION DE CLINICA Y PARACLINICA SE DECIDE SU INGRESO CON FINES DIAGNOSTICOS Y TERAPÉUTICOS. `;

  const cleanPe = ClinicalDataNormalizer.cleanPhysicalExamSections(pe);
  const statusText = (pe.general || (patient as any).generalStatus || cleanPe.general || 'ALERTA ORIENTADO EN LAS 3 ESFERAS DEL SENSORIO, CON ADECUADA MECANICA VENTILATORIA AFEBRIL TOLERANDO AIRE AMBIENTE Y VIA ORAL').toUpperCase();
  p1 += `ACTUALMENTE PACIENTE ${statusText}, `;

  const vitalsResult = formatClinicalVitals(v);
  p1 += `MANEJANDO LOS SIGUIENTES ${vitalsResult.summaryLine}. `;

  p1 += `AL EXAMEN FÍSICO: `;
  p1 += `CABEZA: ${cleanPe.head.toUpperCase()}. `;
  p1 += `OJOS: ${cleanPe.eyes.toUpperCase()}. `;
  p1 += `OÍDOS: ${(cleanPe as any).ears ? (cleanPe as any).ears.toUpperCase() : 'PABELLONES AURICULARES NORMO IMPLANTADOS, CONDUCTO AUDITIVO EXTERNO PERMEABLE BILATERALMENTE SIN SECRECIONES, NO DOLOR EN TRAGO'}. `;
  p1 += `NARIZ: ${(cleanPe as any).nose ? (cleanPe as any).nose.toUpperCase() : 'SIMETRICA, FOSAS NASALES PERMEABLES, SIN SECRECIONES PATOLOGICAS'}. `;
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

  if (studies.length > 0) {
    p1 += `SE REALIZAN ESTUDIOS DE GABINETE: `;
    studies.forEach((s) => {
      p1 += `[${s.category.toUpperCase()}] ${s.title.toUpperCase()}: ${s.preliminaryInterpretation ? s.preliminaryInterpretation.toUpperCase() : 'SIN HALLAZGOS AGUDOS ADICIONALES'}. `;
    });
  } else {
    p1 += `SE REALIZAN ESTUDIOS DE GABINETE: RADIOGRAFÍA DE TÓRAX Y ELECTROCARDIOGRAMA SIN HALLAZGOS AGUDOS ADICIONALES. `;
  }

  if (labs.length > 0) {
    p1 += `SE REALIZAN PARACLINICAS QUE REPORTA: `;
    const labItems = labs.map((l) => `${l.parameter.toUpperCase()}: ${l.value}${l.unit ? ` ${l.unit.toUpperCase()}` : ''}`).join(', ');
    p1 += `${labItems}. `;
  }

  p1 += `POR LO QUE SE INGRESA BAJO DIAGNOSTICOS DE:\n\n`;

  const rawDiag = (patient.diagnosesList && patient.diagnosesList.length > 0)
    ? patient.diagnosesList.map((d) => d.name).join('\n')
    : (h.clinicalImpression || patient.chiefComplaint || 'SÍNDROME CLÍNICO EN ESTUDIO');
  const { diagnoses } = extractScalesAndDiagnoses(rawDiag);
  const diagList = diagnoses.length > 0 ? diagnoses : [rawDiag];

  diagList.forEach((d) => {
    p1 += `${d.trim().toUpperCase()}\n`;
  });
  p1 += `\n`;

  // Discusión terapéutica continua justificada según guías
  const discussionText = generateTherapeuticDiscussionForOrders(orders);
  p1 += `${discussionText}\n`;

  out += p1;
  return cleanAndDeduplicateNarrative(normalizeMedicalText(out));
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

