import { Patient, LabResult, MedicalStudy } from '../types';

export interface DiagnosticSuggestion {
  condition: string;
  confidence: 'Alta' | 'Moderada' | 'Baja' | 'Sospecha Inicial';
  matchScore: number; // 0 to 100
  clinicalRationale: string;
  dataUsed: string[];
  missingData: string[];
  redFlags: string[];
  guidelineReference: string;
}

export interface ClinicalDecisionResult {
  disclaimer: string;
  hasRedFlags: boolean;
  activeRedFlags: string[];
  suggestions: DiagnosticSuggestion[];
  generalObservations: string[];
}

export function evaluateClinicalData(
  patient: Patient,
  labs: LabResult[] = [],
  studies: MedicalStudy[] = []
): ClinicalDecisionResult {
  const disclaimer = 'RECOMENDACIÓN DE ORIENTACIÓN CLÍNICA: Requiere validación médica por el profesional actuante. No sustituye el juicio médico ni los protocolos institucionales.';
  const redFlags: string[] = [];
  const suggestions: DiagnosticSuggestion[] = [];
  const observations: string[] = [];

  const vitals = patient.vitals || {};
  const complaint = (patient.chiefComplaint || '').toLowerCase();
  const history = (patient.clinicalHistory?.currentIllnessHistory || '').toLowerCase();
  const text = `${complaint} ${history}`;

  // Evaluate Vitals & Red Flags
  if (vitals.systolicBP && vitals.systolicBP < 90) {
    redFlags.push(`Hipotensión severa (PAS: ${vitals.systolicBP} mmHg) - Riesgo de Choque / Inestabilidad hemodinámica`);
  }
  if (vitals.oxygenSaturation && vitals.oxygenSaturation < 90) {
    redFlags.push(`Hipoxemia crítica (SpO2: ${vitals.oxygenSaturation}%) - Requiere oxígeno suplementario inmediato`);
  }
  if (vitals.heartRate && vitals.heartRate > 120) {
    redFlags.push(`Taquicardia marcada (FC: ${vitals.heartRate} lpm)`);
  }
  if (vitals.glasgowTotal && vitals.glasgowTotal <= 8) {
    redFlags.push(`Glasgow severamente deprimido (GCS: ${vitals.glasgowTotal}/15) - Proteger vía aérea`);
  }
  if (vitals.temperature && vitals.temperature >= 39.0) {
    redFlags.push(`Fiebre alta (Temp: ${vitals.temperature}°C)`);
  }

  // Check studies and labs
  const hasECG = studies.some(s => s.category === 'Electrocardiograma');
  const hasXRay = studies.some(s => s.category === 'Radiografía');
  const hasCT = studies.some(s => s.category === 'Tomografía');

  const troponinLab = labs.find(l => l.parameter.toLowerCase().includes('troponina'));
  const ddimerLab = labs.find(l => l.parameter.toLowerCase().includes('dímero d') || l.parameter.toLowerCase().includes('dimero'));
  const leukocyteLab = labs.find(l => l.parameter.toLowerCase().includes('leucocitos'));
  const creatinineLab = labs.find(l => l.parameter.toLowerCase().includes('creatinina'));
  const lactateLab = labs.find(l => l.parameter.toLowerCase().includes('lactato'));

  // 1. Sindrome Coronario Agudo (SCA)
  if (text.includes('pecho') || text.includes('torax') || text.includes('torácico') || text.includes('precordial') || text.includes('angina') || text.includes('opresiv')) {
    const dataUsed: string[] = ['Motivo/Historia de dolor torácico opresivo'];
    const missing: string[] = [];
    const rf: string[] = [];
    let score = 50;

    if (vitals.systolicBP && vitals.systolicBP > 160) {
      dataUsed.push(`Crisis hipertensiva concomitante (${vitals.systolicBP}/${vitals.diastolicBP} mmHg)`);
      score += 10;
    }
    if (hasECG) {
      dataUsed.push('Electrocardiograma realizado');
      score += 15;
    } else {
      missing.push('ECG de 12 derivaciones en los primeros 10 minutos (mandatorio)');
      rf.push('Falta ECG para descartar SCACEST (supradesnivel ST)');
    }

    if (troponinLab) {
      dataUsed.push(`Troponina dosificada (${troponinLab.value} ${troponinLab.unit}, Flag: ${troponinLab.flag})`);
      if (troponinLab.flag === 'alto' || troponinLab.flag === 'critico') {
        score += 25;
        rf.push('Curva de troponinas elevadas concordante con necrosis miocárdica');
      }
    } else {
      missing.push('Troponina I o T seriada de alta sensibilidad (0h y 2-3h)');
    }

    suggestions.push({
      condition: 'Síndrome Coronario Agudo (SCA / Angina Inestable o IAM)',
      confidence: score >= 75 ? 'Alta' : 'Moderada',
      matchScore: Math.min(score, 98),
      clinicalRationale: 'Paciente con síntomas torácicos de características isquémicas. Requiere evaluación inmediata con ECG de 12 derivaciones y cinética enzimática.',
      dataUsed,
      missingData: missing,
      redFlags: rf,
      guidelineReference: 'Guías ESC / AHA 2023 sobre Síndromes Coronarios Agudos'
    });
  }

  // 2. Tromboembolismo Pulmonar (TEP)
  if (text.includes('disnea') || text.includes('falta de aire') || text.includes('pleurítico') || text.includes('súbito')) {
    const dataUsed: string[] = ['Disnea de inicio agudo/subagudo'];
    const missing: string[] = [];
    const rf: string[] = [];
    let score = 45;

    if (vitals.oxygenSaturation && vitals.oxygenSaturation < 94) {
      dataUsed.push(`Desaturación de oxígeno (${vitals.oxygenSaturation}%)`);
      score += 15;
    }
    if (vitals.heartRate && vitals.heartRate > 100) {
      dataUsed.push(`Taquicardia sinusal (${vitals.heartRate} lpm)`);
      score += 15;
    }
    if (ddimerLab) {
      dataUsed.push(`Dímero D (${ddimerLab.value} ${ddimerLab.unit}, Flag: ${ddimerLab.flag})`);
      if (ddimerLab.flag === 'alto') score += 20;
    } else {
      missing.push('Dímero D (si probabilidad Wells baja/intermedia)');
    }
    if (!hasCT) {
      missing.push('Angio-TAC de tórax protocolo TEP (si probabilidad Wells alta o Dímero D positivo)');
    }

    suggestions.push({
      condition: 'Tromboembolismo Pulmonar Agudo (TEP) / Insuficiencia Respiratoria Aguda',
      confidence: score >= 70 ? 'Moderada' : 'Sospecha Inicial',
      matchScore: Math.min(score, 95),
      clinicalRationale: 'Disnea súbita asociada a alteraciones gasométricas/oximetría y taquicardia. Evaluar score de Wells / Ginebra.',
      dataUsed,
      missingData: missing,
      redFlags: rf,
      guidelineReference: 'Guías ESC 2019 de Diagnóstico y Manejo de Embolismo Pulmonar Agudo'
    });
  }

  // 3. Sepsis / Choque Séptico
  const hasInfectionKeywords = text.includes('fiebre') || text.includes('tos') || text.includes('disuria') || text.includes('infección') || text.includes('herida') || text.includes('celulitis');
  if (hasInfectionKeywords || (vitals.temperature && (vitals.temperature > 38.3 || vitals.temperature < 36.0))) {
    let qSOFA = 0;
    const dataUsed: string[] = [];
    const missing: string[] = [];
    const rf: string[] = [];

    if (vitals.respiratoryRate && vitals.respiratoryRate >= 22) {
      qSOFA++;
      dataUsed.push(`FR >= 22 rpm (${vitals.respiratoryRate} rpm)`);
    }
    if (vitals.systolicBP && vitals.systolicBP <= 100) {
      qSOFA++;
      dataUsed.push(`PAS <= 100 mmHg (${vitals.systolicBP} mmHg)`);
    }
    if (vitals.glasgowTotal && vitals.glasgowTotal < 15) {
      qSOFA++;
      dataUsed.push(`Alteración del estado mental (GCS: ${vitals.glasgowTotal})`);
    }

    if (qSOFA >= 2) {
      rf.push(`qSOFA positivo (${qSOFA}/3): Alto riesgo de deterioro clínico y mortalidad hospitalaria`);
    }

    if (lactateLab) {
      dataUsed.push(`Lactato sérico: ${lactateLab.value} ${lactateLab.unit}`);
      if (lactateLab.flag === 'alto' || lactateLab.flag === 'critico') {
        rf.push('Hiperlactatemia: Marcador de hipoperfusión tisular');
      }
    } else {
      missing.push('Lactato sérico en sangre venosa/arterial');
      missing.push('Hemocultivos x 2 antes de inicio de antibióticos');
    }

    suggestions.push({
      condition: qSOFA >= 2 ? 'Sepsis Grave / Posible Choque Séptico' : 'Síndrome de Respuesta Inflamatoria Sistémica / Foco Infeccioso',
      confidence: qSOFA >= 2 ? 'Alta' : 'Moderada',
      matchScore: qSOFA >= 2 ? 88 : 65,
      clinicalRationale: `Evaluación basada en criterios qSOFA (${qSOFA}/3) y foco infeccioso sospechado. Requiere resucitación hídrica y antibióticos en la 1ra hora si confirma sepsis.`,
      dataUsed,
      missingData: missing,
      redFlags: rf,
      guidelineReference: 'Surviving Sepsis Campaign International Guidelines 2021'
    });
  }

  // 4. Abdomen Agudo Quirúrgico / Apendicitis / Colecistitis
  if (text.includes('abdomen') || text.includes('abdominal') || text.includes('fosa iliaca') || text.includes('epigastrio') || text.includes('hipocondrio') || text.includes('nausea') || text.includes('vómito')) {
    const dataUsed: string[] = ['Dolor abdominal agudo de consulta en urgencias'];
    const missing: string[] = [];
    const rf: string[] = [];
    let score = 55;

    if (leukocyteLab) {
      dataUsed.push(`Leucocitosis: ${leukocyteLab.value} ${leukocyteLab.unit} (Flag: ${leukocyteLab.flag})`);
      if (leukocyteLab.flag === 'alto') score += 15;
    } else {
      missing.push('Hemograma completo con diferencial (desviación izquierda)');
    }

    const hasUltrasound = studies.some(s => s.category === 'Ultrasonido');
    if (hasUltrasound) {
      dataUsed.push('Ultrasonido abdominal/pélvico realizado');
      score += 15;
    } else {
      missing.push('Ultrasonido abdominal o Tomografía computarizada de abdomen');
    }

    suggestions.push({
      condition: 'Abdomen Agudo (Descartar Apendicitis, Colecistitis, Obstrucción o Perforación)',
      confidence: score >= 70 ? 'Moderada' : 'Sospecha Inicial',
      matchScore: Math.min(score, 90),
      clinicalRationale: 'Presentación con dolor abdominal que amerita descartar etiología quirúrgica o patología biliar/pancreática.',
      dataUsed,
      missingData: missing,
      redFlags: rf,
      guidelineReference: 'Guías de Práctica Clínica WSES (World Society of Emergency Surgery)'
    });
  }

  // 5. Enfermedad Cerebrovascular Aguda (ECV / Ictus)
  if (text.includes('focal') || text.includes('paresia') || text.includes('afasia') || text.includes('disartria') || text.includes('desviación') || text.includes('parestesia') || text.includes('ictus') || text.includes('acv')) {
    const dataUsed: string[] = ['Déficit neurológico focal agudo'];
    const missing: string[] = [];
    const rf: string[] = ['Ventana terapéutica para trombólisis/trombectomía es tiempo-dependiente (<4.5 horas)'];
    let score = 75;

    if (!hasCT) {
      missing.push('TAC de cráneo simple URGENTE para descartar hemorragia intracraneal');
      rf.push('TAC cerebral urgente pendiente: NO administrar anticoagulación ni antiagregación hasta tener TAC');
    } else {
      dataUsed.push('TAC de cráneo realizada');
      score += 15;
    }

    suggestions.push({
      condition: 'Evento Cerebrovascular Agudo (Isquémico vs Hemorrágico) - Código Ictus',
      confidence: 'Alta',
      matchScore: Math.min(score, 95),
      clinicalRationale: 'Focalidad neurológica aguda. Activación inmediata de protocolo de Ictus y determinación estricta del tiempo de inicio de los síntomas (última vez visto sano).',
      dataUsed,
      missingData: missing,
      redFlags: rf,
      guidelineReference: 'AHA/ASA Guidelines for the Early Management of Patients With Acute Ischemic Stroke'
    });
  }

  // General fallback if no specific rule triggered
  if (suggestions.length === 0) {
    suggestions.push({
      condition: 'Síndrome Clínico en Estudio',
      confidence: 'Sospecha Inicial',
      matchScore: 40,
      clinicalRationale: 'Completar anamnesis dirigida, exploración física exhaustiva y exámenes complementarios para categorizar el cuadro.',
      dataUsed: [patient.chiefComplaint || 'Motivo de consulta general'],
      missingData: ['Laboratorios básicos de ingreso', 'Estudios de imagen según sospecha'],
      redFlags: [],
      guidelineReference: 'Manual de Urgencias y Emergencias Médicas'
    });
  }

  return {
    disclaimer,
    hasRedFlags: redFlags.length > 0,
    activeRedFlags: redFlags,
    suggestions: suggestions.sort((a, b) => b.matchScore - a.matchScore),
    generalObservations: observations
  };
}
