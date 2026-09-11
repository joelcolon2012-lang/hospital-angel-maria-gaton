export type TriageLevel = 1 | 2 | 3 | 4 | 5; // 1: Reanimación (Rojo), 2: Emergencia (Naranja), 3: Urgencia (Amarillo), 4: Prioritario/Menor (Verde), 5: No Urgente (Azul)

export type PatientStatus = 
  | 'activos' 
  | 'observacion' 
  | 'pendientes' 
  | 'reevaluacion' 
  | 'ingresados' 
  | 'referidos' 
  | 'alta'
  | 'trasladados'
  | 'egresados';

export type NoteStatus = 
  | 'BORRADOR' 
  | 'EN PROGRESO' 
  | 'COMPLETADA' 
  | 'INGRESADO' 
  | 'EGRESADO' 
  | 'TRASLADADO' 
  | 'ARCHIVADO';

// Roles de usuario y seguridad hospitalaria
export type UserRole = 'ADMINISTRADOR' | 'MÉDICO' | 'RESIDENTE' | 'LECTURA';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  specialty?: string;
  exequatur?: string;
  avatarUrl?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: 'CREAR' | 'MODIFICAR' | 'ELIMINAR_SUAVE' | 'RESTAURAR' | 'GENERAR_NOTA' | 'IMPORTAR_HISTORIA';
  patientId: string;
  fieldPath?: string;
  oldValue?: any;
  newValue?: any;
  details?: string;
}

export interface Vitals {
  id?: string;
  timestamp?: string;
  recordedBy?: string;
  systolicBP?: number;
  diastolicBP?: number;
  map?: number; // Presión Arterial Media
  heartRate?: number;
  respiratoryRate?: number;
  temperature?: number;
  oxygenSaturation?: number;
  bloodGlucose?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  glasgowEye?: number;
  glasgowVerbal?: number;
  glasgowMotor?: number;
  glasgowTotal?: number;
  painScale?: number; // 0 - 10 (EVA)
  supplementalOxygen?: string;
  hemodynamicStatus?: 'Estable' | 'Inestable';
  allergies?: string[];
  isPregnant?: boolean;
  anticoagulation?: boolean;
  comorbidities?: string[];
}

export interface PhysicalExamSystemItem {
  status: 'NORMAL' | 'ALTERADO';
  notes: string;
}

export interface PhysicalExamSystems {
  general: PhysicalExamSystemItem | string;
  head?: PhysicalExamSystemItem | string;
  eyes?: PhysicalExamSystemItem | string;
  nose?: PhysicalExamSystemItem | string;
  mouth?: PhysicalExamSystemItem | string;
  neck?: PhysicalExamSystemItem | string;
  thorax?: PhysicalExamSystemItem | string;
  lungs?: PhysicalExamSystemItem | string;
  cardiovascular: PhysicalExamSystemItem | string;
  respiratory: PhysicalExamSystemItem | string;
  abdominal: PhysicalExamSystemItem | string;
  genitourinary?: PhysicalExamSystemItem | string;
  rectalExam?: PhysicalExamSystemItem | string;
  skin: PhysicalExamSystemItem | string;
  upperExtremities?: PhysicalExamSystemItem | string;
  lowerExtremities?: PhysicalExamSystemItem | string;
  extremities: PhysicalExamSystemItem | string;
  neurological: PhysicalExamSystemItem | string;
  otherFindings?: string;
}

export interface MorbidItem {
  disease: string;
  timeSinceDiagnosis?: string;
  medication?: string;
  dose?: string;
  frequency?: string;
  route?: string;
}

export interface StructuredAntecedents {
  morbidList?: MorbidItem[];
  pathologicalHistory?: string;
  surgicalHistory?: string;
  allergicHistory?: string;
  habitualMedications?: string;
  toxicHabits?: string;
  transfusionalHistory?: string;
  familyHistory?: string;
  obGynHistory?: string;
  systemsReview?: string;
}

export interface StructuredHDA {
  chiefComplaint: string;
  symptomsOnset?: string;
  evolutionTime?: string;
  characteristics?: string;
  location?: string;
  radiation?: string;
  intensityEVA?: number; // 0-10
  easingFactors?: string;
  aggravatingFactors?: string;
  accompanyingSymptoms?: string;
  narrativeText?: string;
}

export interface StructuredDiagnosis {
  id: string;
  name: string;
  status: 'Probable' | 'Confirmado' | 'A descartar';
  type: 'Primario' | 'Secundario';
  notes?: string;
  orderIndex: number;
}

export interface ClinicalHistory {
  reasonForConsultation: string;
  currentIllnessHistory: string;
  hdaStructured?: StructuredHDA;
  pathologicalHistory: string;
  morbidList?: MorbidItem[];
  surgicalHistory: string;
  allergicHistory: string;
  habitualMedications: string;
  toxicHabits: string;
  transfusionalHistory?: string;
  familyHistory: string;
  obGynHistory: string;
  systemsReview: string;
  physicalExam: {
    // 16 Acápites Cefalocaudales Oficiales Independientes
    general: string;             // 1. Estado General
    head?: string;               // 2. Cabeza
    eyes?: string;               // 3. Ojos
    ears?: string;               // 4. Oídos
    nose?: string;               // 5. Nariz
    mouth?: string;              // 6. Boca
    neck?: string;               // 7. Cuello
    thorax?: string;             // 8. Tórax
    lungs?: string;              // 9. Pulmones
    heart?: string;              // 10. Corazón
    abdominal: string;           // 11. Abdomen
    genitals?: string;           // 12. Genitales
    skin: string;                // 13. Piel y Anexos
    upperExtremities?: string;   // 14. Extremidades Superiores
    lowerExtremities?: string;   // 15. Extremidades Inferiores
    neurological: string;        // 16. Neurológico

    // Campos de compatibilidad previa
    cardiovascular?: string;
    respiratory?: string;
    extremities?: string;
    otherFindings?: string;
    genitourinary?: string;
    genitourinaryRectal?: string;
    rectalExam?: string;
  };
  physicalExamSystems?: Record<string, { status: 'NORMAL' | 'ALTERADO'; notes: string }>;
  clinicalImpression: string;
  diagnosesList?: StructuredDiagnosis[];
  diagnosticAndTherapeuticPlan: string;
}

export interface HospitalSettings {
  hospitalName: string;
  serviceSubtitle: string;
  logoUrl: string;
  defaultDoctor: string;
  defaultExequatur: string;
  themeColor: string;
  isDarkMode: boolean;
  normalPhysicalExam?: Record<string, string>; // MI EXAMEN FÍSICO NORMAL PERSONALIZABLE
  customFormOptions?: Record<string, string[]>;
  activeTemplates?: Record<string, OfficialHospitalTemplate>;
  preferredGuidelines?: string[];
  activeScales?: string[];
}

export type OfficialTemplateId = 'nota_emergencia' | 'nota_recibimiento' | 'evolucion' | 'orden_medica';

export interface OfficialTemplateSection {
  id: string;
  title: string;
  description: string;
  required: boolean;
  orderIndex: number;
  enabled: boolean;
}

export interface OfficialTemplateVersion {
  version: number;
  updatedAt: string;
  updatedBy: string;
  changeSummary: string;
  sections: OfficialTemplateSection[];
}

export interface OfficialHospitalTemplate {
  id: OfficialTemplateId;
  title: string;
  subtitle: string;
  activeVersion: number;
  currentSections: OfficialTemplateSection[];
  versionHistory: OfficialTemplateVersion[];
}

export interface QuickOptionItem {
  id: string;
  category: string;
  label: string;
  orderIndex: number;
  isActive: boolean;
}

export type StudyCategory = 
  | 'Electrocardiograma'
  | 'Radiografía'
  | 'Tomografía'
  | 'Resonancia'
  | 'Ultrasonido'
  | 'Laboratorio'
  | 'Fotografía clínica'
  | 'Documento'
  | 'Otro';

export type StudyStatus = 'Solicitado' | 'Tomado' | 'Pendiente' | 'Informado';

export interface MedicalStudy {
  id: string;
  patientId: string;
  category: StudyCategory;
  title: string;
  anatomicalRegion: string;
  description: string;
  preliminaryInterpretation: string;
  officialResult: string;
  status: StudyStatus;
  tags: string[];
  imageDataUrl?: string;
  sourceFileUrl?: string;
  sourceFileName?: string;
  createdAt: string;
  createdBy: string;
}

export type LabPanel = 
  | 'Hemograma' 
  | 'Química' 
  | 'Electrolitos' 
  | 'Función Renal' 
  | 'Función Hepática' 
  | 'Coagulación' 
  | 'Gases Arteriales' 
  | 'Marcadores Cardiacos' 
  | 'Orina' 
  | 'Cultivos' 
  | 'Otros';

export type LabFlag = 'normal' | 'alto' | 'bajo' | 'critico';

export interface LabResult {
  id: string;
  patientId: string;
  panel: LabPanel;
  parameter: string;
  value: string;
  numericValue?: number;
  unit: string;
  referenceRange: string;
  flag: LabFlag;
  timestamp: string;
  source: 'manual' | 'adjunto' | 'foto_vision';
}

export interface ClinicalProblem {
  id: string;
  patientId: string;
  problem: string;
  differentialDiagnoses: string[];
  probableDiagnosis: string;
  confirmedDiagnosis: string;
  ruledOutDiagnoses: string[];
  cie10Code?: string;
  evidencesInFavor?: string;
  evidencesAgainst?: string;
  pendingStudies?: string;
  status: 'activo' | 'resuelto' | 'descartado';
  createdAt: string;
}

export type OrderType = 'Solución' | 'Medicamento' | 'Procedimiento' | 'Interconsulta' | 'Estudio';
export type OrderStatus = 'Indicada' | 'Administrada' | 'Suspendida' | 'Completada';

export interface MedicalOrder {
  id: string;
  patientId: string;
  type: OrderType;
  name: string;
  presentation?: string;
  dose: string;
  route: string;
  frequency: string;
  startTime: string;
  duration?: string;
  treatmentDay?: number;
  indication?: string;
  specialInstructions?: string;
  renalAdjustmentNotes?: string;
  status: OrderStatus;
  notes?: string;
  allergyWarningIgnored?: boolean;
  allergyOverrideReason?: string;
  createdAt: string;
  createdBy?: string;
}

export interface PatientEvolution {
  id: string;
  patientId: string;
  timestamp: string;
  doctorName: string;
  vitalSignsSummary: string;
  clinicalChanges: string;
  newResults: string;
  problemReevaluation: string;
  updatedDiagnoses: string;
  conduct: string;
  nextReevaluationTime?: string;
}

export type FinalOutcome = 
  | 'Observación'
  | 'Ingreso'
  | 'Alta'
  | 'Referimiento'
  | 'Traslado'
  | 'Abandono'
  | 'Fallecimiento';

export interface FinalDisposition {
  patientId: string;
  outcome: FinalOutcome;
  timestamp: string;
  dischargeCondition: string;
  finalDiagnoses: string;
  dischargeTreatment: string;
  recommendations: string;
  redFlags: string;
  destination?: string;
  receivingDoctor?: string;
  receivingCenter?: string;
  referralSummary?: string;
}

export interface SourceDocument {
  id: string;
  patientId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: string;
  rawText?: string;
  parsedSummary?: string;
  storageUrl?: string;
}

export interface ClinicalNoteRecord {
  id: string;
  patientId: string;
  noteType: 'Nota de Emergencia' | 'Nota de Recibimiento en Sala' | 'Orden Médica';
  version: number;
  status: NoteStatus;
  createdAt: string;
  createdBy: string;
  contentHtml: string;
  docxBlobUrl?: string;
  snapshotData?: any;
}

export interface Patient {
  id: string;
  internalCode: string; // ej. EMG-2026-001
  medicalRecordNumber?: string; // Expediente opcional
  fullName: string;
  idDocument?: string; // Cédula o DNI opcional
  birthDate?: string;
  age?: number;
  sex: 'M' | 'F' | 'Otro';
  phone?: string;
  address?: string;
  emergencyContact?: string;
  emergencyContactPhone?: string;
  arrivalDateTime: string;
  provenance: string; // Procedencia / Traslado
  cubicle: string; // Cama / Cubículo / Área
  triageLevel: TriageLevel;
  chiefComplaint: string; // Motivo de consulta
  status: PatientStatus;
  attendingDoctor: string;
  residentDoctor?: string;
  service?: string;
  isDeleted?: boolean;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;

  // Embedded or linked clinical records
  vitals?: Vitals;
  vitalsHistory?: Vitals[];
  clinicalHistory?: ClinicalHistory;
  disposition?: FinalDisposition;
  diagnosesList?: StructuredDiagnosis[];
  notesHistory?: ClinicalNoteRecord[];
  sourceDocuments?: SourceDocument[];
}
