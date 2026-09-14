/**
 * Exportador Oficial de Historia Clínica Planta en Formato PDF
 * Hospital Regional Dr. Ángel María Gatón - Dr. Joel Colón
 *
 * Emite un documento PDF estructurado de alta resolución, idéntico a la plantilla impresa oficial,
 * con logo institucional, encabezados, paginación y firma del médico.
 */

import { jsPDF } from 'jspdf';
import { ClinicalHistoryPlanta } from '../types';
import { authService } from './authService';
import { FALLBACK_LOGO_BASE64 } from './templatesFallback';

export function getStandardPdfFilename(history: ClinicalHistoryPlanta): string {
  const cleanName = (history.generalData.nombre || 'PACIENTE')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  const dateStr = (history.generalData.fechaIngreso || '')
    .replace(/[/]/g, '-');
  
  const formattedDate = dateStr || new Date().toISOString().slice(0, 10);
  return `HC_${cleanName}_${formattedDate}.pdf`;
}

export function generateClinicalHistoryPdf(history: ClinicalHistoryPlanta): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 18;
  const contentWidth = pageWidth - marginX * 2;
  let y = 14;

  const checkPageBreak = (neededHeight: number): void => {
    if (y + neededHeight > pageHeight - 24) {
      doc.addPage();
      y = 16;
      drawHeaderMini();
    }
  };

  const drawHeaderMini = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('HOSPITAL REGIONAL DR. ÁNGEL MARÍA GATÓN — HISTORIA CLÍNICA PLANTA', marginX, 10);
    doc.text(`EXP: ${history.generalData.nombre}`, pageWidth - marginX, 10, { align: 'right' });
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, 12, pageWidth - marginX, 12);
  };

  // 1. Logo oficial hospitalario
  try {
    if (FALLBACK_LOGO_BASE64) {
      const logoW = 68;
      const logoH = 13;
      const logoX = (pageWidth - logoW) / 2;
      doc.addImage('data:image/jpeg;base64,' + FALLBACK_LOGO_BASE64, 'JPEG', logoX, y, logoW, logoH);
      y += logoH + 6;
    }
  } catch (err) {
    console.warn('Fallback cabecera PDF:', err);
    y += 10;
  }

  // Título centrado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('HISTORIA CLÍNICA', pageWidth / 2, y, { align: 'center' });
  doc.setLineWidth(0.4);
  doc.line(pageWidth / 2 - 25, y + 1.2, pageWidth / 2 + 25, y + 1.2);
  y += 7;

  // Función para títulos de sección subrayados
  const drawSectionTitle = (title: string) => {
    checkPageBreak(12);
    y += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text(title.toUpperCase(), marginX, y);
    const textWidth = doc.getTextWidth(title.toUpperCase());
    doc.line(marginX, y + 0.8, marginX + textWidth, y + 0.8);
    y += 5;
  };

  // Función para campo clave-valor
  const drawField = (label: string, value: string) => {
    checkPageBreak(7);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    const labelText = `${label}: `;
    doc.text(labelText, marginX, y);
    const labelW = doc.getTextWidth(labelText);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const availW = contentWidth - labelW;
    const splitVal = doc.splitTextToSize(value || 'NO REGISTRADO', availW);
    doc.text(splitVal, marginX + labelW, y);
    y += (splitVal.length * 4.2);
  };

  // Función para texto de bloque (párrafos)
  const drawBlockText = (text: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const lines = doc.splitTextToSize(text || 'NO REGISTRADO', contentWidth);
    checkPageBreak(lines.length * 4.2 + 2);
    doc.text(lines, marginX, y);
    y += (lines.length * 4.2 + 2);
  };

  // 1. DATOS GENERALES
  drawSectionTitle('DATOS GENERALES');
  const gd = history.generalData;
  drawField('NOMBRE', gd.nombre);
  drawField('ESTADO CIVIL', gd.estadoCivil);
  drawField('EDAD', gd.edad);
  drawField('RAZA', gd.raza);
  drawField('SEXO', gd.sexo);
  drawField('RELIGIÓN', gd.religion);
  drawField('ESCOLARIDAD', gd.escolaridad);
  drawField('SALA', gd.sala);
  drawField('FUENTE', gd.fuente);
  drawField('FECHA INGRESO', gd.fechaIngreso);
  drawField('HORA', gd.hora);
  drawField('PROCEDENCIA', gd.procedencia);

  // 2. MOTIVOS DE CONSULTA
  drawSectionTitle('MOTIVOS DE CONSULTA:');
  if (history.chiefComplaints && history.chiefComplaints.length > 0) {
    history.chiefComplaints.forEach(mc => {
      drawBlockText(`• ${mc.toUpperCase()}`);
    });
  } else {
    drawBlockText('NO REGISTRADO');
  }

  // 3. HISTORIA DE LA ENFERMEDAD ACTUAL
  drawSectionTitle('HISTORIA DE LA ENFERMEDAD ACTUAL:');
  drawBlockText(history.presentIllness || 'NO REGISTRADA.');

  // 4. ANTECEDENTES PERSONALES PATOLÓGICOS
  drawSectionTitle('ANTECEDENTES PERSONALES PATOLÓGICOS:');
  const path = history.pathologicalHistory;
  drawField('NIÑEZ', path.childhood || 'NEGADOS.');
  drawField('ADOLESCENCIA', path.adolescence || 'NEGADOS.');
  drawField('ADULTEZ', path.adulthood || 'NO REGISTRADOS.');
  drawField('ANTECEDENTES HOSPITALARIOS', path.hospitalizations || 'NEGADOS.');
  drawField('ANTECEDENTES QUIRÚRGICOS', path.surgeries || 'NEGADOS.');
  drawField('ANTECEDENTES TRAUMÁTICOS', path.trauma || 'NEGADOS.');
  drawField('TRANFUSIONALES', path.transfusions || 'NEGADOS.');
  drawField('ANTECEDENTES ALÉRGICOS', path.allergies || 'NEGADOS.');

  let medsText = 'NEGADOS.';
  if (path.medications && path.medications.length > 0) {
    medsText = path.medications.map(m => `${m.name.toUpperCase()} ${m.dose} ${m.unit} ${m.route} ${m.frequency}`).join(', ');
  }
  drawField('ANTECEDENTES MEDICAMENTOSOS', medsText);

  // 5. ANTECEDENTES PERSONALES NO PATOLÓGICOS
  drawSectionTitle('ANTECEDENTES PERSONALES NO PATOLÓGICOS:');
  const np = history.nonPathologicalHistory;
  const tob = np.tobacco;
  let tobText = 'NEGADO.';
  if (tob && tob.consumes) {
    tobText = `${tob.cigarettesPerDay} CIGARRILLOS AL DÍA DURANTE ${tob.yearsSmoking} AÑOS PARA UN IPA DE ${tob.packYears}.`;
  }
  drawField('TABACO', tobText);
  drawField('CAFÉ', np.coffee || 'NEGADO.');
  drawField('ALCOHOL', np.alcohol || 'NEGADO.');
  drawField('DROGAS ILÍCITAS', np.illicitDrugs || 'NEGADAS.');
  drawField('TÉ', np.tea || '1 TAZA OCASIONAL.');
  drawField('TRABAJOS ANTERIORES', np.previousJobs || 'NO ESPECIFICADO.');
  drawField('EXPOSICIÓN A TÓXICOS', np.toxicExposure || 'NEGADA.');

  // 6. HEREDOFAMILIARES
  drawSectionTitle('ANTECEDENTES PERSONALES HEREDOFAMILIARES:');
  const fam = history.familyHistory;
  drawField('PADRE', fam.father.alive ? `VIVO, ${fam.father.morbidities || 'SIN PATOLOGÍA REFERIDA.'}` : `FALLECIDO, CAUSA: ${fam.father.causeOfDeath || 'NO ESPECIFICADA'}.`);
  drawField('MADRE', fam.mother.alive ? `VIVA, ${fam.mother.morbidities || 'SIN PATOLOGÍA REFERIDA.'}` : `FALLECIDA, CAUSA: ${fam.mother.causeOfDeath || 'NO ESPECIFICADA'}.`);
  drawField('HERMANOS', `${fam.siblings.count} HERMANOS. ${fam.siblings.details || ''}`);
  drawField('HIJOS', `${fam.children.count} HIJOS. ${fam.children.details || ''}`);

  // 7. ESFERA PSICOSOCIAL
  drawSectionTitle('ESFERA PSICOSOCIAL:');
  const psy = history.psychosocialHistory;
  drawField('INGRESOS MENSUALES AL HOGAR', psy.monthlyIncome || 'NO ESPECIFICADOS.');
  const h = psy.housing;
  const houseText = psy.narrativeText || `VIVIENDA ${h.housingType}, TECHO DE ${h.roofMaterial}, PAREDES DE ${h.wallMaterial}, PISO DE ${h.floorMaterial}, ${h.roomCount} HABITACIONES PARA ${h.personCount} PERSONAS, ${h.bathroomCount} BAÑO (${h.bathroomLocation}), AGUA: ${h.waterSource}, BASURA: ${h.trashDisposal}.`;
  drawField('VIVIENDA', houseText);

  // 8. REVISIÓN POR SISTEMAS
  drawSectionTitle('REVISIÓN POR SISTEMAS:');
  const ros = history.reviewOfSystems;
  drawField('CARDIOVASCULAR', ros.cardiovascular.status === 'NORMAL' ? 'SIN PATOLOGÍAS REFERIDAS.' : ros.cardiovascular.notes);
  drawField('PULMONAR', ros.pulmonary.status === 'NORMAL' ? 'SIN PATOLOGÍAS REFERIDAS.' : ros.pulmonary.notes);
  drawField('GASTROINTESTINAL', ros.gastrointestinal.status === 'NORMAL' ? 'SIN PATOLOGÍAS REFERIDAS.' : ros.gastrointestinal.notes);
  drawField('GENITOURINARIO', ros.genitourinary.status === 'NORMAL' ? 'SIN PATOLOGÍAS REFERIDAS.' : ros.genitourinary.notes);
  drawField('ENDOCRINOMETABÓLICO', ros.endocrinometabolic.status === 'NORMAL' ? 'SIN PATOLOGÍAS REFERIDAS.' : ros.endocrinometabolic.notes);
  drawField('NEUROSENSORIAL', ros.neurosensory.status === 'NORMAL' ? 'SIN PATOLOGÍAS REFERIDAS.' : ros.neurosensory.notes);
  drawField('MUSCULOESQUELÉTICO', ros.musculoskeletal.status === 'NORMAL' ? 'SIN PATOLOGÍAS REFERIDAS.' : ros.musculoskeletal.notes);
  drawField('HEMATOLÓGICO', ros.hematologic.status === 'NORMAL' ? 'SIN PATOLOGÍAS REFERIDAS.' : ros.hematologic.notes);

  // 9. EXAMEN FÍSICO / ESTADO GENERAL
  drawSectionTitle('EXAMEN FÍSICO');
  drawField('ESTADO GENERAL', history.generalStatus.generalStatusSummary || 'ALERTA, CONSCIENTE, EN REGULARES CONDICIONES.');

  const vit = history.vitalSigns;
  const vitText = `TA: ${vit.systolicBP || '--'}/${vit.diastolicBP || '--'} MMHG, FC: ${vit.heartRate || '--'} L/M, FR: ${vit.respiratoryRate || '--'} R/M, TEMP: ${vit.temperature || '--'} °C, SPO2: ${vit.oxygenSaturation || '--'}%${vit.bmi ? `, IMC: ${vit.bmi} KG/M²` : ''}.`;
  drawBlockText(vitText);

  const pe = history.physicalExam;
  drawField('CABEZA', pe.head);
  drawField('OJOS', pe.eyes);
  drawField('OÍDOS', pe.ears);
  drawField('NARIZ', pe.nose);
  drawField('BOCA', pe.mouth);
  drawField('CUELLO', pe.neck);
  drawField('TÓRAX', pe.thorax);
  drawField('PULMONES', pe.lungs);
  drawField('CORAZÓN', pe.heart);
  drawField('ABDOMEN', pe.abdomen);
  drawField('GENITALES EXTERNOS', pe.externalGenitals);
  drawField('PIEL Y ANEXOS', pe.skin);
  drawField('EXTREMIDADES SUPERIORES', pe.upperExtremities);
  drawField('EXTREMIDADES INFERIORES', pe.lowerExtremities);

  // NEUROLÓGICO
  const neuroNarrative = history.neurologicalExam?.narrativeText || pe.neurological || 'ALERTA, CONSCIENTE, ORIENTADO EN LAS TRES ESFERAS DEL SENSORIO. GLASGOW 15/15.';
  drawField('NEUROLÓGICO', neuroNarrative);

  // 10. DIAGNÓSTICOS
  drawSectionTitle('DIAGNÓSTICOS:');
  if (history.diagnoses && history.diagnoses.length > 0) {
    history.diagnoses.forEach((d, idx) => {
      drawBlockText(`${idx + 1}. ${d.name.toUpperCase()}`);
    });
  } else {
    drawBlockText('1. DIAGNÓSTICO EN ESTUDIO');
  }

  // FIRMA MÉDICA
  checkPageBreak(25);
  y += 8;
  const sig = authService.getActiveDoctorSignature();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('____________________________________', pageWidth / 2, y, { align: 'center' });
  y += 4.5;
  doc.text(sig.name.toUpperCase(), pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`${sig.exequatur.toUpperCase()} • ${sig.specialty.toUpperCase()} • HOSPITAL DR. ÁNGEL MARÍA GATÓN`, pageWidth / 2, y, { align: 'center' });

  // Numeración de páginas
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Página ${p} de ${totalPages}`, pageWidth - marginX, pageHeight - 8, { align: 'right' });
  }

  const filename = getStandardPdfFilename(history);
  doc.save(filename);
}
