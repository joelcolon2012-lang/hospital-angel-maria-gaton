import jsPDF from 'jspdf';
import { Patient, MedicalOrder, LabResult, PatientEvolution } from '../types';

export interface DocumentSectionSelection {
  includeVitals: boolean;
  includeHistory: boolean;
  includePhysicalExam: boolean;
  includeLabs: boolean;
  includeOrders: boolean;
  includeEvolutions: boolean;
  includeDisposition: boolean;
}

export function generatePatientPDF(
  patient: Patient,
  documentTitle: string = 'HISTORIA CLÍNICA DE EMERGENCIA',
  sections: DocumentSectionSelection = {
    includeVitals: true,
    includeHistory: true,
    includePhysicalExam: true,
    includeLabs: true,
    includeOrders: true,
    includeEvolutions: true,
    includeDisposition: true,
  },
  labs: LabResult[] = [],
  orders: MedicalOrder[] = [],
  evolutions: PatientEvolution[] = []
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 16;

  // Header Banner
  doc.setFillColor(15, 76, 92); // Petrol Blue #0F4C5C
  doc.rect(margin, y, contentWidth, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('HOSPITAL REGIONAL ÁNGEL MARÍA GATÓN', margin + 6, y + 8);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Departamento de Medicina de Urgencias y Soporte Vital Avanzado', margin + 6, y + 14);
  doc.text(`Fecha de Emisión: ${new Date().toLocaleString('es-ES')}`, margin + 6, y + 19);

  y += 26;

  // Document Title
  doc.setTextColor(15, 76, 92);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(documentTitle.toUpperCase(), margin, y);
  y += 6;

  // Patient Info Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);

  // Row 1
  doc.setFont('helvetica', 'bold');
  doc.text('Paciente:', margin + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(patient.fullName || 'No registrado', margin + 22, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('Código EMG:', margin + 90, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(patient.internalCode || 'N/A', margin + 115, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('Triaje:', margin + 145, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(patient.triageLevel <= 2 ? 220 : 15, patient.triageLevel <= 2 ? 38 : 76, patient.triageLevel <= 2 ? 38 : 92);
  doc.text(`NIVEL ${patient.triageLevel}`, margin + 160, y + 6);

  // Row 2
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.text('Edad/Sexo:', margin + 4, y + 13);
  doc.setFont('helvetica', 'normal');
  doc.text(`${patient.age || 'N/A'} años / ${patient.sex}`, margin + 24, y + 13);

  doc.setFont('helvetica', 'bold');
  doc.text('Expediente:', margin + 90, y + 13);
  doc.setFont('helvetica', 'normal');
  doc.text(patient.medicalRecordNumber || 'Sin exp.', margin + 115, y + 13);

  doc.setFont('helvetica', 'bold');
  doc.text('Ubicación:', margin + 145, y + 13);
  doc.setFont('helvetica', 'normal');
  doc.text(patient.cubicle || 'Triaje general', margin + 163, y + 13);

  // Row 3
  doc.setFont('helvetica', 'bold');
  doc.text('Llegada:', margin + 4, y + 20);
  doc.setFont('helvetica', 'normal');
  doc.text(patient.arrivalDateTime || new Date().toLocaleString(), margin + 22, y + 20);

  doc.setFont('helvetica', 'bold');
  doc.text('Médico:', margin + 90, y + 20);
  doc.setFont('helvetica', 'normal');
  doc.text(patient.attendingDoctor || 'Dr. Colón', margin + 107, y + 20);

  doc.setFont('helvetica', 'bold');
  doc.text('Estado:', margin + 145, y + 20);
  doc.setFont('helvetica', 'normal');
  doc.text((patient.status || 'activos').toUpperCase(), margin + 160, y + 20);

  y += 32;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > 280) {
      doc.addPage();
      y = 18;
    }
  };

  const addSectionHeader = (title: string) => {
    checkPageBreak(12);
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 76, 92);
    doc.text(title.toUpperCase(), margin + 3, y + 4.5);
    y += 9;
  };

  const addParagraph = (label: string, text?: string) => {
    if (!text || text.trim() === '') return;
    checkPageBreak(12);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text(label, margin + 2, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const splitLines = doc.splitTextToSize(text, contentWidth - 4);
    for (const line of splitLines) {
      checkPageBreak(5);
      doc.text(line, margin + 2, y);
      y += 4;
    }
    y += 2;
  };

  // 1. Motivo y Triaje
  addSectionHeader('1. Motivo de Consulta y Triaje');
  addParagraph('Motivo de Consulta:', patient.chiefComplaint || 'Dato no registrado');

  if (sections.includeVitals && patient.vitals) {
    checkPageBreak(18);
    const v = patient.vitals;
    const vitalsStr = `PA: ${v.systolicBP || '--'}/${v.diastolicBP || '--'} mmHg (PAM: ${v.map || '--'}) | FC: ${v.heartRate || '--'} lpm | FR: ${v.respiratoryRate || '--'} rpm | Temp: ${v.temperature || '--'} °C | SpO2: ${v.oxygenSaturation || '--'}% | Glucemia: ${v.bloodGlucose || '--'} mg/dL | Glasgow: ${v.glasgowTotal || '--'}/15 | EVA Dolor: ${v.painScale ?? '--'}/10 | O2: ${v.supplementalOxygen || 'Aire ambiente'}`;
    addParagraph('Constantes Vitales y Escalas al Ingreso:', vitalsStr);

    if (v.allergies && v.allergies.length > 0) {
      addParagraph('¡ALERGIAS REGISTRADAS!:', v.allergies.join(', '));
    }
    if (v.comorbidities && v.comorbidities.length > 0) {
      addParagraph('Comorbilidades relevantes:', v.comorbidities.join(', '));
    }
  }

  // 2. Historia Clínica
  if (sections.includeHistory && patient.clinicalHistory) {
    const ch = patient.clinicalHistory;
    addSectionHeader('2. Historia de la Enfermedad Actual y Antecedentes');
    addParagraph('Enfermedad Actual:', ch.currentIllnessHistory);
    addParagraph('Antecedentes Patológicos:', ch.pathologicalHistory);
    addParagraph('Antecedentes Quirúrgicos:', ch.surgicalHistory);
    addParagraph('Medicamentos Habituales:', ch.habitualMedications);
    addParagraph('Hábitos Tóxicos:', ch.toxicHabits);
    addParagraph('Antecedentes Familiares:', ch.familyHistory);
    addParagraph('Antecedentes Ginecoobstétricos:', ch.obGynHistory);
    addParagraph('Revisión por Sistemas:', ch.systemsReview);
  }

  // 3. Examen Físico
  if (sections.includePhysicalExam && patient.clinicalHistory?.physicalExam) {
    const pe = patient.clinicalHistory.physicalExam;
    addSectionHeader('3. Examen Físico Segmentario');
    addParagraph('Examen General:', pe.general);
    addParagraph('Cardiovascular:', pe.cardiovascular);
    addParagraph('Respiratorio:', pe.respiratory);
    addParagraph('Abdominal:', pe.abdominal);
    addParagraph('Neurológico:', pe.neurological);
    addParagraph('Extremidades:', pe.extremities);
    addParagraph('Piel y Faneras:', pe.skin);
    addParagraph('Otros Hallazgos:', pe.otherFindings);
  }

  // 4. Paraclínicos
  if (sections.includeLabs && labs.length > 0) {
    addSectionHeader('4. Paraclínicos y Laboratorios Relevantes');
    labs.forEach(l => {
      checkPageBreak(5);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const flagText = l.flag !== 'normal' ? ` [${l.flag.toUpperCase()}]` : '';
      doc.text(`• ${l.panel} - ${l.parameter}: ${l.value} ${l.unit} (Ref: ${l.referenceRange})${flagText}`, margin + 2, y);
      y += 4;
    });
    y += 2;
  }

  // 5. Impresión Clínica y Órdenes
  if (patient.clinicalHistory?.clinicalImpression) {
    addSectionHeader('5. Impresión Diagnóstica y Plan');
    addParagraph('Impresión Diagnóstica Inicial:', patient.clinicalHistory.clinicalImpression);
    addParagraph('Plan Diagnóstico y Terapéutico:', patient.clinicalHistory.diagnosticAndTherapeuticPlan);
  }

  if (sections.includeOrders && orders.length > 0) {
    addSectionHeader('6. Órdenes Médicas y Tratamiento Prescrito');
    orders.forEach(o => {
      checkPageBreak(6);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`• [${o.type.toUpperCase()}] ${o.name} - ${o.dose} (${o.route}, ${o.frequency})`, margin + 2, y);
      y += 3.5;
      if (o.notes || o.indication) {
        doc.setFont('helvetica', 'normal');
        doc.text(`  Indicación/Nota: ${o.indication || ''} ${o.notes || ''}`, margin + 4, y);
        y += 3.5;
      }
    });
    y += 2;
  }

  // 6. Evoluciones
  if (sections.includeEvolutions && evolutions.length > 0) {
    addSectionHeader('7. Registro Cronológico de Evoluciones');
    evolutions.forEach(e => {
      checkPageBreak(12);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`Nota de Evolución: ${e.timestamp} - Médico: ${e.doctorName}`, margin + 2, y);
      y += 3.5;
      doc.setFont('helvetica', 'normal');
      addParagraph('Cambios y Conducta:', `${e.clinicalChanges} | Conducta: ${e.conduct}`);
    });
  }

  // 7. Disposición Final
  if (sections.includeDisposition && patient.disposition) {
    const d = patient.disposition;
    addSectionHeader('8. Disposición Final y Egreso');
    addParagraph('Destino / Desenlace:', `${d.outcome} (${d.timestamp})`);
    addParagraph('Condición al Egreso:', d.dischargeCondition);
    addParagraph('Diagnósticos Finales:', d.finalDiagnoses);
    addParagraph('Tratamiento de Egreso:', d.dischargeTreatment);
    addParagraph('Recomendaciones y Signos de Alarma:', d.redFlags);
    if (d.receivingCenter) {
      addParagraph('Centro / Médico Receptor:', `${d.receivingCenter} - ${d.receivingDoctor || ''}`);
    }
  }

  // Footer on all pages
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'Herramienta de documentación y apoyo clínico. No sustituye el juicio médico ni los protocolos institucionales.',
      margin,
      290
    );
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin - 15, 290);
  }

  return doc;
}
