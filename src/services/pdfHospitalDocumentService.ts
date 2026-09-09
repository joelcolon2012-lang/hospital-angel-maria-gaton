import { jsPDF } from 'jspdf';
import { Patient, MedicalOrder, LabResult, MedicalStudy, ClinicalHistory } from '../types';
import { getTherapeuticDiscussion } from './therapeuticDiscussionService';
import { normalizeMedicalText } from './medicalSpellingService';

/**
 * Dibuja el logo oficial hospitalario:
 * Logo en forma de H en tono teal/cyan [2, 132, 199] y texto :HOSPITAL / DR. ÁNGEL MARÍA GATÓN
 */
function drawHospitalHeader(doc: jsPDF, yStart: number = 14): number {
  const primaryColor: [number, number, number] = [2, 132, 199]; // Cyan/Teal #0284c7
  const darkTeal: [number, number, number] = [14, 116, 144]; // #0e7490

  // Centrado horizontal
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoHeight = 14;
  const startX = pageWidth / 2 - 40;

  // Dibujo del logo 'H' estilizado
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  
  // Barra izquierda H (con curvatura)
  doc.roundedRect(startX, yStart, 3.8, logoHeight, 0.8, 0.8, 'F');
  // Barra derecha H
  doc.roundedRect(startX + 9.2, yStart, 3.8, logoHeight, 0.8, 0.8, 'F');
  // Barra transversal H
  doc.roundedRect(startX + 2.5, yStart + 5.2, 8, 3.6, 0.5, 0.5, 'F');

  // Texto :HOSPITAL
  doc.setTextColor(darkTeal[0], darkTeal[1], darkTeal[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(':HOSPITAL', startX + 16, yStart + 5);

  // Texto DR. ÁNGEL MARÍA GATÓN
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('DR. ÁNGEL MARÍA GATÓN', startX + 16, yStart + 11.5);

  return yStart + logoHeight + 7;
}

/**
 * Formatea fecha y hora hospitalaria
 */
function getHospitalDateTime(isoStr?: string): { dateStr: string; timeStr: string } {
  const d = isoStr ? new Date(isoStr) : new Date();
  const dateStr = d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return { dateStr, timeStr };
}

/**
 * Genera y descarga el PDF oficial de la ORDEN MEDICA
 */
export function exportOfficialMedicalOrderPdf(patient: Patient, orders: MedicalOrder[] = []) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const margin = 18;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxLineWidth = pageWidth - margin * 2;

  // Header Logo
  let y = drawHospitalHeader(doc, 14);

  // Document Title
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('ORDEN MEDICA', pageWidth / 2, y, { align: 'center' });
  y += 7;

  // Patient Info Header
  const { dateStr, timeStr } = getHospitalDateTime(patient.arrivalDateTime);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const patientLine = `NOMBRE: ${patient.fullName.toUpperCase()}  EDAD: ${patient.age || '--'} AÑOS,  EMERGENCIA: CUB ${patient.cubicle}  FECHA: ${dateStr}  HORA: ${timeStr}`;
  doc.text(patientLine, margin, y);
  y += 7;

  // Helper de texto con chequeo de salto de página
  const printWrapped = (title: string, body: string, isBoldTitle: boolean = true) => {
    if (y > pageHeight - 20) {
      doc.addPage();
      y = 15;
    }

    doc.setFont('helvetica', isBoldTitle ? 'bold' : 'normal');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);

    const fullText = title ? `${title} ${body}` : body;
    const lines = doc.splitTextToSize(fullText, maxLineWidth);
    
    for (let i = 0; i < lines.length; i++) {
      if (y > pageHeight - 15) {
        doc.addPage();
        y = 15;
      }
      doc.text(lines[i], margin, y);
      y += 4.5;
    }
    y += 2;
  };

  // 1. MEDIDAS GENERALES
  const solutionOrders = orders.filter((o) => o.type === 'Solución');
  const dietaOrder = orders.find((o) => o.name.toLowerCase().includes('dieta'));
  const dietaStr = dietaOrder ? dietaOrder.name.toUpperCase() : 'CORRIENTE';
  printWrapped(
    'MEDIDAS GENERALES:',
    `DIETA: ${dietaStr}, POSICIÓN SEMIFOWLER, SIGNOS VITALES CADA 6 HORAS OXIGENOTERAPIA: SOS SI SPO2 MENOR DE 92%`
  );

  // 2. DIAGNOSTICO
  doc.setFont('helvetica', 'bold');
  doc.text('DIAGNOSTICO:', margin, y);
  y += 5;

  const rawDiag = patient.clinicalHistory?.clinicalImpression || patient.chiefComplaint || 'EN ESTUDIO CLÍNICO';
  const diagList = rawDiag
    .split(/[\n,;]+/)
    .map((d) => d.trim().toUpperCase())
    .filter(Boolean);

  doc.setFont('helvetica', 'normal');
  if (diagList.length > 0) {
    diagList.forEach((diag) => {
      if (y > pageHeight - 15) {
        doc.addPage();
        y = 15;
      }
      doc.text(`  ${diag}`, margin + 3, y);
      y += 4.5;
    });
  } else {
    doc.text('  EN ESTUDIO ETIOLÓGICO', margin + 3, y);
    y += 4.5;
  }
  y += 2;

  // 3. SIGNOS VITALES
  const v = patient.vitals || {};
  const tas = v.systolicBP || '120';
  const tad = v.diastolicBP || '80';
  const fc = v.heartRate || '78';
  const fr = v.respiratoryRate || '19';
  const sat = v.oxygenSaturation || '98';
  const temp = v.temperature || '37';
  const glic = v.bloodGlucose || '110';
  printWrapped(
    'SIGNOS VITALES:',
    `TA: ${tas}/${tad} MMHG, FC: ${fc} L/M, FR: ${fr} R/M, SPO2: ${sat}% TEMP: ${temp} GRADOS, GLICEMIA: ${glic} MG/DL`
  );

  // 4. MEDICACIÓN
  doc.setFont('helvetica', 'bold');
  doc.text('MEDICACIÓN:', margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  let medIndex = 1;

  // Soluciones primero
  if (solutionOrders.length > 0) {
    solutionOrders.forEach((s) => {
      if (y > pageHeight - 15) {
        doc.addPage();
        y = 15;
      }
      doc.text(
        `${medIndex++}.  ${s.name.toUpperCase()} ${s.dose ? s.dose.toUpperCase() : '2,000 ML'} ${s.frequency ? s.frequency.toUpperCase() : 'C/24 HORAS'} ${s.route ? s.route.toUpperCase() : 'EV'}`,
        margin,
        y
      );
      y += 4.5;
    });
  } else {
    doc.text(`${medIndex++}.  SOLUCIÓN SALINA AL 0.9% 2,000 ML C/24 HORAS EV`, margin, y);
    y += 4.5;
  }

  // Medicamentos
  const medicationOrders = orders.filter((o) => o.type === 'Medicamento');
  if (medicationOrders.length > 0) {
    medicationOrders.forEach((m) => {
      if (y > pageHeight - 15) {
        doc.addPage();
        y = 15;
      }
      doc.text(
        `${medIndex++}.  ${m.name.toUpperCase()} ${m.dose ? m.dose.toUpperCase() : ''} ${m.frequency ? m.frequency.toUpperCase() : ''} ${m.route ? m.route.toUpperCase() : 'EV'}`,
        margin,
        y
      );
      y += 4.5;
    });
  } else {
    doc.text(`${medIndex++}.  OMEPRAZOL 40 MG C/24 HORAS EV`, margin, y);
    y += 4.5;
  }
  y += 3;

  // 5. PARACLÍNICOS & IMÁGENES
  printWrapped(
    'PARACLÍNICOS:',
    'HEMOGRAMA, UREA, CREATININA, BUN, PERFIL LIPÍDICO, AMILASA, LIPASA, TGO, TGP, ALBUMINA, PROTEÍNAS TOTALES, HIV, VDRL, HEP B, HEP C, ELECTROLITOS SÉRICOS.'
  );

  printWrapped(
    'IMÁGENES:',
    'RADIOGRAFÍA DE TÓRAX, TAC CRANEO, ELECTROCARDIOGRAMA'
  );

  // 6. NOTAS FARMACOLÓGICAS Y DISCUSIONES DE GUÍAS
  const notesList: string[] = [];
  medicationOrders.forEach((m) => {
    const disc = getTherapeuticDiscussion(m.name);
    if (disc) {
      notesList.push(`NOTA: SE INDICA ${m.name.toUpperCase()} (${disc.primaryGuide.toUpperCase()}). ${disc.discussionSummary.toUpperCase()}`);
    }
  });

  if (notesList.length > 0) {
    notesList.forEach((note) => {
      printWrapped('', note, false);
    });
  } else {
    printWrapped('NOTA:', 'VIGILANCIA ESTRICTA DE SIGNOS VITALES Y CONTROL DE GLICEMIAS CAPILARES CADA TURNO.');
  }

  // Guardar archivo
  const filename = `Orden_Medica_${patient.fullName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

/**
 * Genera y descarga el PDF oficial de la NOTA DE INGRESO (EMERGENCIA O SALA / RECIBIMIENTO)
 */
export function exportOfficialAdmissionNotePdf(
  patient: Patient,
  orders: MedicalOrder[] = [],
  labs: LabResult[] = [],
  studies: MedicalStudy[] = [],
  noteType: 'emergencia' | 'sala' = 'emergencia'
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const margin = 18;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxLineWidth = pageWidth - margin * 2;

  // Header Logo
  let y = drawHospitalHeader(doc, 14);

  // Document Title
  const title = noteType === 'emergencia' ? 'NOTA DE INGRESO EMERGENCIA' : 'NOTA DE RECIBIMIENTO';
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(title, pageWidth / 2, y, { align: 'center' });
  y += 7;

  // Patient Info Header
  const { dateStr, timeStr } = getHospitalDateTime(patient.arrivalDateTime);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const ubica = noteType === 'emergencia' ? `EMERG: ${patient.cubicle}` : `SALA: ${patient.cubicle}`;
  const patientLine = `NOMBRE: ${patient.fullName.toUpperCase()}, EDAD: ${patient.age || '--'} AÑOS, ${ubica}, FECHA INGRESO: ${dateStr}. HORA: ${timeStr}`;
  doc.text(patientLine, margin, y);
  y += 7;

  // Helper de texto fluido
  const printBlock = (text: string, isBold: boolean = false) => {
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);

    const lines = doc.splitTextToSize(text, maxLineWidth);
    for (let i = 0; i < lines.length; i++) {
      if (y > pageHeight - 15) {
        doc.addPage();
        y = 15;
      }
      doc.text(lines[i], margin, y);
      y += 4.2;
    }
  };

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

  const sexoStr = patient.sex === 'F' ? 'FEMENINA' : 'MASCULINO';
  const pronombre = patient.sex === 'F' ? 'ESTA' : 'ESTE';

  // 1. PÁRRAFO CLÍNICO NARRATIVO CONTINUO OFICIAL
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

  if (studies.length > 0) {
    p1 += `SE REALIZAN ESTUDIOS DE GABINETE: `;
    studies.forEach((s) => {
      p1 += `[${s.category.toUpperCase()}] ${s.title.toUpperCase()}: ${s.preliminaryInterpretation ? s.preliminaryInterpretation.toUpperCase() : 'EVIDENCIA PARÁMETROS EN PROCESO'}. `;
    });
  } else {
    p1 += `SE REALIZA RADIOGRAFÍA DE TÓRAX Y ELECTROCARDIOGRAMA SIN HALLAZGOS AGUDOS ADICIONALES. `;
  }

  if (labs.length > 0) {
    p1 += `SE REALIZAN PARACLÍNICOS LOS CUALES REPORTAN: `;
    const labItems = labs.map((l) => `${l.parameter.toUpperCase()}: ${l.value} ${l.unit ? l.unit.toUpperCase() : ''}`).join(', ');
    p1 += `${labItems}. `;
  }

  p1 += `POR LO QUE SE DEJA BAJO DIAGNÓSTICOS DE:`;
  printBlock(normalizeMedicalText(p1));
  y += 2;

  // LISTA DE DIAGNÓSTICOS
  const rawDiag = h.clinicalImpression || patient.chiefComplaint || 'SÍNDROME CLÍNICO EN ESTUDIO';
  const diagList = rawDiag
    .split(/[\n,;]+/)
    .map((d) => d.trim().toUpperCase())
    .filter(Boolean);

  diagList.forEach((d) => {
    if (y > pageHeight - 15) {
      doc.addPage();
      y = 15;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(`  ${d}`, margin + 3, y);
    y += 4.5;
  });
  y += 2;

  // 2. EN CUANTO AL MANEJO (Discusión farmacoterapéutica razonada continua)
  let p2 = `EN CUANTO AL MANEJO: EN NUESTRO PACIENTE SE INDICA SOLUCIÓN SALINA AL 0.9% 2,000 ML C/24 HORAS EV CON EL OBJETIVO DE MANTENER UNA ADECUADA HIDRATACIÓN Y PERFUSIÓN SISTÉMICA, DEBIENDO INDIVIDUALIZARSE EL APORTE SEGÚN FUNCIÓN RENAL, DIURESIS Y PRESENCIA DE SOBRECARGA DE VOLUMEN. `;
  p2 += `SE INDICA OMEPRAZOL 40 MG C/24 HORAS EV COMO INHIBIDOR DE LA BOMBA DE PROTONES PARA GASTROPROTECCIÓN, CUYO USO DEBE CORRELACIONARSE CON EL RIESGO DE LESIÓN GASTRODUODENAL O SANGRADO DIGESTIVO. `;

  orders
    .filter((o) => o.type === 'Medicamento' && !o.name.toLowerCase().includes('omeprazol'))
    .forEach((med) => {
      const disc = getTherapeuticDiscussion(med.name);
      if (disc) {
        p2 += `SE INDICA ${med.name.toUpperCase()} ${med.dose ? med.dose.toUpperCase() : ''} ${med.route ? med.route.toUpperCase() : 'EV'} ${med.frequency ? med.frequency.toUpperCase() : ''}, ${disc.discussionSummary.toUpperCase()} `;
      } else {
        p2 += `SE INDICA ${med.name.toUpperCase()} ${med.dose ? med.dose.toUpperCase() : ''} ${med.route ? med.route.toUpperCase() : ''} ${med.frequency ? med.frequency.toUpperCase() : ''} CON FINES DE CONTROL TERAPÉUTICO ESTRICTO. `;
      }
    });

  p2 += `EN CONCLUSIÓN, NUESTRO PACIENTE SE ENCUENTRA BAJO MANEJO DIRIGIDO A ESTABILIZACIÓN HEMODINÁMICA, CONTROL DE CONSTANTES VITALES Y VIGILANCIA DE COMPLICACIONES EN EL SERVICIO HOSPITALARIO.`;

  printBlock(normalizeMedicalText(p2));

  // Guardar archivo
  const filePrefix = noteType === 'emergencia' ? 'Nota_Ingreso_Emergencia' : 'Nota_Recibimiento_Sala';
  const filename = `${filePrefix}_${patient.fullName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
