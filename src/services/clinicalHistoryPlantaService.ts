/**
 * Servicio Central del Módulo: HISTORIA CLÍNICA PLANTA
 * Hospital Regional Dr. Ángel María Gatón - Dr. Joel Colón
 *
 * Gestiona el ciclo de vida, persistencia Dexie DB, sincronización con datos centrales,
 * detección de campos pendientes, cálculo de fórmulas médicas e historial de versiones.
 */

import { db } from '../db/dexieDb';
import { 
  Patient, 
  MedicalOrder, 
  LabResult,
  ClinicalHistoryPlanta, 
  ClinicalHistoryVersionRecord,
  GeneralDataPlanta,
  PathologicalHistoryPlanta,
  NonPathologicalHistoryPlanta,
  FamilyHistoryPlanta,
  PsychosocialHistoryPlanta,
  ReviewOfSystemsPlanta,
  GeneralStatusPlanta,
  VitalSignsPlanta,
  PhysicalExamSystemsPlanta,
  NeurologicalExamPlanta,
  DiagnosisItemPlanta,
  PendingFieldItem
} from '../types';
import { authService } from './authService';
import { cloudSyncService } from './cloudSyncService';
import { centralSyncService } from './centralSyncService';

export class ConcurrencyConflictError extends Error {
  public serverHistory: ClinicalHistoryPlanta;
  public clientHistory: ClinicalHistoryPlanta;

  constructor(serverHistory: ClinicalHistoryPlanta, clientHistory: ClinicalHistoryPlanta) {
    super(`Conflicto de edición concurrente: La historia fue guardada previamente por ${serverHistory.updatedBy || 'otro médico'} (Versión ${serverHistory.version}).`);
    this.name = 'ConcurrencyConflictError';
    this.serverHistory = serverHistory;
    this.clientHistory = clientHistory;
  }
}

export class ClinicalHistoryPlantaService {

  /**
   * Calcula el Índice Paquete-Año (IPA) para tabaquismo
   * IPA = (cigarrillos al día / 20) * años fumando
   */
  public calculatePackYears(cigarettesPerDay: number, yearsSmoking: number): number {
    if (!cigarettesPerDay || !yearsSmoking || cigarettesPerDay <= 0 || yearsSmoking <= 0) return 0;
    return parseFloat(((cigarettesPerDay / 20) * yearsSmoking).toFixed(1));
  }

  /**
   * Calcula el Índice de Masa Corporal (IMC)
   * IMC = peso (kg) / (talla (m))^2
   */
  public calculateBmi(weightKg?: number, heightCm?: number): number | undefined {
    if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) return undefined;
    const heightM = heightCm > 3 ? heightCm / 100 : heightCm;
    return parseFloat((weightKg / (heightM * heightM)).toFixed(1));
  }

  /**
   * Genera el texto narrativo clínico continuo del Examen Neurológico Estructurado
   */
  public formatNeurologicalNarrative(neuro: NeurologicalExamPlanta): string {
    const parts: string[] = [];

    // Conciencia y orientación
    const orientParts: string[] = [];
    if (neuro.orientation.person) orientParts.push('PERSONA');
    if (neuro.orientation.space) orientParts.push('ESPACIO');
    if (neuro.orientation.time) orientParts.push('TIEMPO');
    
    let orientStr = 'DESORIENTADO';
    if (orientParts.length === 3) {
      orientStr = 'ORIENTADO EN LAS TRES ESFERAS DEL SENSORIO (PERSONA, ESPACIO Y TIEMPO)';
    } else if (orientParts.length > 0) {
      orientStr = `ORIENTADO EN ${orientParts.join(' Y ')}`;
    }

    parts.push(`PACIENTE ${neuro.consciousness.toUpperCase()}, ${orientStr}.`);

    // Glasgow
    const g = neuro.glasgow;
    parts.push(`ESCALA DE COMA DE GLASGOW ${g.total}/15 (OCULAR: ${g.eye}/4, VERBAL: ${g.verbal}/5, MOTORA: ${g.motor}/6).`);

    // Lenguaje
    if (neuro.language === 'Normal') {
      parts.push('LENGUAJE FLUIDO, COHERENTE, SIN DISARTRIA NI AFASIA.');
    } else {
      parts.push(`LENGUAJE CON EVIDENCIA DE ${neuro.language.toUpperCase()}.`);
    }

    // Pupilas
    const pup = neuro.pupils;
    const isocoria = pup.isochoric ? 'ISOCÓRICAS' : 'ANISOCÓRICAS';
    const foto = (pup.photoreactiveRight && pup.photoreactiveLeft) 
      ? 'FOTORREACTIVAS A LA LUZ BILATERALMENTE' 
      : `FOTORREACTIVIDAD (OD: ${pup.photoreactiveRight ? 'CONSERVADA' : 'DISMINUIDA/ABOLIDA'}, OI: ${pup.photoreactiveLeft ? 'CONSERVADA' : 'DISMINUIDA/ABOLIDA'})`;
    parts.push(`PUPILAS ${isocoria} DE ${pup.sizeRightMm}MM EN OJO DERECHO Y ${pup.sizeLeftMm}MM EN OJO IZQUIERDO, ${foto}.`);

    // Pares craneales
    const alteredNerves: string[] = [];
    Object.entries(neuro.cranialNerves || {}).forEach(([nerve, data]) => {
      if (!data.intact) {
        alteredNerves.push(`${nerve} (${data.notes || 'alterado'})`);
      }
    });
    if (alteredNerves.length === 0) {
      parts.push('PARES CRANEALES DEL I AL XII EXPLORADOS Y CONSERVADOS SIN DÉFICIT APARENTE.');
    } else {
      parts.push(`PARES CRANEALES CON COMPROMISO EN: ${alteredNerves.join('; ').toUpperCase()}.`);
    }

    // Fuerza muscular Daniels
    const ms = neuro.muscleStrength;
    parts.push(`FUERZA MUSCULAR (ESCALA DANIELS): MSD ${ms.rightUpper}/5, MSI ${ms.leftUpper}/5, MID ${ms.rightLower}/5, MII ${ms.leftLower}/5.`);

    // Tono y Trofismo
    parts.push(`TONO MUSCULAR ${neuro.tone.toUpperCase()}.`);

    // Sensibilidad
    const sensParts: string[] = [];
    if (neuro.sensitivity.superficial) sensParts.push('SUPERFICIAL');
    if (neuro.sensitivity.pain) sensParts.push('DOLOROSA');
    if (neuro.sensitivity.thermal) sensParts.push('TÉRMICA');
    if (neuro.sensitivity.vibratory) sensParts.push('VIBRATORIA');
    if (neuro.sensitivity.proprioceptive) sensParts.push('PROPIOCEPTIVA');
    if (sensParts.length > 0) {
      parts.push(`SENSIBILIDAD ${sensParts.join(', ')} CONSERVADA.`);
    }

    // Reflejos osteotendinosos
    const r = neuro.reflexes;
    parts.push(`REFLEJOS OSTEOTENDINOSOS: BICIPITAL (D: ${r.bicipitalRight}, I: ${r.bicipitalLeft}), ROTULIANO (D: ${r.patellarRight}, I: ${r.patellarLeft}), AQUÍLEO (D: ${r.achillesRight}, I: ${r.achillesLeft}).`);

    // Babinski
    if (neuro.babinski === 'Negativo') {
      parts.push('REFLEJO CUTÁNEOPLANTAR FLEXOR BILATERAL (BABINSKI NEGATIVO).');
    } else {
      parts.push(`SIGNO DE BABINSKI PRESENTE (${neuro.babinski.toUpperCase()}).`);
    }

    // Marcha y coordinación
    parts.push(`COORDINACIÓN DEDO-NARIZ: ${neuro.coordination.fingerToNose.toUpperCase()}, TALÓN-RODILLA: ${neuro.coordination.heelToShin.toUpperCase()}. SIGNO DE ROMBERG ${neuro.romberg.toUpperCase()}. MARCHA ${neuro.gait.toUpperCase()}.`);

    return parts.join(' ');
  }

  /**
   * Crea una instancia inicial de Historia Clínica Planta a partir del paciente e ingreso actual
   */
  public createInitialHistory(patient: Patient, admissionId?: string): ClinicalHistoryPlanta {
    const activeDoc = authService.getActiveDoctorSignature(patient.attendingDoctor);
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-DO');
    const timeStr = now.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();

    // Importar datos demográficos
    const generalData: GeneralDataPlanta = {
      nombre: patient.fullName.toUpperCase(),
      estadoCivil: 'SOLTERO(A)',
      edad: patient.age ? `${patient.age} AÑOS` : 'NO REGISTRADO',
      raza: 'MESTIZO',
      sexo: patient.sex === 'F' ? 'FEMENINA' : 'MASCULINO',
      religion: 'CATÓLICA',
      escolaridad: 'PRIMARIA',
      sala: patient.cubicle ? patient.cubicle.toUpperCase() : 'PENDIENTE',
      fuente: 'DIRECTA',
      fechaIngreso: patient.arrivalDateTime ? new Date(patient.arrivalDateTime).toLocaleDateString('es-DO') : dateStr,
      hora: patient.arrivalDateTime ? new Date(patient.arrivalDateTime).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase() : timeStr,
      procedencia: patient.provenance ? patient.provenance.toUpperCase() : 'SAN FRANCISCO DE MACORÍS'
    };

    // Motivos de consulta iniciales
    const chiefComplaints: string[] = [];
    if (patient.chiefComplaint) {
      patient.chiefComplaint.split(/[\n,;]+/).map(c => c.trim()).filter(Boolean).forEach(c => {
        chiefComplaints.push(c.toUpperCase());
      });
    }
    if (chiefComplaints.length === 0) {
      chiefComplaints.push('EVALUACIÓN CLÍNICA EN SALA DE MEDICINA INTERNA');
    }

    // HDA
    const presentIllness = patient.clinicalHistory?.currentIllnessHistory || 
      `SE TRATA DE PACIENTE ${generalData.sexo} DE ${generalData.edad} DE EDAD, QUIEN ES INGRESADO EN NUESTRO CENTRO POR PRESENTAR CUADRO CLÍNICO CARACTERIZADO POR ${chiefComplaints.join(', ')}.`;

    // Antecedentes patológicos
    const ch = patient.clinicalHistory;
    const pathologicalHistory: PathologicalHistoryPlanta = {
      childhood: 'NEGADOS.',
      adolescence: 'NEGADOS.',
      adulthood: ch?.pathologicalHistory ? ch.pathologicalHistory.toUpperCase() : 'NO REGISTRADOS.',
      hospitalizations: 'NEGADOS.',
      surgeries: ch?.surgicalHistory ? ch.surgicalHistory.toUpperCase() : 'NEGADOS.',
      trauma: 'NEGADOS.',
      transfusions: ch?.transfusionalHistory ? ch.transfusionalHistory.toUpperCase() : 'NEGADOS.',
      allergies: ch?.allergicHistory ? ch.allergicHistory.toUpperCase() : (patient.vitals?.allergies?.join(', ').toUpperCase() || 'NEGADAS.'),
      medications: []
    };

    // Importar medicamentos habituales
    if (ch?.habitualMedications) {
      const meds = ch.habitualMedications.split(/[\n,;]+/).map(m => m.trim()).filter(Boolean);
      meds.forEach((m, idx) => {
        pathologicalHistory.medications.push({
          id: `med-${idx + 1}`,
          name: m.toUpperCase(),
          dose: 'NO ESPECIFICADA',
          unit: 'MG',
          route: 'VO',
          frequency: 'C/24 HORAS'
        });
      });
    }

    // Antecedentes no patológicos
    const nonPathologicalHistory: NonPathologicalHistoryPlanta = {
      tobacco: {
        consumes: false,
        cigarettesPerDay: 0,
        yearsSmoking: 0,
        packYears: 0
      },
      coffee: '1 TAZA MEDIANA DIARIA.',
      alcohol: 'NEGADO.',
      illicitDrugs: 'NEGADAS.',
      tea: '1 TAZA OCASIONAL.',
      previousJobs: 'NO ESPECIFICADO.',
      toxicExposure: 'EXPUESTO A BIOMASA (HUMO DE LEÑA) OCASIONAL.',
      otherNotes: ch?.toxicHabits ? ch.toxicHabits.toUpperCase() : ''
    };

    // Heredofamiliares
    const familyHistory: FamilyHistoryPlanta = {
      father: { alive: false, causeOfDeath: 'NO ESPECIFICADA', morbidities: 'DESCONOCIDOS' },
      mother: { alive: true, morbidities: 'HIPERTENSIÓN ARTERIAL' },
      siblings: { count: 3, details: 'SIN PATOLOGÍAS CONOCIDAS REFERIDAS.' },
      children: { count: 2, details: 'APArentemente SANOS.' },
      otherRelevant: ch?.familyHistory || 'SIN OTROS ANTECEDENTES RELEVANTES.'
    };

    // Esfera psicosocial
    const psychosocialHistory: PsychosocialHistoryPlanta = {
      monthlyIncome: 'INGRESOS PROMEDIO FAMILIARES NO ESPECIFICADOS.',
      housing: {
        housingType: 'PROPIA',
        wallMaterial: 'BLOCK',
        roofMaterial: 'ZINC',
        floorMaterial: 'CEMENTO',
        roomCount: 2,
        personCount: 3,
        bathroomCount: 1,
        bathroomLocation: 'Intradomiciliario',
        trashDisposal: 'RECOGIDA MUNICIPAL 2 VECES POR SEMANA',
        waterSource: 'ACUEDUCTO LOCAL',
        electricity: true,
        otherFactors: ''
      },
      narrativeText: 'VIVIENDA PROPIA DE BLOCK Y TECHO DE ZINC, PISO DE CEMENTO, CON SERVICIOS BÁSICOS DE AGUA Y ENERGÍA ELÉCTRICA.'
    };

    // Revisión por sistemas
    const reviewOfSystems: ReviewOfSystemsPlanta = {
      cardiovascular: { status: 'NORMAL', notes: 'SIN PATOLOGÍAS REFERIDAS. NIEGA DOLOR TORÁCICO, NIEGA PALPITACIONES.' },
      pulmonary: { status: 'NORMAL', notes: 'SIN PATOLOGÍAS REFERIDAS. NIEGA TOS, NIEGA DISNEA.' },
      gastrointestinal: { status: 'NORMAL', notes: 'SIN PATOLOGÍAS REFERIDAS. NIEGA NÁUSEAS, VÓMITOS, MELENA.' },
      genitourinary: { status: 'NORMAL', notes: 'SIN PATOLOGÍAS REFERIDAS. NIEGA DISURIA, HEMATURIA.' },
      endocrinometabolic: { status: 'NORMAL', notes: 'SIN PATOLOGÍAS REFERIDAS. NIEGA POLIDIPSIA, POLIFAGIA, POLIURIA.' },
      neurosensory: { status: 'NORMAL', notes: 'SIN PATOLOGÍAS REFERIDAS. NIEGA CEFALEA, MAREOS NI DÉFICIT MOTOR.' },
      musculoskeletal: { status: 'NORMAL', notes: 'SIN PATOLOGÍAS REFERIDAS. NIEGA ARTRALGIAS, MIALGIAS.' },
      hematologic: { status: 'NORMAL', notes: 'SIN PATOLOGÍAS REFERIDAS. NIEGA EQUIMOSIS, PETEQUIAS.' },
      constitutional: { status: 'NORMAL', notes: 'NIEGA ASTENIA, FIEBRE O PÉRDIDA DE PESO INVOLUNTARIA.' }
    };

    // Estado general
    const generalStatus: GeneralStatusPlanta = {
      biotype: 'NORMOLÍNEO',
      facies: 'NO CARACTERÍSTICA, NO ÁLGICA',
      consciousness: 'ALERTA, CONSCIENTE',
      orientation: 'ORIENTADO EN LAS TRES ESFERAS DEL SENSORIO',
      language: 'FLUIDO, COHERENTE, NORMOFONÉTICO',
      respiratoryPattern: 'EUPNEICO, SIN USO DE MÚSCULOS ACCESORIOS',
      temperatureCondition: 'AFEBRIL AL TACTO',
      skinColoration: 'NORMOCORÉMICO, ANICTÉRICO',
      hydration: 'ADECUADA HIDRATACIÓN MUCOCUTÁNEA',
      perfusion: 'LLENADO CAPILAR MENOR A 2 SEGUNDOS',
      oxygenTherapy: 'VENTILANDO ESPONTÁNEAMENTE AL AIRE AMBIENTE',
      generalStatusSummary: 'PACIENTE EN REGULARES A BUENAS CONDICIONES GENERALES, TRANQUILO, COOPERADOR CON EL INTERROGATORIO Y EL EXAMEN FÍSICO.'
    };

    // Signos vitales iniciales
    const vit = patient.vitals;
    const vitalSigns: VitalSignsPlanta = {
      systolicBP: vit?.systolicBP || 120,
      diastolicBP: vit?.diastolicBP || 80,
      heartRate: vit?.heartRate || 75,
      respiratoryRate: vit?.respiratoryRate || 18,
      temperature: vit?.temperature || 36.8,
      oxygenSaturation: vit?.oxygenSaturation || 98,
      bloodGlucose: vit?.bloodGlucose || 105,
      weight: vit?.weight || 70,
      height: vit?.height || 170,
      bmi: this.calculateBmi(vit?.weight || 70, vit?.height || 170),
      takenAt: vit?.timestamp || dateStr
    };

    // Examen físico cefalocaudal ordenado
    const pe = patient.clinicalHistory?.physicalExam;
    const physicalExam: PhysicalExamSystemsPlanta = {
      head: pe?.head || 'NORMOCÉFALO, CUERO CABELLUDO SIN LESIONES, CABELLO DE ADECUADA IMPLANTACIÓN Y DISTRIBUCIÓN, NO MASAS NI PUNTOS DOLOROSOS.',
      eyes: pe?.eyes || 'SIMÉTRICOS, MÓVILES, ESCLERAS ANICTÉRICAS, CONJUNTIVAS NORMOCORÉMICAS, PUPILAS ISOCÓRICAS Y FOTORREACTIVAS A LA LUZ.',
      ears: pe?.ears || 'PABELLONES AURICULARES NORMOINSERTOS, CONDUCTOS AUDITIVOS EXTERNOS PERMEABLES, NO SECRECIONES, NO DOLOR A LA PALPACIÓN DE TRAGO.',
      nose: pe?.nose || 'PIRÁMIDE NASAL CENTRAL, FOSAS NASALES PERMEABLES, MUCOSA NORMOCORÉMICA, SIN ALETEO NASAL NI SECRECIONES PATOLÓGICAS.',
      mouth: pe?.mouth || 'SIMÉTRICA, LABIOS Y MUCOSA ORAL HÚMEDA, LENGUA NORMOGLOSA CENTRADA Y MÓVIL, UVULA CENTRAL, AMÍGDALAS EUTRÓFICAS SIN EXUDADO.',
      neck: pe?.neck || 'CILÍNDRICO, SIMÉTRICO, MÓVIL, TRÁQUEA CENTRAL Y MÓVIL, NO SE PALPA TIROIDES AUMENTADA DE TAMAÑO, NO ADENOMEGALIAS, NO INGURGITACIÓN YUGULAR, PULSOS CAROTÍDEOS PRESENTES Y SIMÉTRICOS.',
      thorax: pe?.thorax || 'SIMÉTRICO, NORMODINÁMICO, EXPANSIBILIDAD Y ELASTICIDAD CONSERVADAS, SIN TIRAJES NI CICATRICES QUIRÚRGICAS RECIENTES.',
      lungs: pe?.lungs || 'NORMOVENTILADOS, MURMULLO VESICULAR CONSERVADO EN AMBOS CAMPOS PULMONARES, NO SE AUSCULTAN ESTERTORES NI RUIDOS SOBREAGREGADOS.',
      heart: pe?.heart || 'RUIDOS CARDÍACOS R1 Y R2 RÍTMICOS, REGULARES, NORMOFONÉTICOS, SIN SOPLOS AUDIBLES, NO R3 NI R4, SILENCIOS LIBRES.',
      abdomen: pe?.abdominal || 'PLANO, BLANDO, DEPRESIBLE, PERISTALSIS PRESENTE NORMOCONFIGURADA, NO DOLOROSO A LA PALPACIÓN SUPERFICIAL NI PROFUNDA, NO MASAS NI VISCEROMEGALIAS, NO SIGNOS DE IRRITACIÓN PERITONEAL.',
      externalGenitals: pe?.genitals || 'FENOTÍPICAMENTE ADECUADOS PARA EDAD Y SEXO, SIN LESIONES EVIDENTES.',
      skin: pe?.skin || 'INTEGRA, TURGENCIA CUTÁNEA Y ELASTICIDAD CONSERVADAS, COLORACIÓN HOMOGÉNEA, LLENADO CAPILAR DISTAL MENOR A 2 SEGUNDOS.',
      upperExtremities: pe?.upperExtremities || 'SIMÉTRICAS, MÓVILES, SIN EDEMAS, PULSOS RADIALES Y BRAQUIALES PRESENTES BILATERALMENTE CON ADECUADA AMPLITUD.',
      lowerExtremities: pe?.lowerExtremities || 'SIMÉTRICAS, MÓVILES, SIN EDEMAS NI SIGNOS DE TROMBOSIS VENOSA PROFUNDA, PULSOS PEDIOS Y TIBIALES POSTERIORES PRESENTES.',
      neurological: pe?.neurological || 'ALERTA, CONSCIENTE, ORIENTADO EN PERSONA, TIEMPO Y ESPACIO. GLASGOW 15/15. SIN DÉFICIT MOTOR NI SENSITIVO FOCAL.'
    };

    // Examen neurológico estructurado
    const neurologicalExam: NeurologicalExamPlanta = {
      consciousness: 'Alerta',
      orientation: { person: true, space: true, time: true },
      glasgow: { eye: 4, verbal: 5, motor: 6, total: 15 },
      language: 'Normal',
      memory: { anterograde: true, retrograde: true },
      pupils: {
        sizeRightMm: 3,
        sizeLeftMm: 3,
        isochoric: true,
        photoreactiveRight: true,
        photoreactiveLeft: true
      },
      cranialNerves: {
        'I Olfatorio': { intact: true, notes: 'Conservado' },
        'II Óptico': { intact: true, notes: 'Agudeza y campos visuales conservados' },
        'III, IV, VI Motores Oculares': { intact: true, notes: 'Movimientos oculares conjugados íntegros' },
        'V Trigémino': { intact: true, notes: 'Sensibilidad facial y fuerza mandibular conservada' },
        'VII Facial': { intact: true, notes: 'Mímica facial simétrica sin paresia' },
        'VIII Vestibulococlear': { intact: true, notes: 'Audición bilateral simétrica' },
        'IX, X Glosofaríngeo y Vago': { intact: true, notes: 'Elevación simétrica de velo de paladar y úvula central' },
        'XI Espinal/Accesorio': { intact: true, notes: 'Fuerza conservada en trapecio y esternocleidomastoideo' },
        'XII Hipogloso': { intact: true, notes: 'Lengua centrada sin fasciculaciones' }
      },
      muscleStrength: {
        rightUpper: 5,
        leftUpper: 5,
        rightLower: 5,
        leftLower: 5
      },
      tone: 'Normal',
      sensitivity: {
        superficial: true,
        pain: true,
        thermal: true,
        vibratory: true,
        proprioceptive: true
      },
      reflexes: {
        bicipitalRight: '++/++++',
        bicipitalLeft: '++/++++',
        tricipitalRight: '++/++++',
        tricipitalLeft: '++/++++',
        brachioradialRight: '++/++++',
        brachioradialLeft: '++/++++',
        patellarRight: '++/++++',
        patellarLeft: '++/++++',
        achillesRight: '++/++++',
        achillesLeft: '++/++++'
      },
      babinski: 'Negativo',
      coordination: {
        fingerToNose: 'Normal',
        heelToShin: 'Normal',
        diadochokinesia: 'Normal'
      },
      romberg: 'Negativo',
      gait: 'Normal'
    };
    neurologicalExam.narrativeText = this.formatNeurologicalNarrative(neurologicalExam);

    // Diagnósticos iniciales
    const diagnoses: DiagnosisItemPlanta[] = [];
    if (patient.diagnosesList && patient.diagnosesList.length > 0) {
      patient.diagnosesList.forEach((d, idx) => {
        diagnoses.push({
          id: d.id || `diag-${idx + 1}`,
          name: d.name.toUpperCase(),
          priorityIndex: idx + 1
        });
      });
    } else if (patient.clinicalHistory?.clinicalImpression) {
      const parts = patient.clinicalHistory.clinicalImpression.split(/[\n;]+/).map(p => p.trim()).filter(Boolean);
      parts.forEach((p, idx) => {
        diagnoses.push({
          id: `diag-${idx + 1}`,
          name: p.toUpperCase(),
          priorityIndex: idx + 1
        });
      });
    } else {
      diagnoses.push({
        id: 'diag-1',
        name: 'HIPERTENSIÓN ARTERIAL ESTADIO II AHA',
        priorityIndex: 1
      });
      diagnoses.push({
        id: 'diag-2',
        name: 'DIABETES MELLITUS TIPO 2',
        priorityIndex: 2
      });
    }

    const newHistory: ClinicalHistoryPlanta = {
      id: `HC-PLANTA-${patient.id}-${Date.now()}`,
      patientId: patient.id,
      admissionId: admissionId || `ADM-${patient.id}-1`,
      generalData,
      chiefComplaints,
      presentIllness,
      pathologicalHistory,
      nonPathologicalHistory,
      familyHistory,
      psychosocialHistory,
      reviewOfSystems,
      generalStatus,
      vitalSigns,
      physicalExam,
      neurologicalExam,
      diagnoses,
      status: 'BORRADOR',
      version: 1,
      createdAt: now.toISOString(),
      createdBy: activeDoc.name,
      updatedAt: now.toISOString(),
      updatedBy: activeDoc.name
    };

    return newHistory;
  }

  /**
   * Obtiene la historia clínica de planta para un paciente e ingreso determinado
   */
  public async getHistory(patientId: string, admissionId?: string): Promise<ClinicalHistoryPlanta | null> {
    try {
      if (admissionId) {
        const item = await db.clinicalHistoriesPlanta
          .where({ patientId, admissionId })
          .first();
        if (item) return item;
      }
      // Buscar última historia por patientId
      const list = await db.clinicalHistoriesPlanta
        .where('patientId')
        .equals(patientId)
        .reverse()
        .sortBy('updatedAt');
      return list.length > 0 ? list[0] : null;
    } catch (err) {
      console.error('Error al recuperar Historia Clínica Planta de Dexie:', err);
      return null;
    }
  }

  /**
   * Guarda o actualiza la Historia Clínica Planta en Dexie DB
   * Crea un registro de versión para auditoría y trazabilidad
   */
  public async saveHistory(
    history: ClinicalHistoryPlanta, 
    optionsOrSummary: { changeSummary?: string; force?: boolean } | string = 'Modificación de Historia Clínica Planta'
  ): Promise<ClinicalHistoryPlanta> {
    const changeSummary = typeof optionsOrSummary === 'string' ? optionsOrSummary : (optionsOrSummary.changeSummary || 'Modificación de Historia Clínica Planta');
    const force = typeof optionsOrSummary === 'object' ? !!optionsOrSummary.force : false;

    const activeDoc = authService.getActiveDoctorSignature();
    const now = new Date();
    
    // Auto actualizar narrativa neurológica
    if (history.neurologicalExam) {
      history.neurologicalExam.narrativeText = this.formatNeurologicalNarrative(history.neurologicalExam);
    }

    // Comprobar concurrencia optimista
    const existing = await db.clinicalHistoriesPlanta.get(history.id);
    if (existing && !force && (existing.version || 1) > (history.version || 1)) {
      throw new ConcurrencyConflictError(existing, history);
    }

    const newVersion = existing ? Math.max(existing.version || 1, history.version || 1) + 1 : 1;

    const updatedHistory: ClinicalHistoryPlanta = {
      ...history,
      version: newVersion,
      updatedAt: now.toISOString(),
      updatedBy: activeDoc.name || history.updatedBy
    };

    // Guardar en Dexie DB
    await db.clinicalHistoriesPlanta.put(updatedHistory);

    // Guardar versión histórica
    const versionRecord: ClinicalHistoryVersionRecord = {
      id: `VER-${history.id}-v${newVersion}`,
      clinicalHistoryId: history.id,
      patientId: history.patientId,
      admissionId: history.admissionId,
      version: newVersion,
      createdAt: now.toISOString(),
      createdBy: activeDoc.name || history.updatedBy,
      changeSummary,
      snapshot: JSON.parse(JSON.stringify(updatedHistory))
    };
    await db.clinicalHistoryVersions.put(versionRecord);

    // Auditoría
    await authService.recordAudit({
      action: existing ? 'PLANTA_HISTORY_UPDATED' : 'PLANTA_HISTORY_CREATED',
      patientId: history.patientId,
      recordId: history.id,
      recordType: 'CLINICAL_HISTORY_PLANTA',
      details: `${existing ? 'Actualización' : 'Creación'} de Historia Clínica Planta v${newVersion} (${changeSummary})`
    });

    // Sincronización en tiempo real a disco y nube
    centralSyncService.saveHistoryPlantaCentral(updatedHistory, activeDoc.name || history.updatedBy).catch(console.warn);
    cloudSyncService.scheduleAutoSync();

    return updatedHistory;
  }

  /**
   * Lista las versiones históricas de una Historia Clínica
   */
  public async getVersions(clinicalHistoryId: string): Promise<ClinicalHistoryVersionRecord[]> {
    try {
      return await db.clinicalHistoryVersions
        .where('clinicalHistoryId')
        .equals(clinicalHistoryId)
        .reverse()
        .sortBy('version');
    } catch (err) {
      console.error('Error al listar versiones:', err);
      return [];
    }
  }

  /**
   * Restaura una versión histórica
   */
  public async restoreVersion(versionId: string): Promise<ClinicalHistoryPlanta | null> {
    try {
      const ver = await db.clinicalHistoryVersions.get(versionId);
      if (!ver || !ver.snapshot) return null;
      const restored = { ...ver.snapshot };
      return await this.saveHistory(restored, `Restauración a la versión ${ver.version}`);
    } catch (err) {
      console.error('Error al restaurar versión:', err);
      return null;
    }
  }

  /**
   * Detecta campos pendientes y genera un checklist interactivo
   */
  public getPendingFields(history: ClinicalHistoryPlanta): PendingFieldItem[] {
    const pending: PendingFieldItem[] = [];

    const check = (val: any, title: string, field: string, sectionId: string) => {
      if (!val || val === '' || val === 'PENDIENTE' || val === 'NO REGISTRADO' || val === 'NO ESPECIFICADO') {
        pending.push({ id: `${sectionId}-${field}`, sectionTitle: title, fieldName: field, sectionId });
      }
    };

    // Datos generales
    check(history.generalData.religion, 'Datos Generales', 'Religión', 'sec-datos-generales');
    check(history.generalData.escolaridad, 'Datos Generales', 'Escolaridad', 'sec-datos-generales');
    check(history.generalData.fuente, 'Datos Generales', 'Fuente de Información', 'sec-datos-generales');
    check(history.generalData.procedencia, 'Datos Generales', 'Procedencia', 'sec-datos-generales');
    check(history.generalData.sala, 'Datos Generales', 'Sala/Cama', 'sec-datos-generales');

    // Motivos de consulta
    if (!history.chiefComplaints || history.chiefComplaints.length === 0) {
      pending.push({ id: 'sec-motivos-consulta', sectionTitle: 'Motivos de Consulta', fieldName: 'Al menos un motivo de consulta', sectionId: 'sec-motivos-consulta' });
    }

    // Antecedentes patológicos
    check(history.pathologicalHistory.childhood, 'Antecedentes Patológicos', 'Niñez', 'sec-patologicos');
    check(history.pathologicalHistory.hospitalizations, 'Antecedentes Patológicos', 'Hospitalarios', 'sec-patologicos');
    check(history.pathologicalHistory.transfusions, 'Antecedentes Patológicos', 'Transfusionales', 'sec-patologicos');

    // No patológicos
    check(history.nonPathologicalHistory.previousJobs, 'Antecedentes No Patológicos', 'Trabajos Anteriores', 'sec-no-patologicos');
    check(history.nonPathologicalHistory.toxicExposure, 'Antecedentes No Patológicos', 'Exposición a Tóxicos', 'sec-no-patologicos');

    // Signos vitales
    if (!history.vitalSigns.systolicBP || !history.vitalSigns.diastolicBP) {
      pending.push({ id: 'sec-signos-vitales-ta', sectionTitle: 'Signos Vitales', fieldName: 'Presión Arterial (TA)', sectionId: 'sec-signos-vitales' });
    }
    if (!history.vitalSigns.heartRate) {
      pending.push({ id: 'sec-signos-vitales-fc', sectionTitle: 'Signos Vitales', fieldName: 'Frecuencia Cardíaca (FC)', sectionId: 'sec-signos-vitales' });
    }
    if (!history.vitalSigns.temperature) {
      pending.push({ id: 'sec-signos-vitales-temp', sectionTitle: 'Signos Vitales', fieldName: 'Temperatura', sectionId: 'sec-signos-vitales' });
    }

    // Diagnósticos
    if (!history.diagnoses || history.diagnoses.length === 0) {
      pending.push({ id: 'sec-diagnosticos', sectionTitle: 'Diagnósticos', fieldName: 'Al menos un diagnóstico de ingreso', sectionId: 'sec-diagnosticos' });
    }

    return pending;
  }
}

export const clinicalHistoryPlantaService = new ClinicalHistoryPlantaService();
