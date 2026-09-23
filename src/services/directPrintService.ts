import { FALLBACK_LOGO_BASE64 } from './templatesFallback';
import { Patient, MedicalOrder, LabResult, MedicalStudy } from '../types';
import {
  generateEmergencyAdmissionNote,
  generateInternalMedicineWardAdmissionNote,
  generateIndividualMedicalOrder,
} from './hospitalNoteGenerator';

export interface PrintDocumentOptions {
  title?: string;
  patient?: Patient;
  content?: string;
  docType?: 'emergencia' | 'sala' | 'orden' | 'combinada' | 'historia' | 'evolucion' | 'general';
  orders?: MedicalOrder[];
  labs?: LabResult[];
  studies?: MedicalStudy[];
}

/**
 * Servicio de Impresión Directa Ultrarrápida (0 Retrasos, 0 Lag, Formato 1:1 Idéntico a Descarga)
 */
export function printOfficialHospitalDocument(options: PrintDocumentOptions): void {
  const {
    patient,
    content,
    docType = 'emergencia',
    orders = [],
    labs = [],
    studies = [],
  } = options;

  let logoSrc = './hospital_logo.jpg';
  try {
    const customLogo = localStorage.getItem('hospital_custom_logo');
    if (customLogo) {
      logoSrc = customLogo;
    } else if (FALLBACK_LOGO_BASE64) {
      logoSrc = 'data:image/jpeg;base64,' + FALLBACK_LOGO_BASE64;
    }
  } catch (_) {
    if (FALLBACK_LOGO_BASE64) {
      logoSrc = 'data:image/jpeg;base64,' + FALLBACK_LOGO_BASE64;
    }
  }

  // Helper de datos del paciente
  const pName = (patient?.fullName || 'PACIENTE').toUpperCase();
  const pAge = patient?.age ? `${patient.age} AÑOS` : '--';
  const pCubicle = patient?.cubicle || 'CUBÍCULO 1';
  const pArrival = patient?.arrivalDateTime ? new Date(patient.arrivalDateTime) : new Date();
  const dateStr = pArrival.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = pArrival.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  let htmlBody = '';

  if (docType === 'combinada') {
    // 1. NOTA DE INGRESO
    const isSala = patient?.status === 'ingresados' || (Boolean(patient?.cubicle) && !patient.cubicle.toLowerCase().includes('emerg') && !patient.cubicle.toLowerCase().includes('cub'));
    const noteText = content && content.includes('MEDIDAS GENERALES:')
      ? content.split(/={10,}|\[HOJA OFICIAL|\[SALTO DE PÁGINA/i)[0].trim()
      : isSala
      ? generateInternalMedicineWardAdmissionNote(patient!, orders, labs, studies)
      : generateEmergencyAdmissionNote(patient!, orders, labs, studies);

    const noteBodyClean = noteText
      .replace(/^[\s\S]*?(?:HOSPITAL|DR\.\s+ÁNGEL\s+MARÍA\s+GATÓN)[\s\S]*?(?:HORA:[^\n]+\n+)/i, '')
      .replace(/____________________________________[\s\S]*$/g, '')
      .trim();

    // 2. HOJA DE ORDEN MÉDICA
    const orderText = content && content.includes('MEDIDAS GENERALES:')
      ? content.slice(content.indexOf('MEDIDAS GENERALES:'))
      : generateIndividualMedicalOrder(patient!, orders);

    const orderBodyClean = orderText
      .replace(/^[\s\S]*?(?=MEDIDAS GENERALES:)/i, '')
      .replace(/____________________________________[\s\S]*$/g, '')
      .trim();

    htmlBody = `
      <!-- PÁGINA 1: NOTA DE INGRESO -->
      <div class="print-page">
        <div class="header-logo-container">
          <img src="${logoSrc}" alt="Hospital Regional Dr. Ángel María Gatón" class="header-logo-img" />
        </div>
        <div class="doc-title">${isSala ? 'NOTA DE RECIBIMIENTO' : 'NOTA DE INGRESO EMERGENCIA'}</div>
        <div class="patient-header-line">
          NOMBRE: ${pName} &nbsp;&nbsp; EDAD: ${pAge} &nbsp;&nbsp; ${isSala ? `SALA: ${pCubicle}` : `EMERGENCIA: CUB ${pCubicle}`} &nbsp;&nbsp; FECHA: ${dateStr} &nbsp;&nbsp; HORA: ${timeStr}
        </div>
        <div class="content-body">${escapeHtml(noteBodyClean)}</div>
        <div class="signature-section">
          <div class="signature-line"></div>
          <div class="signature-label">FIRMA DEL MEDICO</div>
        </div>
      </div>

      <!-- PÁGINA 2: HOJA DE ORDEN MÉDICA OFICIAL -->
      <div class="print-page page-break">
        <div class="header-logo-container">
          <img src="${logoSrc}" alt="Hospital Regional Dr. Ángel María Gatón" class="header-logo-img" />
        </div>
        <div class="doc-title">ORDEN MEDICA</div>
        <div class="patient-header-line">
          NOMBRE: ${pName} &nbsp;&nbsp; EDAD: ${pAge} &nbsp;&nbsp; EMERGENCIA: CUB ${pCubicle} &nbsp;&nbsp; FECHA: ${dateStr} &nbsp;&nbsp; HORA: ${timeStr}
        </div>
        <div class="content-body">${escapeHtml(orderBodyClean)}</div>
        <div class="signature-section">
          <div class="signature-line"></div>
          <div class="signature-label">FIRMA DEL MEDICO</div>
        </div>
      </div>
    `;
  } else if (docType === 'orden') {
    const rawOrder = content || (patient ? generateIndividualMedicalOrder(patient, orders) : '');
    const orderBodyClean = rawOrder
      .replace(/^[\s\S]*?(?=MEDIDAS GENERALES:)/i, '')
      .replace(/____________________________________[\s\S]*$/g, '')
      .trim();

    htmlBody = `
      <div class="print-page">
        <div class="header-logo-container">
          <img src="${logoSrc}" alt="Hospital Regional Dr. Ángel María Gatón" class="header-logo-img" />
        </div>
        <div class="doc-title">ORDEN MEDICA</div>
        <div class="patient-header-line">
          NOMBRE: ${pName} &nbsp;&nbsp; EDAD: ${pAge} &nbsp;&nbsp; EMERGENCIA: CUB ${pCubicle} &nbsp;&nbsp; FECHA: ${dateStr} &nbsp;&nbsp; HORA: ${timeStr}
        </div>
        <div class="content-body">${escapeHtml(orderBodyClean)}</div>
        <div class="signature-section">
          <div class="signature-line"></div>
          <div class="signature-label">FIRMA DEL MEDICO</div>
        </div>
      </div>
    `;
  } else {
    let titleText = 'NOTA DE INGRESO EMERGENCIA';
    if (docType === 'sala') titleText = 'NOTA DE RECIBIMIENTO';
    else if (docType === 'historia') titleText = 'HISTORIA CLÍNICA Y EXAMEN FÍSICO';
    else if (docType === 'evolucion') titleText = 'NOTA DE EVOLUCIÓN MÉDICA';

    let rawText = content || '';
    if (!rawText && patient) {
      if (docType === 'sala') {
        rawText = generateInternalMedicineWardAdmissionNote(patient, orders, labs, studies);
      } else {
        rawText = generateEmergencyAdmissionNote(patient, orders, labs, studies);
      }
    }

    const bodyClean = rawText
      .replace(/^[\s\S]*?(?:HOSPITAL|DR\.\s+ÁNGEL\s+MARÍA\s+GATÓN)[\s\S]*?(?:HORA:[^\n]+\n+)/i, '')
      .replace(/____________________________________[\s\S]*$/g, '')
      .trim();

    htmlBody = `
      <div class="print-page">
        <div class="header-logo-container">
          <img src="${logoSrc}" alt="Hospital Regional Dr. Ángel María Gatón" class="header-logo-img" />
        </div>
        <div class="doc-title">${titleText}</div>
        <div class="patient-header-line">
          NOMBRE: ${pName} &nbsp;&nbsp; EDAD: ${pAge} &nbsp;&nbsp; ${docType === 'sala' ? `SALA: ${pCubicle}` : `EMERGENCIA: CUB ${pCubicle}`} &nbsp;&nbsp; FECHA: ${dateStr} &nbsp;&nbsp; HORA: ${timeStr}
        </div>
        <div class="content-body">${escapeHtml(bodyClean)}</div>
        <div class="signature-section">
          <div class="signature-line"></div>
          <div class="signature-label">FIRMA DEL MEDICO</div>
        </div>
      </div>
    `;
  }

  executeIframePrint(htmlBody, `${docType.toUpperCase()}_${pName}`);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Crea e inyecta un iframe invisible de alta velocidad y lanza la impresión instantáneamente
 */
function executeIframePrint(htmlContent: string, docTitle: string): void {
  let iframe = document.getElementById('hospital-print-iframe') as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'hospital-print-iframe';
    iframe.setAttribute('style', 'position:fixed;top:-10000px;left:-10000px;width:1px;height:1px;border:none;');
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    window.print();
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>${docTitle}</title>
      <style>
        @page {
          size: letter portrait;
          margin: 14mm 16mm 14mm 16mm;
        }
        *, *::before, *::after {
          box-sizing: border-box;
        }
        html, body {
          margin: 0;
          padding: 0;
          background: #ffffff !important;
          color: #000000 !important;
          font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
          font-size: 10pt;
          line-height: 1.4;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .print-page {
          width: 100%;
          margin: 0 auto;
          background: #ffffff;
        }
        .page-break {
          page-break-before: always;
          break-before: page;
          margin-top: 15mm;
        }
        .header-logo-container {
          text-align: center;
          margin-bottom: 6px;
        }
        .header-logo-img {
          max-height: 52px;
          max-width: 320px;
          object-fit: contain;
          margin: 0 auto;
          display: block;
        }
        .doc-title {
          text-align: center;
          font-size: 11.5pt;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 4px 0 8px 0;
          color: #000000;
        }
        .patient-header-line {
          font-size: 9.5pt;
          font-weight: bold;
          text-transform: uppercase;
          border-bottom: 1px solid #000000;
          padding-bottom: 4px;
          margin-bottom: 10px;
          color: #000000;
          line-height: 1.35;
        }
        .content-body {
          font-size: 9.5pt;
          line-height: 1.45;
          text-align: justify;
          white-space: pre-wrap;
          font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
          color: #000000;
          margin-bottom: 24px;
        }
        .signature-section {
          margin-top: 30px;
          text-align: center;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .signature-line {
          width: 230px;
          margin: 0 auto 4px auto;
          border-top: 1px solid #000000;
        }
        .signature-label {
          font-size: 8.5pt;
          font-weight: bold;
          text-transform: uppercase;
          color: #000000;
        }
      </style>
    </head>
    <body>
      ${htmlContent}
    </body>
    </html>
  `);
  doc.close();

  // Se lanza de forma inmediata tras 80ms para asegurar la correcta renderización del DOM del iframe
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.warn('Iframe print error, falling back to window.print()', e);
      window.print();
    }
  }, 80);
}
