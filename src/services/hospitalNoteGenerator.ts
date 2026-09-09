/**
 * Generador de Notas Clínicas y Órdenes Médicas Oficiales
 * Hospital Regional Ángel María Gatón — Dr. Colón
 * 
 * Basado estrictamente en los formatos oficiales hospitalarios validados.
 */

import { Patient, MedicalOrder, LabResult, MedicalStudy, ClinicalHistory } from '../types';
import { normalizeMedicalText } from './medicalSpellingService';
import { getTherapeuticDiscussion } from './therapeuticDiscussionService';

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

  // NOTAS FARMACOLÓGICAS BASADAS EN GUÍAS
  const notesList: string[] = [];
  medicationOrders.forEach((m) => {
    const disc = getTherapeuticDiscussion(m.name);
    if (disc) {
      notesList.push(`NOTA: SE INDICA ${m.name.toUpperCase()} (${disc.primaryGuide.toUpperCase()}). ${disc.discussionSummary.toUpperCase()}`);
    }
  });

  if (notesList.length > 0) {
    notesList.forEach((n) => {
      out += `${n}\n`;
    });
  } else {
    out += `NOTA: VIGILANCIA ESTRICTA DE SIGNOS VITALES Y CONTROL DE GLICEMIAS CAPILARES CADA TURNO.\n`;
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
  const lines = text.split('\n');
  const seenLines = new Set<string>();
  const dedupedLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      dedupedLines.push('');
      continue;
    }
    // Encabezados institucionales se preservan
    if (trimmed.includes(':HOSPITAL') || trimmed.includes('H DR.') || trimmed.length < 5) {
      dedupedLines.push(line);
      continue;
    }
    if (seenLines.has(trimmed.toUpperCase())) {
      continue; // Omitir línea idéntica repetida
    }
    seenLines.add(trimmed.toUpperCase());
    dedupedLines.push(line);
  }

  let result = dedupedLines.join('\n');
  result = result.replace(/\.\s*\./g, '.');
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
  let p1 = `SE TRATA DE PACIENTE ${sexoStr} DE ${patient.age || '--'} AÑOS DE EDAD, `;
  p1 += `CON ANTECEDENTES MÓRBIDOS CONOCIDOS DE ${h.pathologicalHistory ? h.pathologicalHistory.toUpperCase() : 'NIEGA ENFERMEDADES CRÓNICAS'}, `;
  p1 += `EN TRATAMIENTO ACTUAL CON ${h.habitualMedications ? h.habitualMedications.toUpperCase() : 'NINGUNO REFERIDO'}, `;
  p1 += `ANTECEDENTES QUIRÚRGICOS DE ${h.surgicalHistory ? h.surgicalHistory.toUpperCase() : 'QUIRÚRGICOS NEGADOS'}, `;
  p1 += `ANTECEDENTES TÓXICOS ${h.toxicHabits ? h.toxicHabits.toUpperCase() : 'NEGADOS'}, `;
  p1 += `ALERGIAS ${h.allergicHistory ? h.allergicHistory.toUpperCase() : (v.allergies && v.allergies.length > 0 ? v.allergies.join(', ').toUpperCase() : 'NEGADAS')}. `;

  p1 += `REFIERE PACIENTE QUE ${pronombre} SE ENCONTRABA EN APARENTE BUEN ESTADO DE SALUD HASTA HACE ${h.currentIllnessHistory ? h.currentIllnessHistory.toUpperCase() : 'POCO TIEMPO CUANDO INICIA SINTOMATOLOGÍA'}, `;
  p1 += `MOTIVOS POR LOS CUALES ACUDE A NUESTRO CENTRO DE SALUD DONDE TRAS PREVIA EVALUACIÓN CLÍNICA Y PARACLÍNICA SE DECIDE SU INGRESO CON FINES DIAGNÓSTICOS Y TERAPÉUTICOS. `;

  p1 += `ACTUALMENTE PACIENTE ALERTA, CON ADECUADA MECÁNICA VENTILATORIA, AFEBRIL, TOLERANDO AIRE AMBIENTE Y VÍA ORAL, `;
  p1 += `MANEJANDO LOS SIGUIENTES SIGNOS VITALES: TA: ${v.systolicBP || '120'}/${v.diastolicBP || '80'} MMHG, FC: ${v.heartRate || '78'} LPM, FR: ${v.respiratoryRate || '18'} RPM, SPO2: ${v.oxygenSaturation || '98'}% AL AIRE AMBIENTE, TEMP: ${v.temperature || '37'} °C. `;

  // Examen físico narrativo continuo cefalocaudal ordenado
  p1 += `AL EXAMEN FÍSICO: CABEZA: ${pe.head ? pe.head.toUpperCase() : 'NORMOCÉFALA, SIN MASAS NI HUNDIMIENTOS ÓSEOS, ADECUADA IMPLANTACIÓN DE PELO'}. `;
  p1 += `OJOS: ${pe.eyes ? pe.eyes.toUpperCase() : 'SIMÉTRICOS, ESCLERAS ANICTÉRICAS, PUPILAS ISOCÓRICAS Y FOTORREACTIVAS A LA LUZ'}. `;
  if (pe.ears) p1 += `OÍDOS: ${pe.ears.toUpperCase()}. `;
  if (pe.nose) p1 += `NARIZ: ${pe.nose.toUpperCase()}. `;
  p1 += `BOCA: ${pe.mouth ? pe.mouth.toUpperCase() : 'SIMÉTRICA, MUCOSA ORAL HÚMEDA, LENGUA NORMOGLOSA, ÚVULA CENTRAL'}. `;
  p1 += `CUELLO: ${pe.neck ? pe.neck.toUpperCase() : 'SIMÉTRICO, CILÍNDRICO, MÓVIL, TRÁQUEA CENTRAL, TIROIDES EUTRÓFICA, NO INGURGITACIÓN YUGULAR NI SOPLOS'}. `;
  p1 += `TÓRAX: ${pe.chest ? pe.chest.toUpperCase() : 'SIMÉTRICO, NORMODINÁMICO, NORMOEXPANSIVO, SIN TIRAJES'}. `;
  p1 += `PULMONES: ${pe.respiratory ? pe.respiratory.toUpperCase() : 'NORMOVENTILADOS, CON MURMULLO VESICULAR AUDIBLE EN AMBOS CAMPOS PULMONARES, SIN ESTERTORES'}. `;
  p1 += `CORAZÓN: ${pe.cardiovascular ? pe.cardiovascular.toUpperCase() : 'RUIDOS CARDÍACOS RÍTMICOS Y REGULARES, R1 Y R2 ÍNTEGROS, NO SOPLOS AUDIBLES'}. `;
  p1 += `ABDOMEN: ${pe.abdominal ? pe.abdominal.toUpperCase() : 'GLOBOSO, DEPRESIBLE, NO DOLOROSO A LA PALPACIÓN SUPERFICIAL NI PROFUNDA, PERISTALSIS PRESENTE'}. `;
  p1 += `EXTREMIDADES: ${pe.extremities ? pe.extremities.toUpperCase() : 'SIMÉTRICAS, MÓVILES, PULSOS PERIFÉRICOS PRESENTES EN BUENA FORMA Y AMPLITUD, SIN EDEMA'}. `;
  p1 += `NEUROLÓGICO: ${pe.neurological ? pe.neurological.toUpperCase() : 'ALERTA, ORIENTADO EN TRES ESFERAS, GLASGOW 15/15, SIN DÉFICIT FOCAL'}. `;

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

  // 4. EN CUANTO AL MANEJO (Sin duplicaciones de Salina u Omeprazol)
  p1 += `EN CUANTO AL MANEJO: `;

  const solutionOrders = orders.filter((o) => o.type === 'Solución');
  const medicationOrders = orders.filter((o) => o.type === 'Medicamento');

  // Manejo de soluciones
  if (solutionOrders.length > 0) {
    const seenSolutions = new Set<string>();
    solutionOrders.forEach((sol) => {
      const key = sol.name.toUpperCase().trim();
      if (!seenSolutions.has(key)) {
        seenSolutions.add(key);
        p1 += `SE INDICA ${key} ${sol.dose ? sol.dose.toUpperCase() : '2,000 ML'} ${sol.route ? sol.route.toUpperCase() : 'EV'} ${sol.frequency ? sol.frequency.toUpperCase() : 'C/24 HORAS'} CON FINES DE HIDRATACIÓN Y VÍA VENOSA PERMEABLE. `;
      }
    });
  } else {
    p1 += `SE INDICA SOLUCIÓN SALINA AL 0.9% 2,000 ML C/24 HORAS EV CON FINES DE HIDRATACIÓN PARENTERAL Y MANTENIMIENTO HEMODINÁMICO. `;
  }

  // Manejo de medicamentos prescritos sin duplicar
  if (medicationOrders.length > 0) {
    const seenMeds = new Set<string>();
    medicationOrders.forEach((med) => {
      const key = med.name.toUpperCase().trim();
      if (!seenMeds.has(key)) {
        seenMeds.add(key);
        const disc = getTherapeuticDiscussion(med.name);
        const dayStr = med.treatmentDay ? ` (DÍA ${med.treatmentDay})` : '';
        if (disc) {
          p1 += `SE INDICA ${key}${dayStr} ${med.dose ? med.dose.toUpperCase() : ''} ${med.route ? med.route.toUpperCase() : 'EV'} ${med.frequency ? med.frequency.toUpperCase() : ''}, ${disc.discussionSummary.toUpperCase()} `;
        } else {
          p1 += `SE INDICA ${key}${dayStr} ${med.dose ? med.dose.toUpperCase() : ''} ${med.route ? med.route.toUpperCase() : 'EV'} ${med.frequency ? med.frequency.toUpperCase() : ''} CON FINES DE CONTROL TERAPÉUTICO ESTRICTO. `;
        }
      }
    });
  } else {
    p1 += `SE INDICA OMEPRAZOL 40 MG C/24 HORAS EV PARA GASTROPROTECCIÓN HOSPITALARIA. `;
  }

  p1 += `EN CONCLUSIÓN, EL PACIENTE PERMANECE BAJO MONITORIZACIÓN CONTINUA DE CONSTANTES VITALES, VIGILANCIA DE PATRONES NEUROLÓGICOS Y SEGUIMIENTO EVOLUTIVO ESTRICTO EN EL SERVICIO.\n`;

  out += p1;
  const normalized = normalizeMedicalText(out);
  return cleanAndDeduplicateNarrative(normalized);
}

function getDietaText(orders: MedicalOrder[]): string {
  const dietaOrder = orders.find((o) => o.name.toLowerCase().includes('dieta'));
  if (dietaOrder) return dietaOrder.name.toUpperCase();
  return 'CORRIENTE';
}
