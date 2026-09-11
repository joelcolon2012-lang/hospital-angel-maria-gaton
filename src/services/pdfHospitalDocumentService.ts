import { jsPDF } from 'jspdf';
import { Patient, MedicalOrder, LabResult, MedicalStudy, ClinicalHistory } from '../types';
import { getTherapeuticDiscussion } from './therapeuticDiscussionService';
import { normalizeMedicalText } from './medicalSpellingService';
import { FALLBACK_LOGO_BASE64 } from './templatesFallback';

/**
 * Dibuja el logo oficial hospitalario:
 * Emite la imagen oficial del hospital con dimensiones y proporciones exactas.
 */
function drawHospitalHeader(doc: jsPDF, yStart: number = 12): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoWidth = 72;
  const logoHeight = 13.65;
  const startX = (pageWidth - logoWidth) / 2;

  try {
    if (FALLBACK_LOGO_BASE64) {
      doc.addImage('data:image/jpeg;base64,' + FALLBACK_LOGO_BASE64, 'JPEG', startX, yStart, logoWidth, logoHeight);
      return yStart + logoHeight + 6;
    }
  } catch (err) {
    console.warn('Fallback a dibujo vectorial de cabecera institucional:', err);
  }

  const primaryColor: [number, number, number] = [2, 132, 199];
  const darkTeal: [number, number, number] = [14, 116, 144];
  const fallbackStartX = pageWidth / 2 - 40;

  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.roundedRect(fallbackStartX, yStart, 3.8, 14, 0.8, 0.8, 'F');
  doc.roundedRect(fallbackStartX + 9.2, yStart, 3.8, 14, 0.8, 0.8, 'F');
  doc.roundedRect(fallbackStartX + 2.5, yStart + 5.2, 8, 3.6, 0.5, 0.5, 'F');

  doc.setTextColor(darkTeal[0], darkTeal[1], darkTeal[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(':HOSPITAL', fallbackStartX + 16, yStart + 5);

  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('DR. ÁNGEL MARÍA GATÓN', fallbackStartX + 16, yStart + 11.5);

  return yStart + 20;
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

  // 6. NOTAS FARMACOLÓGICAS Y DISCUSIONES DE GUÍAS (DEDUPLICADAS)
  const notesList: string[] = [];
  const seenGuides = new Set<string>();
  medicationOrders.forEach((m) => {
    const disc = getTherapeuticDiscussion(m.name);
    if (disc) {
      const guideKey = `${disc.primaryGuide}_${m.name.toUpperCase().trim()}`;
      if (!seenGuides.has(guideKey)) {
        seenGuides.add(guideKey);
        notesList.push(`NOTA: SE INDICA ${m.name.toUpperCase()} (${disc.primaryGuide.toUpperCase()}). ${disc.discussionSummary.toUpperCase()}`);
      }
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

/**
 * Genera y descarga el PDF oficial combinado: NOTA DE INGRESO + HOJA DE ORDEN MÉDICA
 * En un solo documento institucional multipágina con membrete y firmas independientes.
 */
export function exportOfficialCombinedNoteAndOrderPdf(
  patient: Patient,
  orders: MedicalOrder[] = [],
  labs: LabResult[] = [],
  studies: MedicalStudy[] = []
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

  // ========================================================
  // PÁGINA 1: NOTA DE INGRESO / RECIBIMIENTO
  // ========================================================
  let y = drawHospitalHeader(doc, 12);

  const isSala = patient.status === 'ingresados' || (Boolean(patient.cubicle) && !patient.cubicle.toLowerCase().includes('emerg') && !patient.cubicle.toLowerCase().includes('cub'));
  const noteTitle = isSala ? 'NOTA DE RECIBIMIENTO EN SALA' : 'NOTA DE INGRESO EMERGENCIA';

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(noteTitle, pageWidth / 2, y, { align: 'center' });
  y += 7;

  const { dateStr, timeStr } = getHospitalDateTime(patient.arrivalDateTime);
  const ageStr = patient.age ? `${patient.age} AÑOS` : 'N/D';
  const patientHeaderLine = `NOMBRE: ${patient.fullName.toUpperCase()}  EDAD: ${ageStr},  ${isSala ? 'SALA' : 'EMERGENCIA'}: ${patient.cubicle.toUpperCase()}  FECHA: ${dateStr}  HORA: ${timeStr}`;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(patientHeaderLine, margin, y);
  y += 6;

  const printBlock = (text: string, isBold: boolean = false, fontSize: number = 8.5) => {
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(fontSize);
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
    y += 1.5;
  };

  // Narrativa de nota
  const v = patient.vitals || {};
  const h: Partial<ClinicalHistory> = patient.clinicalHistory || {};
  const pe: any = h.physicalExam || {};
  const sexText = patient.sex === 'F' ? 'FEMENINA' : 'MASCULINO';
  const pron = patient.sex === 'F' ? 'ESTA' : 'ESTE';

  let p1 = `SE TRATA DE PACIENTE ${sexText} DE ${ageStr} DE EDAD, CON ANTECEDENTES MÓRBIDOS CONOCIDOS DE ${h.pathologicalHistory ? h.pathologicalHistory.toUpperCase() : 'NIEGA ENFERMEDADES CRÓNICAS'}, EN TRATAMIENTO ACTUAL CON ${h.habitualMedications ? h.habitualMedications.toUpperCase() : 'NINGUNO REFERIDO'}, ANTECEDENTES QUIRÚRGICOS DE ${h.surgicalHistory ? h.surgicalHistory.toUpperCase() : 'QUIRÚRGICOS NEGADOS'}, HÁBITOS TÓXICOS ${h.toxicHabits ? h.toxicHabits.toUpperCase() : 'NEGADOS'}, ALERGIAS ${h.allergicHistory ? h.allergicHistory.toUpperCase() : 'NEGADAS'}. `;
  p1 += `REFIERE QUE ${pron} SE ENCONTRABA EN APARENTE ESTADO DE SALUD HASTA HACE ${h.currentIllnessHistory ? h.currentIllnessHistory.toUpperCase() : 'POCO TIEMPO CUANDO INICIA SINTOMATOLOGÍA'}, MOTIVOS POR LOS CUALES ACUDE A NUESTRO CENTRO DE SALUD DONDE TRAS PREVIA EVALUACIÓN CLÍNICA Y PARACLÍNICA SE DECIDE SU INGRESO CON FINES DIAGNÓSTICOS Y TERAPÉUTICOS. `;
  p1 += `ACTUALMENTE PACIENTE ALERTA Y CONSCIENTE, MANEJANDO SIGNOS VITALES: TA: ${v.systolicBP || '120'}/${v.diastolicBP || '80'} MMHG, FC: ${v.heartRate || '78'} LPM, FR: ${v.respiratoryRate || '18'} RPM, SPO2: ${v.oxygenSaturation || '98'}% AA, TEMP: ${v.temperature || '37'} °C. `;
  p1 += `AL EXAMEN FÍSICO: CABEZA/CUELLO: ${pe.head ? pe.head.toUpperCase() : 'NORMOCÉFALO, PUPILAS ISOCÓRICAS'}. TÓRAX: ${pe.chest ? pe.chest.toUpperCase() : 'SIMÉTRICO, NORMOEXPANSIBLE'}. PULMONES: ${pe.respiratory ? pe.respiratory.toUpperCase() : 'MURMULLO VESICULAR CONSERVADO'}. CORAZÓN: ${pe.cardiovascular ? pe.cardiovascular.toUpperCase() : 'RUIDOS RÍTMICOS, NO SOPLOS'}. ABDOMEN: ${pe.abdominal ? pe.abdominal.toUpperCase() : 'BLANDO, DEPRESIBLE, PERISTALSIS PRESENTE'}. EXTREMIDADES: ${pe.extremities ? pe.extremities.toUpperCase() : 'SIMÉTRICAS, SIN EDEMAS'}. NEUROLÓGICO: ${pe.neurological ? pe.neurological.toUpperCase() : 'GLASGOW 15/15, SIN DÉFICIT FOCAL'}. `;

  if (labs.length > 0) {
    p1 += `PARACLÍNICOS REPORTAN: ` + labs.map((l) => `${l.parameter.toUpperCase()}: ${l.value} ${l.unit ? l.unit.toUpperCase() : ''}`).join(', ') + '. ';
  }
  p1 += `POR LO QUE SE DEJA BAJO DIAGNÓSTICOS DE:`;
  printBlock(normalizeMedicalText(p1));
  y += 2;

  // Diagnósticos
  const rawDiag = h.clinicalImpression || patient.chiefComplaint || 'SÍNDROME CLÍNICO EN ESTUDIO';
  const diagList = rawDiag.split(/[\n,;]+/).map((d) => d.trim().toUpperCase()).filter(Boolean);
  diagList.forEach((d) => {
    if (y > pageHeight - 15) { doc.addPage(); y = 15; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(`  ${d}`, margin + 3, y);
    y += 4.2;
  });
  y += 2;

  // Manejo de la nota
  let p2 = `EN CUANTO AL MANEJO: SE INDICA SOLUCIÓN SALINA AL 0.9% 2,000 ML C/24 HORAS EV PARA MANTENER HIDRATACIÓN Y VÍA PERMEABLE, Y OMEPRAZOL 40 MG C/24 HORAS EV COMO GASTROPROTECCIÓN HOSPITALARIA. `;
  orders.filter(o => o.type === 'Medicamento' && !o.name.toLowerCase().includes('omeprazol')).forEach(med => {
    const disc = getTherapeuticDiscussion(med.name);
    if (disc) {
      p2 += `SE INDICA ${med.name.toUpperCase()} ${med.dose ? med.dose.toUpperCase() : ''} ${med.route ? med.route.toUpperCase() : 'EV'} ${med.frequency ? med.frequency.toUpperCase() : ''}, ${disc.discussionSummary.toUpperCase()} `;
    } else {
      p2 += `SE INDICA ${med.name.toUpperCase()} ${med.dose ? med.dose.toUpperCase() : ''} ${med.route ? med.route.toUpperCase() : ''} ${med.frequency ? med.frequency.toUpperCase() : ''} CON FINES DE CONTROL TERAPÉUTICO ESTRICTO. `;
    }
  });
  p2 += `EN CONCLUSIÓN, EL PACIENTE PERMANECE BAJO MONITORIZACIÓN CONTINUA DE CONSTANTES VITALES Y SEGUIMIENTO EVOLUTIVO ESTRICTO.`;
  printBlock(normalizeMedicalText(p2));

  // Firma Nota
  if (y > pageHeight - 25) { doc.addPage(); y = 15; }
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('____________________________________', pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.text((patient.attendingDoctor || 'DR. COLÓN').toUpperCase(), pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('MÉDICO TRATANTE • HOSPITAL REGIONAL DR. ÁNGEL MARÍA GATÓN', pageWidth / 2, y, { align: 'center' });

  // ========================================================
  // PÁGINA 2: HOJA DE ÓRDENES MÉDICAS OFICIAL
  // ========================================================
  doc.addPage();
  y = drawHospitalHeader(doc, 12);

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('ORDEN MEDICA', pageWidth / 2, y, { align: 'center' });
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`NOMBRE: ${patient.fullName.toUpperCase()}  EDAD: ${ageStr},  SALA: ${patient.cubicle.toUpperCase()}  FECHA: ${dateStr}  HORA: ${timeStr}`, margin, y);
  y += 6;

  // Medidas Generales
  printBlock('MEDIDAS GENERALES: DIETA ADECUADA SEGÚN CONDICIÓN, CABECERA A 30°, MONITORIZACIÓN DE SIGNOS VITALES CADA 6 HORAS, OXIGENOTERAPIA SOS SI SPO2 < 92%.', false, 8.5);

  // Diagnósticos
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('DIAGNÓSTICOS:', margin, y);
  y += 4.5;
  diagList.forEach(d => {
    if (y > pageHeight - 15) { doc.addPage(); y = 15; }
    doc.setFont('helvetica', 'normal');
    doc.text(`  ${d}`, margin + 3, y);
    y += 4.2;
  });
  y += 2;

  // Signos vitales
  printBlock(`SIGNOS VITALES: TA: ${v.systolicBP || '120'}/${v.diastolicBP || '80'} MMHG | FC: ${v.heartRate || '78'} LPM | FR: ${v.respiratoryRate || '18'} RPM | SPO2: ${v.oxygenSaturation || '98'}% AA | TEMP: ${v.temperature || '37'} °C | GLICEMIA: ${v.bloodGlucose || '100'} MG/DL`, false, 8.5);
  y += 2;

  // Medicación y Soluciones
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('MEDICACIÓN Y SOLUCIONES:', margin, y);
  y += 4.5;

  let medIdx = 1;
  const solOrders = orders.filter(o => o.type === 'Solución');
  if (solOrders.length > 0) {
    solOrders.forEach(s => {
      if (y > pageHeight - 15) { doc.addPage(); y = 15; }
      doc.setFont('helvetica', 'normal');
      doc.text(`${medIdx++}.  ${s.name.toUpperCase()} ${(s.dose || '2,000 ML').toUpperCase()} ${(s.frequency || 'C/24 HORAS').toUpperCase()} ${(s.route || 'EV').toUpperCase()}`, margin + 2, y);
      y += 4.2;
    });
  } else {
    doc.setFont('helvetica', 'normal');
    doc.text(`${medIdx++}.  SOLUCIÓN SALINA AL 0.9% 2,000 ML C/24 HORAS EV`, margin + 2, y);
    y += 4.2;
  }

  const medOrders = orders.filter(o => o.type === 'Medicamento');
  if (medOrders.length > 0) {
    medOrders.forEach(m => {
      if (y > pageHeight - 15) { doc.addPage(); y = 15; }
      doc.setFont('helvetica', 'normal');
      doc.text(`${medIdx++}.  ${m.name.toUpperCase()} ${(m.dose || '').toUpperCase()} ${(m.frequency || '').toUpperCase()} ${(m.route || 'EV').toUpperCase()}`, margin + 2, y);
      y += 4.2;
    });
  } else {
    doc.setFont('helvetica', 'normal');
    doc.text(`${medIdx++}.  OMEPRAZOL 40 MG C/24 HORAS EV`, margin + 2, y);
    y += 4.2;
  }
  y += 2;

  // Paraclínicos
  printBlock('PARACLÍNICOS: HEMOGRAMA, UREA, CREATININA, BUN, PERFIL LIPÍDICO, TGO, TGP, ELECTROLITOS SÉRICOS, HIV, VDRL, HEPATITIS B Y C.', false, 8);
  printBlock('IMÁGENES: RADIOGRAFÍA DE TÓRAX, ELECTROCARDIOGRAMA, TAC CRÁNEO SEGÚN PROTOCOLO.', false, 8);

  // Notas farmacológicas deduplicadas
  const seenGuidesComb = new Set<string>();
  const combNotes: string[] = [];
  medOrders.forEach(m => {
    const disc = getTherapeuticDiscussion(m.name);
    if (disc) {
      const k = `${disc.primaryGuide}_${m.name.toUpperCase().trim()}`;
      if (!seenGuidesComb.has(k)) {
        seenGuidesComb.add(k);
        combNotes.push(`NOTA: SE INDICA ${m.name.toUpperCase()} (${disc.primaryGuide.toUpperCase()}). ${disc.discussionSummary.toUpperCase()}`);
      }
    }
  });

  if (combNotes.length > 0) {
    combNotes.forEach(cn => printBlock(cn, false, 8));
  } else {
    printBlock('NOTA: VIGILANCIA ESTRICTA DE CONSTANTES VITALES Y PATRÓN CLÍNICO.', false, 8);
  }

  // Firma Orden
  if (y > pageHeight - 25) { doc.addPage(); y = 15; }
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('____________________________________', pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.text((patient.attendingDoctor || 'DR. COLÓN').toUpperCase(), pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('MÉDICO TRATANTE • HOSPITAL REGIONAL DR. ÁNGEL MARÍA GATÓN', pageWidth / 2, y, { align: 'center' });

  // Descarga
  const filename = `Nota_Mas_Orden_Medica_${patient.fullName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
