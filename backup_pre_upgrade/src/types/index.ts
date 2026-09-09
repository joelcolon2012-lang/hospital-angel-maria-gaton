export type TriageLevel = 1 | 2 | 3 | 4 | 5; // 1: Reanimación (Rojo), 2: Emergencia (Naranja), 3: Urgencia (Amarillo), 4: Prioritario/Menor (Verde), 5: No Urgente (Azul)

export type PatientStatus = 
  | 'activos' 
  | 'observacion' 
  | 'pendientes' 
  | 'reevaluacion' 
  | 'ingresados' 
  | 'referidos' 
  | 'alta';

export interface Vitals {
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
  painScale?: number; // 0 - 10
  supplementalOxygen?: string;
  hemodynamicStatus?: 'Estable' | 'Inestable';
  allergies?: string[];
  isPregnant?: boolean;
  anticoagulation?: boolean;
  comorbidities?: string[];
}

export interface ClinicalHistory {
  reasonForConsultation: string;
  currentIllnessHistory: string;
  pathologicalHistory: string;
  surgicalHistory: string;
  allergicHistory: string;
  habitualMedications: string;
  toxicHabits: string;
  familyHistory: string;
  obGynHistory: string;
  systemsReview: string;
  physicalExam: {
    general: string;
    cardiovascular: string;
    respiratory: string;
    abdominal: string;
    neurological: string;
    extremities: string;
    skin: string;
    otherFindings: string;
  };
  clinicalImpression: string;
  diagnosticAndTherapeuticPlan: string;
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
  source: 'manual' | 'adjunto';
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
  dose: string;
  route: string;
  frequency: string;
  startTime: string;
  duration?: string;
  indication?: string;
  renalAdjustmentNotes?: string;
  status: OrderStatus;
  notes?: string;
  allergyWarningIgnored?: boolean;
  allergyOverrideReason?: string;
  createdAt: string;
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
  emergencyContact?: string;
  arrivalDateTime: string;
  provenance: string; // Procedencia / Traslado
  cubicle: string; // Cama / Cubículo / Área
  triageLevel: TriageLevel;
  chiefComplaint: string; // Motivo de consulta
  status: PatientStatus;
  attendingDoctor: string;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;

  // Embedded or linked clinical records
  vitals?: Vitals;
  clinicalHistory?: ClinicalHistory;
  disposition?: FinalDisposition;
}
