/**
 * Tipos e Interfaces para el Módulo: HISTORIA CLÍNICA PLANTA
 * Hospital Regional Dr. Ángel María Gatón - Dr. Joel Colón
 */

export interface GeneralDataPlanta {
  nombre: string;
  estadoCivil: string;
  edad: string;
  raza: string;
  sexo: 'MASCULINO' | 'FEMENINA' | string;
  religion: string;
  escolaridad: string;
  sala: string;
  fuente: string;
  fechaIngreso: string;
  hora: string;
  procedencia: string;
}

export interface MedicationItemPlanta {
  id: string;
  name: string;
  dose: string;
  unit: string;
  route: string;
  frequency: string;
  duration?: string;
}

export interface PathologicalHistoryPlanta {
  childhood: string;
  adolescence: string;
  adulthood: string;
  hospitalizations: string;
  surgeries: string;
  trauma: string;
  transfusions: string;
  allergies: string;
  medications: MedicationItemPlanta[];
}

export interface TobaccoHabitPlanta {
  consumes: boolean;
  cigarettesPerDay: number;
  yearsSmoking: number;
  yearsSinceQuit?: number;
  packYears: number; // IPA = (cigarrillos/día / 20) * años
}

export interface NonPathologicalHistoryPlanta {
  tobacco: TobaccoHabitPlanta;
  coffee: string;
  alcohol: string;
  illicitDrugs: string;
  tea: string;
  previousJobs: string;
  toxicExposure: string;
  otherNotes?: string;
}

export interface FamilyHistoryMemberPlanta {
  alive: boolean;
  age?: string;
  causeOfDeath?: string;
  morbidities?: string;
}

export interface FamilyHistoryPlanta {
  father: FamilyHistoryMemberPlanta;
  mother: FamilyHistoryMemberPlanta;
  siblings: {
    count: number;
    details: string;
  };
  children: {
    count: number;
    details: string;
  };
  otherRelevant?: string;
}

export interface HousingPlanta {
  housingType: string;
  wallMaterial: string;
  roofMaterial: string;
  floorMaterial: string;
  roomCount: number;
  personCount: number;
  bathroomCount: number;
  bathroomLocation: 'Intradomiciliario' | 'Extradomiciliario' | string;
  trashDisposal: string;
  waterSource: string;
  electricity: boolean;
  otherFactors?: string;
}

export interface PsychosocialHistoryPlanta {
  monthlyIncome: string;
  housing: HousingPlanta;
  narrativeText?: string;
}

export type SystemStatusPlanta = 'NORMAL' | 'CON_HALLAZGOS' | 'NO_EVALUADO';

export interface SystemReviewItemPlanta {
  status: SystemStatusPlanta;
  notes: string;
}

export interface ReviewOfSystemsPlanta {
  cardiovascular: SystemReviewItemPlanta;
  pulmonary: SystemReviewItemPlanta;
  gastrointestinal: SystemReviewItemPlanta;
  genitourinary: SystemReviewItemPlanta;
  endocrinometabolic: SystemReviewItemPlanta;
  neurosensory: SystemReviewItemPlanta;
  musculoskeletal: SystemReviewItemPlanta;
  hematologic: SystemReviewItemPlanta;
  constitutional?: SystemReviewItemPlanta;
}

export interface GeneralStatusPlanta {
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

export interface VitalSignsPlanta {
  systolicBP?: number;
  diastolicBP?: number;
  heartRate?: number;
  respiratoryRate?: number;
  temperature?: number;
  oxygenSaturation?: number;
  bloodGlucose?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  takenAt?: string;
}

export interface PhysicalExamSystemsPlanta {
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
  externalGenitals: string;
  skin: string;
  upperExtremities: string;
  lowerExtremities: string;
  neurological: string;
}

export type NeurologicalConsciousness = 'Alerta' | 'Somnoliento' | 'Obnubilado' | 'Estupor' | 'Coma' | 'Otro';
export type NeurologicalLanguage = 'Normal' | 'Disartria' | 'Afasia motora' | 'Afasia sensitiva' | 'Afasia global' | 'Mutismo' | 'Otro';
export type NeurologicalTone = 'Normal' | 'Hipotonía' | 'Hipertonía' | 'Espasticidad' | 'Rigidez';
export type NeurologicalBabinski = 'Negativo' | 'Derecho' | 'Izquierdo' | 'Bilateral';
export type NeurologicalGait = 'Normal' | 'Hemiparética' | 'Espástica' | 'Atáxica' | 'Festinante' | 'Estepaje' | 'No valorable' | 'Otro';

export interface NeurologicalExamPlanta {
  consciousness: NeurologicalConsciousness;
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
  language: NeurologicalLanguage;
  memory: {
    anterograde: boolean;
    retrograde: boolean;
    notes?: string;
  };
  pupils: {
    sizeRightMm: number;
    sizeLeftMm: number;
    isochoric: boolean;
    photoreactiveRight: boolean;
    photoreactiveLeft: boolean;
  };
  cranialNerves: Record<string, { intact: boolean; notes: string }>;
  muscleStrength: {
    rightUpper: number; // Daniels 0-5
    leftUpper: number;
    rightLower: number;
    leftLower: number;
  };
  tone: NeurologicalTone;
  sensitivity: {
    superficial: boolean;
    pain: boolean;
    thermal: boolean;
    vibratory: boolean;
    proprioceptive: boolean;
    notes?: string;
  };
  reflexes: {
    bicipitalRight: string;
    bicipitalLeft: string;
    tricipitalRight: string;
    tricipitalLeft: string;
    brachioradialRight: string;
    brachioradialLeft: string;
    patellarRight: string;
    patellarLeft: string;
    achillesRight: string;
    achillesLeft: string;
  };
  babinski: NeurologicalBabinski;
  coordination: {
    fingerToNose: 'Normal' | 'Alterada' | 'No valorable';
    heelToShin: 'Normal' | 'Alterada' | 'No valorable';
    diadochokinesia: 'Normal' | 'Alterada' | 'No valorable';
  };
  romberg: 'Negativo' | 'Positivo' | 'No valorable';
  gait: NeurologicalGait;
  narrativeText?: string;
}

export interface DiagnosisItemPlanta {
  id: string;
  name: string;
  priorityIndex: number;
}

export type ClinicalHistoryStatus = 'BORRADOR' | 'EN REVISIÓN' | 'COMPLETADA';

export interface ClinicalHistoryVersionRecord {
  id: string;
  clinicalHistoryId: string;
  patientId: string;
  admissionId: string;
  version: number;
  createdAt: string;
  createdBy: string;
  changeSummary: string;
  snapshot: any;
}

export interface ClinicalHistoryPlanta {
  id: string;
  patientId: string;
  admissionId: string;

  generalData: GeneralDataPlanta;
  chiefComplaints: string[];
  presentIllness: string;

  pathologicalHistory: PathologicalHistoryPlanta;
  nonPathologicalHistory: NonPathologicalHistoryPlanta;
  familyHistory: FamilyHistoryPlanta;
  psychosocialHistory: PsychosocialHistoryPlanta;

  reviewOfSystems: ReviewOfSystemsPlanta;
  generalStatus: GeneralStatusPlanta;
  vitalSigns: VitalSignsPlanta;
  physicalExam: PhysicalExamSystemsPlanta;
  neurologicalExam: NeurologicalExamPlanta;

  diagnoses: DiagnosisItemPlanta[];

  status: ClinicalHistoryStatus;
  version: number;

  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface PendingFieldItem {
  id: string;
  sectionTitle: string;
  fieldName: string;
  sectionId: string;
}

export interface ClinicalInconsistencyAlert {
  id: string;
  type: 'WARNING' | 'DANGER' | 'INFO';
  title: string;
  description: string;
  sectionId: string;
}

export interface SpellingCorrectionProposal {
  id: string;
  originalWord: string;
  proposedWord: string;
  contextSnippet: string;
  sectionId: string;
  fieldKey: string;
  accepted?: boolean;
}
