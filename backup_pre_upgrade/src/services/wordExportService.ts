/**
 * Servicio de Exportación a Microsoft Word (.DOC)
 * Hospital Regional Ángel María Gatón — Dr. Colón
 * 
 * Genera archivos .doc compatibles nativamente con Microsoft Word, Google Docs,
 * LibreOffice y visores móviles de Office con el formato visual oficial hospitalario.
 */

import { Patient, MedicalOrder, LabResult, MedicalStudy } from '../types';
import { generateIndividualMedicalOrder, generateEmergencyAdmissionNote, generateInternalMedicineWardAdmissionNote } from './hospitalNoteGenerator';

/**
 * Descarga en el navegador un archivo .doc formateado
 */
export function downloadWordDocument(filename: string, htmlBody: string, docTitle: string = 'Documento Médico') {
  // Encabezado XML / HTML compatible con Microsoft Word
  const wordDocumentHtml = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>${docTitle}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page Section1 {
      size: 8.5in 11.0in;
      margin: 1.0in 1.0in 1.0in 1.0in;
      mso-header-margin: 0.5in;
      mso-footer-margin: 0.5in;
      mso-paper-source: 0;
    }
    div.Section1 {
      page: Section1;
    }
    body {
      font-family: 'Calibri', 'Arial', sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #0f172a;
    }
    .hospital-header {
      text-align: center;
      margin-bottom: 20px;
    }
    .hospital-logo-h {
      font-family: 'Arial Black', 'Arial', sans-serif;
      font-size: 24pt;
      font-weight: 900;
      color: #0284c7;
      display: inline-block;
      vertical-align: middle;
      margin-right: 8px;
    }
    .hospital-title-wrap {
      display: inline-block;
      vertical-align: middle;
      text-align: left;
    }
    .hospital-label {
      font-size: 8pt;
      font-weight: bold;
      color: #0e7490;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin: 0;
    }
    .hospital-name {
      font-size: 13pt;
      font-weight: bold;
      color: #0284c7;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin: 0;
    }
    .doc-title {
      text-align: center;
      font-size: 13pt;
      font-weight: bold;
      color: #1e293b;
      margin-top: 15px;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .patient-meta-box {
      font-size: 9.5pt;
      font-weight: bold;
      color: #1e293b;
      border-bottom: 1.5pt solid #cbd5e1;
      padding-bottom: 6px;
      margin-bottom: 16px;
      line-height: 1.5;
    }
    .section-heading {
      font-weight: bold;
      color: #0f172a;
      margin-top: 12px;
      margin-bottom: 4px;
      text-transform: uppercase;
      font-size: 10.5pt;
    }
    .narrative-body {
      text-align: justify;
      font-size: 10.5pt;
      line-height: 1.45;
      margin-bottom: 14px;
    }
    .bullet-item {
      margin-left: 18px;
      font-weight: bold;
      font-size: 10pt;
      line-height: 1.4;
    }
    .numbered-item {
      margin-left: 18px;
      font-size: 10pt;
      line-height: 1.4;
    }
    .note-box {
      margin-top: 12px;
      font-size: 10pt;
      font-style: italic;
      color: #334155;
    }
    .footer-stamp {
      margin-top: 40px;
      border-top: 1pt solid #94a3b8;
      width: 250px;
      text-align: center;
      font-size: 9pt;
      padding-top: 4px;
      color: #475569;
    }
  </style>
</head>
<body>
  <div class="Section1">
    ${htmlBody}
  </div>
</body>
</html>
  `;

  const blob = new Blob(['\ufeff' + wordDocumentHtml], {
    type: 'application/msword;charset=utf-8',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.doc') ? filename : `${filename}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exporta la ORDEN MEDICA en formato .DOC Word
 */
export function exportMedicalOrderToWord(patient: Patient, orders: MedicalOrder[] = []) {
  const d = patient.arrivalDateTime ? new Date(patient.arrivalDateTime) : new Date();
  const dateStr = d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const rawOrderText = generateIndividualMedicalOrder(patient, orders);

  // Extraer secciones
  const extractSection = (header: string, nextHeader?: string): string => {
    const start = rawOrderText.indexOf(header);
    if (start === -1) return '';
    const fromStart = rawOrderText.substring(start + header.length);
    if (!nextHeader) return fromStart.trim();
    const end = fromStart.indexOf(nextHeader);
    if (end === -1) return fromStart.trim();
    return fromStart.substring(0, end).trim();
  };

  const medidas = extractSection('MEDIDAS GENERALES:', 'DIAGNOSTICO:');
  const diagRaw = extractSection('DIAGNOSTICO:', 'SIGNOS VITALES:');
  const vitals = extractSection('SIGNOS VITALES:', 'MEDICACIÓN:');
  const medsRaw = extractSection('MEDICACIÓN:', 'PARACLÍNICOS:');
  const paraclinicos = extractSection('PARACLÍNICOS:', 'IMÁGENES:');
  const imagenes = extractSection('IMÁGENES:', 'NOTA:');
  const nota = extractSection('NOTA:');

  const diagItems = diagRaw
    .split('\n')
    .map((s) => s.replace(/^[•\-\*]\s*/, '').trim())
    .filter(Boolean);

  const medItems = medsRaw
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  let body = `
    <div class="hospital-header">
      <table align="center" style="margin: 0 auto; border: none;">
        <tr>
          <td style="padding-right: 10px; vertical-align: middle;">
            <div style="background-color: #0284c7; color: white; font-family: Arial, sans-serif; font-size: 20pt; font-weight: bold; width: 34px; height: 34px; line-height: 34px; text-align: center; border-radius: 6px;">H</div>
          </td>
          <td style="text-align: left; vertical-align: middle;">
            <div style="font-size: 8pt; font-weight: bold; color: #0e7490; letter-spacing: 1.5px; text-transform: uppercase;">:HOSPITAL</div>
            <div style="font-size: 13pt; font-weight: bold; color: #0284c7; letter-spacing: 1px; text-transform: uppercase;">DR. ÁNGEL MARÍA GATÓN</div>
          </td>
        </tr>
      </table>
    </div>

    <div class="doc-title">ORDEN MEDICA</div>

    <div class="patient-meta-box">
      NOMBRE: ${patient.fullName.toUpperCase()} &nbsp;&nbsp;&nbsp;&nbsp;
      EDAD: ${patient.age || '--'} AÑOS &nbsp;&nbsp;&nbsp;&nbsp;
      EMERGENCIA: CUB ${patient.cubicle} &nbsp;&nbsp;&nbsp;&nbsp;
      FECHA: ${dateStr} &nbsp;&nbsp;&nbsp;&nbsp;
      HORA: ${timeStr}
    </div>

    <p><span class="section-heading">MEDIDAS GENERALES:</span> ${medidas}</p>

    <p class="section-heading">DIAGNOSTICO:</p>
    ${diagItems.map((d) => `<div class="bullet-item">• &nbsp;${d}</div>`).join('')}
    <br/>

    <p><span class="section-heading">SIGNOS VITALES:</span> ${vitals}</p>

    <p class="section-heading">MEDICACIÓN:</p>
    ${medItems.map((m) => `<div class="numbered-item">${m}</div>`).join('')}
    <br/>

    <p><span class="section-heading">PARACLÍNICOS:</span> ${paraclinicos}</p>
    <p><span class="section-heading">IMÁGENES:</span> ${imagenes}</p>

    ${nota ? `<div class="note-box"><strong>NOTA:</strong> ${nota}</div>` : ''}

    <br/><br/>
    <table style="width: 100%; margin-top: 30px; border: none;">
      <tr>
        <td style="width: 50%; text-align: center;">
          <div style="border-top: 1pt solid #000; width: 220px; margin: 0 auto; padding-top: 4px; font-size: 9pt; font-weight: bold;">
            Firma y Sello Médico Tratante<br/>
            Dr. Colón — Medicina Interna / Emergencias
          </div>
        </td>
        <td style="width: 50%; text-align: center;">
          <div style="border-top: 1pt solid #000; width: 220px; margin: 0 auto; padding-top: 4px; font-size: 9pt; font-weight: bold;">
            Recibido Enfermería
          </div>
        </td>
      </tr>
    </table>
  `;

  const filename = `Orden_Medica_${patient.fullName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.doc`;
  downloadWordDocument(filename, body, `Orden Médica - ${patient.fullName}`);
}

/**
 * Exporta la NOTA DE INGRESO (Emergencia o Sala) en formato .DOC Word
 */
export function exportAdmissionNoteToWord(
  patient: Patient,
  orders: MedicalOrder[] = [],
  labs: LabResult[] = [],
  studies: MedicalStudy[] = [],
  noteType: 'emergencia' | 'sala' = 'emergencia'
) {
  const d = patient.arrivalDateTime ? new Date(patient.arrivalDateTime) : new Date();
  const dateStr = d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const rawNoteText =
    noteType === 'emergencia'
      ? generateEmergencyAdmissionNote(patient, orders, labs, studies)
      : generateInternalMedicineWardAdmissionNote(patient, orders, labs, studies);

  const title = noteType === 'emergencia' ? 'NOTA DE INGRESO EMERGENCIA' : 'NOTA DE RECIBIMIENTO';
  const ubica = noteType === 'emergencia' ? `EMERG: ${patient.cubicle}` : `SALA: ${patient.cubicle}`;

  // Extraer el texto narrativo eliminando cabeceras
  const narrativeStart = rawNoteText.indexOf('SE TRATA DE PACIENTE');
  const cleanNarrative = narrativeStart !== -1 ? rawNoteText.substring(narrativeStart) : rawNoteText;

  // Dividir entre narrativa previa a diagnósticos, diagnósticos y manejo
  const diagMarker = 'POR LO QUE SE DEJA BAJO DIAGNÓSTICOS DE:';
  const manejoMarker = 'EN CUANTO AL MANEJO:';

  let part1 = cleanNarrative;
  let partDiag = '';
  let partManejo = '';

  const diagIdx = cleanNarrative.indexOf(diagMarker);
  const manejoIdx = cleanNarrative.indexOf(manejoMarker);

  if (diagIdx !== -1 && manejoIdx !== -1) {
    part1 = cleanNarrative.substring(0, diagIdx + diagMarker.length);
    partDiag = cleanNarrative.substring(diagIdx + diagMarker.length, manejoIdx).trim();
    partManejo = cleanNarrative.substring(manejoIdx).trim();
  }

  const diagItems = partDiag
    .split('\n')
    .map((s) => s.replace(/^[•\-\*]\s*/, '').trim())
    .filter(Boolean);

  let body = `
    <div class="hospital-header">
      <table align="center" style="margin: 0 auto; border: none;">
        <tr>
          <td style="padding-right: 10px; vertical-align: middle;">
            <div style="background-color: #0284c7; color: white; font-family: Arial, sans-serif; font-size: 20pt; font-weight: bold; width: 34px; height: 34px; line-height: 34px; text-align: center; border-radius: 6px;">H</div>
          </td>
          <td style="text-align: left; vertical-align: middle;">
            <div style="font-size: 8pt; font-weight: bold; color: #0e7490; letter-spacing: 1.5px; text-transform: uppercase;">:HOSPITAL</div>
            <div style="font-size: 13pt; font-weight: bold; color: #0284c7; letter-spacing: 1px; text-transform: uppercase;">DR. ÁNGEL MARÍA GATÓN</div>
          </td>
        </tr>
      </table>
    </div>

    <div class="doc-title">${title}</div>

    <div class="patient-meta-box">
      NOMBRE: ${patient.fullName.toUpperCase()}, &nbsp;&nbsp;&nbsp;&nbsp;
      EDAD: ${patient.age || '--'} AÑOS, &nbsp;&nbsp;&nbsp;&nbsp;
      ${ubica}, &nbsp;&nbsp;&nbsp;&nbsp;
      FECHA INGRESO: ${dateStr}. &nbsp;&nbsp;&nbsp;&nbsp;
      HORA: ${timeStr}
    </div>

    <div class="narrative-body">${part1}</div>

    ${diagItems.length > 0 ? diagItems.map((d) => `<div class="bullet-item">• &nbsp;${d}</div>`).join('') + '<br/>' : ''}

    ${partManejo ? `<div class="narrative-body">${partManejo}</div>` : ''}

    <br/><br/>
    <table style="width: 100%; margin-top: 35px; border: none;">
      <tr>
        <td style="text-align: right;">
          <div style="border-top: 1pt solid #000; width: 250px; margin-left: auto; text-align: center; padding-top: 4px; font-size: 9pt; font-weight: bold;">
            Firma y Sello Médico Tratante<br/>
            Dr. Colón — Medicina Interna / Emergencias
          </div>
        </td>
      </tr>
    </table>
  `;

  const filePrefix = noteType === 'emergencia' ? 'Nota_Ingreso_Emergencia' : 'Nota_Recibimiento_Sala';
  const filename = `${filePrefix}_${patient.fullName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.doc`;
  downloadWordDocument(filename, body, `${title} - ${patient.fullName}`);
}

/**
 * Exporta la HISTORIA CLÍNICA COMPLETA en formato .DOC Word
 */
export function exportClinicalHistoryToWord(patient: Patient) {
  const h = patient.clinicalHistory;
  if (!h) return;

  const d = new Date();
  const dateStr = d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

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

  let body = `
    <div class="hospital-header">
      <table align="center" style="margin: 0 auto; border: none;">
        <tr>
          <td style="padding-right: 10px; vertical-align: middle;">
            <div style="background-color: #0284c7; color: white; font-family: Arial, sans-serif; font-size: 20pt; font-weight: bold; width: 34px; height: 34px; line-height: 34px; text-align: center; border-radius: 6px;">H</div>
          </td>
          <td style="text-align: left; vertical-align: middle;">
            <div style="font-size: 8pt; font-weight: bold; color: #0e7490; letter-spacing: 1.5px; text-transform: uppercase;">:HOSPITAL</div>
            <div style="font-size: 13pt; font-weight: bold; color: #0284c7; letter-spacing: 1px; text-transform: uppercase;">DR. ÁNGEL MARÍA GATÓN</div>
          </td>
        </tr>
      </table>
    </div>

    <div class="doc-title">HISTORIA CLÍNICA Y EXAMEN FÍSICO</div>

    <div class="patient-meta-box">
      PACIENTE: ${patient.fullName.toUpperCase()} &nbsp;&nbsp;&nbsp;&nbsp;
      EDAD: ${patient.age || '--'} AÑOS &nbsp;&nbsp;&nbsp;&nbsp;
      CÉDULA / EXP: ${patient.medicalRecordNumber || patient.idDocument || 'S/N'} &nbsp;&nbsp;&nbsp;&nbsp;
      FECHA: ${dateStr} ${timeStr}
    </div>

    <p class="section-heading">1. MOTIVO DE CONSULTA</p>
    <div class="narrative-body">${h.reasonForConsultation || 'No especificado'}</div>

    <p class="section-heading">2. HISTORIA DE LA ENFERMEDAD ACTUAL (HDA)</p>
    <div class="narrative-body">${h.currentIllnessHistory || 'No especificado'}</div>

    <p class="section-heading">3. ANTECEDENTES</p>
    <div class="bullet-item">• <strong>Patológicos:</strong> ${h.pathologicalHistory || 'Negados'}</div>
    <div class="bullet-item">• <strong>Quirúrgicos:</strong> ${h.surgicalHistory || 'Negados'}</div>
    <div class="bullet-item">• <strong>Alergias:</strong> ${h.allergicHistory || 'Negadas'}</div>
    <div class="bullet-item">• <strong>Medicamentos habituales:</strong> ${h.habitualMedications || 'Ninguno'}</div>
    <div class="bullet-item">• <strong>Hábitos tóxicos:</strong> ${h.toxicHabits || 'Negados'}</div>
    <div class="bullet-item">• <strong>Familiares:</strong> ${h.familyHistory || 'No especificados'}</div>
    <br/>

    <p class="section-heading">4. EXAMEN FÍSICO POR SISTEMAS</p>
    <div class="bullet-item">• <strong>General:</strong> ${pe.general || 'Normal'}</div>
    <div class="bullet-item">• <strong>Cardiovascular:</strong> ${pe.cardiovascular || 'R1 y R2 rítmicos sin soplos'}</div>
    <div class="bullet-item">• <strong>Respiratorio:</strong> ${pe.respiratory || 'Murmullo vesicular conservado'}</div>
    <div class="bullet-item">• <strong>Abdomen:</strong> ${pe.abdominal || 'Blando, depresible, no doloroso'}</div>
    <div class="bullet-item">• <strong>Neurológico:</strong> ${pe.neurological || 'Glasgow 15/15, sin déficit focal'}</div>
    <div class="bullet-item">• <strong>Extremidades:</strong> ${pe.extremities || 'Simétricas, sin edemas'}</div>
    <br/>

    <p class="section-heading">5. IMPRESIÓN CLÍNICA DIAGNÓSTICA</p>
    <div class="narrative-body"><strong>${h.clinicalImpression || 'En estudio'}</strong></div>

    <p class="section-heading">6. PLAN DIAGNÓSTICO Y TERAPÉUTICO</p>
    <div class="narrative-body">${h.diagnosticAndTherapeuticPlan || 'Monitoreo y tratamiento hospitalario'}</div>

    <br/><br/>
    <table style="width: 100%; margin-top: 35px; border: none;">
      <tr>
        <td style="text-align: right;">
          <div style="border-top: 1pt solid #000; width: 250px; margin-left: auto; text-align: center; padding-top: 4px; font-size: 9pt; font-weight: bold;">
            Firma y Sello Médico Tratante<br/>
            Dr. Colón — Medicina Interna / Emergencias
          </div>
        </td>
      </tr>
    </table>
  `;

  const filename = `Historia_Clinica_${patient.fullName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.doc`;
  downloadWordDocument(filename, body, `Historia Clínica - ${patient.fullName}`);
}
