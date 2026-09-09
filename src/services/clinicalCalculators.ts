/**
 * Calculadoras y Escalas Clínicas para Medicina Interna y Emergencias
 * Hospital Regional Ángel María Gatón — Dr. Colón
 */

export interface CalculatorResult {
  title: string;
  score?: number | string;
  interpretation: string;
  recommendation: string;
  criteriaMet?: string[];
}

// 1. Tasa de Filtración Glomerular (CKD-EPI 2021)
export function calculateCKDEPI(creatinine: number, age: number, isFemale: boolean): CalculatorResult {
  const kappa = isFemale ? 0.7 : 0.9;
  const alpha = isFemale ? -0.241 : -0.302;
  const minCr = Math.min(creatinine / kappa, 1);
  const maxCr = Math.max(creatinine / kappa, 1);
  
  const gfr = 142 * Math.pow(minCr, alpha) * Math.pow(maxCr, -1.200) * Math.pow(0.9938, age) * (isFemale ? 1.012 : 1);
  const rounded = Math.round(gfr * 10) / 10;
  
  let stage = '';
  let recommendation = '';
  if (rounded >= 90) {
    stage = 'G1: Función renal normal o elevada';
    recommendation = 'Monitoreo habitual. Ajuste de fármacos no requerido en su mayoría.';
  } else if (rounded >= 60) {
    stage = 'G2: Disminución leve de la TFG';
    recommendation = 'Evaluar albuminuria y factores de riesgo cardiovascular. Ajuste de algunos nefrotóxicos.';
  } else if (rounded >= 45) {
    stage = 'G3a: Disminución leve a moderada';
    recommendation = 'Requerido ajuste de dosis en antibióticos (ej. enoxaparina, vancomicina, quinolonas).';
  } else if (rounded >= 30) {
    stage = 'G3b: Disminución moderada a severa';
    recommendation = 'Ajuste estricto de dosis farmacológicas. Evitar AINEs y contrastes yodados.';
  } else if (rounded >= 15) {
    stage = 'G4: Disminución severa';
    recommendation = 'Riesgo alto de uremia. Preparación para terapia de reemplazo renal y ajuste renal extremo.';
  } else {
    stage = 'G5: Falla renal / Enfermedad renal terminal';
    recommendation = 'Criterios de diálisis de urgencia (AEIOU). Ajustar todos los fármacos de eliminación renal.';
  }

  return {
    title: 'Filtrado Glomerular (CKD-EPI 2021)',
    score: `${rounded} mL/min/1.73 m²`,
    interpretation: stage,
    recommendation,
  };
}

// 2. Presión Arterial Media (PAM)
export function calculateMAP(systolic: number, diastolic: number): CalculatorResult {
  const map = Math.round((systolic + 2 * diastolic) / 3);
  let interpretation = '';
  let recommendation = '';

  if (map < 65) {
    interpretation = 'PAM baja (< 65 mmHg) — Riesgo de hipoperfusión tisular';
    recommendation = 'Meta de resucitación hemodinámica: fluidoterapia guiada o inicio de vasopresores (Norepinefrina).';
  } else if (map <= 100) {
    interpretation = 'PAM normal (65 - 100 mmHg) — Perfusión tisular adecuada';
    recommendation = 'Mantener vigilancia hemodinámica periódica.';
  } else {
    interpretation = 'PAM elevada (> 100 mmHg)';
    recommendation = 'Descartar emergencia/urgencia hipertensiva según compromiso de órgano blanco.';
  }

  return {
    title: 'Presión Arterial Media (PAM)',
    score: `${map} mmHg`,
    interpretation,
    recommendation,
  };
}

// 3. Anion Gap y Corrección de Albúmina
export function calculateAnionGap(na: number, cl: number, hco3: number, albumin?: number): CalculatorResult {
  let ag = na - (cl + hco3);
  let correctedAg = ag;
  let text = `Anion Gap calculado: ${ag} mEq/L (Normal: 8-12 mEq/L).`;

  if (albumin !== undefined && albumin < 4) {
    correctedAg = ag + 2.5 * (4 - albumin);
    text += ` Corregido por albúmina (${albumin} g/dL): ${Math.round(correctedAg * 10) / 10} mEq/L.`;
  }

  let interpretation = '';
  let recommendation = '';
  if (correctedAg > 12) {
    interpretation = 'Anion Gap Elevado — Acidosis metabólica de brecha aniónica aumentada (MUDPILES / GOLDMARK)';
    recommendation = 'Descartar: Cetoacidosis (diabética/alcohólica), Acidosis láctica, Uremia, Intoxicaciones (salicilatos, metanol, etilenglicol).';
  } else if (correctedAg < 8) {
    interpretation = 'Anion Gap Disminuido (< 8 mEq/L)';
    recommendation = 'Causas: Hipoalbuminemia severa, mieloma múltiple, hipercalcemia o hipermagnesemia.';
  } else {
    interpretation = 'Anion Gap Normal (8 - 12 mEq/L) — Acidosis hiperclorémica';
    recommendation = 'Descartar: Pérdidas gastrointestinales (diarreas), acidosis tubular renal, infusión masiva de SS 0.9%.';
  }

  return {
    title: 'Anion Gap Sérico',
    score: `${Math.round(correctedAg * 10) / 10} mEq/L`,
    interpretation,
    recommendation,
  };
}

// 4. Corrección de Calcio por Albúmina
export function calculateCorrectedCalcium(calcium: number, albumin: number): CalculatorResult {
  const corrected = Math.round((calcium + 0.8 * (4.0 - albumin)) * 10) / 10;
  let interpretation = '';
  let recommendation = '';

  if (corrected < 8.5) {
    interpretation = 'Hipocalcemia corregida (< 8.5 mg/dL)';
    recommendation = 'Evaluar signos de Chvostek/Trousseau, ECG (intervalo QTc) y niveles de Magnesio / PTH.';
  } else if (corrected <= 10.5) {
    interpretation = 'Normocalcemia corregida (8.5 - 10.5 mg/dL)';
    recommendation = 'Niveles fisiológicos estables.';
  } else {
    interpretation = 'Hipercalcemia corregida (> 10.5 mg/dL)';
    recommendation = 'Descartar hiperparatiroidismo primario o neoplasia oculta. Hidratación vigorosa con SS 0.9%.';
  }

  return {
    title: 'Calcio Corregido por Albúmina',
    score: `${corrected} mg/dL`,
    interpretation,
    recommendation,
  };
}

// 5. Corrección de Sodio en Hiperglicemia
export function calculateCorrectedSodium(measuredNa: number, glucose: number): CalculatorResult {
  const correctedNa = Math.round((measuredNa + 0.016 * (glucose - 100)) * 10) / 10;
  return {
    title: 'Sodio Corregido por Glucosa (Fórmula de Katz)',
    score: `${correctedNa} mEq/L`,
    interpretation: `Na medido: ${measuredNa} mEq/L con Glicemia de ${glucose} mg/dL.`,
    recommendation: 'Usar este valor para calcular la osmolaridad efectiva y el déficit de agua libre en cetoacidosis o estado hiperosmolar.',
  };
}

// 6. Déficit de Agua Libre en Hipernatremia
export function calculateFreeWaterDeficit(weightKg: number, currentNa: number, isFemale: boolean, isElderly: boolean): CalculatorResult {
  let factor = isFemale ? (isElderly ? 0.45 : 0.5) : (isElderly ? 0.5 : 0.6);
  const act = weightKg * factor;
  const deficit = Math.round((act * ((currentNa / 140) - 1)) * 10) / 10;

  return {
    title: 'Déficit de Agua Libre',
    score: `${deficit > 0 ? deficit : 0} Litros`,
    interpretation: `Agua Corporal Total estimada: ${Math.round(act * 10) / 10} L.`,
    recommendation: 'Reponer el déficit en 48-72 horas. No descender el Na plasmático más de 10-12 mEq/L en 24h para prevenir edema cerebral.',
  };
}

// 7. Intervalo QTc (Bazett)
export function calculateQTc(qtMs: number, heartRate: number): CalculatorResult {
  const rrSeconds = 60 / heartRate;
  const qtc = Math.round(qtMs / Math.sqrt(rrSeconds));
  let interpretation = '';
  let recommendation = '';

  if (qtc > 500) {
    interpretation = 'QTc marcadamente prolongado (> 500 ms) — Alto riesgo de Torsades de Pointes';
    recommendation = 'Suspender fármacos que prolonguen el QT (antiarrítmicos, macrólidos, fluoroquinolonas, ondansetrón). Corregir K+ y Mg2+.';
  } else if (qtc > 450) {
    interpretation = 'QTc limítrofe / prolongado (450 - 500 ms)';
    recommendation = 'Monitoreo electrocardiográfico periódico y vigilar electrolitos séricos.';
  } else {
    interpretation = 'QTc dentro de límites normales (< 450 ms)';
    recommendation = 'Sin riesgo evidente de arritmias ventriculares por intervalo QT.';
  }

  return {
    title: 'Intervalo QTc Corregido (Bazett)',
    score: `${qtc} ms`,
    interpretation,
    recommendation,
  };
}

// ==========================================
// ESCALAS CLÍNICAS SEGÚN DIAGNÓSTICO
// ==========================================

export interface ClinicalScaleDefinition {
  id: string;
  name: string;
  associatedDiagnoses: string[]; // términos que activan la escala
  description: string;
  items: {
    id: string;
    label: string;
    points: number;
  }[];
  interpret: (score: number) => { risk: string; recommendation: string; level: 'verde' | 'amarillo' | 'naranja' | 'rojo' };
}

export const CLINICAL_SCALES: ClinicalScaleDefinition[] = [
  // 1. CURB-65 (Neumonía Adquirida en la Comunidad)
  {
    id: 'curb65',
    name: 'CURB-65 (Neumonía Adquirida en la Comunidad)',
    associatedDiagnoses: ['neumonia', 'neumonía', 'nac', 'infeccion respiratoria baja', 'condensacion pulmonar'],
    description: 'Estratificación de severidad y mortalidad a 30 días en Neumonía Adquirida en la Comunidad.',
    items: [
      { id: 'c', label: 'C — Confusión mental aguda (AMTS ≤ 8 o desorientación)', points: 1 },
      { id: 'u', label: 'U — Urea > 7 mmol/L (> 19 mg/dL) o BUN > 20 mg/dL', points: 1 },
      { id: 'r', label: 'R — Frecuencia respiratoria ≥ 30 rpm', points: 1 },
      { id: 'b', label: 'B — Presión arterial Sistólica < 90 mmHg o Diastólica ≤ 60 mmHg', points: 1 },
      { id: '65', label: '65 — Edad ≥ 65 años', points: 1 },
    ],
    interpret: (score: number) => {
      if (score === 0 || score === 1) {
        return {
          risk: `Bajo riesgo (Mortalidad ~1.5%). Puntuación: ${score}`,
          recommendation: 'Tratamiento ambulatorio seguro salvo factores sociales o hipoxemia.',
          level: 'verde',
        };
      } else if (score === 2) {
        return {
          risk: `Riesgo intermedio (Mortalidad ~9.2%). Puntuación: ${score}`,
          recommendation: 'Considerar ingreso hospitalario en sala general o estancia corta supervisada.',
          level: 'amarillo',
        };
      } else {
        return {
          risk: `Alto riesgo (Mortalidad 15 - 40%). Puntuación: ${score}`,
          recommendation: 'Ingreso hospitalario urgente. Evaluar criterios de UCI si score ≥ 3.',
          level: 'rojo',
        };
      }
    },
  },

  // 2. Escala de Wells para Tromboembolismo Pulmonar (TEP)
  {
    id: 'wells_tep',
    name: 'Escala de Wells para TEP (Tromboembolismo Pulmonar)',
    associatedDiagnoses: ['tep', 'tromboembolismo', 'embolia pulmonar', 'embolismo', 'disnea subita'],
    description: 'Probabilidad clínica pretest para Tromboembolia Pulmonar.',
    items: [
      { id: 'signs_tvp', label: 'Signos clínicos y síntomas de TVP (edema unilateral, dolor a la palpación)', points: 3 },
      { id: 'alt_diag', label: 'Diagnóstico alternativo menos probable que TEP', points: 3 },
      { id: 'fc100', label: 'Frecuencia cardíaca > 100 lpm', points: 1.5 },
      { id: 'immo', label: 'Inmovilización ≥ 3 días o cirugía en las últimas 4 semanas', points: 1.5 },
      { id: 'prev_tvp_tep', label: 'Antecedente previo de TVP o TEP documentado', points: 1.5 },
      { id: 'hemoptysis', label: 'Hemoptisis', points: 1 },
      { id: 'cancer', label: 'Cáncer activo (tratamiento en los últimos 6 meses o paliativo)', points: 1 },
    ],
    interpret: (score: number) => {
      if (score <= 4) {
        return {
          risk: `TEP Poco Probable (Score: ${score}).`,
          recommendation: 'Solicitar Dímero D de alta sensibilidad. Si es negativo descarta TEP; si es positivo realizar Angio-TC.',
          level: 'amarillo',
        };
      } else {
        return {
          risk: `TEP Probable / Alta probabilidad clínica (Score: ${score}).`,
          recommendation: 'Realizar Angio-TC de tórax directamente e iniciar anticoagulación precoz si no hay contraindicaciones.',
          level: 'rojo',
        };
      }
    },
  },

  // 3. CHA2DS2-VASc (Riesgo tromboembólico en Fibrilación Auricular)
  {
    id: 'cha2ds2vasc',
    name: 'CHA₂DS₂-VASc (Riesgo de ACV en Fibrilación Auricular)',
    associatedDiagnoses: ['fa', 'fibrilacion auricular', 'flutter auricular', 'arritmia'],
    description: 'Estratificación del riesgo anual de ictus isquémico e indicación de anticoagulación oral.',
    items: [
      { id: 'c', label: 'C — Insuficiencia cardíaca congestiva / FEVI ≤ 40%', points: 1 },
      { id: 'h', label: 'H — Hipertensión arterial sistémica', points: 1 },
      { id: 'a2', label: 'A₂ — Edad ≥ 75 años', points: 2 },
      { id: 'd', label: 'D — Diabetes Mellitus', points: 1 },
      { id: 's2', label: 'S₂ — Antecedente de ACV, AIT o tromboembolismo previo', points: 2 },
      { id: 'v', label: 'V — Enfermedad vascular (infarto previo, EAP, placa aórtica)', points: 1 },
      { id: 'a', label: 'A — Edad 65 a 74 años', points: 1 },
      { id: 'sc', label: 'Sc — Sexo femenino', points: 1 },
    ],
    interpret: (score: number) => {
      if (score === 0) {
        return {
          risk: `Bajo riesgo tromboembólico (Score: ${score}).`,
          recommendation: 'No se recomienda terapia antitrombótica.',
          level: 'verde',
        };
      } else if (score === 1) {
        return {
          risk: `Riesgo moderado (Score: ${score}).`,
          recommendation: 'Considerar anticoagulación oral (DOACs preferidos) según evaluación individualizada y sexo.',
          level: 'amarillo',
        };
      } else {
        return {
          risk: `Alto riesgo tromboembólico (Score: ${score} puntos). Riesgo anual de ictus > 2.2 - 15%.`,
          recommendation: 'Indicación formal de anticoagulación oral plena (DOACs: Apixabán, Rivaroxabán, Dabigatrán, o Warfarina).',
          level: 'rojo',
        };
      }
    },
  },

  // 4. qSOFA (Quick SOFA para Sepsis)
  {
    id: 'qsofa',
    name: 'qSOFA (Sospecha de Sepsis en Emergencia/Sala)',
    associatedDiagnoses: ['sepsis', 'shock septico', 'bacteriemia', 'infeccion', 'sirs', 'foco septico'],
    description: 'Identificación rápida a la cabecera del paciente con sospecha de infección y alto riesgo de deterioro.',
    items: [
      { id: 'resp', label: 'Frecuencia respiratoria ≥ 22 rpm', points: 1 },
      { id: 'mental', label: 'Alteración del estado mental (Glasgow < 15)', points: 1 },
      { id: 'bp', label: 'Presión arterial sistólica ≤ 100 mmHg', points: 1 },
    ],
    interpret: (score: number) => {
      if (score >= 2) {
        return {
          risk: `qSOFA Positivo (Score: ${score} ≥ 2). Alto riesgo de mortalidad hospitalaria.`,
          recommendation: 'Activar paquete de Sepsis: Hemocultivos x2, Lactato sérico, Antibioticoterapia de amplio espectro en la 1ª hora, fluidoterapia 30 mL/kg si hay hipotensión.',
          level: 'rojo',
        };
      } else {
        return {
          risk: `qSOFA Negativo (Score: ${score}).`,
          recommendation: 'Continuar monitoreo de signos vitales y buscar foco infeccioso.',
          level: 'verde',
        };
      }
    },
  },

  // 5. Criterios de Framingham para Insuficiencia Cardíaca
  {
    id: 'framingham_ic',
    name: 'Criterios de Framingham (Insuficiencia Cardíaca)',
    associatedDiagnoses: ['insuficiencia cardiaca', 'falla cardiaca', 'edema agudo de pulmon', 'ic', 'disnea paroxistica'],
    description: 'Diagnóstico clínico de Insuficiencia Cardíaca (Requiere 2 criterios mayores o 1 mayor + 2 menores).',
    items: [
      // Mayores
      { id: 'dpn', label: '[Mayor] Disnea paroxística nocturna u ortopnea', points: 2 },
      { id: 'ingurgitacion', label: '[Mayor] Ingurgitación yugular patológica', points: 2 },
      { id: 'estertores', label: '[Mayor] Estertores crepitantes pulmonares basales', points: 2 },
      { id: 'cardiomegalia', label: '[Mayor] Cardiomegalia en Radiografía de tórax', points: 2 },
      { id: 'edema_pulm', label: '[Mayor] Edema agudo de pulmón', points: 2 },
      { id: 'tercer_tono', label: '[Mayor] Ritmo de galope por tercer tono (S3)', points: 2 },
      { id: 'reflujo_hepato', label: '[Mayor] Reflujo hepatoyugular positivo', points: 2 },
      // Menores
      { id: 'edema_mmii', label: '[Menor] Edema bilateral de miembros inferiores', points: 1 },
      { id: 'tos_nocturna', label: '[Menor] Tos nocturna', points: 1 },
      { id: 'disnea_esfuerzo', label: '[Menor] Disnea de medianos/pequeños esfuerzos', points: 1 },
      { id: 'hepatomegalia', label: '[Menor] Hepatomegalia dolorosa o congestiva', points: 1 },
      { id: 'derrame_pleural', label: '[Menor] Derrame pleural', points: 1 },
      { id: 'taquicardia', label: '[Menor] Frecuencia cardíaca > 120 lpm', points: 1 },
    ],
    interpret: (score: number) => {
      if (score >= 4) {
        return {
          risk: `Criterios Diagnósticos Cumplidos para Falla Cardíaca (Score: ${score}).`,
          recommendation: 'Iniciar manejo de congestión: Furosemida IV, restricción hídrica, monitoreo de diuresis, ECG y Péptido Natriurético (BNP/NT-proBNP).',
          level: 'rojo',
        };
      } else {
        return {
          risk: `Criterios insuficientes para diagnóstico concluyente (Score: ${score}).`,
          recommendation: 'Completar evaluación con Ecocardiograma transtorácico y biomarcadores.',
          level: 'amarillo',
        };
      }
    },
  },

  // 6. TIMI Score para Angina Inestable / IAMSEST
  {
    id: 'timi_iamsest',
    name: 'TIMI Score (Síndrome Coronario Agudo sin elevación ST)',
    associatedDiagnoses: ['sca', 'iam', 'angina', 'infarto', 'dolor precordial', 'coronario'],
    description: 'Estratificación del riesgo de mortalidad, nuevo infarto o revascularización urgente a 14 días.',
    items: [
      { id: 'age65', label: 'Edad ≥ 65 años', points: 1 },
      { id: 'risk_factors', label: '≥ 3 Factores de riesgo CV (HTA, DM, tabaquismo, dislipidemia, historia familiar)', points: 1 },
      { id: 'known_cad', label: 'Estenosis coronaria conocida ≥ 50%', points: 1 },
      { id: 'asa_use', label: 'Uso de Aspirina en los últimos 7 días', points: 1 },
      { id: 'severe_angina', label: '≥ 2 Episodios anginosos en las últimas 24 horas', points: 1 },
      { id: 'st_deviation', label: 'Desviación del segmento ST ≥ 0.5 mm en ECG', points: 1 },
      { id: 'biomarkers', label: 'Elevación de biomarcadores cardíacos (Troponina I o T)', points: 1 },
    ],
    interpret: (score: number) => {
      if (score <= 2) {
        return {
          risk: `Bajo Riesgo (Score: ${score} pts — 5-8% eventos a 14 días).`,
          recommendation: 'Estrategia conservadora inicial, monitorización con troponinas seriadas a 0h y 3h.',
          level: 'verde',
        };
      } else if (score <= 4) {
        return {
          risk: `Riesgo Intermedio (Score: ${score} pts — 13-20% eventos a 14 días).`,
          recommendation: 'Doble antiagregación plaquetaria, anticoagulación y coronariografía en < 24-72 horas.',
          level: 'amarillo',
        };
      } else {
        return {
          risk: `Alto Riesgo (Score: ${score} pts — 26-41% eventos a 14 días).`,
          recommendation: 'Estrategia invasiva precoz (< 24 horas), doble antiagregación y monitoreo continuo en UCI/UCIC.',
          level: 'rojo',
        };
      }
    },
  },

  // 7. Child-Pugh (Severidad de Cirrosis Hepática)
  {
    id: 'child_pugh',
    name: 'Escala de Child-Pugh (Insuficiencia Hepática / Cirrosis)',
    associatedDiagnoses: ['cirrosis', 'hepatopatia', 'falla hepatica', 'ascitis', 'varices esofagicas', 'hipertension portal'],
    description: 'Estratificación pronóstica de la severidad de la hepatopatía crónica y sobrevida.',
    items: [
      { id: 'bili_mod', label: 'Bilirrubina 2 - 3 mg/dL', points: 2 },
      { id: 'bili_high', label: 'Bilirrubina > 3 mg/dL', points: 3 },
      { id: 'alb_mod', label: 'Albúmina 2.8 - 3.5 g/dL', points: 2 },
      { id: 'alb_low', label: 'Albúmina < 2.8 g/dL', points: 3 },
      { id: 'inr_mod', label: 'INR 1.7 - 2.3 (TP prolongado 4-6s)', points: 2 },
      { id: 'inr_high', label: 'INR > 2.3 (TP prolongado > 6s)', points: 3 },
      { id: 'asc_mild', label: 'Ascitis leve / controlada', points: 2 },
      { id: 'asc_sev', label: 'Ascitis moderada a severa o refractaria', points: 3 },
      { id: 'encef_mild', label: 'Encefalopatía grado 1 o 2', points: 2 },
      { id: 'encef_sev', label: 'Encefalopatía grado 3 o 4 (estupor / coma)', points: 3 },
    ],
    interpret: (score: number) => {
      // Score base mínimo es 5
      const total = Math.max(score, 5);
      if (total <= 6) {
        return {
          risk: `Clase A (Score: ${total} pts) — Enfermedad compensada (Sobrevida al año ~100%).`,
          recommendation: 'Vigilancia ambulatoria periódica de tamizaje de hepatocarcinoma con AFP y ecografía.',
          level: 'verde',
        };
      } else if (total <= 9) {
        return {
          risk: `Clase B (Score: ${total} pts) — Compromiso funcional significativo (Sobrevida al año ~80%).`,
          recommendation: 'Ajuste estricto de medicamentos con metabolismo hepático. Profilaxis de peritonitis bacteriana espontánea si aplica.',
          level: 'amarillo',
        };
      } else {
        return {
          risk: `Clase C (Score: ${total} pts) — Enfermedad descompensada severa (Sobrevida al año ~45%).`,
          recommendation: 'Manejo hospitalario prioritario de complicaciones agudas (PBE, sangrado variceal, síndrome hepatorrenal) y protocolo de trasplante.',
          level: 'rojo',
        };
      }
    },
  },

  // 8. Escala NIHSS (National Institutes of Health Stroke Scale) para EVC
  {
    id: 'nihss',
    name: 'Escala NIHSS (Déficit Neurológico en EVC Isquémico)',
    associatedDiagnoses: [
      'evc',
      'acv',
      'ictus',
      'isquemico',
      'isquemia cerebral',
      'enfermedad vascular cerebral',
      'vasculocerebral',
      'cerebrovascular',
      'hemiparesia',
      'infarto cerebral',
      'afasia',
      'nihss',
    ],
    description: 'Cuantificación del déficit neurológico agudo en Evento Vascular Cerebral Isquémico (0 - 42 puntos).',
    items: [
      { id: '1a_alert', label: '1a. Nivel de Conciencia: Somnoliento pero despierta con estímulo leve (+1 pt)', points: 1 },
      { id: '1a_stupor', label: '1a. Nivel de Conciencia: Estuporoso / requiere estímulos repetidos (+2 pts)', points: 2 },
      { id: '1a_coma', label: '1a. Nivel de Conciencia: Coma / no responde (+3 pts)', points: 3 },
      { id: '1b_questions', label: '1b. Preguntas (Mes y Edad): Solo una respuesta correcta (+1 pt) o Ninguna (+2 pts)', points: 1 },
      { id: '1c_commands', label: '1c. Órdenes motoras (Cerrar ojos y puño): Solo una correcta (+1 pt) o Ninguna (+2 pts)', points: 1 },
      { id: '2_gaze', label: '2. Mirada Conjugada: Paresia parcial (+1 pt) o Desviación forzada (+2 pts)', points: 1 },
      { id: '3_visual', label: '3. Campos Visuales: Hemianopsia parcial (+1 pt) o Completa (+2 pts)', points: 1 },
      { id: '4_facial', label: '4. Parálisis Facial: Menor/asimétrica (+1 pt) o Parcial/inferior (+2 pts) o Completa (+3 pts)', points: 2 },
      { id: '5a_arm_left', label: '5a. Motor Brazo Izquierdo: Caída antes de 10s (+1 pt) o No vence gravedad (+2 pts) o Parálisis (+4 pts)', points: 2 },
      { id: '5b_arm_right', label: '5b. Motor Brazo Derecho: Caída antes de 10s (+1 pt) o No vence gravedad (+2 pts) o Parálisis (+4 pts)', points: 2 },
      { id: '6a_leg_left', label: '6a. Motor Pierna Izquierda: Caída antes de 5s (+1 pt) o No vence gravedad (+2 pts) o Parálisis (+4 pts)', points: 2 },
      { id: '6b_leg_right', label: '6b. Motor Pierna Derecha: Caída antes de 5s (+1 pt) o No vence gravedad (+2 pts) o Parálisis (+4 pts)', points: 2 },
      { id: '7_ataxia', label: '7. Ataxia de Extremidades: Presente en una extremidad (+1 pt) o En dos (+2 pts)', points: 1 },
      { id: '8_sensory', label: '8. Sensibilidad: Hipoestesia leve a moderada (+1 pt) o Anestesia grave (+2 pts)', points: 1 },
      { id: '9_language', label: '9. Lenguaje / Afasia: Afasia leve a moderada (+1 pt) o Severa/Global (+2-3 pts)', points: 2 },
      { id: '10_dysarthria', label: '10. Disartria: Leve a moderada (+1 pt) o Severa/Ininteligible (+2 pts)', points: 1 },
      { id: '11_extinction', label: '11. Extinción o Inatención / Negligencia hemi-espacial (+1-2 pts)', points: 1 },
    ],
    interpret: (score: number) => {
      if (score === 0) {
        return {
          risk: `NIHSS: 0 puntos — Sin déficit neurológico detectable.`,
          recommendation: 'Descartar AIT (Ataque Isquémico Transitorio) o mímicos de ictus (hipoglicemia, migraña).',
          level: 'verde',
        };
      } else if (score <= 4) {
        return {
          risk: `NIHSS: ${score} puntos — EVC Isquémico Menor / Leve.`,
          recommendation: 'Manejo con doble antiagregación plaquetaria (Aspirina + Clopidogrel) precoz según ensayo CHANCE/POINT, estatinas de alta potencia y monitorización estrecha.',
          level: 'amarillo',
        };
      } else if (score <= 15) {
        return {
          risk: `NIHSS: ${score} puntos — EVC Isquémico Moderado.`,
          recommendation: 'Evaluar criterios de trombólisis endovenosa con rt-PA / Tenecteplasa si tiempo de inicio ≤ 4.5 horas y TAC sin sangrado ni infarto extenso. Si hay oclusión de gran vaso evaluar trombectomía mecánica (≤ 24h).',
          level: 'rojo',
        };
      } else if (score <= 20) {
        return {
          risk: `NIHSS: ${score} puntos — EVC Isquémico Moderado a Severo.`,
          recommendation: 'Candidato prioritario a trombectomía mecánica de urgencia. Ingreso en Unidad de Ictus / UCI.',
          level: 'rojo',
        };
      } else {
        return {
          risk: `NIHSS: ${score} puntos (≥ 21 pts) — EVC Isquémico Severo / Masivo.`,
          recommendation: 'Riesgo alto de transformación hemorrágica y edema cerebral maligno con herniación. Vigilancia neurocrítica estricta, considerar craniectomía descompresiva.',
          level: 'rojo',
        };
      }
    },
  },

  // 9. Escala de Rankin Modificada (mRS) para Discapacidad en EVC
  {
    id: 'rankin',
    name: 'Escala de Rankin Modificada (mRS — Discapacidad en EVC)',
    associatedDiagnoses: ['rankin', 'mrs', 'evc', 'acv', 'ictus', 'discapacidad', 'secuela', 'hemiparesia'],
    description: 'Medición del grado de dependencia funcional y discapacidad física post-EVC (Grados 0 a 6).',
    items: [
      { id: 'mrs_1', label: 'Grado 1: Incapacidad no significativa; presenta síntomas pero realiza sus deberes y actividades habituales', points: 1 },
      { id: 'mrs_2', label: 'Grado 2: Incapacidad leve; incapaz de realizar algunas actividades previas, pero independiente en su autocuidado', points: 2 },
      { id: 'mrs_3', label: 'Grado 3: Incapacidad moderada; requiere alguna ayuda, pero es capaz de caminar sin asistencia', points: 3 },
      { id: 'mrs_4', label: 'Grado 4: Incapacidad moderadamente severa; incapaz de caminar sin ayuda y de atender sus necesidades corporales sin asistencia', points: 4 },
      { id: 'mrs_5', label: 'Grado 5: Incapacidad severa; confinado a cama, incontinente y dependiente constante de cuidados de enfermería', points: 5 },
      { id: 'mrs_6', label: 'Grado 6: Fallecimiento del paciente', points: 6 },
    ],
    interpret: (score: number) => {
      if (score <= 2) {
        return {
          risk: `Rankin mRS: Grado ${score} — Buen pronóstico funcional (Autosuficiente e independiente).`,
          recommendation: 'Continuar rehabilitación motora ambulatoria y prevención secundaria estricta de recurrencia vascular.',
          level: 'verde',
        };
      } else if (score <= 4) {
        return {
          risk: `Rankin mRS: Grado ${score} — Discapacidad moderada a severa (Dependencia para actividades básicas).`,
          recommendation: 'Protocolo de neurorehabilitación intensiva, prevención de úlceras por presión, profilaxis tromboembólica y soporte nutricional.',
          level: 'amarillo',
        };
      } else {
        return {
          risk: `Rankin mRS: Grado ${score} — Dependencia total / Estado grave post-evento.`,
          recommendation: 'Atención multidisciplinaria de soporte intensivo, prevención de neumonía por aspiración y complicaciones asociadas al encamamiento prolongado.',
          level: 'rojo',
        };
      }
    },
  },
];

export function findMatchingScales(diagnosisText: string): ClinicalScaleDefinition[] {
  if (!diagnosisText) return [];
  const normalized = diagnosisText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  return CLINICAL_SCALES.filter(scale => {
    return scale.associatedDiagnoses.some(term => {
      const normTerm = term.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return normalized.includes(normTerm);
    });
  });
}
