/**
 * Servicio Especializado: Generador de Nota de Ingreso en Planta
 * a partir de la Historia Clínica de Planta
 * Hospital Regional Dr. Ángel María Gatón - Dr. Joel Colón
 */

import { jsPDF } from 'jspdf';
import PizZip from 'pizzip';
import { db } from '../db/dexieDb';
import { 
  Patient, 
  ClinicalHistoryPlanta, 
  PatientEvolution 
} from '../types';
import { authService } from './authService';
import { FALLBACK_TEMPLATES, base64ToArrayBuffer } from './templatesFallback';

/**
 * Genera el texto continuo hospitalario oficial de la NOTA DE INGRESO EN PLANTA
 * a partir del objeto ClinicalHistoryPlanta
 */
export function generateNotaIngresoPlantaText(
  history: ClinicalHistoryPlanta,
  patient?: Patient,
  doctorOverride?: { name?: string; exequatur?: string; specialty?: string }
): string {
  const g = history.generalData;
  const p = history.pathologicalHistory;
  const np = history.nonPathologicalHistory;
  const fam = history.familyHistory;
  const v = history.vitalSigns;
  const pe = history.physicalExam;
  const neuro = history.neurologicalExam;
  const diagList = history.diagnoses;

  const curUser = authService.getCurrentUser();
  const doctorName = doctorOverride?.name || curUser?.name || 'DR. JOEL COLÓN';
  const doctorExequatur = doctorOverride?.exequatur || curUser?.exequatur || '48712-19';
  const doctorSpecialty = doctorOverride?.specialty || curUser?.specialty || 'MEDICINA INTERNA / EMERGENCIOLOGÍA';

  // Fecha y hora
  const fechaStr = g.fechaIngreso || new Date().toLocaleDateString('es-DO');
  const horaStr = g.hora || new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const salaStr = g.sala || (patient?.cubicle ? patient.cubicle.toUpperCase() : 'SALA DE MEDICINA INTERNA');
  const nombreStr = (g.nombre || patient?.fullName || 'PACIENTE').toUpperCase();
  const edadStr = g.edad || (patient?.age ? `${patient.age} AÑOS` : '--');
  const sexoStr = g.sexo ? g.sexo.toUpperCase() : (patient?.sex === 'F' ? 'FEMENINA' : 'MASCULINO');
  const pronombre = sexoStr.includes('FEM') ? 'ESTA' : 'ESTE';

  let out = `             :HOSPITAL\n`;
  out += `          H  DR. ÁNGEL MARÍA GATÓN\n\n`;
  out += `                     NOTA DE INGRESO EN PLANTA\n`;
  out += `                  (NOTA DE RECIBIMIENTO EN SALA)\n\n`;
  out += `NOMBRE: ${nombreStr}   EDAD: ${edadStr}   SALA/CUBÍCULO: ${salaStr}   FECHA: ${fechaStr}   HORA: ${horaStr}\n\n`;

  // 1. PÁRRAFO INICIAL NARRATIVO DE ANTECEDENTES Y FILIACIÓN
  let antecedentesNarrativa = `SE TRATA DE PACIENTE ${sexoStr} DE ${edadStr} DE EDAD, `;
  if (g.estadoCivil) antecedentesNarrativa += `ESTADO CIVIL: ${g.estadoCivil.toUpperCase()}, `;
  if (g.procedencia) antecedentesNarrativa += `PROCEDENTE DE ${g.procedencia.toUpperCase()}, `;

  // Antecedentes Patológicos
  const patoAdult = p.adulthood && p.adulthood !== 'NO REGISTRADOS.' ? p.adulthood.toUpperCase() : 'NIEGA ANTECEDENTES PATOLÓGICOS';
  antecedentesNarrativa += `CON ANTECEDENTES MÓRBIDOS CONOCIDOS DE: ${patoAdult}. `;

  // Quirúrgicos
  const quir = p.surgeries && p.surgeries !== 'NEGADOS.' ? p.surgeries.toUpperCase() : 'NEGADOS';
  antecedentesNarrativa += `ANTECEDENTES QUIRÚRGICOS: ${quir}. `;

  // Alergias
  const aler = p.allergies && p.allergies !== 'NEGADAS.' ? p.allergies.toUpperCase() : 'NEGADAS';
  antecedentesNarrativa += `ALERGIAS MEDICAMENTOSAS / ALIMENTARIAS: ${aler}. `;

  // Transfusiones y Hospitalizaciones
  if (p.transfusions && p.transfusions !== 'NEGADAS.') {
    antecedentesNarrativa += `TRANSFUSIONES PREVIAS: ${p.transfusions.toUpperCase()}. `;
  }
  if (p.hospitalizations && p.hospitalizations !== 'NEGADAS.') {
    antecedentesNarrativa += `HOSPITALIZACIONES PREVIAS: ${p.hospitalizations.toUpperCase()}. `;
  }
  if (p.trauma && p.trauma !== 'NEGADOS.') {
    antecedentesNarrativa += `TRAUMATISMOS PREVIOS: ${p.trauma.toUpperCase()}. `;
  }

  // Medicamentos habituales
  if (p.medications && p.medications.length > 0) {
    const medStrings = p.medications.map(m => 
      `${m.name.toUpperCase()} ${m.dose || ''} ${m.unit || ''} ${m.route || 'VO'} ${m.frequency || ''}`.trim()
    );
    antecedentesNarrativa += `MEDICAMENTOS HABITUALES: ${medStrings.join(', ')}. `;
  } else {
    antecedentesNarrativa += `MEDICAMENTOS HABITUALES: NIEGA CONSUMO HABITUAL. `;
  }

  // Hábitos no patológicos / tóxicos
  let toxNarr = '';
  if (np.tobacco.consumes) {
    toxNarr += `TABAQUISMO POSITIVO (${np.tobacco.cigarettesPerDay || 0} CIG/DÍA POR ${np.tobacco.yearsSmoking || 0} AÑOS, IPA: ${np.tobacco.packYears || 0} PAQ/AÑO)`;
  } else {
    toxNarr += `TABAQUISMO NEGADO`;
  }
  if (np.alcohol && np.alcohol !== 'NO') {
    toxNarr += `, CONSUMO DE ALCOHOL: ${np.alcohol.toUpperCase()}`;
  }
  if (np.illicitDrugs && np.illicitDrugs !== 'NO') {
    toxNarr += `, SUSTANCIAS ILÍCITAS: ${np.illicitDrugs.toUpperCase()}`;
  }
  antecedentesNarrativa += `HÁBITOS TÓXICOS: ${toxNarr}. `;

  // Heredofamiliares
  const famParts: string[] = [];
  if (fam.father?.morbidities && fam.father.morbidities !== 'NEGADOS.') famParts.push(`PADRE: ${fam.father.morbidities.toUpperCase()}`);
  if (fam.mother?.morbidities && fam.mother.morbidities !== 'NEGADOS.') famParts.push(`MADRE: ${fam.mother.morbidities.toUpperCase()}`);
  if (fam.siblings?.details && fam.siblings.details !== 'NEGADOS.') famParts.push(`HERMANOS: ${fam.siblings.details.toUpperCase()}`);
  if (famParts.length > 0) {
    antecedentesNarrativa += `ANTECEDENTES HEREDOFAMILIARES: ${famParts.join('; ')}.`;
  } else {
    antecedentesNarrativa += `ANTECEDENTES HEREDOFAMILIARES: NO RELEVANTES / DESCONOCIDOS.`;
  }

  out += `${antecedentesNarrativa}\n\n`;

  // 2. HISTORIA DE LA ENFERMEDAD ACTUAL (HDA)
  out += `HISTORIA DE LA ENFERMEDAD ACTUAL:\n`;
  const hdaText = history.presentIllness || 
    (history.chiefComplaints && history.chiefComplaints.length > 0 ? history.chiefComplaints.join(', ') : '') ||
    'PACIENTE QUE INGRESA PARA ESTUDIO, COMPENSACIÓN Y TRATAMIENTO EN SALA.';
  
  let hdaNarrativa = `REFIERE PACIENTE QUE ${pronombre} SE ENCONTRABA EN SU ESTADO HABITUAL CUANDO PRESENTA CUADRO CARACTERIZADO POR: ${hdaText.toUpperCase().trim()}. `;
  hdaNarrativa += `MOTIVO POR EL CUAL TRAS SU EVALUACIÓN INICIAL, SE PROCEDE A SU INGRESO FORMAL EN PLANTA DE MEDICINA INTERNA PARA PROTOCOLO DE ESTUDIO, MONITOREO CLÍNICO ESTRICTO Y TRATAMIENTO ESPECÍFICO.`;
  out += `${hdaNarrativa}\n\n`;

  // 3. SIGNOS VITALES Y ESTADO GENERAL
  out += `SIGNOS VITALES Y ANTROPOMETRÍA AL INGRESO:\n`;
  const ta = (v.systolicBP && v.diastolicBP) ? `${v.systolicBP}/${v.diastolicBP} MMHG` : '120/80 MMHG';
  const fc = v.heartRate ? `${v.heartRate} LPM` : '78 LPM';
  const fr = v.respiratoryRate ? `${v.respiratoryRate} RPM` : '18 RPM';
  const temp = v.temperature ? `${v.temperature} °C` : '36.8 °C';
  const spo2 = v.oxygenSaturation ? `${v.oxygenSaturation}% AL AIRE AMBIENTE` : '98% AL AIRE AMBIENTE';
  const peso = v.weight ? `${v.weight} KG` : '--';
  const talla = v.height ? `${v.height} CM` : '--';
  const imc = v.bmi ? `${v.bmi} KG/M²` : '--';

  out += `TA: ${ta} | FC: ${fc} | FR: ${fr} | TEMP: ${temp} | SPO2: ${spo2} | PESO: ${peso} | TALLA: ${talla} | IMC: ${imc}\n\n`;

  // Estado General
  const eg = history.generalStatus;
  out += `ESTADO GENERAL:\n`;
  out += `PACIENTE EN ${eg.generalStatusSummary ? eg.generalStatusSummary.toUpperCase() : 'CONDICIONES GENERALES DE CUIDADO'}, FACIE ${eg.facies ? eg.facies.toUpperCase() : 'COMPUESTA'}, BIOTIPO ${eg.biotype ? eg.biotype.toUpperCase() : 'NORMOLÍNEO'}, CON PATRÓN RESPIRATORIO ${eg.respiratoryPattern ? eg.respiratoryPattern.toUpperCase() : 'ESPONTÁNEO Y ADECUADO'}, ESTADO DE HIDRATACIÓN ${eg.hydration ? eg.hydration.toUpperCase() : 'ADECUADO'}, PERFUSIÓN DISTAL ${eg.perfusion ? eg.perfusion.toUpperCase() : 'CONSERVADA'}.\n\n`;

  // 4. EXAMEN FÍSICO SEGMENTARIO DETALLADO (15 SISTEMAS)
  out += `EXAMEN FÍSICO SEGMENTARIO:\n`;
  const peHead = pe.head || 'NORMOCÉFALO, SIN DEPRESIONES NI MASAS PALPABLES';
  const peEyes = pe.eyes || 'SIMÉTRICOS, ESCLERAS ANICTÉRICAS, PUPILAS ISOCÓRICAS Y REACTIVAS';
  const peNeck = pe.neck || 'CILÍNDRICO, MÓVIL, SIN INGURGITACIÓN YUGULAR NI ADENOMEGALIAS';
  const peThorax = pe.thorax || 'SIMÉTRICO, NORMODINÁMICO, NORMOEXPANSIVO';
  const peLungs = pe.lungs || 'CAMPOS PULMONARES BIEN VENTILADOS, SIN RUIDOS PATOLÓGICOS SOBREAÑADIDOS';
  const peHeart = pe.heart || 'RUIDOS CARDÍACOS RÍTMICOS, REGULARES, SIN SOPLOS';
  const peAbdomen = pe.abdomen || 'GLOBOSO A EXPENSAS DE PANÍCULO ADIPOSO, BLANDO, DEPRESIBLE, RUIDOS HIDROAÉREOS PRESENTES, NO DOLOROSO';
  const peExtrem = (pe.lowerExtremities || pe.upperExtremities) 
    ? `${pe.upperExtremities ? 'SUPERIORES: ' + pe.upperExtremities.toUpperCase() + '. ' : ''}${pe.lowerExtremities ? 'INFERIORES: ' + pe.lowerExtremities.toUpperCase() : ''}`
    : 'EXTREMIDADES SIMÉTRICAS, MÓVILES, SIN EDEMA PERIFÉRICO, PULSOS DISTALES PRESENTES';
  const peSkin = pe.skin || 'PIEL NORMOTÉRMICA, EUTRÓFICA, ELASTICIDAD Y TURGENCIA CONSERVADAS';

  out += `• CABEZA Y CUELLO: ${peHead.toUpperCase()}. OJOS: ${peEyes.toUpperCase()}. CUELLO: ${peNeck.toUpperCase()}\n`;
  out += `• TÓRAX Y PULMONES: ${peThorax.toUpperCase()}. PULMONES: ${peLungs.toUpperCase()}\n`;
  out += `• CARDIOVASCULAR: ${peHeart.toUpperCase()}\n`;
  out += `• ABDOMEN: ${peAbdomen.toUpperCase()}\n`;
  out += `• EXTREMIDADES: ${peExtrem.toUpperCase()}\n`;
  out += `• PIEL Y FANERAS: ${peSkin.toUpperCase()}\n\n`;

  // 5. EXAMEN NEUROLÓGICO ESTRUCTURADO (GLASGOW, DANIELS, PARES)
  out += `EXAMEN NEUROLÓGICO ESTRUCTURADO:\n`;
  const gEye = neuro.glasgow.eye || 4;
  const gVerb = neuro.glasgow.verbal || 5;
  const gMot = neuro.glasgow.motor || 6;
  const gTotal = neuro.glasgow.total || (gEye + gVerb + gMot);

  const dUpperR = neuro.muscleStrength.rightUpper ?? 5;
  const dUpperL = neuro.muscleStrength.leftUpper ?? 5;
  const dLowerR = neuro.muscleStrength.rightLower ?? 5;
  const dLowerL = neuro.muscleStrength.leftLower ?? 5;

  out += `• ESTADO DE CONCIENCIA: ${neuro.consciousness.toUpperCase()}, GLASGOW: ${gTotal}/15 (OCULAR: ${gEye}/4, VERBAL: ${gVerb}/5, MOTOR: ${gMot}/6).\n`;
  out += `• FUERZA MUSCULAR (ESCALA DANIELS): MSD ${dUpperR}/5, MSI ${dUpperL}/5, MID ${dLowerR}/5, MII ${dLowerL}/5. TONO: ${neuro.tone.toUpperCase()}. BABINSKI: ${neuro.babinski.toUpperCase()}.\n`;
  if (neuro.narrativeText) {
    out += `• CONCLUSIÓN NEUROLÓGICA: ${neuro.narrativeText.toUpperCase()}\n\n`;
  } else {
    out += `• CONCLUSIÓN NEUROLÓGICA: PACIENTE ORIENTADO EN TIEMPO, ESPACIO Y PERSONA, SIN SIGNOS DE FOCALIZACIÓN NEUROLÓGICA AGUDA.\n\n`;
  }

  // 6. DIAGNÓSTICOS DE INGRESO EN PLANTA
  out += `DIAGNÓSTICOS DE INGRESO EN PLANTA:\n`;
  if (diagList && diagList.length > 0) {
    diagList.forEach((d, idx) => {
      out += `${idx + 1}. ${d.name.toUpperCase()}\n`;
    });
  } else {
    out += `1. SÍNDROME CLÍNICO EN ESTUDIO ETIOLÓGICO\n`;
    out += `2. DESCARTE DE COMPLICACIONES AGUDAS\n`;
  }
  out += `\n`;

  // 7. PLAN TERAPÉUTICO Y DE MANEJO EN SALA
  out += `PLAN DE MANEJO EN PLANTA / SALA:\n`;
  out += `1. INGRESO FORMAL EN SALA DE MEDICINA INTERNA / PLANTA.\n`;
  out += `2. REPOSO EN CAMA EN POSICIÓN SEMIFOWLER 30-45 GRADOS.\n`;
  out += `3. DIETA ADECUADA SEGÚN CONDICIÓN CLÍNICA Y ANTECEDENTES MÓRBIDOS.\n`;
  out += `4. MONITORIZACIÓN ESTRICTA DE SIGNOS VITALES Y DIURESIS CADA TURNO.\n`;
  out += `5. HIDRATACIÓN PARENTERAL Y MEDICAMENTOS SEGÚN HOJA DE ÓRDENES MÉDICAS VIGENTES.\n`;
  out += `6. PARACLÍNICOS DE RUTINA Y ESTUDIOS DE GABINETE DE CONTROL.\n`;
  out += `7. VIGILANCIA DE SIGNOS DE ALARMA Y CRITERIOS DE DETERIORO CLÍNICO.\n`;
  out += `8. PENDIENTE VALORACIÓN Y EVOLUCIÓN CLÍNICA CONTINUA.\n\n`;

  // 8. FIRMA MÉDICA INSTITUCIONAL
  out += `                                ____________________________________\n`;
  out += `                                      ${doctorName}\n`;
  out += `                                EXEQUÁTUR: ${doctorExequatur}\n`;
  out += `                           ${doctorSpecialty}\n`;
  out += `                                HOSPITAL DR. ÁNGEL MARÍA GATÓN\n`;

  return out;
}

/**
 * Guarda la Nota de Ingreso generada en el expediente del paciente
 * (IndexedDB: tabla evolutions y actualiza datos en tabla patients)
 */
export async function saveNotaIngresoPlantaToPatient(
  history: ClinicalHistoryPlanta,
  patient: Patient,
  noteText: string
): Promise<void> {
  const curUser = authService.getCurrentUser();
  const doctorName = curUser?.name || 'Dr. Joel Colón';

  // 1. Crear entrada en Evoluciones del paciente
  const evolutionEntry: PatientEvolution = {
    id: 'evo-ingreso-' + Date.now(),
    patientId: patient.id,
    timestamp: new Date().toISOString(),
    doctorName,
    vitalSignsSummary: `TA: ${history.vitalSigns.systolicBP || '120'}/${history.vitalSigns.diastolicBP || '80'} | FC: ${history.vitalSigns.heartRate || '78'} | FR: ${history.vitalSigns.respiratoryRate || '18'} | SpO2: ${history.vitalSigns.oxygenSaturation || '98'}% | Temp: ${history.vitalSigns.temperature || '37'}°C`,
    clinicalChanges: 'INGRESO FORMAL EN PLANTA A PARTIR DE HISTORIA CLÍNICA DE PLANTA.',
    newResults: 'Historia clínica completa levantada y validada.',
    problemReevaluation: noteText,
    updatedDiagnoses: history.diagnoses.map(d => d.name).join('; ') || 'En estudio en sala',
    conduct: 'Manejo en sala según órdenes médicas oficiales.'
  };

  await db.evolutions.add(evolutionEntry);

  // 2. Sincronizar datos con el paciente central
  const updatedClinicalHistory = {
    ...(patient.clinicalHistory || {}),
    reasonForConsultation: history.chiefComplaints?.join(', ') || patient.clinicalHistory?.reasonForConsultation || '',
    currentIllnessHistory: history.presentIllness || patient.clinicalHistory?.currentIllnessHistory || '',
    pathologicalHistory: history.pathologicalHistory.adulthood || patient.clinicalHistory?.pathologicalHistory || '',
    surgicalHistory: history.pathologicalHistory.surgeries || patient.clinicalHistory?.surgicalHistory || '',
    allergicHistory: history.pathologicalHistory.allergies || patient.clinicalHistory?.allergicHistory || '',
    clinicalImpression: history.diagnoses.map(d => d.name).join('; ') || patient.clinicalHistory?.clinicalImpression || ''
  };

  await db.patients.update(patient.id, {
    clinicalHistory: updatedClinicalHistory as any,
    status: 'ingresados',
    cubicle: history.generalData.sala || patient.cubicle
  });
}

/**
 * Exporta la Nota de Ingreso en formato Word (.docx) con membrete institucional
 */
export async function exportNotaIngresoPlantaDocx(
  history: ClinicalHistoryPlanta,
  noteText: string
): Promise<void> {
  const g = history.generalData;
  const safeName = (g.nombre || 'PACIENTE').replace(/\s+/g, '_').toUpperCase();
  const safeDate = (g.fechaIngreso || new Date().toISOString().split('T')[0]).replace(/\//g, '-');
  const filename = `NOTA_INGRESO_PLANTA_${safeName}_${safeDate}.docx`;

  try {
    let arrayBuffer: ArrayBuffer | null = null;
    const templateName = 'clinical-history-template.docx';
    const baseUrl = (import.meta as any).env?.BASE_URL || './';
    const urls = [
      `${baseUrl}templates/${templateName}`,
      `./templates/${templateName}`,
      `templates/${templateName}`,
      `/templates/${templateName}`
    ];

    for (const u of urls) {
      try {
        const res = await fetch(u);
        if (res.ok) {
          const buf = await res.arrayBuffer();
          if (buf && buf.byteLength > 1000) {
            arrayBuffer = buf;
            break;
          }
        }
      } catch {}
    }

    if (!arrayBuffer && FALLBACK_TEMPLATES[templateName]) {
      arrayBuffer = base64ToArrayBuffer(FALLBACK_TEMPLATES[templateName]);
    }

    if (!arrayBuffer && FALLBACK_TEMPLATES['NOTA DE INGRESO EMERGENCIA.docx']) {
      arrayBuffer = base64ToArrayBuffer(FALLBACK_TEMPLATES['NOTA DE INGRESO EMERGENCIA.docx']);
    }

    if (!arrayBuffer) {
      throw new Error('No se pudo cargar el buffer de la plantilla DOCX');
    }

    const zip = new PizZip(arrayBuffer);
    let docXml = zip.file('word/document.xml')?.asText() || '';

    // Convertir párrafos de texto en bloques XML de Word
    const lines = noteText.split('\n');
    let xmlParagraphs = '';
    for (const line of lines) {
      const trimmed = line.trim();
      const isTitle = trimmed.includes('HOSPITAL') || trimmed.includes('NOTA DE INGRESO') || trimmed.includes('RECIBIMIENTO');
      const isHeader = trimmed.endsWith(':') || trimmed.startsWith('•') || /^[0-9]+\./.test(trimmed);
      const isBold = isTitle || isHeader;
      const fontSize = isTitle ? 24 : 20;

      const escaped = trimmed
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      xmlParagraphs += `<w:p>
        <w:pPr>
          <w:jc w:val="${isTitle ? 'center' : 'both'}"/>
          <w:spacing w:line="240" w:lineRule="auto" w:before="60" w:after="60"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
            ${isBold ? '<w:b/>' : ''}
            <w:sz w:val="${fontSize}"/>
            <w:color w:val="${isTitle ? '1B365D' : '222222'}"/>
          </w:rPr>
          <w:t xml:space="preserve">${escaped}</w:t>
        </w:r>
      </w:p>`;
    }

    // Conservar encabezado con dibujo del logo si existe
    const drawingMatch = docXml.match(/<w:p[^>]*>.*?<w:drawing>.*?<\/w:drawing>.*?<\/w:p>/s);
    const logoParagraph = drawingMatch ? drawingMatch[0] : '';

    const newBodyXml = `<w:body>${logoParagraph}${xmlParagraphs}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080"/></w:sectPr></w:body>`;
    docXml = docXml.replace(/<w:body>.*<\/w:body>/s, newBodyXml);
    zip.file('word/document.xml', docXml);

    const outBlob = zip.generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    const url = URL.createObjectURL(outBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);

  } catch (err) {
    console.error('Error generando DOCX de Nota de Ingreso en Planta:', err);
    // Fallback texto enriquecido descargable
    const blob = new Blob([noteText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.replace('.docx', '.txt');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
}

/**
 * Exporta la Nota de Ingreso en formato PDF vectorial con membrete hospitalario
 */
export async function exportNotaIngresoPlantaPdf(
  history: ClinicalHistoryPlanta,
  noteText: string
): Promise<void> {
  const g = history.generalData;
  const safeName = (g.nombre || 'PACIENTE').replace(/\s+/g, '_').toUpperCase();
  const safeDate = (g.fechaIngreso || new Date().toISOString().split('T')[0]).replace(/\//g, '-');
  const filename = `NOTA_INGRESO_PLANTA_${safeName}_${safeDate}.pdf`;

  const pdf = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const margin = 18;
  const maxLineWidth = pageWidth - (margin * 2);
  let y = 20;

  // Membrete Institucional
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.setTextColor(27, 54, 93); // Azul institucional
  pdf.text('HOSPITAL REGIONAL DR. ÁNGEL MARÍA GATÓN', pageWidth / 2, y, { align: 'center' });
  y += 6;

  pdf.setFontSize(11);
  pdf.setTextColor(15, 76, 129);
  pdf.text('NOTA DE INGRESO EN PLANTA / RECIBIMIENTO EN SALA', pageWidth / 2, y, { align: 'center' });
  y += 6;

  pdf.setDrawColor(27, 54, 93);
  pdf.setLineWidth(0.6);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Contenido de la Nota
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9.5);
  pdf.setTextColor(30, 30, 30);

  const lines = noteText.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      y += 3;
      continue;
    }

    // Saltar encabezados redundantes ya dibujados en el membrete
    if (trimmed.includes(':HOSPITAL') || trimmed.includes('H  DR. ÁNGEL MARÍA GATÓN') || 
        trimmed.includes('NOTA DE INGRESO EN PLANTA') || trimmed.includes('(NOTA DE RECIBIMIENTO EN SALA)')) {
      continue;
    }

    // Nueva página si se acerca al final
    if (y > 275) {
      pdf.addPage();
      y = 20;
    }

    const isHeader = trimmed.endsWith(':') || trimmed.startsWith('NOMBRE:') || trimmed.startsWith('•');
    if (isHeader) {
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(20, 45, 85);
    } else {
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(35, 35, 35);
    }

    const wrappedLines = pdf.splitTextToSize(trimmed, maxLineWidth);
    for (const wl of wrappedLines) {
      if (y > 275) {
        pdf.addPage();
        y = 20;
      }
      pdf.text(wl, margin, y);
      y += 4.5;
    }
  }

  pdf.save(filename);
}
