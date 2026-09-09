import mammoth from 'mammoth';
import { 
  ClinicalHistory, 
  Vitals, 
  Patient, 
  StructuredDiagnosis, 
  MorbidItem 
} from '../types';

export interface ParsedHistoryData {
  sourceFileName: string;
  sourceFileType: string;
  rawText: string;
  
  // Demographics
  patientInfo?: {
    fullName?: string;
    idDocument?: string;
    medicalRecordNumber?: string;
    age?: number;
    sex?: 'M' | 'F' | 'Otro';
    provenance?: string;
    cubicle?: string;
  };

  // Clinical History
  reasonForConsultation?: string;
  currentIllnessHistory?: string;
  pathologicalHistory?: string;
  morbidList?: MorbidItem[];
  surgicalHistory?: string;
  allergicHistory?: string;
  habitualMedications?: string;
  toxicHabits?: string;
  familyHistory?: string;
  obGynHistory?: string;
  systemsReview?: string;

  // Vitals
  vitals?: Partial<Vitals>;

  // Physical Exam
  physicalExam?: {
    general?: string;
    head?: string;
    neck?: string;
    cardiovascular?: string;
    respiratory?: string;
    abdominal?: string;
    genitourinary?: string;
    neurological?: string;
    extremities?: string;
    skin?: string;
    otherFindings?: string;
  };

  // Diagnoses
  diagnosesList?: StructuredDiagnosis[];
  clinicalImpression?: string;

  // Plan
  diagnosticAndTherapeuticPlan?: string;
}

/**
 * Extract raw text from File (.docx, .txt, .pdf)
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'docx') {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value || '';
  }

  if (extension === 'txt') {
    return await file.text();
  }

  if (extension === 'pdf') {
    // Basic text extraction for plain/uncompressed streams in browser or fallback text
    try {
      const text = await file.text();
      // Look for PDF stream text tokens
      const matches = text.match(/\((.*?)\)\s*Tj/g);
      if (matches && matches.length > 5) {
        return matches.map(m => m.replace(/^\(|\)\s*Tj$/g, '')).join(' ');
      }
    } catch {
      // ignore
    }
    return `[Archivo PDF adjuntado: ${file.name} — Se recomienda revisar el documento original o copiar texto si el PDF es escaneado/imagen.]`;
  }

  return await file.text();
}

/**
 * Parses raw clinical text into structured history fields
 * STRICT RULE: NEVER hallucinate. If not found in text, leave undefined.
 */
export function parseClinicalText(text: string, fileName: string = 'documento.docx'): ParsedHistoryData {
  const clean = text.replace(/\r\n/g, '\n');
  const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);

  const parsed: ParsedHistoryData = {
    sourceFileName: fileName,
    sourceFileType: fileName.split('.').pop()?.toLowerCase() || 'docx',
    rawText: clean,
    patientInfo: {},
    physicalExam: {},
    vitals: {},
    morbidList: [],
    diagnosesList: []
  };

  // Helper regex searcher
  const findRegex = (pattern: RegExp, textToSearch = clean): string | undefined => {
    const match = textToSearch.match(pattern);
    return match ? match[1]?.trim() : undefined;
  };

  // 1. Demographics & Identification
  const nameMatch = findRegex(/(?:NOMBRE|PACIENTE|NOMBRE DEL PACIENTE|DATOS DEL PACIENTE)\s*[:\-]?\s*([A-Za-zÁÉÍÓÚáéíóúñÑ\s]+?)(?=(?:\s+EDAD|\s+CÉDULA|\s+CEDULA|\s+EXP|\s+SEXO|\n|$))/i);
  if (nameMatch && nameMatch.length > 2 && !nameMatch.toLowerCase().includes('completo')) {
    parsed.patientInfo!.fullName = nameMatch.trim();
  }

  const ageMatch = findRegex(/(?:EDAD|AÑOS)\s*[:\-]?\s*(\d{1,3})\s*(?:AÑOS|A)?/i);
  if (ageMatch) {
    const ageNum = parseInt(ageMatch, 10);
    if (!isNaN(ageNum) && ageNum >= 0 && ageNum <= 125) {
      parsed.patientInfo!.age = ageNum;
    }
  }

  const sexMatch = findRegex(/(?:SEXO|GÉNERO)\s*[:\-]?\s*(MASCULINO|FEMENINO|M|F|HOMBRE|MUJER)/i);
  if (sexMatch) {
    const s = sexMatch.toUpperCase();
    if (s.startsWith('M') || s.startsWith('H')) parsed.patientInfo!.sex = 'M';
    else if (s.startsWith('F')) parsed.patientInfo!.sex = 'F';
  }

  const idDocMatch = findRegex(/(?:CÉDULA|CEDULA|DNI|IDENTIFICACIÓN)\s*[:\-]?\s*([\d\-]{9,15})/i);
  if (idDocMatch) parsed.patientInfo!.idDocument = idDocMatch.trim();

  const recordNumMatch = findRegex(/(?:EXPEDIENTE|NO\.\s*EXP|RECORD|HISTORIA)\s*[:\-]?\s*([A-Z0-9\-]+)/i);
  if (recordNumMatch) parsed.patientInfo!.medicalRecordNumber = recordNumMatch.trim();

  // 2. Vital Signs
  const bpMatch = findRegex(/(?:T\/A|TA|PA|PRESIÓN ARTERIAL|PRESION)\s*[:\-]?\s*(\d{2,3})\s*[\/|\-]\s*(\d{2,3})/i);
  if (bpMatch) {
    const matchAll = clean.match(/(?:T\/A|TA|PA|PRESIÓN ARTERIAL|PRESION)\s*[:\-]?\s*(\d{2,3})\s*[\/|\-]\s*(\d{2,3})/i);
    if (matchAll) {
      const sbp = parseInt(matchAll[1], 10);
      const dbp = parseInt(matchAll[2], 10);
      if (sbp > 30 && sbp < 300) parsed.vitals!.systolicBP = sbp;
      if (dbp > 20 && dbp < 200) parsed.vitals!.diastolicBP = dbp;
    }
  }

  const hrMatch = findRegex(/(?:FC|FRECUENCIA CARD(?:Í|I)ACA|PULSO)\s*[:\-]?\s*(\d{2,3})\s*(?:LPM|X'|XMIN|\/MIN)?/i);
  if (hrMatch) {
    const hr = parseInt(hrMatch, 10);
    if (hr >= 30 && hr <= 250) parsed.vitals!.heartRate = hr;
  }

  const rrMatch = findRegex(/(?:FR|FRECUENCIA RESPIRATORIA)\s*[:\-]?\s*(\d{1,2})\s*(?:RPM|X'|XMIN|\/MIN)?/i);
  if (rrMatch) {
    const rr = parseInt(rrMatch, 10);
    if (rr >= 5 && rr <= 70) parsed.vitals!.respiratoryRate = rr;
  }

  const tempMatch = findRegex(/(?:TEMP|TEMPERATURA|T°)\s*[:\-]?\s*(\d{2}(?:[.,]\d)?)\s*(?:°C|C)?/i);
  if (tempMatch) {
    const temp = parseFloat(tempMatch.replace(',', '.'));
    if (temp >= 30 && temp <= 43) parsed.vitals!.temperature = temp;
  }

  const satMatch = findRegex(/(?:SATO2|SAT\s*O2|SATURACI(?:Ó|O)N|SPO2)\s*[:\-]?\s*(\d{2,3})\s*%/i);
  if (satMatch) {
    const sat = parseInt(satMatch, 10);
    if (sat >= 40 && sat <= 100) parsed.vitals!.oxygenSaturation = sat;
  }

  const glucMatch = findRegex(/(?:GLUCEMIA|GLICEMIA|HGT|DEXTROSTIX)\s*[:\-]?\s*(\d{2,3})\s*(?:MG\/DL)?/i);
  if (glucMatch) {
    const gluc = parseInt(glucMatch, 10);
    if (gluc >= 20 && gluc <= 800) parsed.vitals!.bloodGlucose = gluc;
  }

  const glasgowMatch = findRegex(/(?:GLASGOW|ECG)\s*[:\-]?\s*(\d{1,2})\s*(?:\/\s*15)?/i);
  if (glasgowMatch) {
    const g = parseInt(glasgowMatch, 10);
    if (g >= 3 && g <= 15) parsed.vitals!.glasgowTotal = g;
  }

  // 3. Section Slicing for Clinical History
  const sectionExtract = (startWords: string[], endWords: string[]): string | undefined => {
    const startPattern = `(?:^|\\n)\\s*(?:${startWords.join('|')})\\s*[:\\-]?\\s*([\\s\\S]*?)`;
    const endPattern = `(?=\\n\\s*(?:${endWords.join('|')})\\s*[:\\-]|$)`;
    const fullRegex = new RegExp(startPattern + endPattern, 'i');
    const match = clean.match(fullRegex);
    if (match && match[1]?.trim()) {
      return match[1].trim();
    }
    return undefined;
  };

  // Sections
  parsed.reasonForConsultation = sectionExtract(
    ['MOTIVO DE CONSULTA', 'MOTIVO DE INGRESO', 'MOTIVO CONSULTA', 'SÍNTOMA PRINCIPAL'],
    ['HISTORIA DE LA ENFERMEDAD ACTUAL', 'ENFERMEDAD ACTUAL', 'HDA', 'ANTECEDENTES']
  );

  parsed.currentIllnessHistory = sectionExtract(
    ['HISTORIA DE LA ENFERMEDAD ACTUAL', 'ENFERMEDAD ACTUAL', 'HDA', 'PADECIMIENTO ACTUAL'],
    ['ANTECEDENTES PATOLÓGICOS', 'ANTECEDENTES PERSONALES', 'ANTECEDENTES', 'REVISIÓN POR SISTEMAS', 'EXAMEN FÍSICO']
  );

  parsed.pathologicalHistory = sectionExtract(
    ['ANTECEDENTES PATOLÓGICOS PERSONALES', 'ANTECEDENTES PERSONALES PATOLÓGICOS', 'ANTECEDENTES PATOLÓGICOS', 'PATOLÓGICOS'],
    ['ANTECEDENTES QUIRÚRGICOS', 'QUIRÚRGICOS', 'ALERGIAS', 'ANTECEDENTES ALÉRGICOS', 'TÓXICOS', 'HÁBITOS TÓXICOS', 'MEDICAMENTOS']
  );

  parsed.surgicalHistory = sectionExtract(
    ['ANTECEDENTES QUIRÚRGICOS', 'QUIRÚRGICOS'],
    ['ANTECEDENTES ALÉRGICOS', 'ALERGIAS', 'ALÉRGICOS', 'TÓXICOS', 'HÁBITOS TÓXICOS', 'MEDICAMENTOS', 'FAMILIARES']
  );

  parsed.allergicHistory = sectionExtract(
    ['ANTECEDENTES ALÉRGICOS', 'ALERGIAS', 'ALÉRGICOS'],
    ['TÓXICOS', 'HÁBITOS TÓXICOS', 'MEDICAMENTOS', 'HÁBITOS', 'FAMILIARES', 'GINECO']
  );

  parsed.toxicHabits = sectionExtract(
    ['HÁBITOS TÓXICOS', 'TÓXICOS', 'HÁBITOS'],
    ['MEDICAMENTOS HABITUALES', 'MEDICAMENTOS', 'TRATAMIENTO HABITUAL', 'FAMILIARES']
  );

  parsed.habitualMedications = sectionExtract(
    ['MEDICAMENTOS HABITUALES', 'MEDICAMENTOS DE USO HABITUAL', 'TRATAMIENTO HABITUAL', 'MEDICAMENTOS'],
    ['ANTECEDENTES FAMILIARES', 'FAMILIARES', 'GINECO-OBSTÉTRICOS', 'EXAMEN FÍSICO']
  );

  parsed.familyHistory = sectionExtract(
    ['ANTECEDENTES FAMILIARES', 'FAMILIARES', 'HEREDOFAMILIARES'],
    ['GINECO-OBSTÉTRICOS', 'GINECOLÓGICOS', 'REVISIÓN POR SISTEMAS', 'EXAMEN FÍSICO']
  );

  parsed.obGynHistory = sectionExtract(
    ['ANTECEDENTES GINECO-OBSTÉTRICOS', 'GINECO-OBSTÉTRICOS', 'GINECOLÓGICOS'],
    ['REVISIÓN POR SISTEMAS', 'EXAMEN FÍSICO', 'CONSTANTES VITALES']
  );

  // 4. Physical Exam Extraction
  const peFull = sectionExtract(
    ['EXAMEN FÍSICO', 'EXAMEN FISICO', 'EXPLORACIÓN FÍSICA'],
    ['IMPRESIÓN DIAGNÓSTICA', 'DIAGNÓSTICOS', 'DIAGNÓSTICO', 'PLAN', 'MANEJO', 'ORDEN MÉDICA']
  );

  if (peFull) {
    const subPe = (keys: string[]): string | undefined => {
      const p = new RegExp(`(?:^|\\n)\\s*(?:${keys.join('|')})\\s*[:\\-]\\s*([^\\n]+(?:\\n(?!\\s*(?:CABEZA|CUELLO|TÓRAX|TORAX|CARDIO|RESPIRA|ABDOMEN|NEURO|EXTREMI|PIEL|GENITO|TACTO))[^\\n]+)*)`, 'i');
      const m = peFull.match(p);
      return m ? m[1].trim() : undefined;
    };

    parsed.physicalExam = {
      general: subPe(['GENERAL', 'ASPECTO GENERAL', 'ESTADO GENERAL']),
      head: subPe(['CABEZA', 'CABEZA Y CUELLO', 'CRÁNEO']),
      neck: subPe(['CUELLO']),
      cardiovascular: subPe(['CARDIOVASCULAR', 'CORAZÓN', 'APARATO CIRCULATORIO', 'RUIDOS CARDIACOS']),
      respiratory: subPe(['RESPIRATORIO', 'PULMONES', 'TÓRAX PLEUROPULMONAR', 'CAMPOS PULMONARES']),
      abdominal: subPe(['ABDOMINAL', 'ABDOMEN']),
      neurological: subPe(['NEUROLÓGICO', 'NEUROLÓGICO Y ESTADO MENTAL', 'SNC']),
      extremities: subPe(['EXTREMIDADES', 'MIEMBROS INFERIORES']),
      skin: subPe(['PIEL', 'PIEL Y FANERAS', 'TEGUMENTOS']),
      genitourinary: subPe(['GENITOURINARIO', 'GENITALES']),
    };

    // If general is not found, take first lines of peFull
    if (!parsed.physicalExam.general && !parsed.physicalExam.cardiovascular) {
      parsed.physicalExam.general = peFull.slice(0, 300);
    }
  }

  // 5. Diagnoses
  const diagSection = sectionExtract(
    ['IMPRESIÓN DIAGNÓSTICA', 'DIAGNÓSTICO PRESUNTIVO', 'DIAGNÓSTICOS', 'DIAGNÓSTICO', 'IMPRESIONES DIAGNÓSTICAS'],
    ['PLAN', 'PLAN TERAPÉUTICO', 'CONDUCTA', 'TRATAMIENTO', 'ORDEN MÉDICA', 'MANEJO']
  );

  if (diagSection) {
    parsed.clinicalImpression = diagSection;
    const diagLines = diagSection.split('\n')
      .map(l => l.replace(/^[\d\-•*.)\s]+/, '').trim())
      .filter(l => l.length > 2);

    parsed.diagnosesList = diagLines.map((diag, index) => ({
      id: `diag-import-${Date.now()}-${index}`,
      name: diag,
      status: 'Probable',
      type: index === 0 ? 'Primario' : 'Secundario',
      orderIndex: index
    }));
  }

  // 6. Plan / Manejo
  parsed.diagnosticAndTherapeuticPlan = sectionExtract(
    ['PLAN DIAGNÓSTICO Y TERAPÉUTICO', 'PLAN TERAPÉUTICO', 'PLAN', 'CONDUCTA Y PLAN', 'MANEJO', 'ÓRDENES MÉDICAS'],
    ['FIRMA', 'MÉDICO TRATANTE', 'DR.', 'DRA.']
  );

  return parsed;
}

/**
 * Merges selected fields from parsed draft into target Patient object
 */
export function applyParsedHistoryToPatient(
  patient: Patient, 
  parsed: ParsedHistoryData, 
  selectedFields: Record<string, boolean>
): Patient {
  const updated: Patient = JSON.parse(JSON.stringify(patient));

  // Demographics
  if (selectedFields['patientInfo.fullName'] && parsed.patientInfo?.fullName) {
    updated.fullName = parsed.patientInfo.fullName;
  }
  if (selectedFields['patientInfo.age'] && parsed.patientInfo?.age) {
    updated.age = parsed.patientInfo.age;
  }
  if (selectedFields['patientInfo.sex'] && parsed.patientInfo?.sex) {
    updated.sex = parsed.patientInfo.sex;
  }
  if (selectedFields['patientInfo.idDocument'] && parsed.patientInfo?.idDocument) {
    updated.idDocument = parsed.patientInfo.idDocument;
  }
  if (selectedFields['patientInfo.medicalRecordNumber'] && parsed.patientInfo?.medicalRecordNumber) {
    updated.medicalRecordNumber = parsed.patientInfo.medicalRecordNumber;
  }

  // Clinical History
  if (!updated.clinicalHistory) {
    updated.clinicalHistory = {
      reasonForConsultation: '',
      currentIllnessHistory: '',
      pathologicalHistory: '',
      surgicalHistory: '',
      allergicHistory: '',
      habitualMedications: '',
      toxicHabits: '',
      familyHistory: '',
      obGynHistory: '',
      systemsReview: '',
      physicalExam: {
        general: '',
        cardiovascular: '',
        respiratory: '',
        abdominal: '',
        neurological: '',
        extremities: '',
        skin: '',
        otherFindings: ''
      },
      clinicalImpression: '',
      diagnosticAndTherapeuticPlan: ''
    };
  }

  if (selectedFields['reasonForConsultation'] && parsed.reasonForConsultation) {
    updated.clinicalHistory.reasonForConsultation = parsed.reasonForConsultation;
    if (!updated.chiefComplaint) updated.chiefComplaint = parsed.reasonForConsultation;
  }

  if (selectedFields['currentIllnessHistory'] && parsed.currentIllnessHistory) {
    updated.clinicalHistory.currentIllnessHistory = parsed.currentIllnessHistory;
  }

  if (selectedFields['pathologicalHistory'] && parsed.pathologicalHistory) {
    updated.clinicalHistory.pathologicalHistory = parsed.pathologicalHistory;
  }

  if (selectedFields['surgicalHistory'] && parsed.surgicalHistory) {
    updated.clinicalHistory.surgicalHistory = parsed.surgicalHistory;
  }

  if (selectedFields['allergicHistory'] && parsed.allergicHistory) {
    updated.clinicalHistory.allergicHistory = parsed.allergicHistory;
    // Add to allergies array if not already present
    if (!updated.vitals) updated.vitals = {};
    if (!updated.vitals.allergies) updated.vitals.allergies = [];
    const allergies = parsed.allergicHistory.split(/[,;\n]+/).map(a => a.trim()).filter(Boolean);
    allergies.forEach(a => {
      if (!updated.vitals?.allergies?.includes(a)) {
        updated.vitals?.allergies?.push(a);
      }
    });
  }

  if (selectedFields['habitualMedications'] && parsed.habitualMedications) {
    updated.clinicalHistory.habitualMedications = parsed.habitualMedications;
  }

  if (selectedFields['toxicHabits'] && parsed.toxicHabits) {
    updated.clinicalHistory.toxicHabits = parsed.toxicHabits;
  }

  if (selectedFields['familyHistory'] && parsed.familyHistory) {
    updated.clinicalHistory.familyHistory = parsed.familyHistory;
  }

  if (selectedFields['obGynHistory'] && parsed.obGynHistory) {
    updated.clinicalHistory.obGynHistory = parsed.obGynHistory;
  }

  // Vitals
  if (!updated.vitals) updated.vitals = {};
  if (selectedFields['vitals.systolicBP'] && parsed.vitals?.systolicBP) {
    updated.vitals.systolicBP = parsed.vitals.systolicBP;
  }
  if (selectedFields['vitals.diastolicBP'] && parsed.vitals?.diastolicBP) {
    updated.vitals.diastolicBP = parsed.vitals.diastolicBP;
  }
  if (selectedFields['vitals.heartRate'] && parsed.vitals?.heartRate) {
    updated.vitals.heartRate = parsed.vitals.heartRate;
  }
  if (selectedFields['vitals.respiratoryRate'] && parsed.vitals?.respiratoryRate) {
    updated.vitals.respiratoryRate = parsed.vitals.respiratoryRate;
  }
  if (selectedFields['vitals.temperature'] && parsed.vitals?.temperature) {
    updated.vitals.temperature = parsed.vitals.temperature;
  }
  if (selectedFields['vitals.oxygenSaturation'] && parsed.vitals?.oxygenSaturation) {
    updated.vitals.oxygenSaturation = parsed.vitals.oxygenSaturation;
  }
  if (selectedFields['vitals.bloodGlucose'] && parsed.vitals?.bloodGlucose) {
    updated.vitals.bloodGlucose = parsed.vitals.bloodGlucose;
  }
  if (selectedFields['vitals.glasgowTotal'] && parsed.vitals?.glasgowTotal) {
    updated.vitals.glasgowTotal = parsed.vitals.glasgowTotal;
  }

  // Physical Exam
  if (parsed.physicalExam) {
    Object.entries(parsed.physicalExam).forEach(([k, v]) => {
      if (selectedFields[`physicalExam.${k}`] && v) {
        (updated.clinicalHistory!.physicalExam as any)[k] = v;
      }
    });
  }

  // Diagnoses
  if (selectedFields['diagnosesList'] && parsed.diagnosesList && parsed.diagnosesList.length > 0) {
    updated.diagnosesList = parsed.diagnosesList;
    if (parsed.clinicalImpression) {
      updated.clinicalHistory.clinicalImpression = parsed.clinicalImpression;
    }
  }

  // Plan
  if (selectedFields['diagnosticAndTherapeuticPlan'] && parsed.diagnosticAndTherapeuticPlan) {
    updated.clinicalHistory.diagnosticAndTherapeuticPlan = parsed.diagnosticAndTherapeuticPlan;
  }

  // Record Source Document
  if (!updated.sourceDocuments) updated.sourceDocuments = [];
  updated.sourceDocuments.push({
    id: `src-doc-${Date.now()}`,
    patientId: updated.id,
    fileName: parsed.sourceFileName,
    fileType: parsed.sourceFileType,
    fileSize: parsed.rawText.length,
    uploadedAt: new Date().toISOString(),
    uploadedBy: 'Médico Tratante',
    rawText: parsed.rawText,
    parsedSummary: `Campos importados: ${Object.keys(selectedFields).filter(k => selectedFields[k]).join(', ')}`
  });

  updated.updatedAt = new Date().toISOString();
  return updated;
}
