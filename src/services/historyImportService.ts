import { Patient, StructuredDiagnosis, MorbidItem, Vitals } from '../types';
import { parseClinicalNote, fold, type ParsedNote, type Confidence } from './clinicalImport/noteParser';
import { extractTextFromClinicalFile } from './clinicalImport/fileText';

/**
 * Importación de notas / historias clínicas externas al expediente del paciente.
 * El texto se distribuye por acápites con el lector inteligente (noteParser) y el
 * médico revisa, edita y elige qué aplicar. Nada se inventa.
 */
export interface ParsedHistoryData {
  sourceFileName: string;
  sourceFileType: string;
  rawText: string;
  extractionMethod?: string;

  patientInfo?: {
    fullName?: string;
    idDocument?: string;
    medicalRecordNumber?: string;
    age?: number;
    sex?: 'M' | 'F' | 'Otro';
    provenance?: string;
    cubicle?: string;
  };

  reasonForConsultation?: string;
  currentIllnessHistory?: string;
  pathologicalHistory?: string;
  morbidList?: MorbidItem[];
  surgicalHistory?: string;
  allergicHistory?: string;
  allergiesNegated?: boolean;
  allergyList?: string[];
  habitualMedications?: string;
  toxicHabits?: string;
  familyHistory?: string;
  obGynHistory?: string;
  transfusionalHistory?: string;
  systemsReview?: string;

  vitals?: Partial<Vitals>;

  physicalExam?: {
    general?: string;
    head?: string;
    eyes?: string;
    ears?: string;
    nose?: string;
    mouth?: string;
    neck?: string;
    thorax?: string;
    lungs?: string;
    heart?: string;
    abdominal?: string;
    genitals?: string;
    skin?: string;
    upperExtremities?: string;
    lowerExtremities?: string;
    neurological?: string;
    extremities?: string;
    rectalExam?: string;
    otherFindings?: string;
    // compatibilidad
    cardiovascular?: string;
    respiratory?: string;
    genitourinary?: string;
  };

  labsText?: string;
  imagingText?: string;
  diagnosesList?: StructuredDiagnosis[];
  clinicalImpression?: string;
  diagnosticAndTherapeuticPlan?: string;

  /** Origen de cada dato ('ALTA' = acápite con título, 'MEDIA' = deducido del texto) */
  confidence?: Record<string, Confidence>;
  warnings?: string[];
  sectionsFound?: string[];
}

/** Lee el texto de cualquier archivo soportado (Word, PDF, texto, RTF, fotos…). */
export async function extractTextFromFile(file: File): Promise<string> {
  const r = await extractTextFromClinicalFile(file);
  return r.text;
}

export async function extractTextWithDetails(file: File) {
  return extractTextFromClinicalFile(file);
}

const CONF_MAP: Record<string, string> = {
  'identification.fullName': 'patientInfo.fullName',
  'identification.age': 'patientInfo.age',
  'identification.sex': 'patientInfo.sex',
  'identification.idDocument': 'patientInfo.idDocument',
  'identification.medicalRecordNumber': 'patientInfo.medicalRecordNumber',
  'identification.location': 'patientInfo.cubicle',
  reasonForConsultation: 'reasonForConsultation',
  currentIllness: 'currentIllnessHistory',
  'antecedents.pathological': 'pathologicalHistory',
  'antecedents.surgical': 'surgicalHistory',
  'antecedents.allergic': 'allergicHistory',
  'antecedents.medications': 'habitualMedications',
  'antecedents.toxic': 'toxicHabits',
  'antecedents.family': 'familyHistory',
  'antecedents.obGyn': 'obGynHistory',
  'antecedents.transfusional': 'transfusionalHistory',
  systemsReview: 'systemsReview',
  diagnoses: 'diagnosesList',
  plan: 'diagnosticAndTherapeuticPlan',
  labs: 'labsText'
};

export function noteToHistoryData(note: ParsedNote, rawText: string, fileName: string, method?: string, extraWarnings: string[] = []): ParsedHistoryData {
  const A = note.antecedents;
  const ex = note.physicalExam;
  const confidence: Record<string, Confidence> = {};
  for (const [k, v] of Object.entries(note.confidence)) {
    if (CONF_MAP[k]) confidence[CONF_MAP[k]] = v;
    else if (k.startsWith('vitals.') || k.startsWith('physicalExam.')) confidence[k] = v;
  }
  if (confidence['vitals.systolicBP']) confidence['vitals.diastolicBP'] = confidence['vitals.systolicBP'];

  // "Antecedentes:" genérico (sin sub-apartados) -> patológicos
  const pathological = A.pathological || A.general;
  if (!A.pathological && A.general) confidence['pathologicalHistory'] = note.confidence['antecedents.general'] || 'MEDIA';

  const now = Date.now();
  return {
    sourceFileName: fileName,
    sourceFileType: fileName.split('.').pop()?.toLowerCase() || 'txt',
    rawText,
    extractionMethod: method,
    patientInfo: {
      fullName: note.identification.fullName,
      age: note.identification.age,
      sex: note.identification.sex,
      idDocument: note.identification.idDocument,
      medicalRecordNumber: note.identification.medicalRecordNumber,
      cubicle: note.identification.location
    },
    reasonForConsultation: note.reasonForConsultation,
    currentIllnessHistory: note.currentIllness,
    pathologicalHistory: pathological,
    surgicalHistory: A.surgical,
    allergicHistory: A.allergic,
    allergiesNegated: A.allergiesNegated,
    allergyList: A.allergyList,
    habitualMedications: A.medications,
    toxicHabits: A.toxic,
    familyHistory: A.family,
    obGynHistory: A.obGyn,
    transfusionalHistory: A.transfusional,
    systemsReview: note.systemsReview,
    vitals: { ...note.vitals },
    physicalExam: {
      general: ex.general,
      head: ex.head,
      eyes: ex.eyes,
      ears: ex.ears,
      nose: ex.nose,
      mouth: ex.mouth,
      neck: ex.neck,
      thorax: ex.thorax,
      lungs: ex.lungs,
      heart: ex.heart,
      abdominal: ex.abdominal,
      genitals: ex.genitals,
      skin: ex.skin,
      upperExtremities: ex.upperExtremities,
      lowerExtremities: ex.lowerExtremities,
      extremities: ex.extremities,
      neurological: ex.neurological,
      rectalExam: ex.rectal
    },
    labsText: note.labs,
    imagingText: note.imaging,
    diagnosesList: note.diagnoses.map((name, index) => ({
      id: `diag-import-${now}-${index}`,
      name,
      status: 'Probable',
      type: index === 0 ? 'Primario' : 'Secundario',
      orderIndex: index
    })),
    clinicalImpression: note.diagnoses.length ? note.diagnoses.map((d, i) => `${i + 1}. ${d}`).join('\n') : undefined,
    diagnosticAndTherapeuticPlan: note.plan,
    confidence,
    warnings: [...extraWarnings, ...note.warnings],
    sectionsFound: note.sectionsFound
  };
}

/**
 * Distribuye el texto de una nota por acápites.
 * REGLA: nunca inventa; lo que no está en el texto queda vacío.
 */
export function parseClinicalText(text: string, fileName: string = 'documento.txt', method?: string, extraWarnings: string[] = []): ParsedHistoryData {
  return noteToHistoryData(parseClinicalNote(text), text, fileName, method, extraWarnings);
}

/** ¿El nombre del documento corresponde al paciente abierto? (evita importar la nota de otro paciente) */
export function nameMatchesPatient(docName?: string, patientName?: string): boolean {
  if (!docName || !patientName) return true;
  const tokens = (s: string) =>
    fold(s)
      .replace(/[^A-Z\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !['DEL', 'LAS', 'LOS'].includes(w));
  const a = new Set(tokens(docName));
  const b = tokens(patientName);
  if (!a.size || !b.length) return true;
  const common = b.filter((w) => a.has(w)).length;
  return common >= Math.min(2, Math.min(a.size, b.length));
}

const hasText = (s?: string) => typeof s === 'string' && s.trim().length > 0;

/**
 * Aplica al paciente SOLO los campos marcados por el médico.
 * - No borra datos: un campo vacío del documento no reemplaza uno existente.
 * - Diagnósticos: se agregan los nuevos sin duplicar los que ya existen.
 * - Alergias: "NEGADAS" no se registra como alergia.
 */
export function applyParsedHistoryToPatient(patient: Patient, parsed: ParsedHistoryData, selectedFields: Record<string, boolean>): Patient {
  const updated: Patient = JSON.parse(JSON.stringify(patient));
  const on = (k: string) => Boolean(selectedFields[k]);
  const P = parsed.patientInfo || {};

  if (on('patientInfo.fullName') && hasText(P.fullName)) updated.fullName = P.fullName!.trim();
  if (on('patientInfo.age') && typeof P.age === 'number' && P.age >= 0 && P.age <= 120) updated.age = P.age;
  if (on('patientInfo.sex') && P.sex) updated.sex = P.sex as any;
  if (on('patientInfo.idDocument') && hasText(P.idDocument)) (updated as any).idDocument = P.idDocument!.trim();
  if (on('patientInfo.medicalRecordNumber') && hasText(P.medicalRecordNumber)) (updated as any).medicalRecordNumber = P.medicalRecordNumber!.trim();
  if (on('patientInfo.cubicle') && hasText(P.cubicle)) updated.cubicle = P.cubicle!.trim();

  const blankExam = { general: '', abdominal: '', skin: '', neurological: '' };
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
      physicalExam: { ...blankExam },
      clinicalImpression: '',
      diagnosticAndTherapeuticPlan: ''
    } as any;
  }
  const ch: any = updated.clinicalHistory;
  if (!ch.physicalExam) ch.physicalExam = { ...blankExam };

  const textFields: Array<[string, string]> = [
    ['reasonForConsultation', 'reasonForConsultation'],
    ['currentIllnessHistory', 'currentIllnessHistory'],
    ['pathologicalHistory', 'pathologicalHistory'],
    ['surgicalHistory', 'surgicalHistory'],
    ['allergicHistory', 'allergicHistory'],
    ['habitualMedications', 'habitualMedications'],
    ['toxicHabits', 'toxicHabits'],
    ['familyHistory', 'familyHistory'],
    ['obGynHistory', 'obGynHistory'],
    ['transfusionalHistory', 'transfusionalHistory'],
    ['systemsReview', 'systemsReview'],
    ['diagnosticAndTherapeuticPlan', 'diagnosticAndTherapeuticPlan']
  ];
  for (const [src, dst] of textFields) {
    const v = (parsed as any)[src];
    if (on(src) && hasText(v)) ch[dst] = v.trim();
  }
  if (on('reasonForConsultation') && hasText(parsed.reasonForConsultation) && !hasText(updated.chiefComplaint)) {
    updated.chiefComplaint = parsed.reasonForConsultation!.trim();
  }

  // Alergias: sólo sustancias reales
  if (on('allergicHistory') && hasText(parsed.allergicHistory)) {
    if (!updated.vitals) updated.vitals = {};
    const current = (updated.vitals.allergies || []).filter((a) => !/^(NEGAD|NINGUN|NO\b|NIEGA)/.test(fold(String(a))));
    const list = (parsed.allergyList && parsed.allergyList.length
      ? parsed.allergyList
      : parsed.allergiesNegated
        ? []
        : parsed.allergicHistory!.split(/[,;\n]+/)
    )
      .map((a) => a.trim())
      .filter((a) => a.length > 1 && !/^(NEGAD|NINGUN|NO\b|NIEGA)/.test(fold(a)));
    for (const a of list) if (!current.some((c) => fold(String(c)) === fold(a))) current.push(a);
    updated.vitals.allergies = current;
  }

  // Signos vitales
  if (!updated.vitals) updated.vitals = {};
  const vitalKeys: Array<keyof Vitals> = ['systolicBP', 'diastolicBP', 'heartRate', 'respiratoryRate', 'temperature', 'oxygenSaturation', 'bloodGlucose', 'glasgowTotal', 'weight', 'height'];
  let vitalsApplied = false;
  for (const k of vitalKeys) {
    const v = (parsed.vitals as any)?.[k];
    const key = k === 'diastolicBP' ? 'vitals.systolicBP' : `vitals.${k}`;
    if (on(key) && typeof v === 'number' && Number.isFinite(v)) {
      (updated.vitals as any)[k] = v;
      vitalsApplied = true;
    }
  }
  if (vitalsApplied) {
    const V = updated.vitals;
    V.timestamp = new Date().toISOString();
    V.recordedBy = 'Importado de documento';
    if (V.systolicBP && V.diastolicBP) V.map = Math.round((V.systolicBP + 2 * V.diastolicBP) / 3);
    if (V.weight && V.height) {
      const m = V.height > 3 ? V.height / 100 : V.height;
      if (m > 0.3) V.bmi = Math.round((V.weight / (m * m)) * 10) / 10;
    }
  }

  // Examen físico (16 acápites + campos de compatibilidad)
  const ex = parsed.physicalExam || {};
  const examMap: Array<[keyof NonNullable<ParsedHistoryData['physicalExam']>, string[]]> = [
    ['general', ['general']],
    ['head', ['head']],
    ['eyes', ['eyes']],
    ['ears', ['ears']],
    ['nose', ['nose']],
    ['mouth', ['mouth']],
    ['neck', ['neck']],
    ['thorax', ['thorax']],
    ['lungs', ['lungs', 'respiratory']],
    ['heart', ['heart', 'cardiovascular']],
    ['abdominal', ['abdominal']],
    ['genitals', ['genitals', 'genitourinary']],
    ['skin', ['skin']],
    ['upperExtremities', ['upperExtremities']],
    ['lowerExtremities', ['lowerExtremities']],
    ['extremities', ['extremities']],
    ['neurological', ['neurological']],
    ['rectalExam', ['rectalExam', 'genitourinaryRectal']]
  ];
  for (const [src, dsts] of examMap) {
    const v = (ex as any)[src];
    if (on(`physicalExam.${src}`) && hasText(v)) for (const d of dsts) ch.physicalExam[d] = v.trim();
  }
  // "Extremidades:" sin separar superiores/inferiores -> se refleja en ambos acápites
  if (on('physicalExam.extremities') && hasText(ex.extremities)) {
    if (!hasText(ex.upperExtremities) && !hasText(ch.physicalExam.upperExtremities)) ch.physicalExam.upperExtremities = ex.extremities!.trim();
    if (!hasText(ex.lowerExtremities) && !hasText(ch.physicalExam.lowerExtremities)) ch.physicalExam.lowerExtremities = ex.extremities!.trim();
  }

  // Diagnósticos: agregar sin duplicar
  if (on('diagnosesList') && parsed.diagnosesList && parsed.diagnosesList.length) {
    const existing: StructuredDiagnosis[] = Array.isArray(updated.diagnosesList) ? updated.diagnosesList : [];
    const names = new Set(existing.map((d) => fold(d.name).trim()));
    const toAdd = parsed.diagnosesList
      .filter((d) => hasText(d.name) && !names.has(fold(d.name).trim()))
      .map((d, i) => ({ ...d, type: existing.length || i > 0 ? 'Secundario' : 'Primario', orderIndex: existing.length + i } as StructuredDiagnosis));
    updated.diagnosesList = [...existing, ...toAdd];
    if (!hasText(ch.clinicalImpression) || !existing.length) {
      ch.clinicalImpression = updated.diagnosesList.map((d, i) => `${i + 1}. ${d.name}`).join('\n');
    }
  }

  // Documento fuente (trazabilidad)
  if (!updated.sourceDocuments) updated.sourceDocuments = [];
  const applied = Object.keys(selectedFields).filter((k) => selectedFields[k]);
  updated.sourceDocuments.push({
    id: `src-doc-${Date.now()}`,
    patientId: updated.id,
    fileName: parsed.sourceFileName,
    fileType: parsed.sourceFileType,
    fileSize: parsed.rawText.length,
    uploadedAt: new Date().toISOString(),
    uploadedBy: 'Médico Tratante',
    rawText: parsed.rawText,
    parsedSummary: `Campos importados (${applied.length}): ${applied.join(', ')}${parsed.labsText ? ` | Paraclínicos en el documento: ${parsed.labsText}` : ''}`
  } as any);

  updated.updatedAt = new Date().toISOString();
  return updated;
}
