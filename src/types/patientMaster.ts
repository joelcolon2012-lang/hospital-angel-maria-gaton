/**
 * PATIENT MASTER RECORD - Única Fuente Central de Verdad Clínica
 * Hospital Regional Dr. Ángel María Gatón — Dr. Joel Colón
 *
 * Arquitectura unificada: Capturar una vez -> Almacenar una vez -> Reutilizar en todos los documentos.
 */

import { TriageLevel, PatientStatus, NoteStatus, UserRole } from './index';

export interface DemographicData {
  id: string;
  admissionId: string;
  internalCode: string;
  medicalRecordNumber?: string;
  idDocument?: string; // Cédula de identidad y electoral
  fullName: string;
  birthDate?: string;
  age?: number;
  sex: 'M' | 'F' | 'Otro';
  civilStatus?: string;
  occupation?: string;
  religion?: string;
  educationLevel?: string;
  phone?: string;
  address?: string;
  provenance: string; // Procedencia / Lugar de origen
  cubicle: string; // Sala / Cama / Cubículo actual
  triageLevel: TriageLevel;
  status: PatientStatus;
  arrivalDateTime: string;
  admissionDate: string;
  admissionTime: string;
  emergencyContact?: string;
  emergencyContactPhone?: string;
}

export interface ChronicConditionItem {
  id: string;
  name: string;
  evolutionYears?: number | string;
  treatment?: string;
  status?: 'Controlada' | 'Descompensada' | 'En estudio';
  notes?: string;
}

export interface MedicationScheduleItem {
  id: string;
  name: string;
  dose: string;
  unit: string;
  route: string;
  frequency: string;
  duration?: string;
  indication?: string;
  isHabitual: boolean;
  prescribedInHospital?: boolean;
}

export interface TobaccoHistory {
  consumes: boolean;
  cigarettesPerDay: number;
  yearsSmoking: number;
  yearsSinceQuit?: number;
  packYears: number; // IPA = (cigarrillos/día / 20) * años
}

export interface ToxicHabitsRecord {
  tobacco: TobaccoHistory;
  alcohol: string;
  illicitDrugs: string;
  biomassExposure?: string; // Humo de leña / biomasa
  coffee?: string;
  tea?: string;
  occupationalExposure?: string;
  otherNotes?: string;
}

export interface FamilyHistoryDetails {
  father?: string;
  mother?: string;
  siblings?: string;
  children?: string;
  hypertension?: string;
  diabetes?: string;
  heartDisease?: string;
  cancer?: string;
  otherRelevant?: string;
}

export interface SystemReviewItem {
  status: 'NORMAL' | 'CON_HALLAZGOS' | 'NO_EVALUADO';
  notes: string;
}

export interface ReviewOfSystemsRecord {
  cardiovascular: SystemReviewItem;
  pulmonary: SystemReviewItem;
  gastrointestinal: SystemReviewItem;
  genitourinary: SystemReviewItem;
  endocrinometabolic: SystemReviewItem;
  neurosensory: SystemReviewItem;
  musculoskeletal: SystemReviewItem;
  hematologic: SystemReviewItem;
  constitutional?: SystemReviewItem;
}

export interface GeneralStatusAssessment {
  biotype: string;
  facies: string;
  consciousness: string;
  orientation: string;
  language: string;
  respiratoryPattern: string;
  temperatureCondition: string;
  skinColoration: string;
  hydration: string;
  perfusion: string;
  oxygenTherapy: string;
  generalStatusSummary: string;
  otherFindings?: string;
}

export interface PhysicalExamSystemRecord {
  head: string;
  eyes: string;
  ears: string;
  nose: string;
  mouth: string;
  neck: string;
  thorax: string;
  lungs: string;
  heart: string;
  abdomen: string;
  externalGenitals?: string;
  skin: string;
  upperExtremities: string;
  lowerExtremities: string;
  neurological: string;
}

export interface NeurologicalStructuredExam {
  consciousness: 'Alerta' | 'Somnoliento' | 'Obnubilado' | 'Estupor' | 'Coma' | 'Otro';
  orientation: {
    person: boolean;
    space: boolean;
    time: boolean;
  };
  glasgow: {
    eye: number;    // 1-4
    verbal: number; // 1-5
    motor: number;  // 1-6
    total: number;  // 3-15
  };
  muscleStrength: {
    rightUpper: number; // Daniels 0-5
    leftUpper: number;
    rightLower: number;
    leftLower: number;
  };
  tone: string;
  babinski: 'Negativo' | 'Derecho' | 'Izquierdo' | 'Bilateral';
  cranialNerves: string;
  reflexes: string;
  gait: string;
  narrativeText?: string;
}

export interface NosologicalDiagnosis {
  id: string;
  name: string;
  cie10Code?: string;
  status: 'Probable' | 'Confirmado' | 'A descartar';
  type: 'Primario' | 'Secundario';
  priorityIndex: number;
  notes?: string;
}

export interface StandardParaclinicalItem {
  id: string;
  category: 'Hemograma' | 'Química' | 'Función Hepática' | 'Coagulación' | 'Marcadores Cardiacos' | 'Gases Arteriales' | 'Orina' | 'Otros';
  parameter: string;
  value: string;
  numericValue?: number;
  unit: string;
  referenceRange?: string;
  flag: 'normal' | 'alto' | 'bajo' | 'critico';
  timestamp: string;
}

export interface ImagingStudyItem {
  id: string;
  category: 'Electrocardiograma' | 'Radiografía' | 'Tomografía' | 'Resonancia' | 'Ultrasonido' | 'Ecocardiograma' | 'Endoscopía' | 'Cultivo' | 'Otro';
  title: string;
  date: string;
  findings: string;
  conclusion: string;
}

export interface StructuredTreatmentPlan {
  generalMeasures: string;
  diet: string;
  position: string;
  vitalsFrequency: string;
  oxygenTherapy: string;
  discussionSummary?: string;
  specialInstructions?: string;
}

/**
 * REGISTRO MAESTRO INTEGRAL DEL PACIENTE (PATIENT MASTER RECORD)
 */
export interface PatientMasterRecord {
  // 1. Demografía y Admisión
  demographics: DemographicData;

  // 2. Motivo de Consulta
  reasonForConsultation: string;

  // 3. Historia de la Enfermedad Actual (HDA)
  currentIllness: {
    narrative: string;
    onset?: string;
    duration?: string;
    painIntensityEVA?: number;
    accompanyingSymptoms?: string[];
    alleviatingFactors?: string;
    aggravatingFactors?: string;
  };

  // 4. Antecedentes Médicos (APP)
  medicalHistory: {
    pathological: string;
    pathologicalList: ChronicConditionItem[];
    surgical: string;
    allergies: string[];
    transfusional: string;
    trauma: string;
    hospitalizations: string;
    obGynHistory?: string;
  };

  // 5. Medicamentos Habituales
  habitualMedications: MedicationScheduleItem[];

  // 6. Hábitos No Patológicos & Tóxicos
  toxicHabits: ToxicHabitsRecord;

  // 7. Heredofamiliares
  familyHistory: FamilyHistoryDetails;

  // 8. Revisión por Sistemas
  reviewOfSystems: ReviewOfSystemsRecord;

  // 9. Estado General
  generalStatus: GeneralStatusAssessment;

  // 10. Constantes Vitales & Antropometría
  vitalSigns: {
    systolicBP?: number;
    diastolicBP?: number;
    heartRate?: number;
    respiratoryRate?: number;
    temperature?: number;
    oxygenSaturation?: number;
    bloodGlucose?: number;
    weightKg?: number;
    heightCm?: number;
    bmi?: number;
    recordedAt?: string;
  };

  // 11. Examen Físico Segmentario Cefalocaudal (15 Sistemas)
  physicalExam: PhysicalExamSystemRecord;

  // 12. Examen Neurológico Estructurado
  neurologicalExam: NeurologicalStructuredExam;

  // 13. Paraclínicos y Laboratorios
  paraclinicals: StandardParaclinicalItem[];

  // 14. Estudios de Imagen y Gabinete
  imagingStudies: ImagingStudyItem[];

  // 15. Diagnósticos Nosológicos
  diagnoses: NosologicalDiagnosis[];

  // 16. Plan de Tratamiento y Órdenes
  treatmentPlan: StructuredTreatmentPlan;

  // 17. Control de Versiones y Metadatos
  metadata: {
    templateVersion: string; // ej. '2026.1-GATON'
    createdAt: string;
    updatedAt: string;
    attendingDoctor: string;
    doctorExequatur: string;
    doctorSpecialty: string;
    isLocked?: boolean;
  };
}
