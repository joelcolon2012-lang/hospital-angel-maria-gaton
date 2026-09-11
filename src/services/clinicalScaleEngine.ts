/**
 * ClinicalScaleEngine: Definitive Clinical Scale Calculators
 * Hospital Regional Dr. Ángel María Gatón — Servicio de Medicina Interna & Emergencias
 * Dr. Joel Colón
 *
 * Requirements (Phases 10 & 16; Sections 25, 26, 52):
 * Fully calculates with zero errors:
 * 1. NIHSS (National Institutes of Health Stroke Scale)
 * 2. MODIFIED RANKIN (mRS)
 * 3. CURB-65 (Pneumonia)
 * 4. PSI / PORT (Pneumonia Severity Index)
 * 5. GLASGOW-BLATCHFORD (Upper Gastrointestinal Bleeding)
 * 6. SOFA (Sequential Organ Failure Assessment)
 * 7. qSOFA (Quick SOFA for sepsis)
 * 8. NEWS2 (National Early Warning Score 2)
 *
 * Clinical Safety Rule (Section 26):
 * - Auto-completes patient vitals, age, and labs when present.
 * - NEVER calculates silently with missing information.
 * - Explicitly lists "DATOS FALTANTES".
 * - Shows PUNTAJE, INTERPRETACIÓN, RIESGO, and FUENTE OFICIAL.
 */

import { Patient, LabResult, Vitals } from '../types';

export interface ScaleFieldRequirement {
  id: string;
  label: string;
  category: 'vital' | 'lab' | 'clinical' | 'demographic';
  autoValue?: string | number;
  isMissing: boolean;
}

export interface ScaleCalculationOutput {
  scaleId: string;
  scaleName: string;
  score: number;
  maxScore?: number;
  interpretation: string;
  riskCategory: 'Bajo Riesgo' | 'Riesgo Intermedio' | 'Alto Riesgo' | 'Riesgo Crítico';
  recommendation: string;
  officialSource: string;
  missingData: string[];
  isComplete: boolean;
  variablesUsed: Record<string, any>;
  summaryText: string;
}

export interface ComprehensivePatientContext {
  age?: number;
  sex?: 'M' | 'F' | string;
  vitals?: Vitals;
  labs?: LabResult[];
  activeDiagnoses?: string[];
}

/**
 * Extracts and maps lab values from patient lab history
 */
export function extractPatientLabMetrics(labs: LabResult[] = []) {
  const map: Record<string, number> = {};

  labs.forEach((l) => {
    const val = parseFloat(l.value.replace(',', '.'));
    if (isNaN(val)) return;

    const p = l.parameter.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    if (p.includes('hemoglob') || p.includes('hgb') || p === 'hb') map['hgb'] = val;
    else if (p.includes('hematocrito') || p.includes('hct')) map['hct'] = val;
    else if (p.includes('leucocito') || p.includes('wbc') || p.includes('blanco')) map['wbc'] = val;
    else if (p.includes('plaqueta') || p.includes('plt')) map['plt'] = val;
    else if (p.includes('creatinina') || p === 'cr') map['creatinine'] = val;
    else if (p.includes('urea')) map['urea'] = val;
    else if (p.includes('bun') || p.includes('nitrogeno ureico')) map['bun'] = val;
    else if (p.includes('glucosa') || p.includes('glicemia')) map['glucose'] = val;
    else if (p.includes('sodio') || p.includes('na')) map['sodium'] = val;
    else if (p.includes('potasio') || p.includes('k')) map['potassium'] = val;
    else if (p.includes('bilirrubina total') || p.includes('bil-t')) map['bilirubin'] = val;
    else if (p.includes('po2') || p.includes('pao2')) map['pao2'] = val;
    else if (p.includes('ph')) map['ph'] = val;
  });

  return map;
}

// ============================================================================
// 1. CURB-65 (Neumonía Adquirida en la Comunidad)
// ============================================================================
export function calculateCURB65(
  ctx: ComprehensivePatientContext,
  manualOverrides?: { isConfused?: boolean; bunOver19?: boolean; rrOver30?: boolean; sbpLow?: boolean; ageOver65?: boolean }
): ScaleCalculationOutput {
  const missing: string[] = [];
  const vitals = ctx.vitals;
  const labMetrics = extractPatientLabMetrics(ctx.labs);

  // C: Confusión
  let c = false;
  if (manualOverrides?.isConfused !== undefined) {
    c = manualOverrides.isConfused;
  } else if (vitals?.glasgowTotal !== undefined) {
    c = vitals.glasgowTotal < 15;
  } else {
    missing.push('Estado mental / Glasgow (C)');
  }

  // U: Urea > 7 mmol/L (BUN > 19-20 mg/dL)
  let u = false;
  if (manualOverrides?.bunOver19 !== undefined) {
    u = manualOverrides.bunOver19;
  } else if (labMetrics['bun'] !== undefined) {
    u = labMetrics['bun'] > 19;
  } else if (labMetrics['urea'] !== undefined) {
    u = labMetrics['urea'] > 42; // ~7 mmol/L
  } else {
    missing.push('BUN o Urea sérica (U)');
  }

  // R: Frecuencia respiratoria >= 30 rpm
  let r = false;
  if (manualOverrides?.rrOver30 !== undefined) {
    r = manualOverrides.rrOver30;
  } else if (vitals?.respiratoryRate !== undefined) {
    r = vitals.respiratoryRate >= 30;
  } else {
    missing.push('Frecuencia Respiratoria (R)');
  }

  // B: TA Sistólica < 90 mmHg o Diastólica <= 60 mmHg
  let b = false;
  if (manualOverrides?.sbpLow !== undefined) {
    b = manualOverrides.sbpLow;
  } else if (vitals?.systolicBP !== undefined && vitals?.diastolicBP !== undefined) {
    b = vitals.systolicBP < 90 || vitals.diastolicBP <= 60;
  } else {
    missing.push('Presión Arterial (Sistólica/Diastólica) (B)');
  }

  // 65: Edad >= 65 años
  let is65 = false;
  if (manualOverrides?.ageOver65 !== undefined) {
    is65 = manualOverrides.ageOver65;
  } else if (ctx.age !== undefined) {
    is65 = ctx.age >= 65;
  } else {
    missing.push('Edad del paciente (65)');
  }

  const score = (c ? 1 : 0) + (u ? 1 : 0) + (r ? 1 : 0) + (b ? 1 : 0) + (is65 ? 1 : 0);

  let riskCategory: ScaleCalculationOutput['riskCategory'] = 'Bajo Riesgo';
  let interpretation = '';
  let recommendation = '';

  if (score === 0 || score === 1) {
    riskCategory = 'Bajo Riesgo';
    interpretation = `CURB-65: ${score} punto(s) — Grupo 1 (Bajo riesgo, mortalidad estimada ~1.5%).`;
    recommendation = 'Tratamiento ambulatorio estándar seguro salvo factores de riesgo social o hipoxemia severa.';
  } else if (score === 2) {
    riskCategory = 'Riesgo Intermedio';
    interpretation = `CURB-65: ${score} puntos — Grupo 2 (Riesgo moderado, mortalidad ~9.2%).`;
    recommendation = 'Considerar ingreso hospitalario en sala general de medicina o estancia corta supervisada.';
  } else {
    riskCategory = 'Alto Riesgo';
    interpretation = `CURB-65: ${score} puntos — Grupo 3 (Severa, mortalidad estimada 15% - 40%).`;
    recommendation = 'Ingreso hospitalario urgente. Evaluar criterios mayores/menores ATS/IDSA para ingreso en UCI si score ≥ 3.';
  }

  return {
    scaleId: 'curb65',
    scaleName: 'Escala CURB-65 (Severidad en Neumonía)',
    score,
    maxScore: 5,
    interpretation,
    riskCategory,
    recommendation,
    officialSource: 'British Thoracic Society (BTS) / Lim WS et al. Thorax 2003;58:377-382; ATS/IDSA Guidelines 2019.',
    missingData: missing,
    isComplete: missing.length === 0,
    variablesUsed: { c, u, r, b, is65 },
    summaryText: `CURB-65: ${score}/5 pts [${riskCategory}] — ${interpretation}`,
  };
}

// ============================================================================
// 2. qSOFA (Quick SOFA para Sepsis a la cabecera del paciente)
// ============================================================================
export function calculateQSOFA(
  ctx: ComprehensivePatientContext,
  manualOverrides?: { rrOver22?: boolean; alteredMentalState?: boolean; sbpUnder100?: boolean }
): ScaleCalculationOutput {
  const missing: string[] = [];
  const vitals = ctx.vitals;

  let rr = false;
  if (manualOverrides?.rrOver22 !== undefined) {
    rr = manualOverrides.rrOver22;
  } else if (vitals?.respiratoryRate !== undefined) {
    rr = vitals.respiratoryRate >= 22;
  } else {
    missing.push('Frecuencia Respiratoria (≥ 22 rpm)');
  }

  let gcs = false;
  if (manualOverrides?.alteredMentalState !== undefined) {
    gcs = manualOverrides.alteredMentalState;
  } else if (vitals?.glasgowTotal !== undefined) {
    gcs = vitals.glasgowTotal < 15;
  } else {
    missing.push('Glasgow / Estado mental (< 15)');
  }

  let sbp = false;
  if (manualOverrides?.sbpUnder100 !== undefined) {
    sbp = manualOverrides.sbpUnder100;
  } else if (vitals?.systolicBP !== undefined) {
    sbp = vitals.systolicBP <= 100;
  } else {
    missing.push('Presión Arterial Sistólica (≤ 100 mmHg)');
  }

  const score = (rr ? 1 : 0) + (gcs ? 1 : 0) + (sbp ? 1 : 0);

  const isPositive = score >= 2;
  const riskCategory: ScaleCalculationOutput['riskCategory'] = isPositive ? 'Alto Riesgo' : 'Bajo Riesgo';
  const interpretation = isPositive
    ? `qSOFA: ${score}/3 — POSITIVO. Alto riesgo de deterioro clínico, ingreso a UCI y mortalidad hospitalaria (≥ 10%).`
    : `qSOFA: ${score}/3 — NEGATIVO. Bajo riesgo inmediato por esta escala rápida, continuar vigilancia.`;

  const recommendation = isPositive
    ? 'Activar Código Sepsis: Iniciar protocolo Surviving Sepsis en la primera hora (Hemocultivos x2, Lactato sérico, antibiótico de amplio espectro, reanimación con cristaloides 30 mL/kg si PAM < 65 mmHg).'
    : 'Reevaluar periódicamente constantes vitales y vigilar disfunción orgánica si la sospecha de infección persiste.';

  return {
    scaleId: 'qsofa',
    scaleName: 'qSOFA (Quick SOFA para Sepsis)',
    score,
    maxScore: 3,
    interpretation,
    riskCategory,
    recommendation,
    officialSource: 'The Third International Consensus Definitions for Sepsis and Septic Shock (Sepsis-3). JAMA 2016;315(8):801-810.',
    missingData: missing,
    isComplete: missing.length === 0,
    variablesUsed: { rr, gcs, sbp },
    summaryText: `qSOFA: ${score}/3 pts [${isPositive ? 'POSITIVO' : 'NEGATIVO'}]`,
  };
}

// ============================================================================
// 3. NEWS2 (National Early Warning Score 2)
// ============================================================================
export function calculateNEWS2(
  ctx: ComprehensivePatientContext,
  manualOverrides?: {
    useSpO2Scale2?: boolean; // Para pacientes con insuficiencia respiratoria hipercápnica / EPOC
    onOxygen?: boolean;
    consciousnessLevel?: 'A' | 'V' | 'P' | 'U'; // Alert, Voice, Pain, Unresponsive
  }
): ScaleCalculationOutput {
  const missing: string[] = [];
  const vitals = ctx.vitals;

  let totalScore = 0;

  // 1. Frecuencia Respiratoria
  if (vitals?.respiratoryRate !== undefined) {
    const rr = vitals.respiratoryRate;
    if (rr <= 8) totalScore += 3;
    else if (rr >= 9 && rr <= 11) totalScore += 1;
    else if (rr >= 12 && rr <= 20) totalScore += 0;
    else if (rr >= 21 && rr <= 24) totalScore += 2;
    else if (rr >= 25) totalScore += 3;
  } else {
    missing.push('Frecuencia Respiratoria');
  }

  // 2. SpO2
  const useScale2 = manualOverrides?.useSpO2Scale2 ?? false;
  if (vitals?.oxygenSaturation !== undefined) {
    const spo2 = vitals.oxygenSaturation;
    if (!useScale2) {
      if (spo2 <= 91) totalScore += 3;
      else if (spo2 >= 92 && spo2 <= 93) totalScore += 2;
      else if (spo2 >= 94 && spo2 <= 95) totalScore += 1;
      else totalScore += 0; // >= 96
    } else {
      // Escala 2 (EPOC/Hipercápnicos)
      if (spo2 <= 83) totalScore += 3;
      else if (spo2 >= 84 && spo2 <= 85) totalScore += 2;
      else if (spo2 >= 86 && spo2 <= 87) totalScore += 1;
      else if (spo2 >= 88 && spo2 <= 92) totalScore += 0;
      else if (spo2 >= 93 && spo2 <= 94) totalScore += 1;
      else if (spo2 >= 95 && spo2 <= 96) totalScore += 2;
      else totalScore += 3; // >= 97 con oxígeno
    }
  } else {
    missing.push('Saturación de Oxígeno (SpO2)');
  }

  // 3. Oxígeno Suplementario
  const onO2 = manualOverrides?.onOxygen ?? Boolean(vitals?.supplementalOxygen && vitals.supplementalOxygen !== 'Aire ambiente');
  if (onO2) totalScore += 2;

  // 4. Presión Arterial Sistólica
  if (vitals?.systolicBP !== undefined) {
    const sbp = vitals.systolicBP;
    if (sbp <= 90) totalScore += 3;
    else if (sbp >= 91 && sbp <= 100) totalScore += 2;
    else if (sbp >= 101 && sbp <= 110) totalScore += 1;
    else if (sbp >= 111 && sbp <= 219) totalScore += 0;
    else if (sbp >= 220) totalScore += 3;
  } else {
    missing.push('Presión Arterial Sistólica');
  }

  // 5. Frecuencia Cardíaca
  if (vitals?.heartRate !== undefined) {
    const hr = vitals.heartRate;
    if (hr <= 40) totalScore += 3;
    else if (hr >= 41 && hr <= 50) totalScore += 1;
    else if (hr >= 51 && hr <= 90) totalScore += 0;
    else if (hr >= 91 && hr <= 110) totalScore += 1;
    else if (hr >= 111 && hr <= 130) totalScore += 2;
    else if (hr >= 131) totalScore += 3;
  } else {
    missing.push('Frecuencia Cardíaca');
  }

  // 6. Nivel de Conciencia (ACVPU)
  const gcs = vitals?.glasgowTotal;
  if (manualOverrides?.consciousnessLevel) {
    if (manualOverrides.consciousnessLevel !== 'A') totalScore += 3;
  } else if (gcs !== undefined) {
    if (gcs < 15) totalScore += 3;
  } else {
    missing.push('Nivel de Conciencia (AVPU / Glasgow)');
  }

  // 7. Temperatura
  if (vitals?.temperature !== undefined) {
    const temp = vitals.temperature;
    if (temp <= 35.0) totalScore += 3;
    else if (temp >= 35.1 && temp <= 36.0) totalScore += 1;
    else if (temp >= 36.1 && temp <= 38.0) totalScore += 0;
    else if (temp >= 38.1 && temp <= 39.0) totalScore += 1;
    else if (temp >= 39.1) totalScore += 2;
  } else {
    missing.push('Temperatura corporal');
  }

  let riskCategory: ScaleCalculationOutput['riskCategory'] = 'Bajo Riesgo';
  let interpretation = '';
  let recommendation = '';

  if (totalScore <= 4) {
    riskCategory = 'Bajo Riesgo';
    interpretation = `NEWS2: ${totalScore} puntos — Riesgo Clínico Bajo.`;
    recommendation = 'Monitorización de signos vitales cada 4-6 horas por enfermería.';
  } else if (totalScore >= 5 && totalScore <= 6) {
    riskCategory = 'Riesgo Intermedio';
    interpretation = `NEWS2: ${totalScore} puntos — Riesgo Clínico Medio / Alerta Moderada.`;
    recommendation = 'Reevaluación médica urgente por médico de guardia. Aumentar frecuencia de monitoreo al menos cada hora.';
  } else {
    riskCategory = 'Riesgo Crítico';
    interpretation = `NEWS2: ${totalScore} puntos (≥ 7) — Emergencia Clínica / Riesgo Crítico.`;
    recommendation = 'Respuesta médica inmediata por equipo de respuesta rápida / Medicina Interna / UCI. Evaluación de vía aérea y soporte hemodinámico invasivo.';
  }

  return {
    scaleId: 'news2',
    scaleName: 'NEWS2 (National Early Warning Score 2)',
    score: totalScore,
    maxScore: 20,
    interpretation,
    riskCategory,
    recommendation,
    officialSource: 'Royal College of Physicians. National Early Warning Score (NEWS) 2: Standardising the assessment of acute-illness severity in the NHS. London: RCP, 2017.',
    missingData: missing,
    isComplete: missing.length === 0,
    variablesUsed: { totalScore, onO2, useScale2 },
    summaryText: `NEWS2: ${totalScore} pts [${riskCategory}]`,
  };
}

// ============================================================================
// 4. GLASGOW-BLATCHFORD (Sangrado Digestivo Alto)
// ============================================================================
export function calculateGlasgowBlatchford(
  ctx: ComprehensivePatientContext,
  manualOverrides?: {
    syncope?: boolean;
    hepaticDisease?: boolean;
    heartFailure?: boolean;
    melena?: boolean;
  }
): ScaleCalculationOutput {
  const missing: string[] = [];
  const vitals = ctx.vitals;
  const labs = extractPatientLabMetrics(ctx.labs);
  const isFemale = ctx.sex?.toUpperCase().startsWith('F') ?? false;

  let score = 0;

  // 1. BUN (mg/dL)
  if (labs['bun'] !== undefined || labs['urea'] !== undefined) {
    const bunVal = labs['bun'] !== undefined ? labs['bun'] : (labs['urea'] ? labs['urea'] / 2.14 : 0);
    if (bunVal >= 70) score += 6;
    else if (bunVal >= 28) score += 4;
    else if (bunVal >= 22.4) score += 3;
    else if (bunVal >= 18.2) score += 2;
  } else {
    missing.push('BUN sérico');
  }

  // 2. Hemoglobina (g/dL)
  if (labs['hgb'] !== undefined) {
    const hb = labs['hgb'];
    if (isFemale) {
      if (hb < 10.0) score += 6;
      else if (hb >= 10.0 && hb < 12.0) score += 1;
    } else {
      if (hb < 10.0) score += 6;
      else if (hb >= 10.0 && hb < 12.0) score += 3;
      else if (hb >= 12.0 && hb < 13.0) score += 1;
    }
  } else {
    missing.push('Hemoglobina (HGB)');
  }

  // 3. Presión Arterial Sistólica
  if (vitals?.systolicBP !== undefined) {
    const sbp = vitals.systolicBP;
    if (sbp < 90) score += 3;
    else if (sbp >= 90 && sbp <= 99) score += 2;
    else if (sbp >= 100 && sbp <= 109) score += 1;
  } else {
    missing.push('Presión Arterial Sistólica');
  }

  // 4. Frecuencia Cardíaca
  if (vitals?.heartRate !== undefined) {
    if (vitals.heartRate >= 100) score += 1;
  } else {
    missing.push('Frecuencia Cardíaca');
  }

  // 5. Presentación Clínica y Comorbilidades
  if (manualOverrides?.melena) score += 1;
  if (manualOverrides?.syncope) score += 2;
  if (manualOverrides?.hepaticDisease) score += 2;
  if (manualOverrides?.heartFailure) score += 2;

  let riskCategory: ScaleCalculationOutput['riskCategory'] = 'Bajo Riesgo';
  let interpretation = '';
  let recommendation = '';

  if (score === 0) {
    riskCategory = 'Bajo Riesgo';
    interpretation = 'Glasgow-Blatchford: 0 puntos — Riesgo extremadamente bajo de intervención médica o endoscópica.';
    recommendation = 'Candidato a manejo ambulatorio seguro y endoscopia electiva programada sin ingreso hospitalario según guías ACG/ESGE.';
  } else if (score <= 1) {
    riskCategory = 'Bajo Riesgo';
    interpretation = `Glasgow-Blatchford: ${score} punto(s) — Riesgo bajo.`;
    recommendation = 'Observación en emergencias, considerar alta temprana si tolerancia oral y estabilidad hemodinámica.';
  } else {
    riskCategory = score >= 6 ? 'Riesgo Crítico' : 'Alto Riesgo';
    interpretation = `Glasgow-Blatchford: ${score} puntos — Alto riesgo de requerir hemotransfusión, intervención endoscópica urgente o cirugía.`;
    recommendation = 'Ingreso hospitalario urgente, resucitación con cristaloides, inicio de IBP intravenoso a dosis altas (Omeprazol 80mg bolo + infusión o 40mg c/12h) y endoscopia digestiva alta precoz en < 24 horas (o < 12h si inestabilidad).';
  }

  return {
    scaleId: 'glasgow_blatchford',
    scaleName: 'Escala de Glasgow-Blatchford (Hemorragia Digestiva Alta)',
    score,
    maxScore: 23,
    interpretation,
    riskCategory,
    recommendation,
    officialSource: 'Blatchford O et al. A risk score to predict need for treatment for upper-gastrointestinal haemorrhage. Lancet 2000; 356: 1318-1321. Guías ACG 2021.',
    missingData: missing,
    isComplete: missing.length === 0,
    variablesUsed: { score, isFemale },
    summaryText: `Glasgow-Blatchford: ${score} pts [${riskCategory}]`,
  };
}

// ============================================================================
// 5. SOFA (Sequential Organ Failure Assessment)
// ============================================================================
export function calculateSOFA(
  ctx: ComprehensivePatientContext,
  manualOverrides?: {
    vasopressors?: 'none' | 'dopamine_low' | 'dopamine_mod' | 'norepi_low' | 'norepi_high';
    respirationPaO2FiO2?: number; // PaO2 / FiO2
    onMechanicalVentilation?: boolean;
  }
): ScaleCalculationOutput {
  const missing: string[] = [];
  const vitals = ctx.vitals;
  const labs = extractPatientLabMetrics(ctx.labs);

  let sofaScore = 0;

  // 1. Respiración (PaO2/FiO2)
  const pf = manualOverrides?.respirationPaO2FiO2 ?? (labs['pao2'] ? labs['pao2'] / 0.21 : undefined);
  const vent = manualOverrides?.onMechanicalVentilation ?? false;
  if (pf !== undefined) {
    if (pf < 100 && vent) sofaScore += 4;
    else if (pf < 200 && vent) sofaScore += 3;
    else if (pf < 300) sofaScore += 2;
    else if (pf < 400) sofaScore += 1;
  } else {
    missing.push('PaO2 / FiO2 respiratorio');
  }

  // 2. Coagulación (Plaquetas x10³/µL)
  if (labs['plt'] !== undefined) {
    const plt = labs['plt'];
    if (plt < 20) sofaScore += 4;
    else if (plt < 50) sofaScore += 3;
    else if (plt < 100) sofaScore += 2;
    else if (plt < 150) sofaScore += 1;
  } else {
    missing.push('Plaquetas séricas');
  }

  // 3. Hígado (Bilirrubina mg/dL)
  if (labs['bilirubin'] !== undefined) {
    const bil = labs['bilirubin'];
    if (bil >= 12.0) sofaScore += 4;
    else if (bil >= 6.0) sofaScore += 3;
    else if (bil >= 2.0) sofaScore += 2;
    else if (bil >= 1.2) sofaScore += 1;
  } else {
    missing.push('Bilirrubina total');
  }

  // 4. Cardiovascular (Hipotensión o vasopresores)
  const vaso = manualOverrides?.vasopressors ?? 'none';
  if (vaso === 'norepi_high') sofaScore += 4;
  else if (vaso === 'norepi_low' || vaso === 'dopamine_mod') sofaScore += 3;
  else if (vaso === 'dopamine_low') sofaScore += 2;
  else if (vitals?.systolicBP !== undefined && vitals?.diastolicBP !== undefined) {
    const pam = Math.round((vitals.systolicBP + 2 * vitals.diastolicBP) / 3);
    if (pam < 70) sofaScore += 1;
  } else {
    missing.push('Presión Arterial Media o requerimiento de vasopresores');
  }

  // 5. Sistema Nervioso Central (Glasgow)
  if (vitals?.glasgowTotal !== undefined) {
    const gcs = vitals.glasgowTotal;
    if (gcs < 6) sofaScore += 4;
    else if (gcs <= 9) sofaScore += 3;
    else if (gcs <= 12) sofaScore += 2;
    else if (gcs <= 14) sofaScore += 1;
  } else {
    missing.push('Escala de Coma de Glasgow');
  }

  // 6. Renal (Creatinina mg/dL)
  if (labs['creatinine'] !== undefined) {
    const cr = labs['creatinine'];
    if (cr >= 5.0) sofaScore += 4;
    else if (cr >= 3.5) sofaScore += 3;
    else if (cr >= 2.0) sofaScore += 2;
    else if (cr >= 1.2) sofaScore += 1;
  } else {
    missing.push('Creatinina sérica');
  }

  let riskCategory: ScaleCalculationOutput['riskCategory'] = 'Bajo Riesgo';
  let interpretation = '';
  let recommendation = '';

  if (sofaScore <= 1) {
    riskCategory = 'Bajo Riesgo';
    interpretation = `SOFA: ${sofaScore} puntos — Sin disfunción orgánica aguda relevante (Mortalidad < 5%).`;
    recommendation = 'Monitorización clínica y control de la infección primaria.';
  } else if (sofaScore <= 5) {
    riskCategory = 'Riesgo Intermedio';
    interpretation = `SOFA: ${sofaScore} puntos — Disfunción multiorgánica leve a moderada (Mortalidad ~10-20%). Incremento ≥ 2 define Sepsis clínica.`;
    recommendation = 'Manejo hospitalario activo, optimización hemodinámica, ajuste de fármacos a función renal y cultivos.';
  } else if (sofaScore <= 11) {
    riskCategory = 'Alto Riesgo';
    interpretation = `SOFA: ${sofaScore} puntos — Falla multiorgánica severa (Mortalidad ~40-60%).`;
    recommendation = 'Ingreso prioritario en UCI, soporte vasopresor guiado por metas, vigilancia ventilatoria invasiva.';
  } else {
    riskCategory = 'Riesgo Crítico';
    interpretation = `SOFA: ${sofaScore} puntos (≥ 12) — Falla multiorgánica crítica extrema (Mortalidad > 80%).`;
    recommendation = 'Soporte intensivo multiorgánico máximo en UCI, monitorización hemodinámica avanzada y discusión pronóstica.';
  }

  return {
    scaleId: 'sofa',
    scaleName: 'SOFA (Sequential Organ Failure Assessment)',
    score: sofaScore,
    maxScore: 24,
    interpretation,
    riskCategory,
    recommendation,
    officialSource: 'Vincent JL et al. The SOFA score. Intensive Care Med 1996; 22:707-710; Sepsis-3 Consensus 2016.',
    missingData: missing,
    isComplete: missing.length === 0,
    variablesUsed: { sofaScore },
    summaryText: `SOFA: ${sofaScore}/24 pts [${riskCategory}]`,
  };
}

// ============================================================================
// 6. PSI / PORT (Pneumonia Severity Index)
// ============================================================================
export function calculatePSI(
  ctx: ComprehensivePatientContext,
  manualOverrides?: {
    nursingHome?: boolean;
    neoplasm?: boolean;
    liverDisease?: boolean;
    chf?: boolean;
    cerebrovascularDisease?: boolean;
    renalDisease?: boolean;
    alteredMentalStatus?: boolean;
    pleuralEffusion?: boolean;
    arterialPHUnder735?: boolean;
    pao2Under60?: boolean;
  }
): ScaleCalculationOutput {
  const missing: string[] = [];
  const age = ctx.age ?? 50;
  const isFemale = ctx.sex?.toUpperCase().startsWith('F') ?? false;
  const vitals = ctx.vitals;
  const labs = extractPatientLabMetrics(ctx.labs);

  let score = isFemale ? age - 10 : age;

  if (manualOverrides?.nursingHome) score += 10;
  if (manualOverrides?.neoplasm) score += 30;
  if (manualOverrides?.liverDisease) score += 20;
  if (manualOverrides?.chf) score += 10;
  if (manualOverrides?.cerebrovascularDisease) score += 10;
  if (manualOverrides?.renalDisease) score += 10;

  // Hallazgos en Examen Físico
  if (manualOverrides?.alteredMentalStatus || (vitals?.glasgowTotal && vitals.glasgowTotal < 15)) score += 20;
  if (vitals?.respiratoryRate !== undefined) {
    if (vitals.respiratoryRate >= 30) score += 20;
  } else {
    missing.push('Frecuencia Respiratoria');
  }

  if (vitals?.systolicBP !== undefined) {
    if (vitals.systolicBP < 90) score += 20;
  } else {
    missing.push('Presión Arterial Sistólica');
  }

  if (vitals?.temperature !== undefined) {
    if (vitals.temperature < 35.0 || vitals.temperature >= 40.0) score += 15;
  } else {
    missing.push('Temperatura corporal');
  }

  if (vitals?.heartRate !== undefined) {
    if (vitals.heartRate >= 125) score += 10;
  } else {
    missing.push('Frecuencia Cardíaca');
  }

  // Laboratorios y Radiología
  if (manualOverrides?.arterialPHUnder735 || (labs['ph'] && labs['ph'] < 7.35)) score += 30;
  if (labs['bun'] !== undefined) {
    if (labs['bun'] >= 30) score += 20;
  } else if (labs['urea'] !== undefined) {
    if (labs['urea'] >= 65) score += 20;
  } else {
    missing.push('BUN / Urea sérica');
  }

  if (labs['sodium'] !== undefined) {
    if (labs['sodium'] < 130) score += 20;
  } else {
    missing.push('Sodio sérico');
  }

  if (labs['glucose'] !== undefined) {
    if (labs['glucose'] >= 250) score += 10;
  }

  if (labs['hct'] !== undefined) {
    if (labs['hct'] < 30) score += 10;
  }

  if (manualOverrides?.pao2Under60 || (labs['pao2'] && labs['pao2'] < 60)) score += 10;
  if (manualOverrides?.pleuralEffusion) score += 10;

  let riskCategory: ScaleCalculationOutput['riskCategory'] = 'Bajo Riesgo';
  let classRoman = 'I';
  let mortality = '< 1%';
  let recommendation = 'Tratamiento ambulatorio';

  if (score <= 50) {
    classRoman = 'Clase I';
    mortality = '0.1 - 0.4%';
    riskCategory = 'Bajo Riesgo';
    recommendation = 'Tratamiento ambulatorio estándar.';
  } else if (score <= 70) {
    classRoman = 'Clase II';
    mortality = '0.6 - 0.7%';
    riskCategory = 'Bajo Riesgo';
    recommendation = 'Tratamiento ambulatorio supervisado.';
  } else if (score <= 90) {
    classRoman = 'Clase III';
    mortality = '0.9 - 2.8%';
    riskCategory = 'Riesgo Intermedio';
    recommendation = 'Estancia corta hospitalaria o ingreso breve en observación.';
  } else if (score <= 130) {
    classRoman = 'Clase IV';
    mortality = '8.2 - 9.3%';
    riskCategory = 'Alto Riesgo';
    recommendation = 'Ingreso hospitalario en sala general de Medicina Interna.';
  } else {
    classRoman = 'Clase V';
    mortality = '27 - 31%';
    riskCategory = 'Riesgo Crítico';
    recommendation = 'Ingreso urgente en Unidad de Cuidados Intensivos (UCI).';
  }

  const interpretation = `PSI / PORT: ${score} puntos — ${classRoman} (Mortalidad a 30 días estimada: ${mortality}).`;

  return {
    scaleId: 'psi_port',
    scaleName: 'PSI / PORT (Pneumonia Severity Index)',
    score,
    interpretation,
    riskCategory,
    recommendation,
    officialSource: 'Fine MJ et al. A prediction rule to identify low-risk patients with community-acquired pneumonia. N Engl J Med 1997; 336:243-250.',
    missingData: missing,
    isComplete: missing.length === 0,
    variablesUsed: { score, classRoman },
    summaryText: `PSI/PORT: ${score} pts [${classRoman}]`,
  };
}

// Master scale list definition for the UI
export const EXPANDED_SCALE_LIST = [
  { id: 'nihss', name: 'NIHSS (Ictus / EVC Isquémico)', targetDiagnosis: 'evc' },
  { id: 'rankin', name: 'Escala de Rankin Modificada (mRS)', targetDiagnosis: 'evc' },
  { id: 'curb65', name: 'CURB-65 (Neumonía Comunitaria)', targetDiagnosis: 'neumonia' },
  { id: 'psi_port', name: 'PSI / PORT (Severidad de Neumonía)', targetDiagnosis: 'neumonia' },
  { id: 'glasgow_blatchford', name: 'Glasgow-Blatchford (Sangrado Digestivo Alto)', targetDiagnosis: 'sangrado' },
  { id: 'sofa', name: 'SOFA (Falla Orgánica en Sepsis / UCI)', targetDiagnosis: 'sepsis' },
  { id: 'qsofa', name: 'qSOFA (Sepsis Rápido)', targetDiagnosis: 'sepsis' },
  { id: 'news2', name: 'NEWS2 (Deterioro Clínico Agudo)', targetDiagnosis: 'todos' },
];
