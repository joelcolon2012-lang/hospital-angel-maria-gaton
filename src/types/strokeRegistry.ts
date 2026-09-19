/**
 * Registro de Eventos Cerebrovasculares (EVC / Stroke Registry)
 * Hospital Regional Dr. Ángel María Gatón - Servicio de Emergencias & Medicina Interna
 * Clasificación obligatoria en 3 entidades clínicas separadas:
 * 1. EVC Isquémico
 * 2. EVC Hemorrágico
 * 3. Ataque Isquémico Transitorio (AIT)
 */

export type StrokeType = 'ISQUEMICO' | 'HEMORRAGICO' | 'AIT';

export type ThrombolysisDrug = 'ALTEPLASA' | 'TENECTEPLASA' | 'OTRO';

export type AntiplateletTherapy = 'NINGUNA' | 'ASPIRINA' | 'CLOPIDOGREL' | 'DOBLE_ANTIAGREGACION' | boolean;

export type DischargeDisposition = 
  | 'ALTA' 
  | 'REFERIMIENTO' 
  | 'MORTALIDAD_INTRAHOSPITALARIA' 
  | 'OBSERVACION' 
  | 'INGRESO_SALA'
  | 'HOSPITALIZACION_SALA'
  | 'UCI'
  | 'ALTA_DOMICILIO'
  | 'TRASLADO_TERCER_NIVEL';

export type HemorrhageLocation = 
  | 'LOBAR'
  | 'GANGLIOS_BASALES'
  | 'TALAMO'
  | 'TRONCO_ENCEFALICO'
  | 'TALLO_CEREBRAL'
  | 'CEREBELO'
  | 'INTRAVENTRICULAR_PRIMARIA'
  | 'SUBARACNOIDEA'
  | 'OTRA';

export interface IschemicStrokeData {
  timeOfOnset?: string;               // Hora de inicio de síntomas
  lastKnownWell?: string;             // Última vez visto sano
  hospitalArrivalTime?: string;       // Hora de llegada al hospital
  timeFromOnsetHours?: number;        // Tiempo de evolución en horas
  withinTherapeuticWindow?: boolean;  // En ventana terapéutica (<= 4.5h)
  nihssArrival?: number;              // Escala NIHSS al ingreso (0-42)
  aspectsScore?: number;              // Escala ASPECTS (0-10)
  thrombolysisPerformed: boolean;     // Trombólisis Sí / No
  thrombolysisDrug?: ThrombolysisDrug;// Alteplasa / Tenecteplasa
  thrombolysisTime?: string;          // Hora de infusión de trombólisis
  doorToNeedleMinutes?: number;       // Tiempo puerta-aguja en minutos
  thrombectomyPerformed?: boolean;    // Trombectomía mecánica Sí / No
  mechanicalThrombectomy?: boolean;   // Alias para trombectomía mecánica
  doorToPunctureMinutes?: number;     // Tiempo puerta-punción en minutos
  vascularTerritory?: 'ACM' | 'ACA' | 'ACP' | 'VERTEBROBASILAR' | 'LACUNAR' | string;
  antiplateletTherapy?: AntiplateletTherapy; // Aspirina / Clopidogrel / Doble
  anticoagulation?: boolean;          // Anticoagulación Sí / No
  anticoagulationTherapy?: boolean;   // Alias
  highIntensityStatin?: boolean;      // Estatina de alta intensidad Sí / No
  statinTherapy?: boolean;            // Alias
  bloodPressureManagement?: string;   // Manejo de presión arterial
  icuAdmission?: boolean;             // Ingreso a UCI Sí / No
  nihssDischarge?: number;            // NIHSS al egreso
  modifiedRankinArrival?: number;     // Escala de Rankin Modificada al ingreso (0-6)
  modifiedRankinDischarge?: number;   // Escala de Rankin Modificada al egreso (0-6)
  disposition: DischargeDisposition;  // Alta, Referimiento, Mortalidad intrahospitalaria
}

export interface HemorrhagicStrokeData {
  location?: HemorrhageLocation;      // Localización anatómica
  bleedingLocation?: HemorrhageLocation | string; // Alias
  locationOther?: string;
  glasgowScore?: number;              // Escala de Coma de Glasgow (3-15)
  glasgowArrival?: number;            // Alias
  ichScore?: number;                  // ICH Score (0-6)
  bleedingVolumeMl?: number;          // Volumen del sangrado en mL (Fórmula ABC/2)
  hematomaVolumeMl?: number;          // Alias
  intraventricularExtension?: boolean;// Extensión intraventricular Sí / No
  ventricularExtension?: boolean;     // Alias
  priorAnticoagulation?: boolean;     // Anticoagulación previa Sí / No
  anticoagulationReversal?: boolean;  // Reversión de anticoagulación Sí / No
  reversalAgent?: string;             // Agente de reversión
  bloodPressureControl?: string;      // Metas de PA sistólica <140 mmHg
  systolicBpArrival?: number;         // PA sistólica inicial
  strictBpControlAchieved?: boolean;  // Meta <140 mmHg alcanzada
  neurosurgeryEvaluation?: boolean;   // Valoración por Neurocirugía Sí / No
  surgicalProcedure?: 'CONSERVADOR' | 'CRANEOTOMIA_EVACUADORA' | 'DRENAJE_VENTRICULAR_EXTERNO' | 'CRANIECTOMIA_DESCOMPRESIVA' | 'OTRO';
  surgicalManagement?: 'MEDICO_CONSERVADOR' | 'CRANEOTOMIA_EVACUACION' | 'DERIVACION_VENTRICULAR' | string;
  icuAdmission?: boolean;             // Ingreso a UCI Sí / No
  modifiedRankinDischarge?: number;   // Escala de Rankin Modificada al egreso (0-6)
  inHospitalMortality: boolean;       // Mortalidad intrahospitalaria Sí / No
}

export interface TransientIschemicAttackData {
  abcd2Score?: number;                // Escala ABCD2 (0-7)
  symptomType?: string;               // Tipo de síntomas
  symptomDurationMinutes?: number;    // Duración exacta de síntomas en minutos
  symptoms?: {
    unilateralWeakness?: boolean;
    speechDisturbance?: boolean;
    visualLossAmaurosis?: boolean;
    sensoryLoss?: boolean;
    ataxiaOrVertigo?: boolean;
  };
  recurrenceRisk48h?: string;
  brainCtPerformed?: boolean;         // TC Cerebral Sí / No
  brainMriPerformed?: boolean;        // RM Cerebral (DWI) Sí / No
  ctAngiographyPerformed?: boolean;   // Angio-TC intra/extracraneal Sí / No
  angioCtDone?: boolean;              // Alias
  carotidDopplerPerformed?: boolean;  // Doppler de carótidas Sí / No
  carotidEchoDone?: boolean;          // Alias
  ecgPerformed?: boolean;             // ECG 12 derivaciones Sí / No
  telemetryMonitoring?: boolean;      // Telemetría cardíaca continua Sí / No
  atrialFibrillationDetected?: boolean;// Fibrilación Auricular Sí / No
  antiplateletTherapy?: AntiplateletTherapy; // Antiagregación / Doble
  dualAntiplateletStarted?: boolean;  // Alias
  anticoagulation?: boolean;          // Anticoagulación Sí / No
  statinsPrescribed?: boolean;        // Estatinas Sí / No
  highIntensityStatin?: boolean;      // Alias
  disposition?: 'INGRESO_SALA' | 'OBSERVACION' | 'ALTA' | 'REFERIMIENTO';
}

export interface StrokeRecord {
  id: string;
  patientId: string;
  patientName: string;
  patientRecordNumber?: string;
  patientIdDocument?: string;
  age: number;
  sex: 'M' | 'F';
  service: string;                    // Emergencias / Medicina Interna / Sala
  attendingDoctor?: string;
  eventDate: string;                  // Fecha del evento (YYYY-MM-DD)
  symptomOnsetTime?: string;
  hospitalArrivalTime?: string;
  premorbidRankin?: number;
  strokeType: StrokeType;             // ISQUEMICO | HEMORRAGICO | AIT
  notes?: string;
  clinicalNotes?: string;

  // Sub-registros específicos
  ischemicData?: IschemicStrokeData;
  hemorrhagicData?: HemorrhagicStrokeData;
  tiaData?: TransientIschemicAttackData;

  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface StrokeFilterParams {
  startDate?: string;
  endDate?: string;
  month?: number;
  year?: number;
  strokeType?: StrokeType | 'ALL';
  sex?: 'M' | 'F' | 'ALL';
  minAge?: number;
  maxAge?: number;
  service?: string;
  attendingDoctor?: string;
  outcome?: 'ALL' | 'VIVO' | 'FALLECIDO' | 'TROMBOLIZADO' | 'UCI';
}

export interface StrokeKpiMetrics {
  totalEvents: number;
  totalIschemic: number;
  totalHemorrhagic: number;
  totalTia: number;
  thrombolysisCount: number;
  thrombolysisPercentage: number;
  thrombectomyCount: number;
  thrombectomyPercentage: number;
  icuAdmissions: number;
  icuPercentage: number;
  mortalityCount: number;
  mortalityRate: number;
  averageAge: number;
  averageNihssArrival: number;
  averageRankinDischarge: number;
  averageDoorToNeedleMinutes: number;
  sexDistribution: {
    male: number;
    female: number;
  };
  eventsByMonth: Array<{ month: string; total: number; ischemic: number; hemorrhagic: number; tia: number }>;
  eventsByYear: Array<{ year: number; total: number }>;
  doorToNeedleCategories: {
    lessThan60: number;
    between60And90: number;
    greaterThan90: number;
  };
  rankinDistribution: Record<number, number>;
  nihssCategories: {
    mild: number;       // 1-4
    moderate: number;   // 5-15
    moderateSevere: number; // 16-20
    severe: number;     // 21-42
  };
}
