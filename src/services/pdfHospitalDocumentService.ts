import { jsPDF } from 'jspdf';
import { downloadOfficialPdf, officialPartsFor } from './officialDocuments';
import { Patient, MedicalOrder, LabResult, MedicalStudy, ClinicalHistory } from '../types';
import { formatClinicalVitals, extractClinicalStatus, formatPhysicalExam, validateDownloadableClinicalNote } from './clinicalDocumentBuilder';
import { normalizeMedicalText } from './medicalSpellingService';
import { extractScalesAndDiagnoses } from './hospitalNoteGenerator';
import { FALLBACK_LOGO_BASE64 } from './templatesFallback';
import { authService } from './authService';

/**
 * Estampa la línea de firma al pie del documento PDF (sin datos de doctor ni exequátur al imprimir)
 */
function drawDoctorSignatureFooter(doc: jsPDF, y: number, _patient?: Patient): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y > pageHeight - 25) {
    doc.addPage();
    y = 18;
  }
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('____________________________________', pageWidth / 2, y, { align: 'center' });
  return y + 6;
}

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
export function exportOfficialMedicalOrderPdf(patient: Patient, orders: MedicalOrder[] = [], text?: string) {
  // Formato oficial único (mismas medidas que la plantilla ORDEN MEDICA del hospital)
  return downloadOfficialPdf(officialPartsFor('orden', patient, orders, [], [], text), patient);
}

/**
 * Genera y descarga el PDF oficial de la NOTA DE INGRESO (EMERGENCIA O SALA / RECIBIMIENTO)
 */
export function exportOfficialAdmissionNotePdf(
  patient: Patient,
  orders: MedicalOrder[] = [],
  labs: LabResult[] = [],
  studies: MedicalStudy[] = [],
  noteType: 'emergencia' | 'sala' = 'emergencia',
  text?: string
) {
  return downloadOfficialPdf(officialPartsFor(noteType, patient, orders, labs, studies, text), patient);
}

/**
 * Genera y descarga el PDF oficial combinado: NOTA DE INGRESO + HOJA DE ORDEN MÉDICA
 * En un solo documento institucional multipágina con membrete y firmas independientes.
 */
export function exportOfficialCombinedNoteAndOrderPdf(
  patient: Patient,
  orders: MedicalOrder[] = [],
  labs: LabResult[] = [],
  studies: MedicalStudy[] = [],
  text?: string
) {
  return downloadOfficialPdf(officialPartsFor('combinada', patient, orders, labs, studies, text), patient);
}
