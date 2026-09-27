/**
 * Servicio de Generación de Documentos Oficiales en Formato DOCX
 * Hospital Regional Dr. Ángel María Gatón — Dr. Colón
 * 
 * Utiliza las plantillas maestras reales del hospital mediante PizZip y docxtemplater
 * garantizando la conservación de tipografías (Calibri/Arial), márgenes, tablas,
 * encabezados institucionales y redacción en mayúsculas estandarizada.
 */

import PizZip from 'pizzip';
import { db } from '../db/dexieDb';
import {
  Patient,
  PatientEvolution, 
  MedicalOrder, 
  LabResult, 
  MedicalStudy, 
  ClinicalHistory,
  FinalDisposition 
} from '../types';
import { generateTherapeuticDiscussionForOrders, getTherapeuticDiscussion } from './therapeuticDiscussionService';
import { extractScalesAndDiagnoses, cleanAndDeduplicateNarrative } from './hospitalNoteGenerator';
import { ClinicalDataNormalizer } from './clinicalDataNormalizer';
import { formatClinicalVitals, extractClinicalStatus, formatPhysicalExam, validateDownloadableClinicalNote } from './clinicalDocumentBuilder';
import { FALLBACK_LOGO_BASE64, FALLBACK_TEMPLATES, base64ToArrayBuffer } from './templatesFallback';
import { authService } from './authService';
import { buildOfficialParts, parseOfficialText, downloadOfficialDocx, type OfficialDocKind } from './officialDocuments';

export interface DocxExportOptions {
  doctorName?: string;
  exequatur?: string;
  hospitalWard?: string;
  includeTherapeuticDiscussion?: boolean;
  /** Texto final (posiblemente editado en la vista previa). Si se envía, el Word refleja EXACTAMENTE ese texto. */
  text?: string;
}

/**
 * Exporta nota/orden con el formato oficial del hospital (plantillas limpias + marcas de rol).
 * Si hay texto editado en la vista previa, se usa ese texto; si no, se construye desde los datos.
 */
async function exportOfficialDocument(
  kind: OfficialDocKind,
  patient: Patient,
  orders: MedicalOrder[],
  labs: LabResult[],
  studies: MedicalStudy[],
  options: DocxExportOptions
): Promise<void> {
  try {
    const p = options.hospitalWard ? { ...patient, cubicle: options.hospitalWard } : patient;
    const parts = options.text && options.text.trim()
      ? parseOfficialText(options.text, kind, p)
      : buildOfficialParts(kind, p, orders, labs, studies);
    await downloadOfficialDocx(parts, p);
  } catch (error: any) {
    console.error('Error generando documento oficial:', error);
    alert('No se pudo generar el documento Word: ' + (error?.message || error));
  }
}

export function resolveDoctorSignature(patient?: Patient, options?: DocxExportOptions): { docName: string; exequatur: string } {
  const active = authService.getActiveDoctorSignature(patient?.attendingDoctor);
  return {
    docName: (options?.doctorName || active.name).toUpperCase(),
    exequatur: (options?.exequatur || active.exequatur).toUpperCase(),
  };
}

/**
 * Inyecta el logo oficial del hospital en el archivo DOCX si la plantilla contiene medios
 */
async function injectOfficialLogoIfPresent(zip: PizZip): Promise<void> {
  try {
    let logoBuffer: ArrayBuffer | null = null;
    const baseUrl = (import.meta as any).env?.BASE_URL || './';
    const candidates = [
      './hospital_logo.jpg',
      `${baseUrl}hospital_logo.jpg`,
      'hospital_logo.jpg',
      '/hospital_logo.jpg'
    ];

    try {
      const identitySetting = await db.settings.get('hospital_identity_settings');
      if (identitySetting && identitySetting.value && identitySetting.value.logoUrl) {
        candidates.unshift(identitySetting.value.logoUrl);
      } else if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('hospital_custom_logo');
        if (stored) candidates.unshift(stored);
      }
    } catch {}

    for (const url of candidates) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          logoBuffer = await res.arrayBuffer();
          if (logoBuffer && logoBuffer.byteLength > 500) break;
        }
      } catch {}
    }

    if (!logoBuffer && FALLBACK_LOGO_BASE64) {
      logoBuffer = base64ToArrayBuffer(FALLBACK_LOGO_BASE64);
    }

    if (logoBuffer) {
      const files = Object.keys(zip.files);
      for (const f of files) {
        if (f.startsWith('word/media/')) {
          zip.file(f, logoBuffer);
        }
      }
    }
  } catch (err) {
    console.warn('No se pudo inyectar el logo oficial en DOCX:', err);
  }
}

/**
 * Normaliza y formatea la fecha y hora para el encabezado oficial
 */
function getFormattedDateTime(dateString?: string): { date: string; time: string } {
  const dateObj = dateString ? new Date(dateString) : new Date();
  if (isNaN(dateObj.getTime())) {
    const now = new Date();
    return {
      date: `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`,
      time: now.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()
    };
  }

  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  const time = dateObj.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();

  return { date: `${day}/${month}/${year}`, time };
}

/**
 * Escapa caracteres especiales para inserción en XML de Word
 */
function escapeXml(unsafe: string = ''): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Genera el XML de un párrafo de Word preservando el formato y estilo estándar
 */
function createDocxParagraphXml(text: string, isBold: boolean = false, isCentered: boolean = false, spaceAfter: number = 160): string {
  const clean = escapeXml(text);
  const boldTag = isBold ? '<w:b/><w:bCs/>' : '';
  const alignTag = isCentered ? '<w:jc w:val="center"/>' : '<w:jc w:val="both"/>';

  return `
    <w:p>
      <w:pPr>
        <w:spacing w:before="60" w:after="${spaceAfter}" w:line="276" w:lineRule="auto"/>
        ${alignTag}
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
          ${boldTag}
          <w:sz w:val="22"/>
          <w:szCs w:val="22"/>
        </w:rPr>
        <w:t xml:space="preserve">${clean}</w:t>
      </w:r>
    </w:p>
  `;
}

/**
 * Genera el XML de un salto de página oficial en Word
 */

/**
 * Extrae el párrafo del logo institucional (<w:drawing>) de la plantilla original
 */
function extractLogoParagraphXml(xml: string): string {
  const match = xml.match(/<w:p\b(?:(?!<w:p[\s>])[\s\S])*?<w:drawing[\s\S]*?<\/w:p>/);
  return match ? match[0] : '';
}

function createDocxPageBreakXml(): string {
  return `
    <w:p>
      <w:pPr>
        <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
      </w:pPr>
      <w:r>
        <w:br w:type="page"/>
      </w:r>
    </w:p>
  `;
}

/**
 * Carga el archivo de plantilla (.docx) resolviendo URLs relativas de Vite / GitHub Pages
 * y utilizando plantilla en memoria Base64 como garantía absoluta de disponibilidad.
 */
async function loadTemplateBuffer(templateFilename: string): Promise<ArrayBuffer> {
  const cleanName = templateFilename.trim();
  const encName = encodeURIComponent(cleanName);
  const baseUrl = (import.meta as any).env?.BASE_URL || './';
  const urls = [
    `${baseUrl}templates/${encName}`,
    `./templates/${encName}`,
    `templates/${encName}`,
    `/templates/${encName}`
  ];

  for (const u of urls) {
    try {
      const resp = await fetch(u);
      if (resp.ok) {
        const buf = await resp.arrayBuffer();
        if (buf && buf.byteLength > 1000) return buf;
      }
    } catch {}
  }

  if (FALLBACK_TEMPLATES[cleanName]) {
    return base64ToArrayBuffer(FALLBACK_TEMPLATES[cleanName]);
  }
  throw new Error(`No se pudo cargar la plantilla maestra "${templateFilename}"`);
}

/**
 * Dispara la descarga del archivo binario .docx en el navegador
 */
function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * 1. GENERAR NOTA DE INGRESO EN EMERGENCIA (.DOCX)
 */

/**
 * Genera el texto de manejo intrahospitalario numerado y libre de ensayos o discusiones teóricas
 */
export function buildCleanHospitalManagement(orders: MedicalOrder[] = []): string {
  const solutions = orders.filter(o => o.type === 'Solución');
  const medications = orders.filter(o => o.type === 'Medicamento');
  const orderItems: string[] = [];

  // 1. Dieta
  const dietOrder = orders.find(o => o.name.toLowerCase().includes('dieta') || o.name.toLowerCase().includes('npo'));
  if (dietOrder) {
    orderItems.push(dietOrder.name.toUpperCase());
  } else {
    orderItems.push('DIETA ADECUADA SEGÚN CONDICIÓN CLÍNICA');
  }

  // 2. Soluciones
  if (solutions.length > 0) {
    solutions.forEach(s => {
      const dose = s.dose ? s.dose.toUpperCase() : '';
      const route = s.route ? s.route.toUpperCase() : 'EV';
      const freq = s.frequency ? s.frequency.toUpperCase() : '';
      orderItems.push(`${s.name.toUpperCase()} ${dose} ${route} ${freq}`.trim());
    });
  } else {
    orderItems.push('SOLUCIÓN SALINA AL 0.9% 1,000 ML C/12 HORAS EV CON FINES DE HIDRATACIÓN');
  }

  // 3. Medicamentos
  if (medications.length > 0) {
    medications.forEach(m => {
      const pres = m.presentation ? `(${m.presentation.toUpperCase()}) ` : '';
      const dose = m.dose ? m.dose.toUpperCase() : '';
      const route = m.route ? m.route.toUpperCase() : 'EV';
      const freq = m.frequency ? m.frequency.toUpperCase() : '';
      const dayText = m.treatmentDay ? ` [DÍA ${m.treatmentDay}]` : '';
      orderItems.push(`${m.name.toUpperCase()} ${pres}${dose} ${route} ${freq}${dayText}`.trim());
    });
  } else {
    orderItems.push('OMEPRAZOL 40 MG C/24 HORAS EV GASTROPROTECCIÓN');
  }

  // 4. Medidas y Monitorización
  orderItems.push('MONITORIZACIÓN CONTINUA DE CONSTANTES VITALES CADA 6 HORAS');
  orderItems.push('VIGILANCIA ESTRICTA Y REEVALUACIÓN MÉDICA PERIÓDICA');

  return 'EN CUANTO AL MANEJO: SE INDICA ' + orderItems.map((item, idx) => `${idx + 1}. ${item}`).join('. ') + '.';
}

export async function generateEmergencyNoteDocx(
  patient: Patient,
  orders: MedicalOrder[] = [],
  labs: LabResult[] = [],
  options: DocxExportOptions = {},
  studies: MedicalStudy[] = []
): Promise<void> {
  return exportOfficialDocument('emergencia', patient, orders, labs, studies, options);
}

/**
 * 2. GENERAR NOTA DE RECIBIMIENTO / TRASLADO A SALA (.DOCX)
 */
export async function generateWardTransferNoteDocx(
  patient: Patient,
  orders: MedicalOrder[] = [],
  labs: LabResult[] = [],
  options: DocxExportOptions = {},
  studies: MedicalStudy[] = []
): Promise<void> {
  return exportOfficialDocument('sala', patient, orders, labs, studies, options);
}

/**
 * 3. GENERAR ORDEN MÉDICA OFICIAL (.DOCX)
 */
export async function generateMedicalOrderDocx(
  patient: Patient,
  orders: MedicalOrder[] = [],
  options: DocxExportOptions = {}
): Promise<void> {
  return exportOfficialDocument('orden', patient, orders, [], [], options);
}

/**
 * 3B. GENERAR DOCUMENTO COMBINADO: NOTA DE INGRESO + ORDEN MÉDICA (.DOCX)
 * Genera en un solo archivo Word la Nota de Ingreso y la Hoja de Órdenes Médicas
 * separadas por un salto de página oficial con membrete y firmas independientes.
 */
export async function generateCombinedNoteAndOrderDocx(
  patient: Patient,
  orders: MedicalOrder[] = [],
  labs: LabResult[] = [],
  studies: MedicalStudy[] = [],
  options: DocxExportOptions = {}
): Promise<void> {
  return exportOfficialDocument('combinada', patient, orders, labs, studies, options);
}

/**
 * 4. GENERAR DISPOSICIÓN FINAL Y DOCUMENTO DE EGRESO / TRASLADO (.DOCX)
 */
export async function generateFinalDispositionDocx(
  patient: Patient,
  disposition: FinalDisposition,
  options: DocxExportOptions = {}
): Promise<void> {
  try {
    const arrayBuffer = await loadTemplateBuffer('ORDEN MEDICA.docx');
    const zip = new PizZip(arrayBuffer);
    await injectOfficialLogoIfPresent(zip);

    const { date, time } = getFormattedDateTime(disposition.timestamp);
    const { docName, exequatur } = resolveDoctorSignature(patient, options);

    const sexText = patient.sex === 'F' ? 'FEMENINA' : 'MASCULINO';
    const ageText = patient.age ? `${patient.age} AÑOS` : 'N/D';
    const recordNum = patient.medicalRecordNumber || patient.idDocument || patient.internalCode || 'S/N';

    const headerLine = `NOMBRE: ${patient.fullName.toUpperCase()}  EDAD: ${ageText}  EXP/CÉD: ${recordNum.toUpperCase()}  FECHA: ${date}  HORA: ${time}`;

    let xml = zip.file('word/document.xml')?.asText() || '';
    const logoParagraphXml = extractLogoParagraphXml(xml);

    const newParagraphs: string[] = [
      ...(logoParagraphXml ? [logoParagraphXml] : []),
      createDocxParagraphXml('HOSPITAL REGIONAL DR. ÁNGEL MARÍA GATÓN', true, true, 40),
      createDocxParagraphXml('SERVICIO DE EMERGENCIAS Y MEDICINA INTERNA', true, true, 80),
      createDocxParagraphXml('DISPOSICIÓN FINAL Y DOCUMENTO DE EGRESO / TRASLADO', true, true, 180),
      createDocxParagraphXml(headerLine, true, false, 140),
      createDocxParagraphXml(`DECISIÓN CLÍNICA: ${disposition.outcome.toUpperCase()} (DESTINO: ${(disposition.destination || 'DOMICILIO').toUpperCase()})`, true, false, 140),
      createDocxParagraphXml('1. DIAGNÓSTICO FINAL AL EGRESO:', true, false, 40),
      createDocxParagraphXml((disposition.finalDiagnoses || patient.clinicalHistory?.clinicalImpression || 'SÍNDROME CLÍNICO RESUELTO / EN CONTROL AMBULATORIO').toUpperCase(), false, false, 120),
      createDocxParagraphXml('2. CONDICIÓN CLÍNICA AL EGRESO:', true, false, 40),
      createDocxParagraphXml((disposition.dischargeCondition || 'HEMODINÁMICAMENTE ESTABLE, AFEBRIL, SIN DISTRÉS RESPIRATORIO, ADECUADA TOLERANCIA VÍA ORAL').toUpperCase(), false, false, 120),
      createDocxParagraphXml('3. TRATAMIENTO FARMACOLÓGICO DE EGRESO (RECETA DOMICILIARIA):', true, false, 40),
      createDocxParagraphXml((disposition.dischargeTreatment || 'CONTINUAR CON MEDICACIÓN HABITUAL Y CONTROLES SEGÚN PAUTA AMBULATORIA').toUpperCase(), false, false, 120),
      createDocxParagraphXml('4. RECOMENDACIONES GENERALES Y PLAN:', true, false, 40),
      createDocxParagraphXml((disposition.recommendations || 'REPOSO RELATIVO, DIETA ADECUADA A SU CONDICIÓN, HIDRATACIÓN ORAL Y SEGUIMIENTO POR CONSULTA EXTERNA').toUpperCase(), false, false, 120),
      createDocxParagraphXml('5. SIGNOS DE ALARMA Y CRITERIOS DE RECONSULTA URGENTE:', true, false, 40),
      createDocxParagraphXml((disposition.redFlags || 'ACUDIR INMEDIATAMENTE AL SERVICIO DE EMERGENCIAS ANTE DOLOR EN PECHO, DIFICULTAD PARA RESPIRAR, FIEBRE MAYOR A 38.5°C O DETERIORO DEL ESTADO DE CONCIENCIA').toUpperCase(), false, false, 160),
    ];

    if (disposition.outcome === 'Referimiento' || disposition.outcome === 'Traslado') {
      newParagraphs.push(createDocxParagraphXml('DATOS DE TRASLADO / REFERIMIENTO:', true, false, 40));
      newParagraphs.push(createDocxParagraphXml(`CENTRO RECEPTOR: ${(disposition.receivingCenter || 'NO ESPECIFICADO').toUpperCase()}`, false, false, 40));
      newParagraphs.push(createDocxParagraphXml(`MÉDICO RECEPTOR: ${(disposition.receivingDoctor || 'MÉDICO DE GUARDIA').toUpperCase()}`, false, false, 40));
      newParagraphs.push(createDocxParagraphXml(`RESUMEN CLÍNICO: ${(disposition.referralSummary || 'SE TRASLADA PARA CONTINUIDAD DE MANEJO ESPECIALIZADO').toUpperCase()}`, false, false, 140));
    }

    newParagraphs.push(createDocxParagraphXml('', false, false, 160));
    newParagraphs.push(createDocxParagraphXml(`____________________________________`, true, true, 40));
    newParagraphs.push(createDocxParagraphXml(`${docName.toUpperCase()}`, true, true, 40));
    newParagraphs.push(createDocxParagraphXml(`${exequatur.toUpperCase()} • MÉDICO TRATANTE • HOSPITAL REGIONAL DR. ÁNGEL MARÍA GATÓN`, false, true, 100));

    const bodyMatch = xml.match(/<w:body>([\s\S]*?)<\/w:body>/);
    if (bodyMatch) {
      const sectPrMatch = xml.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/);
      const sectPr = sectPrMatch ? sectPrMatch[0] : '';
      xml = xml.replace(/<w:body>[\s\S]*?<\/w:body>/, `<w:body>${newParagraphs.join('')}${sectPr}</w:body>`);
      zip.file('word/document.xml', xml);
    }

    const outBlob = zip.generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE'
    });

    const safeName = patient.fullName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    const safeDate = date.replace(/\//g, '-');
    triggerBrowserDownload(outBlob, `DISPOSICION_EGRESO_${safeName}_${safeDate}.docx`);
  } catch (error: any) {
    console.error('Error generando DOCX de Disposición Final:', error);
    alert('Error al generar la disposición final DOCX: ' + error.message);
  }
}

/**
 * 5. GENERAR NOTA DE EVOLUCIÓN MÉDICA HOSPITALARIA (.DOCX)
 */
export async function generateEvolutionDocx(
  patient: Patient,
  evolutions: PatientEvolution[] = [],
  orders: MedicalOrder[] = [],
  options: DocxExportOptions = {}
): Promise<void> {
  try {
    const arrayBuffer = await loadTemplateBuffer('NOTA DE RECIBIMIENTO EN SALA.docx');
    const zip = new PizZip(arrayBuffer);
    await injectOfficialLogoIfPresent(zip);

    const { date, time } = getFormattedDateTime();
    const { docName, exequatur } = resolveDoctorSignature(patient, options);
    const bed = options.hospitalWard || patient.cubicle || 'SALA 3';

    const lastEvo = evolutions[0];
    const dayNumber = evolutions.length > 0 ? evolutions.length : 1;

    const headerLine = `NOMBRE: ${patient.fullName.toUpperCase()}  EDAD: ${patient.age ? `${patient.age} AÑOS` : 'N/D'}  SALA: ${bed.toUpperCase()}  FECHA: ${date}  HORA: ${time}`;

    const v = patient.vitals || {};
    const vitalsLine = `SIGNOS VITALES DEL TURNO: ${formatClinicalVitals(v).summaryLine.replace(/^SIGNOS VITALES:\s*/i, '')}`;

    const subjectiveText = lastEvo ? lastEvo.clinicalChanges.toUpperCase() : 'PACIENTE EN ADECUADA CONDICIÓN CLÍNICA GENERAL, AFEBRIL, HEMODINÁMICAMENTE ESTABLE, TOLERANDO VÍA ORAL Y SIN REGISTRO DE EVENTOS AGUDOS DURANTE EL TURNO.';
    const objectiveExamText = 'EXAMEN FÍSICO DIRIGIDO: PACIENTE CONSCIENTE, ORIENTADO, ADECUADA MECÁNICA VENTILATORIA. CORAZÓN: RUIDOS CARDÍACOS RÍTMICOS, NO SOPLOS. PULMONES: MURMULLO VESICULAR CONSERVADO EN AMBOS CAMPOS PULMONARES, SIN ESTERTORES. ABDOMEN: BLANDO, DEPRESIBLE, RUIDOS PRESENTES, NO DOLOROSO. EXTREMIDADES: SIN EDEMAS.';
    const assessmentText = lastEvo && lastEvo.problemReevaluation ? lastEvo.problemReevaluation.toUpperCase() : 'JUICIO CLÍNICO: PACIENTE CON ADECUADA RESPUESTA AL PROTOCOLO MÉDICO ADMINISTRADO, SIN SIGNOS DE COMPLICACIÓN NI DETERIORO.';
    const conductText = lastEvo && lastEvo.conduct ? lastEvo.conduct.toUpperCase() : 'CONDUCTA: CONTINUAR TRATAMIENTO MÉDICO PAUTADO, MONITORIZACIÓN DE CONSTANTES VITALES Y VIGILANCIA EVOLUTIVA ESTRICTA.';

    // Diagnósticos
    let rawDiag = patient.clinicalHistory?.clinicalImpression || patient.chiefComplaint || 'SÍNDROME CLÍNICO EN EVOLUCIÓN';
    const diagList = rawDiag.split(/[\n,;]+/).map(d => d.trim().toUpperCase()).filter(Boolean);

    let xml = zip.file('word/document.xml')?.asText() || '';
    const logoParagraphXml = extractLogoParagraphXml(xml);

    const newParagraphs: string[] = [
      ...(logoParagraphXml ? [logoParagraphXml] : []),
      createDocxParagraphXml('HOSPITAL REGIONAL DR. ÁNGEL MARÍA GATÓN', true, true, 40),
      createDocxParagraphXml('SERVICIO DE EMERGENCIAS Y MEDICINA INTERNA', true, true, 80),
      createDocxParagraphXml('NOTA DE EVOLUCIÓN MÉDICA HOSPITALARIA', true, true, 160),
      createDocxParagraphXml(headerLine, true, false, 120),
      createDocxParagraphXml(`ESTANCIA HOSPITALARIA: DÍA ${dayNumber} DE HOSPITALIZACIÓN`, true, false, 120),
      createDocxParagraphXml(vitalsLine, false, false, 140),
      createDocxParagraphXml('1. EVOLUCIÓN SUBJETIVA Y NOVEDADES:', true, false, 40),
      createDocxParagraphXml(subjectiveText, false, false, 120),
      createDocxParagraphXml('2. EXAMEN FÍSICO OBJETIVO:', true, false, 40),
      createDocxParagraphXml(objectiveExamText, false, false, 120),
      createDocxParagraphXml('3. ANÁLISIS CLÍNICO Y JUICIO EVOLUTIVO:', true, false, 40),
      createDocxParagraphXml(assessmentText, false, false, 120),
      createDocxParagraphXml('4. DIAGNÓSTICOS ACTIVOS:', true, false, 40),
    ];

    diagList.forEach((d, i) => {
      newParagraphs.push(createDocxParagraphXml(`${i + 1}. ${d}`, true, false, 50));
    });

    newParagraphs.push(createDocxParagraphXml('5. CONDUCTA MÉDICA Y PLAN:', true, false, 40));
    newParagraphs.push(createDocxParagraphXml(conductText, false, false, 200));

    newParagraphs.push(createDocxParagraphXml('', false, false, 120));
    newParagraphs.push(createDocxParagraphXml('____________________________________', true, true, 40));
    newParagraphs.push(createDocxParagraphXml(`${docName.toUpperCase()}`, true, true, 40));
    newParagraphs.push(createDocxParagraphXml(`${exequatur.toUpperCase()} • MÉDICO TRATANTE • HOSPITAL REGIONAL DR. ÁNGEL MARÍA GATÓN`, false, true, 100));

    const bodyMatch = xml.match(/<w:body>([\s\S]*?)<\/w:body>/);
    if (bodyMatch) {
      const sectPrMatch = xml.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/);
      const sectPr = sectPrMatch ? sectPrMatch[0] : '';
      xml = xml.replace(/<w:body>[\s\S]*?<\/w:body>/, `<w:body>${newParagraphs.join('')}${sectPr}</w:body>`);
      zip.file('word/document.xml', xml);
    }

    const outBlob = zip.generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE'
    });

    const safeName = patient.fullName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    const safeDate = date.replace(/\//g, '-');
    triggerBrowserDownload(outBlob, `EVOLUCION_MEDICA_${safeName}_${safeDate}.docx`);
  } catch (error: any) {
    console.error('Error generando DOCX de Evolución Médica:', error);
    alert('Error al generar la evolución DOCX: ' + error.message);
  }
}
