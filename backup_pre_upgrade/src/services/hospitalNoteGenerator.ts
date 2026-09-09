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
  const pe = h.physicalExam || {
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

  // Examen físico narrativo continuo
  p1 += `AL EXAMEN FÍSICO: CABEZA: NORMOCÉFALA, SIN MASAS NI HUNDIMIENTOS ÓSEOS, ADECUADA IMPLANTACIÓN DE PELO. `;
  p1 += `OJOS: SIMÉTRICOS, ESCLERAS ANICTÉRICAS, PUPILAS ISOCÓRICAS Y FOTORREACTIVAS A LA LUZ, CONJUNTIVAS ${pe.general && pe.general.toLowerCase().includes('palidez') ? 'PÁLIDAS' : 'NORMOPIGMENTADAS'}. `;
  p1 += `BOCA: SIMÉTRICA, MUCOSA ORAL HÚMEDA, LENGUA NORMOGLOSA, ÚVULA CENTRAL, PALADAR DURO Y BLANDO SIN LESIONES. `;
  p1 += `CUELLO: SIMÉTRICO, CILÍNDRICO, MÓVIL, TRÁQUEA CENTRAL, TIROIDES EUTRÓFICA, PULSOS CAROTÍDEOS BILATERALES PRESENTES CON BUENA AMPLITUD Y FORMA, NO INGURGITACIÓN YUGULAR NI SOPLOS AUDIBLES. `;
  p1 += `TÓRAX: SIMÉTRICO, NORMODINÁMICO, NORMOEXPANSIVO, SIN TIRAJES INTERCOSTALES NI SUBCOSTALES, FRÉMITO TÁCTIL CONSERVADO. `;
  p1 += `PULMONES: ${pe.respiratory ? pe.respiratory.toUpperCase() : 'NORMOVENTILADOS, CON MURMULLO VESICULAR AUDIBLE EN AMBOS CAMPOS PULMONARES, SIN ESTERTORES NI RUIDOS AGREGADOS'}. `;
  p1 += `CORAZÓN: ${pe.cardiovascular ? pe.cardiovascular.toUpperCase() : 'RUIDOS CARDÍACOS RÍTMICOS Y REGULARES, R1 Y R2 ÍNTEGROS, NO SOPLOS AUDIBLES NI GALOPE'}. `;
  p1 += `ABDOMEN: ${pe.abdominal ? pe.abdominal.toUpperCase() : 'GLOBOSO, DEPRESIBLE, NO DOLOROSO A LA PALPACIÓN SUPERFICIAL NI PROFUNDA, PERISTALSIS PRESENTE, SIN MEGALIAS NI SIGNOS DE IRRITACIÓN PERITONEAL'}. `;
  p1 += `EXTREMIDADES: ${pe.extremities ? pe.extremities.toUpperCase() : 'SIMÉTRICAS, MÓVILES, PULSOS PERIFÉRICOS PRESENTES EN BUENA FORMA Y AMPLITUD, SIN EDEMA, LLENADO CAPILAR DISTAL MENOR DE 2 SEGUNDOS'}. `;
  p1 += `NEUROLÓGICO: ${pe.neurological ? pe.neurological.toUpperCase() : 'ALERTA, ORIENTADA EN LAS TRES ESFERAS DEL SENSORIO, GLASGOW 15/15, PARES CRANEALES SIN LESIONES, FUERZA MUSCULAR 5/5 GLOBAL, SIN SIGNOS MENÍNGEOS NI DÉFICIT FOCAL'}. `;

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

  p1 += `POR LO QUE SE DEJA BAJO DIAGNÓSTICOS DE:\n`;

  // Diagnósticos
  const rawDiag = h.clinicalImpression || patient.chiefComplaint || 'SÍNDROME CLÍNICO EN ESTUDIO';
  const diagList = rawDiag
    .split(/[\n,;]+/)
    .map((d) => d.trim().toUpperCase())
    .filter(Boolean);

  diagList.forEach((d) => {
    p1 += `${d}\n`;
  });
  p1 += `\n`;

  // EN CUANTO AL MANEJO (Discusión terapéutica continua y fundamentada en guías)
  p1 += `EN CUANTO AL MANEJO: EN NUESTRO PACIENTE SE INDICA SOLUCIÓN SALINA AL 0.9% 2,000 ML C/24 HORAS EV CON EL OBJETIVO DE MANTENER UNA ADECUADA HIDRATACIÓN Y PERFUSIÓN SISTÉMICA, DEBIENDO INDIVIDUALIZARSE EL APORTE SEGÚN FUNCIÓN RENAL, DIURESIS Y PRESENCIA DE SOBRECARGA DE VOLUMEN. `;
  p1 += `SE INDICA OMEPRAZOL 40 MG C/24 HORAS EV COMO INHIBIDOR DE LA BOMBA DE PROTONES PARA GASTROPROTECCIÓN, CUYO USO DEBE CORRELACIONARSE CON EL RIESGO DE LESIÓN GASTRODUODENAL. `;

  orders
    .filter((o) => o.type === 'Medicamento' && !o.name.toLowerCase().includes('omeprazol'))
    .forEach((med) => {
      const disc = getTherapeuticDiscussion(med.name);
      if (disc) {
        p1 += `SE INDICA ${med.name.toUpperCase()} ${med.dose ? med.dose.toUpperCase() : ''} ${med.route ? med.route.toUpperCase() : 'EV'} ${med.frequency ? med.frequency.toUpperCase() : ''}, ${disc.discussionSummary.toUpperCase()} `;
      } else {
        p1 += `SE INDICA ${med.name.toUpperCase()} ${med.dose ? med.dose.toUpperCase() : ''} ${med.route ? med.route.toUpperCase() : ''} ${med.frequency ? med.frequency.toUpperCase() : ''} CON FINES DE CONTROL TERAPÉUTICO ESTRICTO. `;
      }
    });

  p1 += `EN CONCLUSIÓN, NUESTRO PACIENTE SE ENCUENTRA BAJO MANEJO DIRIGIDO A CONTROL HEMODINÁMICO, MONITOREO DE CONSTANTES VITALES Y VIGILANCIA DE COMPLICACIONES CLÍNICAS EN EL SERVICIO.\n`;

  out += p1;
  return normalizeMedicalText(out);
}

function getDietaText(orders: MedicalOrder[]): string {
  const dietaOrder = orders.find((o) => o.name.toLowerCase().includes('dieta'));
  if (dietaOrder) return dietaOrder.name.toUpperCase();
  return 'CORRIENTE';
}
