/**
 * Exportador Oficial de Historia Clínica Planta en Formato DOCX
 * Hospital Regional Dr. Ángel María Gatón - Dr. Joel Colón
 *
 * Utiliza como base la plantilla maestra oficial clinical-history-template.docx,
 * inyecta el logo institucional, respeta tipografías, negritas, subrayados,
 * márgenes, interlineado y concluye exactamente en los diagnósticos.
 */

import PizZip from 'pizzip';
import { ClinicalHistoryPlanta } from '../types';
import { authService } from './authService';
import { FALLBACK_LOGO_BASE64, FALLBACK_TEMPLATES, base64ToArrayBuffer } from './templatesFallback';
import { db } from '../db/dexieDb';

function escapeXml(unsafe: string = ''): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Crea un párrafo con título en negrita y valor normal
 */
function createDocxFieldParagraphXml(
  label: string, 
  value: string, 
  isUnderlineTitle: boolean = false,
  spaceAfter: number = 100
): string {
  const cleanLabel = escapeXml(label);
  const cleanVal = escapeXml(value);
  const uTag = isUnderlineTitle ? '<w:u w:val="single"/>' : '';

  return `
    <w:p>
      <w:pPr>
        <w:spacing w:before="60" w:after="${spaceAfter}" w:line="240" w:lineRule="auto"/>
        <w:jc w:val="both"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
          <w:b/><w:bCs/>
          ${uTag}
          <w:sz w:val="22"/>
          <w:szCs w:val="22"/>
        </w:rPr>
        <w:t xml:space="preserve">${cleanLabel}${value ? ': ' : ''}</w:t>
      </w:r>
      ${value ? `
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
          <w:sz w:val="22"/>
          <w:szCs w:val="22"/>
        </w:rPr>
        <w:t xml:space="preserve">${cleanVal}</w:t>
      </w:r>` : ''}
    </w:p>
  `;
}

/**
 * Crea un párrafo de título de sección en negrita y subrayado
 */
function createDocxSectionHeaderXml(title: string, spaceBefore: number = 200, spaceAfter: number = 100): string {
  const cleanTitle = escapeXml(title.toUpperCase());
  return `
    <w:p>
      <w:pPr>
        <w:spacing w:before="${spaceBefore}" w:after="${spaceAfter}" w:line="240" w:lineRule="auto"/>
        <w:jc w:val="left"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
          <w:b/><w:bCs/>
          <w:u w:val="single"/>
          <w:sz w:val="22"/>
          <w:szCs w:val="22"/>
        </w:rPr>
        <w:t xml:space="preserve">${cleanTitle}</w:t>
      </w:r>
    </w:p>
  `;
}

/**
 * Crea un párrafo normal (para listas o narrativas)
 */
function createDocxTextParagraphXml(text: string, isCentered: boolean = false, spaceAfter: number = 100): string {
  const clean = escapeXml(text);
  const alignTag = isCentered ? '<w:jc w:val="center"/>' : '<w:jc w:val="both"/>';
  return `
    <w:p>
      <w:pPr>
        <w:spacing w:before="40" w:after="${spaceAfter}" w:line="240" w:lineRule="auto"/>
        ${alignTag}
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
          <w:sz w:val="22"/>
          <w:szCs w:val="22"/>
        </w:rPr>
        <w:t xml:space="preserve">${clean}</w:t>
      </w:r>
    </w:p>
  `;
}

/**
 * Carga el buffer de la plantilla maestra
 */
async function loadMasterTemplateBuffer(): Promise<ArrayBuffer> {
  const filename = 'clinical-history-template.docx';
  const baseUrl = (import.meta as any).env?.BASE_URL || './';
  const urls = [
    `${baseUrl}templates/${filename}`,
    `./templates/${filename}`,
    `templates/${filename}`,
    `/templates/${filename}`
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

  if (FALLBACK_TEMPLATES[filename]) {
    return base64ToArrayBuffer(FALLBACK_TEMPLATES[filename]);
  }
  throw new Error(`No se pudo cargar la plantilla maestra "${filename}"`);
}

/**
 * Inyecta el logo oficial del hospital en el DOCX
 */
async function injectOfficialLogo(zip: PizZip): Promise<void> {
  try {
    let logoBuffer: ArrayBuffer | null = null;
    const candidates = [
      './hospital_logo.jpg',
      '/hospital_logo.jpg',
      'hospital_logo.jpg'
    ];

    try {
      const identitySetting = await db.settings.get('hospital_identity_settings');
      if (identitySetting && identitySetting.value && identitySetting.value.logoUrl) {
        candidates.unshift(identitySetting.value.logoUrl);
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
      if (zip.file('word/media/image1.png')) {
        zip.file('word/media/image1.png', logoBuffer);
      }
      if (zip.file('word/media/image1.jpg')) {
        zip.file('word/media/image1.jpg', logoBuffer);
      }
    }
  } catch (err) {
    console.warn('Advertencia logo DOCX:', err);
  }
}

/**
 * Dispara la descarga en el navegador
 */
function triggerDownload(blob: Blob, filename: string) {
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
 * Genera el nombre de archivo institucional: HC_NOMBRE_APELLIDO_FECHA.docx
 */
export function getStandardDocxFilename(history: ClinicalHistoryPlanta): string {
  const cleanName = (history.generalData.nombre || 'PACIENTE')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  const dateStr = (history.generalData.fechaIngreso || '')
    .replace(/[/]/g, '-');
  
  const formattedDate = dateStr || new Date().toISOString().slice(0, 10);
  return `HC_${cleanName}_${formattedDate}.docx`;
}

/**
 * Genera y descarga el archivo DOCX de la Historia Clínica Planta
 */
export async function generateClinicalHistoryDocx(history: ClinicalHistoryPlanta): Promise<void> {
  const arrayBuffer = await loadMasterTemplateBuffer();
  const zip = new PizZip(arrayBuffer);
  await injectOfficialLogo(zip);

  let docXml = zip.file('word/document.xml')?.asText();
  if (!docXml) throw new Error('No se encontró word/document.xml en la plantilla');

  // Conservar la cabecera hasta después del logo institucional
  // El logo se encuentra en los primeros párrafos (w:drawing)
  const drawIndex = docXml.indexOf('</w:drawing>');
  let headerPrefix = '';
  let sectPrXml = '';

  if (drawIndex !== -1) {
    const endP = docXml.indexOf('</w:p>', drawIndex);
    if (endP !== -1) {
      headerPrefix = docXml.substring(0, endP + 6);
    }
  }

  if (!headerPrefix) {
    const bodyStart = docXml.indexOf('<w:body>') + 8;
    headerPrefix = docXml.substring(0, bodyStart);
  }

  // Extraer sectPr (propiedades de página y márgenes)
  const sectMatch = docXml.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/);
  if (sectMatch) {
    sectPrXml = sectMatch[0];
  } else {
    sectPrXml = `
      <w:sectPr>
        <w:pgSz w:w="11906" w:h="16838"/>
        <w:pgMar w:top="1440" w:right="1800" w:bottom="1440" w:left="1800" w:header="720" w:footer="720" w:gutter="0"/>
      </w:sectPr>
    `;
  }

  // Construir el cuerpo ordenado de la Historia Clínica Planta
  let bodyXml = '';

  // 1. TÍTULO PRINCIPAL
  bodyXml += `
    <w:p>
      <w:pPr>
        <w:spacing w:before="120" w:after="160" w:line="240" w:lineRule="auto"/>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
          <w:b/><w:bCs/>
          <w:u w:val="single"/>
          <w:sz w:val="24"/>
          <w:szCs w:val="24"/>
        </w:rPr>
        <w:t xml:space="preserve">HISTORIA CLÍNICA</w:t>
      </w:r>
    </w:p>
  `;

  // 2. DATOS GENERALES
  bodyXml += createDocxSectionHeaderXml('DATOS GENERALES', 160, 80);
  const gd = history.generalData;
  bodyXml += createDocxFieldParagraphXml('NOMBRE', gd.nombre);
  bodyXml += createDocxFieldParagraphXml('ESTADO CIVIL', gd.estadoCivil);
  bodyXml += createDocxFieldParagraphXml('EDAD', gd.edad);
  bodyXml += createDocxFieldParagraphXml('RAZA', gd.raza);
  bodyXml += createDocxFieldParagraphXml('SEXO', gd.sexo);
  bodyXml += createDocxFieldParagraphXml('RELIGI\u00D3N', gd.religion);
  bodyXml += createDocxFieldParagraphXml('ESCOLARIDAD', gd.escolaridad);
  bodyXml += createDocxFieldParagraphXml('SALA', gd.sala);
  bodyXml += createDocxFieldParagraphXml('FUENTE', gd.fuente);
  bodyXml += createDocxFieldParagraphXml('FECHA INGRESO', gd.fechaIngreso);
  bodyXml += createDocxFieldParagraphXml('HORA', gd.hora);
  bodyXml += createDocxFieldParagraphXml('PROCEDENCIA', gd.procedencia);

  // 3. MOTIVOS DE CONSULTA
  bodyXml += createDocxSectionHeaderXml('MOTIVOS DE CONSULTA:', 180, 80);
  if (history.chiefComplaints && history.chiefComplaints.length > 0) {
    history.chiefComplaints.forEach(mc => {
      bodyXml += createDocxTextParagraphXml(mc.toUpperCase());
    });
  } else {
    bodyXml += createDocxTextParagraphXml('NO REGISTRADO');
  }

  // 4. HISTORIA DE LA ENFERMEDAD ACTUAL
  bodyXml += createDocxSectionHeaderXml('HISTORIA DE LA ENFERMEDAD ACTUAL:', 180, 80);
  bodyXml += createDocxTextParagraphXml(history.presentIllness || 'PENDIENTE DE EVALUACIÓN.');

  // 5. ANTECEDENTES PERSONALES PATOLÓGICOS
  bodyXml += createDocxSectionHeaderXml('ANTECEDENTES PERSONALES PATOL\u00D3GICOS:', 180, 80);
  const path = history.pathologicalHistory;
  bodyXml += createDocxFieldParagraphXml('NI\u00D1EZ', path.childhood || 'NEGADOS.');
  bodyXml += createDocxFieldParagraphXml('ADOLESCENCIA', path.adolescence || 'NEGADOS.');
  bodyXml += createDocxFieldParagraphXml('ADULTEZ', path.adulthood || 'NO REGISTRADOS.');
  bodyXml += createDocxFieldParagraphXml('ANTECEDENTES HOSPITALARIOS', path.hospitalizations || 'NEGADOS.');
  bodyXml += createDocxFieldParagraphXml('ANTECEDENTES QUIR\u00DARGICOS', path.surgeries || 'NEGADOS.');
  bodyXml += createDocxFieldParagraphXml('ANTECEDENTES TRAUM\u00C1TICOS', path.trauma || 'NEGADOS.');
  bodyXml += createDocxFieldParagraphXml('TRANSFUSIONALES', path.transfusions || 'NEGADOS.');
  bodyXml += createDocxFieldParagraphXml('ANTECEDENTES AL\u00C9RGICOS', path.allergies || 'NEGADOS.');

  // Medicamentos habituales
  let medsText = 'NEGADOS.';
  if (path.medications && path.medications.length > 0) {
    medsText = path.medications
      .map(m => `${m.name.toUpperCase()} ${m.dose} ${m.unit} ${m.route} ${m.frequency}`)
      .join(', ');
  }
  bodyXml += createDocxFieldParagraphXml('ANTECEDENTES MEDICAMENTOSOS', medsText);

  // 6. ANTECEDENTES PERSONALES NO PATOLÓGICOS
  bodyXml += createDocxSectionHeaderXml('ANTECEDENTES PERSONALES NO PATOL\u00D3GICOS:', 180, 80);
  const np = history.nonPathologicalHistory;
  const tob = np.tobacco;
  let tobText = 'NEGADO.';
  if (tob && tob.consumes) {
    tobText = `${tob.cigarettesPerDay} CIGARRILLOS AL D\u00CDA DURANTE ${tob.yearsSmoking} A\u00D1OS PARA UN IPA DE ${tob.packYears}.`;
  }
  bodyXml += createDocxFieldParagraphXml('TABACO', tobText);
  bodyXml += createDocxFieldParagraphXml('CAF\u00C9', np.coffee || 'NEGADO.');
  bodyXml += createDocxFieldParagraphXml('ALCOHOL', np.alcohol || 'NEGADO.');
  bodyXml += createDocxFieldParagraphXml('DROGAS IL\u00CDCITAS', np.illicitDrugs || 'NEGADOS.');
  bodyXml += createDocxFieldParagraphXml('T\u00C9', np.tea || '1 TAZA OCASIONAL.');
  bodyXml += createDocxFieldParagraphXml('TRABAJOS ANTERIORES', np.previousJobs || 'NO ESPECIFICADO.');
  bodyXml += createDocxFieldParagraphXml('EXPOSICI\u00D3N A T\u00D3XICOS', np.toxicExposure || 'NEGADA.');

  // 7. ANTECEDENTES PERSONALES HEREDOFAMILIARES
  bodyXml += createDocxSectionHeaderXml('ANTECEDENTES PERSONALES HEREDOFAMILIARES:', 180, 80);
  const fam = history.familyHistory;
  const fFather = fam.father.alive ? `VIVO, ${fam.father.morbidities || 'SIN PATOLOGÍA REFERIDA.'}` : `FALLECIDO, CAUSA: ${fam.father.causeOfDeath || 'NO ESPECIFICADA'}.`;
  const fMother = fam.mother.alive ? `VIVA, ${fam.mother.morbidities || 'SIN PATOLOGÍA REFERIDA.'}` : `FALLECIDA, CAUSA: ${fam.mother.causeOfDeath || 'NO ESPECIFICADA'}.`;
  bodyXml += createDocxFieldParagraphXml('PADRE', fFather);
  bodyXml += createDocxFieldParagraphXml('MADRE', fMother);
  bodyXml += createDocxFieldParagraphXml('HERMANOS', `${fam.siblings.count} HERMANOS. ${fam.siblings.details || ''}`);
  bodyXml += createDocxFieldParagraphXml('HIJOS', `${fam.children.count} HIJOS. ${fam.children.details || ''}`);

  // 8. ESFERA PSICOSOCIAL
  bodyXml += createDocxSectionHeaderXml('ESFERA PSICOSOCIAL:', 180, 80);
  const psy = history.psychosocialHistory;
  bodyXml += createDocxFieldParagraphXml('INGRESOS MENSUALES AL HOGAR', psy.monthlyIncome || 'NO ESPECIFICADOS.');
  const h = psy.housing;
  const houseText = psy.narrativeText || `VIVIENDA ${h.housingType}, TECHO DE ${h.roofMaterial}, PAREDES DE ${h.wallMaterial}, PISO DE ${h.floorMaterial}, ${h.roomCount} HABITACIONES PARA ${h.personCount} PERSONAS, ${h.bathroomCount} BAÑO (${h.bathroomLocation}), AGUA: ${h.waterSource}, BASURA: ${h.trashDisposal}.`;
  bodyXml += createDocxFieldParagraphXml('VIVIENDA', houseText);

  // 9. REVISIÓN POR SISTEMAS
  bodyXml += createDocxSectionHeaderXml('REVISI\u00D3N POR SISTEMAS:', 180, 80);
  const ros = history.reviewOfSystems;
  bodyXml += createDocxFieldParagraphXml('CARDIOVASCULAR', ros.cardiovascular.status === 'NORMAL' ? 'SIN PATOLOG\u00CDAS REFERIDAS.' : ros.cardiovascular.notes);
  bodyXml += createDocxFieldParagraphXml('PULMONAR', ros.pulmonary.status === 'NORMAL' ? 'SIN PATOLOG\u00CDAS REFERIDAS.' : ros.pulmonary.notes);
  bodyXml += createDocxFieldParagraphXml('GASTROINTESTINAL', ros.gastrointestinal.status === 'NORMAL' ? 'SIN PATOLOG\u00CDAS REFERIDAS.' : ros.gastrointestinal.notes);
  bodyXml += createDocxFieldParagraphXml('GENITOURINARIO', ros.genitourinary.status === 'NORMAL' ? 'SIN PATOLOG\u00CDAS REFERIDAS.' : ros.genitourinary.notes);
  bodyXml += createDocxFieldParagraphXml('ENDOCRINOMETAB\u00D3LICO', ros.endocrinometabolic.status === 'NORMAL' ? 'SIN PATOLOG\u00CDAS REFERIDAS.' : ros.endocrinometabolic.notes);
  bodyXml += createDocxFieldParagraphXml('NEUROSENSORIAL', ros.neurosensory.status === 'NORMAL' ? 'SIN PATOLOG\u00CDAS REFERIDAS.' : ros.neurosensory.notes);
  bodyXml += createDocxFieldParagraphXml('MUSCULOESQUEL\u00C9TICO', ros.musculoskeletal.status === 'NORMAL' ? 'SIN PATOLOG\u00CDAS REFERIDAS.' : ros.musculoskeletal.notes);
  bodyXml += createDocxFieldParagraphXml('HEMATOL\u00D3GICO', ros.hematologic.status === 'NORMAL' ? 'SIN PATOLOG\u00CDAS REFERIDAS.' : ros.hematologic.notes);

  // 10. EXAMEN FÍSICO / ESTADO GENERAL
  bodyXml += createDocxSectionHeaderXml('EXAMEN F\u00CDSICO', 200, 80);
  bodyXml += createDocxFieldParagraphXml('ESTADO GENERAL', history.generalStatus.generalStatusSummary || 'ALERTA, CONSCIENTE, EN REGULARES CONDICIONES.');

  // SIGNOS VITALES
  const vit = history.vitalSigns;
  const vitText = `TA: ${vit.systolicBP || '--'}/${vit.diastolicBP || '--'} MMHG, FC: ${vit.heartRate || '--'} L/M, FR: ${vit.respiratoryRate || '--'} R/M, TEMP: ${vit.temperature || '--'} °C, SPO2: ${vit.oxygenSaturation || '--'}% (AIRE AMBIENTE)${vit.bmi ? `, IMC: ${vit.bmi} KG/M²` : ''}.`;
  bodyXml += createDocxTextParagraphXml(vitText, false, 80);

  // EXAMEN FÍSICO POR SISTEMAS
  const pe = history.physicalExam;
  bodyXml += createDocxFieldParagraphXml('CABEZA', pe.head);
  bodyXml += createDocxFieldParagraphXml('OJOS', pe.eyes);
  bodyXml += createDocxFieldParagraphXml('O\u00CDDOS', pe.ears);
  bodyXml += createDocxFieldParagraphXml('NARIZ', pe.nose);
  bodyXml += createDocxFieldParagraphXml('BOCA', pe.mouth);
  bodyXml += createDocxFieldParagraphXml('CUELLO', pe.neck);
  bodyXml += createDocxFieldParagraphXml('T\u00D3RAX', pe.thorax);
  bodyXml += createDocxFieldParagraphXml('PULMONES', pe.lungs);
  bodyXml += createDocxFieldParagraphXml('CORAZ\u00D3N', pe.heart);
  bodyXml += createDocxFieldParagraphXml('ABDOMEN', pe.abdomen);
  bodyXml += createDocxFieldParagraphXml('GENITALES EXTERNOS', pe.externalGenitals);
  bodyXml += createDocxFieldParagraphXml('PIEL Y ANEXOS', pe.skin);
  bodyXml += createDocxFieldParagraphXml('EXTREMIDADES SUPERIORES', pe.upperExtremities);
  bodyXml += createDocxFieldParagraphXml('EXTREMIDADES INFERIORES', pe.lowerExtremities);

  // NEUROLÓGICO
  const neuroNarrative = history.neurologicalExam?.narrativeText || pe.neurological || 'ALERTA, CONSCIENTE, ORIENTADO EN LAS TRES ESFERAS DEL SENSORIO. GLASGOW 15/15.';
  bodyXml += createDocxFieldParagraphXml('NEUROL\u00D3GICO', neuroNarrative);

  // 11. DIAGNÓSTICOS
  bodyXml += createDocxSectionHeaderXml('DIAGN\u00D3STICOS:', 200, 80);
  if (history.diagnoses && history.diagnoses.length > 0) {
    history.diagnoses.forEach((d, idx) => {
      bodyXml += createDocxTextParagraphXml(`${idx + 1}. ${d.name.toUpperCase()}`);
    });
  } else {
    bodyXml += createDocxTextParagraphXml('1. DIAGNÓSTICO EN ESTUDIO');
  }

  // FIRMA Y SELLO OFICIAL
  const activeDoc = authService.getActiveDoctorSignature();
  bodyXml += `
    <w:p>
      <w:pPr>
        <w:spacing w:before="360" w:after="40" w:line="240" w:lineRule="auto"/>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
          <w:sz w:val="22"/>
          <w:szCs w:val="22"/>
        </w:rPr>
        <w:t xml:space="preserve">____________________________________________</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:spacing w:before="40" w:after="40" w:line="240" w:lineRule="auto"/>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
          <w:b/><w:bCs/>
          <w:sz w:val="22"/>
          <w:szCs w:val="22"/>
        </w:rPr>
        <w:t xml:space="preserve">${escapeXml(activeDoc.name.toUpperCase())}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:spacing w:before="40" w:after="200" w:line="240" w:lineRule="auto"/>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
          <w:sz w:val="20"/>
          <w:szCs w:val="20"/>
        </w:rPr>
        <w:t xml:space="preserve">${escapeXml(activeDoc.exequatur)} &bull; ${escapeXml(activeDoc.specialty || 'MEDICINA INTERNA')}</w:t>
      </w:r>
    </w:p>
  `;

  // Ensamblar document.xml completo
  const finalDocXml = `${headerPrefix}${bodyXml}${sectPrXml}</w:body></w:document>`;
  zip.file('word/document.xml', finalDocXml);

  const outBlob = zip.generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE'
  });

  const filename = getStandardDocxFilename(history);
  triggerDownload(outBlob, filename);
}
