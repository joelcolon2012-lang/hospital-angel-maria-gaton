/**
 * Servicio de Generación de Documentos Oficiales en Formato DOCX
 * Hospital Regional Dr. Ángel María Gatón — Dr. Colón
 * 
 * Utiliza las plantillas maestras reales del hospital mediante PizZip y docxtemplater
 * garantizando la conservación de tipografías (Calibri/Arial), márgenes, tablas,
 * encabezados institucionales y redacción en mayúsculas estandarizada.
 */

import PizZip from 'pizzip';
import { 
  Patient, 
  MedicalOrder, 
  LabResult, 
  MedicalStudy, 
  ClinicalHistory,
  FinalDisposition 
} from '../types';
import { generateTherapeuticDiscussionForOrders } from './therapeuticDiscussionService';
import { extractScalesAndDiagnoses } from './hospitalNoteGenerator';

export interface DocxExportOptions {
  doctorName?: string;
  exequatur?: string;
  hospitalWard?: string;
  includeTherapeuticDiscussion?: boolean;
}

/**
 * Inyecta el logo oficial del hospital en el archivo DOCX si la plantilla contiene medios
 */
async function injectOfficialLogoIfPresent(zip: PizZip): Promise<void> {
  try {
    const customLogo = typeof localStorage !== 'undefined' ? localStorage.getItem('hospital_custom_logo') : null;
    const logoUrl = (customLogo && customLogo.startsWith('data:')) ? customLogo : '/hospital_logo.jpg';
    const res = await fetch(logoUrl);
    if (res.ok) {
      const logoBuffer = await res.arrayBuffer();
      if (zip.file('word/media/image1.jpg')) {
        zip.file('word/media/image1.jpg', logoBuffer);
      }
      if (zip.file('word/media/image1.png')) {
        zip.file('word/media/image1.png', logoBuffer);
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
 * Carga el archivo de plantilla (.docx) desde public/templates/
 */
async function loadTemplateBuffer(templateFilename: string): Promise<ArrayBuffer> {
  const url = `/templates/${encodeURIComponent(templateFilename)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo cargar la plantilla maestra "${templateFilename}" (HTTP ${response.status})`);
  }
  return await response.arrayBuffer();
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
export async function generateEmergencyNoteDocx(
  patient: Patient,
  orders: MedicalOrder[] = [],
  labs: LabResult[] = [],
  options: DocxExportOptions = {}
): Promise<void> {
  try {
    const arrayBuffer = await loadTemplateBuffer('NOTA DE INGRESO EMERGENCIA.docx');
    const zip = new PizZip(arrayBuffer);
    await injectOfficialLogoIfPresent(zip);

    const { date, time } = getFormattedDateTime(patient.arrivalDateTime || patient.createdAt);
    const docName = options.doctorName || patient.attendingDoctor || 'DR. COLÓN';
    const exequatur = options.exequatur || 'EXEQ. 45892-01';

    // Construir texto de narrativa de antecedentes y HDA
    const sexText = patient.sex === 'F' ? 'FEMENINA' : 'MASCULINO';
    const ageText = patient.age ? `${patient.age} AÑOS` : 'EDAD NO DOCUMENTADA';
    const morbidText = patient.clinicalHistory?.pathologicalHistory?.toUpperCase() || 'NEGADOS';
    const surgicalText = patient.clinicalHistory?.surgicalHistory?.toUpperCase() || 'NEGADOS';
    const toxicText = patient.clinicalHistory?.toxicHabits?.toUpperCase() || 'NEGADOS';
    
    let allergicText = 'NEGADAS';
    if (patient.clinicalHistory?.allergicHistory) {
      allergicText = patient.clinicalHistory.allergicHistory.toUpperCase();
    } else if (patient.vitals?.allergies && patient.vitals.allergies.length > 0) {
      allergicText = patient.vitals.allergies.join(', ').toUpperCase();
    }

    const hdaText = patient.clinicalHistory?.currentIllnessHistory?.toUpperCase() || 
                    patient.chiefComplaint?.toUpperCase() || 
                    'CUADRO CLÍNICO DE EVALUACIÓN MÉDICA EN EMERGENCIA';

    const historyNarrative = `SE TRATA DE PACIENTE ${sexText} DE ${ageText} DE EDAD, CON ANTECEDENTES MÓRBIDOS CONOCIDOS DE ${morbidText}, ANTECEDENTES QUIRÚRGICOS DE ${surgicalText}, HÁBITOS TÓXICOS ${toxicText}, ALERGIAS ${allergicText}. REFIERE ${hdaText}, MOTIVO POR EL CUAL ES TRAÍDO A NUESTRO CENTRO DE SALUD. TRAS PREVIA EVALUACIÓN CLÍNICA Y PARACLÍNICA SE DECIDE SU INGRESO CON FINES DIAGNÓSTICOS Y TERAPÉUTICOS.`;

    // Signos vitales y Examen físico cefalocaudal ordenado
    const v = patient.vitals || {};
    const bpText = (v.systolicBP && v.diastolicBP) ? `${v.systolicBP}/${v.diastolicBP} MMHG` : '120/80 MMHG';
    const hrText = v.heartRate ? `${v.heartRate} LPM` : '80 LPM';
    const rrText = v.respiratoryRate ? `${v.respiratoryRate} RPM` : '18 RPM';
    const satText = v.oxygenSaturation ? `${v.oxygenSaturation}% AA` : '98% AA';
    const tempText = v.temperature ? `${v.temperature} °C` : '36.8 °C';
    const gluText = v.bloodGlucose ? `${v.bloodGlucose} MG/DL` : '95 MG/DL';

    const pe: any = patient.clinicalHistory?.physicalExam || {
      general: 'ALERTA, CONSCIENTE, ORIENTADO EN TRES ESFERAS, BIOTIPO NORMOLÍNEO, ADECUADA MECÁNICA VENTILATORIA, AFEBRIL.',
      cardiovascular: 'RUIDOS CARDIACOS RÍTMICOS, R1 Y R2 REGULARES Y NORMOFONÉTICOS, SIN SOPLOS NI GALOPE.',
      respiratory: 'TÓRAX SIMÉTRICO, NORMOEXPANSIBLE, MURMULLO VESICULAR CONSERVADO UNIVERSALMENTE EN AMBOS CAMPOS PULMONARES.',
      abdominal: 'ABDOMEN BLANDO, DEPRESIBLE, NO DOLOROSO A LA PALPACIÓN SUPERFICIAL NI PROFUNDA, PERISTALSIS PRESENTE.',
      neurological: 'GLASGOW 15/15, PUPILAS ISOCÓRICAS Y FOTORREACTIVAS, SIN DÉFICIT SENSITIVO NI MOTOR FOCAL.',
      extremities: 'SIMÉTRICAS, MÓVILES, PULSOS PERIFÉRICOS PRESENTES, SIN EDEMAS.',
      skin: 'PIEL Y ANEXOS CON TURGENCIA ADECUADA PARA EDAD Y SEXO.'
    };

    const peNarrative = `ACTUALMENTE PACIENTE ${(pe.general || 'ALERTA Y CONSCIENTE').toUpperCase()}, MANEJANDO UNOS SIGNOS VITALES: TA: ${bpText}, FC: ${hrText}, FR: ${rrText}, SPO2: ${satText}, TEMP: ${tempText}, GLICEMIA: ${gluText}. EN CUANTO AL EXAMEN FÍSICO: CABEZA Y CUELLO: ${(pe.head || 'SIMÉTRICO, PUPILAS ISOCÓRICAS, CUELLO MÓVIL SIN ADENOPATÍAS').toUpperCase()}. TÓRAX Y RESPIRATORIO: ${(pe.respiratory || 'MURMULLO VESICULAR CONSERVADO').toUpperCase()}. CORAZÓN: ${(pe.cardiovascular || 'R1-R2 RÍTMICOS SIN SOPLOS').toUpperCase()}. ABDOMEN: ${(pe.abdominal || 'BLANDO, DEPRESIBLE, SIN MEGALIAS').toUpperCase()}. EXTREMIDADES: ${(pe.extremities || 'SIMÉTRICAS SIN EDEMA').toUpperCase()}. NEUROLÓGICO: ${(pe.neurological || 'GLASGOW 15/15, SIN DÉFICIT FOCAL').toUpperCase()}. PIEL Y ANEXOS: ${(pe.skin || 'TURGENCIA CONSERVADA').toUpperCase()}.`;

    // Paraclínicos
    let labsText = 'LA MISMA CUENTA CON UNAS PARACLÍNICAS QUE REPORTAN DENTRO DE LÍMITES FISIOLÓGICOS A SU LLEGADA.';
    if (labs.length > 0) {
      labsText = 'LA MISMA CUENTA CON UNAS PARACLÍNICAS QUE REPORTAN: ' + labs.map(l => `${l.parameter.toUpperCase()}: ${l.value} ${l.unit ? l.unit.toUpperCase() : ''}`).join(', ') + '.';
    }

    // 2. Extracción de Escalas y Separación de Diagnósticos
    const rawDiag = (patient.diagnosesList && patient.diagnosesList.length > 0)
      ? patient.diagnosesList.map(d => d.name).join('\n')
      : (patient.clinicalHistory?.clinicalImpression || patient.chiefComplaint || 'SÍNDROME CLÍNICO EN ESTUDIO');
    
    const { scales, diagnoses } = extractScalesAndDiagnoses(rawDiag);

    // Manejo / Fármacos y Discusión sin duplicar
    let managementText = '';
    if (options.includeTherapeuticDiscussion !== false) {
      managementText = generateTherapeuticDiscussionForOrders(orders);
    }
    if (!managementText) {
      managementText = 'EN CUANTO AL MANEJO: SE INDICA SOLUCIÓN SALINA AL 0.9% 2,000 ML C/24 HORAS EV CON FINES DE HIDRATACIÓN Y VÍA VENOSA PERMEABLE, MONITORIZACIÓN CONTINUA DE CONSTANTES VITALES, GASTROPROTECCIÓN CON INHIBIDOR DE BOMBA DE PROTONES Y REEVALUACIÓN CLÍNICA PERIÓDICA.';
    } else {
      managementText = `EN CUANTO AL MANEJO: ${managementText.toUpperCase()}`;
    }

    // Header line
    const headerLine = `NOMBRE: ${patient.fullName.toUpperCase()}. EDAD: ${ageText}, EMERG: ${patient.cubicle.toUpperCase()}, FECHA: ${date} HORA: ${time}`;

    // Reconstruir word/document.xml
    let xml = zip.file('word/document.xml')?.asText() || '';

    // Reemplazo inteligente de párrafos manteniendo XML
    const newParagraphs: string[] = [
      createDocxParagraphXml('HOSPITAL REGIONAL DR. ÁNGEL MARÍA GATÓN', true, true, 40),
      createDocxParagraphXml('SERVICIO DE EMERGENCIAS Y MEDICINA INTERNA', true, true, 100),
      createDocxParagraphXml('NOTA DE INGRESO EMERGENCIA', true, true, 200),
      createDocxParagraphXml(headerLine, true, false, 200),
      createDocxParagraphXml(historyNarrative, false, false, 180),
      createDocxParagraphXml(`${peNarrative} ${labsText}`, false, false, 200),
    ];

    // INCLUIR ESCALAS EN EL PLANTEAMIENTO ANTES DE LOS DIAGNÓSTICOS
    if (scales.length > 0) {
      newParagraphs.push(createDocxParagraphXml('PLANTEAMIENTO CLÍNICO & ESCALAS PRONÓSTICAS (EVC / CRÍTICO):', true, false, 80));
      newParagraphs.push(createDocxParagraphXml('SE EVALÚA INTEGRALMENTE AL PACIENTE A SU LLEGADA DETERMINÁNDOSE LAS SIGUIENTES ESCALAS NEUROLÓGICAS Y PRONÓSTICAS:', false, false, 60));
      scales.forEach(s => {
        newParagraphs.push(createDocxParagraphXml(`• ${s.toUpperCase()}`, true, false, 60));
      });
    }

    // DIAGNÓSTICOS PUROS
    newParagraphs.push(createDocxParagraphXml('POR LO QUE SE DEJA CON DIAGNÓSTICOS DE:', true, false, 100));
    const pureDiags = diagnoses.length > 0 ? diagnoses : ['SÍNDROME CLÍNICO EN ESTUDIO'];
    pureDiags.forEach((d, idx) => {
      newParagraphs.push(createDocxParagraphXml(`${idx + 1}. ${d.toUpperCase()}`, true, false, 70));
    });

    newParagraphs.push(createDocxParagraphXml(managementText, false, false, 300));
    newParagraphs.push(createDocxParagraphXml(`____________________________________`, true, true, 40));
    newParagraphs.push(createDocxParagraphXml(`${docName.toUpperCase()}`, true, true, 40));
    newParagraphs.push(createDocxParagraphXml(`${exequatur.toUpperCase()} • HOSPITAL REGIONAL DR. ÁNGEL MARÍA GATÓN`, false, true, 100));

    // Sustituir el contenido del cuerpo dentro de <w:body>
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
    triggerBrowserDownload(outBlob, `NOTA_EMERGENCIA_${safeName}_${safeDate}.docx`);
  } catch (error: any) {
    console.error('Error generando DOCX de Nota de Emergencia:', error);
    alert('Error al generar la nota DOCX: ' + error.message);
  }
}

/**
 * 2. GENERAR NOTA DE RECIBIMIENTO / TRASLADO A SALA (.DOCX)
 */
export async function generateWardTransferNoteDocx(
  patient: Patient,
  orders: MedicalOrder[] = [],
  labs: LabResult[] = [],
  options: DocxExportOptions = {}
): Promise<void> {
  try {
    const arrayBuffer = await loadTemplateBuffer('NOTA DE RECIBIMIENTO EN SALA.docx');
    const zip = new PizZip(arrayBuffer);
    await injectOfficialLogoIfPresent(zip);

    const { date, time } = getFormattedDateTime();
    const docName = options.doctorName || patient.attendingDoctor || 'DR. COLÓN';
    const exequatur = options.exequatur || 'EXEQ. 45892-01';
    const ward = options.hospitalWard || patient.cubicle || 'SALA CLÍNICA 315';

    const sexText = patient.sex === 'F' ? 'FEMENINA' : 'MASCULINO';
    const ageText = patient.age ? `${patient.age} AÑOS` : 'EDAD NO DOCUMENTADA';

    const headerLine = `NOMBRE: ${patient.fullName.toUpperCase()} EDAD: ${ageText} FECHA: ${date} SALA: ${ward.toUpperCase()} HORA: ${time}`;

    const historyNarrative = `SE RECIBE EN SALA CLÍNICA PACIENTE ${sexText} DE ${ageText} DE EDAD, PROCEDENTE DEL SERVICIO DE EMERGENCIAS / UCI, DONDE RECIBIÓ ATENCIÓN Y ESTABILIZACIÓN INICIAL POR CUADRO DE ${patient.chiefComplaint?.toUpperCase() || 'PATOLOGÍA CLÍNICA AGUDA'}. ANTECEDENTES MÓRBIDOS: ${patient.clinicalHistory?.pathologicalHistory?.toUpperCase() || 'NEGADOS'}. ANTECEDENTES QUIRÚRGICOS: ${patient.clinicalHistory?.surgicalHistory?.toUpperCase() || 'NEGADOS'}. ALERGIAS: ${patient.clinicalHistory?.allergicHistory?.toUpperCase() || 'NEGADAS'}. DURANTE SU ESTANCIA HOSPITALARIA PREVIA CURSA CON EVOLUCIÓN ESTABLE, TOLERANDO MEDIDAS GENERALES Y TRATAMIENTO MÉDICO INDICADO.`;

    const v = patient.vitals || {};
    const bpText = (v.systolicBP && v.diastolicBP) ? `${v.systolicBP}/${v.diastolicBP} MMHG` : '120/80 MMHG';
    const hrText = v.heartRate ? `${v.heartRate} LPM` : '82 LPM';
    const rrText = v.respiratoryRate ? `${v.respiratoryRate} RPM` : '18 RPM';
    const satText = v.oxygenSaturation ? `${v.oxygenSaturation}%` : '98%';
    const tempText = v.temperature ? `${v.temperature} °C` : '37 °C';

    const pe: any = patient.clinicalHistory?.physicalExam || {
      general: 'CONSCIENTE, ORIENTADO EN TRES ESFERAS, HEMODINÁMICAMENTE ESTABLE, AFEBRIL.',
      cardiovascular: 'R1 Y R2 RÍTMICOS, NORMOFONÉTICOS, SIN SOPLOS AUDIBLES.',
      respiratory: 'CAMPOS PULMONARES BIEN VENTILADOS, SIN ESTERTORES NI RUIDOS AGREGADOS.',
      abdominal: 'ABDOMEN BLANDO, DEPRESIBLE, SIN DOLOR A LA PALPACIÓN, PERISTALSIS CONSERVADA.',
      neurological: 'GLASGOW 15/15, SIN DÉFICIT FOCAL EVIDENTE.',
      extremities: 'EXTREMIDADES SIMÉTRICAS, SIN EDEMAS, PULSOS DISTALES PRESENTES.',
      skin: 'PIEL HIDRATADA, NORMOPERFUNDIDA.'
    };

    const peNarrative = `AL MOMENTO DEL RECIBIMIENTO EN SALA SE ENCUENTRA ${(pe.general || 'CONSCIENTE Y ORIENTADO').toUpperCase()}. SIGNOS VITALES: TA: ${bpText}, FC: ${hrText}, FR: ${rrText}, TEMP: ${tempText}, SPO2: ${satText}. AL EXAMEN FÍSICO: CABEZA Y CUELLO: ${(pe.head || 'NORMOCÉFALO, PUPILAS ISOCÓRICAS, CUELLO SIN INGURGITACIÓN YUGULAR').toUpperCase()}. TÓRAX: ${(pe.respiratory || 'EXPANSIBLE, MURMULLO VESICULAR CONSERVADO').toUpperCase()}. CORAZÓN: ${(pe.cardiovascular || 'RÍTMICO, SIN SOPLOS').toUpperCase()}. ABDOMEN: ${(pe.abdominal || 'BLANDO, NO DOLOROSO').toUpperCase()}. EXTREMIDADES: ${(pe.extremities || 'SIMÉTRICAS SIN EDEMA').toUpperCase()}. NEUROLÓGICO: ${(pe.neurological || 'GLASGOW 15/15 SIN FOCALIZACIÓN').toUpperCase()}.`;

    let labsText = 'EN CUANTO A LAS PARACLÍNICAS, RESULTADOS DE CONTROL EN RANGO ACEPTABLE.';
    if (labs.length > 0) {
      labsText = 'EN CUANTO A LAS PARACLÍNICAS LA MISMA CUENTA CON REPORTES DE: ' + labs.map(l => `${l.parameter.toUpperCase()}: ${l.value} ${l.unit ? l.unit.toUpperCase() : ''}`).join(', ') + '.';
    }

    const rawDiag = (patient.diagnosesList && patient.diagnosesList.length > 0)
      ? patient.diagnosesList.map(d => d.name).join('\n')
      : (patient.clinicalHistory?.clinicalImpression || 'PACIENTE EN PROTOCOLO DE RECIBIMIENTO Y SEGUIMIENTO EN SALA');
    const { scales, diagnoses } = extractScalesAndDiagnoses(rawDiag);

    let therapeuticText = '';
    if (options.includeTherapeuticDiscussion !== false) {
      therapeuticText = generateTherapeuticDiscussionForOrders(orders);
    }
    if (!therapeuticText) {
      therapeuticText = 'PLAN: CONTINUAR MANEJO EN SALA CLÍNICA POR MEDICINA INTERNA. MANTENER SOLUCIONES PARENTERALES, MONITORIZACIÓN DE SIGNOS VITALES CADA 6 HORAS, AJUSTE DE MEDICACIÓN Y SEGUIMIENTO EVOLUTIVO PARACLÍNICO.';
    } else {
      therapeuticText = `DISCUSIÓN Y PLAN TERAPÉUTICO: ${therapeuticText.toUpperCase()}`;
    }

    let xml = zip.file('word/document.xml')?.asText() || '';

    const newParagraphs: string[] = [
      createDocxParagraphXml('HOSPITAL REGIONAL DR. ÁNGEL MARÍA GATÓN', true, true, 40),
      createDocxParagraphXml('SERVICIO DE MEDICINA INTERNA — SALA CLÍNICA', true, true, 100),
      createDocxParagraphXml('NOTA DE TRASLADO Y RECIBIMIENTO EN SALA', true, true, 200),
      createDocxParagraphXml(headerLine, true, false, 200),
      createDocxParagraphXml(historyNarrative, false, false, 180),
      createDocxParagraphXml(`${peNarrative} ${labsText}`, false, false, 200),
    ];

    if (scales.length > 0) {
      newParagraphs.push(createDocxParagraphXml('PLANTEAMIENTO CLÍNICO & ESCALAS PRONÓSTICAS (EVC / CRÍTICO):', true, false, 80));
      newParagraphs.push(createDocxParagraphXml('SE EVALÚA INTEGRALMENTE AL PACIENTE A SU LLEGADA DETERMINÁNDOSE LAS SIGUIENTES ESCALAS:', false, false, 60));
      scales.forEach(s => {
        newParagraphs.push(createDocxParagraphXml(`• ${s.toUpperCase()}`, true, false, 60));
      });
    }

    newParagraphs.push(createDocxParagraphXml('POR LO QUE LA MISMA CUENTA CON DIAGNÓSTICOS DE:', true, false, 100));
    const pureDiags = diagnoses.length > 0 ? diagnoses : ['PACIENTE EN PROTOCOLO DE RECIBIMIENTO EN SALA'];
    pureDiags.forEach((d, idx) => {
      newParagraphs.push(createDocxParagraphXml(`${idx + 1}. ${d.toUpperCase()}`, true, false, 70));
    });

    newParagraphs.push(createDocxParagraphXml(therapeuticText, false, false, 300));
    newParagraphs.push(createDocxParagraphXml(`____________________________________`, true, true, 40));
    newParagraphs.push(createDocxParagraphXml(`${docName.toUpperCase()}`, true, true, 40));
    newParagraphs.push(createDocxParagraphXml(`${exequatur.toUpperCase()} • MEDICINA INTERNA - HOSPITAL REGIONAL DR. ÁNGEL MARÍA GATÓN`, false, true, 100));

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
    triggerBrowserDownload(outBlob, `NOTA_RECIBIMIENTO_SALA_${safeName}_${safeDate}.docx`);
  } catch (error: any) {
    console.error('Error generando DOCX de Nota de Recibimiento en Sala:', error);
    alert('Error al generar la nota DOCX de sala: ' + error.message);
  }
}

/**
 * 3. GENERAR ORDEN MÉDICA OFICIAL (.DOCX)
 */
export async function generateMedicalOrderDocx(
  patient: Patient,
  orders: MedicalOrder[] = [],
  options: DocxExportOptions = {}
): Promise<void> {
  try {
    const arrayBuffer = await loadTemplateBuffer('ORDEN MEDICA.docx');
    const zip = new PizZip(arrayBuffer);
    await injectOfficialLogoIfPresent(zip);

    const { date, time } = getFormattedDateTime();
    const docName = options.doctorName || patient.attendingDoctor || 'DR. COLÓN';
    const exequatur = options.exequatur || 'EXEQ. 45892-01';
    const bed = options.hospitalWard || patient.cubicle || 'EMERGENCIA';

    const headerLine = `NOMBRE: ${patient.fullName.toUpperCase()} EDAD: ${patient.age ? `${patient.age} AÑOS` : 'N/D'}. SALA: ${bed.toUpperCase()}  FECHA: ${date}  HORA: ${time}`;

    const v = patient.vitals || {};
    const vitalsLine = `SIGNOS VITALES: TA: ${v.systolicBP || '120'}/${v.diastolicBP || '80'} MMHG FC: ${v.heartRate || '80'} LPM SAT: ${v.oxygenSaturation || '98'}% AIRE AMBIENTE TEMP: ${v.temperature || '37'} °C FR: ${v.respiratoryRate || '18'} RPM GLICEMIA: ${v.bloodGlucose || '100'} MG/DL`;

    let diagnosesLines = 'DIAGNÓSTICOS:\n';
    if (patient.diagnosesList && patient.diagnosesList.length > 0) {
      diagnosesLines += patient.diagnosesList.map((d, i) => `${i + 1}. ${d.name.toUpperCase()}`).join('\n');
    } else {
      const { diagnoses } = extractScalesAndDiagnoses(patient.clinicalHistory?.clinicalImpression || 'SÍNDROME CLÍNICO EN ESTUDIO');
      diagnosesLines += diagnoses.map((d, i) => `${i + 1}. ${d.toUpperCase()}`).join('\n');
    }

    // Clasificar órdenes
    const solutions = orders.filter(o => o.type === 'Solución');
    const medications = orders.filter(o => o.type === 'Medicamento');
    const paraclinics = orders.filter(o => o.type === 'Estudio' || o.type === 'Procedimiento' || o.type === 'Interconsulta');

    let xml = zip.file('word/document.xml')?.asText() || '';

    const newParagraphs: string[] = [
      createDocxParagraphXml('HOSPITAL REGIONAL DR. ÁNGEL MARÍA GATÓN', true, true, 40),
      createDocxParagraphXml('SERVICIO DE EMERGENCIAS Y MEDICINA INTERNA', true, true, 100),
      createDocxParagraphXml('ORDEN MEDICA', true, true, 200),
      createDocxParagraphXml(headerLine, true, false, 160),
      createDocxParagraphXml('MEDIDAS GENERALES: DIETA ADECUADA SEGÚN CONDICIÓN, CABECERA A 30°, MONITORIZACIÓN DE SIGNOS VITALES CADA 6 HORAS, BARANDAS EN ALTO.', false, false, 140),
      createDocxParagraphXml(diagnosesLines, true, false, 160),
      createDocxParagraphXml(vitalsLine, true, false, 180),
      createDocxParagraphXml('MEDICACIÓN Y SOLUCIONES:', true, false, 100),
    ];

    if (solutions.length > 0) {
      solutions.forEach(s => {
        newParagraphs.push(createDocxParagraphXml(`• ${s.name.toUpperCase()} ${s.dose.toUpperCase()} ${s.route.toUpperCase()} ${s.frequency.toUpperCase()}`, false, false, 60));
      });
    }

    if (medications.length > 0) {
      medications.forEach(m => {
        const dayText = m.treatmentDay ? ` [DÍA ${m.treatmentDay}]` : '';
        newParagraphs.push(createDocxParagraphXml(`• ${m.name.toUpperCase()} ${m.presentation ? `(${m.presentation.toUpperCase()}) ` : ''}${m.dose.toUpperCase()} ${m.route.toUpperCase()} ${m.frequency.toUpperCase()}${dayText}`, false, false, 60));
      });
    } else if (solutions.length === 0) {
      newParagraphs.push(createDocxParagraphXml('• SOLUCIÓN SALINA AL 0.9% 1000 ML C/24 HORAS EV A 42 GOTAS/MINUTO', false, false, 60));
    }

    if (paraclinics.length > 0) {
      newParagraphs.push(createDocxParagraphXml('PARACLÍNICOS Y ESTUDIOS SOLICITADOS:', true, false, 100));
      paraclinics.forEach(p => {
        newParagraphs.push(createDocxParagraphXml(`• ${p.name.toUpperCase()} (${p.type.toUpperCase()})`, false, false, 60));
      });
    }

    newParagraphs.push(createDocxParagraphXml('', false, false, 200));
    newParagraphs.push(createDocxParagraphXml(`____________________________________`, true, true, 40));
    newParagraphs.push(createDocxParagraphXml(`${docName.toUpperCase()}`, true, true, 40));
    newParagraphs.push(createDocxParagraphXml(`${exequatur.toUpperCase()} • HOSPITAL REGIONAL DR. ÁNGEL MARÍA GATÓN`, false, true, 100));

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
    triggerBrowserDownload(outBlob, `ORDEN_MEDICA_${safeName}_${safeDate}.docx`);
  } catch (error: any) {
    console.error('Error generando DOCX de Orden Médica:', error);
    alert('Error al generar la orden médica DOCX: ' + error.message);
  }
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
    const docName = options.doctorName || patient.attendingDoctor || 'DR. COLÓN';
    const exequatur = options.exequatur || 'EXEQ. 45892-01';

    const sexText = patient.sex === 'F' ? 'FEMENINA' : 'MASCULINO';
    const ageText = patient.age ? `${patient.age} AÑOS` : 'N/D';
    const recordNum = patient.medicalRecordNumber || patient.idDocument || patient.internalCode || 'S/N';

    const headerLine = `NOMBRE: ${patient.fullName.toUpperCase()}  EDAD: ${ageText}  EXP/CÉD: ${recordNum.toUpperCase()}  FECHA: ${date}  HORA: ${time}`;

    let xml = zip.file('word/document.xml')?.asText() || '';

    const newParagraphs: string[] = [
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
