/**
 * ClinicalLabInterpreter: Automated Syndromic Lab Interpretation
 * Hospital Regional Dr. Ángel María Gatón — Dr. Joel Colón
 *
 * Requirements (Phases 7, 8, 9; Sections 11, 14):
 * - Generates brief, high-precision syndromic interpretations.
 * - Takes into account patient age and sex.
 * - STRICT CLINICAL RULE: NEVER invent etiologies without sufficient clinical evidence.
 * - Outputs standard uppercase medical summaries.
 */

import { LabParameterDetection } from './VisionLabParser';

export interface InterpretationPatientContext {
  age?: number;
  sex?: 'M' | 'F' | string;
  isPregnant?: boolean;
}

export interface LabInterpretationResult {
  title: string;
  summary: string;
  findings: string[];
  disclaimer: string;
  requiresReview: boolean;
  timestamp: string;
}

/**
 * Interprets confirmed Hemogram parameters
 */
export function interpretHemogram(
  parameters: LabParameterDetection[],
  context?: InterpretationPatientContext
): LabInterpretationResult {
  const findings: string[] = [];
  const paramMap = new Map<string, number>();

  parameters.forEach((p) => {
    if (p.isIdentified && p.value !== 'NO IDENTIFICADO') {
      const num = parseFloat(p.value.replace(',', '.'));
      if (!isNaN(num)) paramMap.set(p.key, num);
    }
  });

  const isFemale = context?.sex?.toUpperCase().startsWith('F') ?? false;
  const age = context?.age ?? 45;

  const wbc = paramMap.get('GB');
  const hgb = paramMap.get('HGB');
  const hct = paramMap.get('HCT');
  const vcm = paramMap.get('VCM');
  const hcm = paramMap.get('HCM');
  const chcm = paramMap.get('CHCM');
  const plt = paramMap.get('PLT');
  const neut = paramMap.get('NEUT');
  const linf = paramMap.get('LINF');
  const eos = paramMap.get('EOS');

  // 1. Serie Blanca (Leucocitos y diferencial)
  if (wbc !== undefined) {
    if (wbc > 11.0) {
      let whiteCellDesc = 'LEUCOCITOSIS';
      if (wbc >= 25.0) whiteCellDesc = 'REACCIÓN LEUCEMOIDE / HIPERLEUCOCITOSIS SEVERA';

      const diffs: string[] = [];
      if (neut !== undefined && neut > 70) diffs.push('CON NEUTROFILIA');
      if (linf !== undefined && linf > 45) diffs.push('CON LINFOCITOSIS');
      if (eos !== undefined && eos > 5) diffs.push('CON EOSINOFILIA');

      if (diffs.length > 0) {
        findings.push(`${whiteCellDesc} ${diffs.join(' Y ')}`);
      } else {
        findings.push(whiteCellDesc);
      }
    } else if (wbc < 4.0) {
      if (wbc < 2.0) {
        findings.push('LEUCOPENIA SEVERA (NEUTROPENIA CRÍTICA A DESCARTAR)');
      } else {
        findings.push('LEUCOPENIA LEVE A MODERADA');
      }
    }
  }

  // 2. Serie Roja (Anemia, Hematocrito e Índices)
  if (hgb !== undefined) {
    const normalHbCutoff = isFemale ? 12.0 : 13.0;

    if (hgb < normalHbCutoff) {
      // Determinar severidad según OMS
      let severity = '';
      if (hgb < 8.0) severity = 'SEVERA (GRADO III)';
      else if (hgb <= 10.9) severity = 'MODERADA (GRADO II)';
      else severity = 'LEVE (GRADO I)';

      // Determinar morfología eritrocitaria
      let morphVCM = '';
      if (vcm !== undefined) {
        if (vcm < 80) morphVCM = 'MICROCÍTICA';
        else if (vcm > 100) morphVCM = 'MACROCÍTICA';
        else morphVCM = 'NORMOCÍTICA';
      }

      let morphHCM = '';
      if (chcm !== undefined || hcm !== undefined) {
        const hypochromic = (chcm !== undefined && chcm < 32) || (hcm !== undefined && hcm < 27);
        morphHCM = hypochromic ? 'HIPOCRÓMICA' : 'NORMOCRÓMICA';
      }

      const morphDesc = [morphVCM, morphHCM].filter(Boolean).join(' ');
      const desc = `ANEMIA ${morphDesc ? morphDesc + ' ' : ''}${severity}`;
      findings.push(desc.trim());
    } else if (hgb > (isFemale ? 16.5 : 17.5) || (hct !== undefined && hct > 52)) {
      findings.push('POLICITEMIA / ERITROCITOSIS RELATIVA O ABSOLUTA');
    }
  }

  // 3. Serie Plaquetaria
  if (plt !== undefined) {
    if (plt < 150) {
      if (plt < 50) {
        findings.push('TROMBOCITOPENIA SEVERA (ALTO RIESGO HEMORRÁGICO)');
      } else if (plt < 100) {
        findings.push('TROMBOCITOPENIA MODERADA');
      } else {
        findings.push('TROMBOCITOPENIA LEVE');
      }
    } else if (plt > 450) {
      if (plt > 800) {
        findings.push('TROMBOCITOSIS MARCADA');
      } else {
        findings.push('TROMBOCITOSIS REACTIVA / PRIMARIA');
      }
    }
  }

  let summary = '';
  if (findings.length === 0) {
    summary = 'HEMOGRAMA SIN ALTERACIONES CUANTITATIVAS EVIDENTES EN SERIES BLANCA, ROJA Y PLAQUETARIA.';
  } else {
    summary = findings.join(', ') + '.';
  }

  return {
    title: 'Interpretación Sindrómica del Hemograma',
    summary,
    findings,
    disclaimer: 'GENERADO CON IA — REQUIERE REVISIÓN MÉDICA. No define etiología definitiva.',
    requiresReview: true,
    timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
  };
}

/**
 * Interprets confirmed Blood Chemistry parameters
 */
export function interpretChemistry(
  parameters: LabParameterDetection[],
  context?: InterpretationPatientContext
): LabInterpretationResult {
  const findings: string[] = [];
  const paramMap = new Map<string, number>();

  parameters.forEach((p) => {
    if (p.isIdentified && p.value !== 'NO IDENTIFICADO') {
      const num = parseFloat(p.value.replace(',', '.'));
      if (!isNaN(num)) paramMap.set(p.key, num);
    }
  });

  const glu = paramMap.get('GLUCOSA');
  const urea = paramMap.get('UREA');
  const bun = paramMap.get('BUN');
  const cr = paramMap.get('CREATININA');
  const na = paramMap.get('SODIO');
  const k = paramMap.get('POTASIO');
  const cl = paramMap.get('CLORO');
  const ca = paramMap.get('CALCIO');
  const tgo = paramMap.get('TGO');
  const tgp = paramMap.get('TGP');
  const alp = paramMap.get('ALP');
  const bt = paramMap.get('BIL-T');
  const bd = paramMap.get('BIL-D');
  const amy = paramMap.get('AMILASA');
  const lip = paramMap.get('LIPASA');
  const alb = paramMap.get('ALBUMINA');
  const tg = paramMap.get('TRIGLICERIDOS');
  const chol = paramMap.get('COLESTEROL');

  // 1. Metabolismo Glucídico
  if (glu !== undefined) {
    if (glu < 70) {
      findings.push(glu < 54 ? 'HIPOGLUCEMIA SEVERA / SINTOMÁTICA' : 'HIPOGLUCEMIA LEVE');
    } else if (glu >= 200) {
      findings.push('HIPERGLUCEMIA MARCADA (EVALUAR CRITERIOS DE CAD O EHH)');
    } else if (glu > 125) {
      findings.push('HIPERGLUCEMIA EN AYUNAS / DESCONTROL GLUCÉMICO');
    }
  }

  // 2. Función Renal y Azotemia
  if (cr !== undefined || urea !== undefined || bun !== undefined) {
    const crElevated = cr !== undefined && cr > 1.2;
    const bunElevated = (bun !== undefined && bun > 20) || (urea !== undefined && urea > 45);

    if (crElevated && bunElevated) {
      const effectiveBun = bun !== undefined ? bun : (urea ? urea / 2.14 : 0);
      const ratio = cr ? effectiveBun / cr : 0;
      if (ratio > 20) {
        findings.push('AZOTEMIA PRERRENAL / DETERIORO RENAL CON ELEVACIÓN DE RELACIÓN BUN/Cr');
      } else {
        findings.push('AZOTEMIA / LESIÓN RENAL CON ELEVACIÓN DE NITROGENADOS');
      }
    } else if (crElevated) {
      findings.push('ELEVACIÓN DE CREATININA SÉRICA (DESCARTAR LESIÓN RENAL AGUDA KDIGO)');
    } else if (bunElevated) {
      findings.push('AZOTEMIA LEVE AISLADA (DESCARTAR DESHIDRATACIÓN O SANGRADO DIGESTIVO)');
    }
  }

  // 3. Medio Interno y Electrolitos
  if (na !== undefined) {
    if (na < 135) {
      findings.push(na < 125 ? 'HIPONATREMIA SEVERA' : 'HIPONATREMIA LEVE A MODERADA');
    } else if (na > 145) {
      findings.push(na > 155 ? 'HIPERNATREMIA SEVERA' : 'HIPERNATREMIA');
    }
  }

  if (k !== undefined) {
    if (k < 3.5) {
      findings.push(k < 2.8 ? 'HIPOKALEMIA SEVERA (ALTO RIESGO DE ARRITMIAS)' : 'HIPOKALEMIA LEVE A MODERADA');
    } else if (k > 5.0) {
      findings.push(k > 6.0 ? 'HIPERKALEMIA SEVERA (URGENCIA CARDIACA / ECG REQUERIDO)' : 'HIPERKALEMIA LEVE');
    }
  }

  if (ca !== undefined) {
    if (ca < 8.5) findings.push('HIPOCALCEMIA SÉRICA');
    else if (ca > 10.5) findings.push('HIPERCALCEMIA SÉRICA');
  }

  // 4. Perfil Hepático y Enzimas
  const liverEnzymesElevated = (tgo !== undefined && tgo > 45) || (tgp !== undefined && tgp > 50);
  const cholestasisElevated = (alp !== undefined && alp > 150) || (bt !== undefined && bt > 1.2 && bd !== undefined && bd > 0.4);

  if (liverEnzymesElevated && cholestasisElevated) {
    findings.push('PATRÓN HEPATOBILIAR MIXTO (ELEVACIÓN DE TRANSAMINASAS Y COLESTASIS)');
  } else if (liverEnzymesElevated) {
    findings.push('PATRÓN HEPATOCELULAR (ELEVACIÓN PREDOMINANTE DE TRANSAMINASAS AST/ALT)');
  } else if (cholestasisElevated) {
    findings.push('PATRÓN COLESTÁSICO (ELEVACIÓN DE FOSFATASA ALCALINA Y BILIRRUBINAS)');
  }

  // 5. Páncreas
  if ((amy !== undefined && amy > 100) || (lip !== undefined && lip > 60)) {
    const lip3x = lip !== undefined && lip >= 180;
    const amy3x = amy !== undefined && amy >= 300;
    if (lip3x || amy3x) {
      findings.push('HIPERLIPASEMIA / HIPERAMILASEMIA SIGNIFICATIVA (>3X LSN: SUGESTIVO DE PANCREATITIS AGUDA)');
    } else {
      findings.push('ELEVACIÓN LEVE DE ENZIMAS PANCREÁTICAS');
    }
  }

  // 6. Proteínas y Lípidos
  if (alb !== undefined && alb < 3.5) {
    findings.push(alb < 2.5 ? 'HIPOALBUMINEMIA SEVERA' : 'HIPOALBUMINEMIA LEVE A MODERADA');
  }

  if (tg !== undefined && tg > 150) {
    findings.push(tg >= 500 ? 'HIPERTRIGLICERIDEMIA SEVERA (RIESGO DE PANCREATITIS)' : 'HIPERTRIGLICERIDEMIA');
  }

  if (chol !== undefined && chol > 200) {
    findings.push('HIPERCOLESTEROLEMIA');
  }

  let summary = '';
  if (findings.length === 0) {
    summary = 'QUÍMICAS SANGUÍNEAS SIN ALTERACIONES ANALÍTICAS SIGNIFICATIVAS.';
  } else {
    summary = findings.join(', ') + '.';
  }

  return {
    title: 'Interpretación Clínica de Químicas Sanguíneas',
    summary,
    findings,
    disclaimer: 'GENERADO CON IA — REQUIERE REVISIÓN MÉDICA. Correlacionar con estado hemodinámico y anamnesis.',
    requiresReview: true,
    timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
  };
}

// =========================================================================
// INTERPRETACIÓN DE ELECTROLITOS COMPLETOS (Na, K, Ca, P, Mg, Cl)
// =========================================================================
export function interpretElectrolytes(
  parameters: LabParameterDetection[],
  context?: InterpretationPatientContext
): LabInterpretationResult {
  const findings: string[] = [];
  const paramMap = new Map<string, number>();

  parameters.forEach((p) => {
    if (p.isIdentified && p.value !== 'NO IDENTIFICADO') {
      const num = parseFloat(p.value.replace(',', '.'));
      if (!isNaN(num)) paramMap.set(p.key, num);
    }
  });

  const na = paramMap.get('SODIO') ?? paramMap.get('NA');
  const k = paramMap.get('POTASIO') ?? paramMap.get('K');
  const cl = paramMap.get('CLORO') ?? paramMap.get('CL');
  const ca = paramMap.get('CALCIO') ?? paramMap.get('CA');
  const p = paramMap.get('FOSFORO') ?? paramMap.get('P');
  const mg = paramMap.get('MAGNESIO') ?? paramMap.get('MG');

  if (na !== undefined) {
    if (na < 125) findings.push('HIPONATREMIA SEVERA (CRÍTICA <125 mEq/L)');
    else if (na < 135) findings.push('HIPONATREMIA LEVE A MODERADA');
    else if (na > 155) findings.push('HIPERNATREMIA SEVERA (CRÍTICA >155 mEq/L)');
    else if (na > 145) findings.push('HIPERNATREMIA');
  }

  if (k !== undefined) {
    if (k < 2.8) findings.push('HIPOKALEMIA SEVERA (CRÍTICA <2.8 mEq/L — ALTO RIESGO DE ARRITMIAS)');
    else if (k < 3.5) findings.push('HIPOKALEMIA LEVE A MODERADA');
    else if (k >= 6.0) findings.push('HIPERKALEMIA SEVERA (CRÍTICA ≥6.0 mEq/L — URGENCIA CARDIOLÓGICA)');
    else if (k > 5.0) findings.push('HIPERKALEMIA LEVE');
  }

  if (ca !== undefined) {
    if (ca < 7.0) findings.push('HIPOCALCEMIA SEVERA / SINTOMÁTICA (<7.0 mg/dL)');
    else if (ca < 8.5) findings.push('HIPOCALCEMIA SÉRICA LEVE');
    else if (ca > 12.0) findings.push('HIPERCALCEMIA SEVERA / CRISIS HIPERCALCÉMICA');
    else if (ca > 10.5) findings.push('HIPERCALCEMIA');
  }

  if (p !== undefined) {
    if (p < 1.5) findings.push('HIPOFOSFATEMIA SEVERA (<1.5 mg/dL)');
    else if (p < 2.5) findings.push('HIPOFOSFATEMIA');
    else if (p >= 7.0) findings.push('HIPERFOSFATEMIA SEVERA (≥7.0 mg/dL)');
    else if (p > 4.5) findings.push('HIPERFOSFATEMIA');
  }

  if (mg !== undefined) {
    if (mg < 1.2) findings.push('HIPOMAGNESEMIA SEVERA (<1.2 mg/dL)');
    else if (mg < 1.7) findings.push('HIPOMAGNESEMIA');
    else if (mg > 2.5) findings.push('HIPERMAGNESEMIA');
  }

  if (cl !== undefined) {
    if (cl < 96) findings.push('HIPOCLOREMIA');
    else if (cl > 108) findings.push('HIPERCLOREMIA');
  }

  return {
    title: 'Interpretación de Medio Interno y Electrolitos',
    summary: findings.length > 0 ? findings.join(', ') + '.' : 'ELECTROLITOS EN RANGOS NORMALES.',
    findings,
    disclaimer: 'REQUIERE VALORACIÓN MÉDICA. Verificar técnica de extracción y hemólisis.',
    requiresReview: true,
    timestamp: new Date().toISOString().slice(0, 16).replace('T', ' ')
  };
}

// =========================================================================
// INTERPRETACIÓN DE GASES ARTERIALES (ÁCIDO-BASE)
// =========================================================================
export function interpretBloodGases(
  parameters: LabParameterDetection[]
): LabInterpretationResult {
  const findings: string[] = [];
  const paramMap = new Map<string, number>();

  parameters.forEach((p) => {
    if (p.isIdentified && p.value !== 'NO IDENTIFICADO') {
      const num = parseFloat(p.value.replace(',', '.'));
      if (!isNaN(num)) paramMap.set(p.key, num);
    }
  });

  const ph = paramMap.get('PH');
  const pco2 = paramMap.get('PCO2');
  const po2 = paramMap.get('PO2');
  const hco3 = paramMap.get('HCO3');

  if (ph !== undefined) {
    if (ph < 7.35) {
      if (hco3 !== undefined && hco3 < 22) {
        findings.push('ACIDOSIS METABÓLICA');
      } else if (pco2 !== undefined && pco2 > 45) {
        findings.push('ACIDOSIS RESPIRATORIA');
      } else {
        findings.push('ACIDEMIA / ACIDOSIS NO ESPECIFICADA');
      }
    } else if (ph > 7.45) {
      if (hco3 !== undefined && hco3 > 26) {
        findings.push('ALCALOSIS METABÓLICA');
      } else if (pco2 !== undefined && pco2 < 35) {
        findings.push('ALCALOSIS RESPIRATORIA');
      } else {
        findings.push('ALCALEMIA');
      }
    } else {
      if (hco3 !== undefined && hco3 < 22 && pco2 !== undefined && pco2 < 35) {
        findings.push('TRASTORNO MIXTO / ACIDOSIS METABÓLICA COMPENSADA');
      } else {
        findings.push('EQUILIBRIO ÁCIDO-BASE CONSERVADO');
      }
    }
  }

  if (po2 !== undefined && po2 < 60) {
    findings.push('HIPOXEMIA ARTERIAL MODERADA A SEVERA (PaO2 < 60 mmHg)');
  }

  return {
    title: 'Interpretación Gasométrica Ácido-Base',
    summary: findings.length > 0 ? findings.join(', ') + '.' : 'GASOMETRÍA ARTERIAL DENTRO DE LÍMITES NORMALES.',
    findings,
    disclaimer: 'REQUIERE VALORACIÓN MÉDICA. Correlacionar con Fracción Inspirada de O2 (FiO2).',
    requiresReview: true,
    timestamp: new Date().toISOString().slice(0, 16).replace('T', ' ')
  };
}

// =========================================================================
// GENERADOR DE DIAGNÓSTICOS DE LABORATORIO SUGERIDOS POR EL SISTEMA
// Cumple Secciones 11, 12, 13, 36, 37 del Requerimiento de Guardia
// =========================================================================
export interface SuggestedLabDiagnosisResult {
  id: string;
  name: string;
  severity?: 'LEVE' | 'MODERADO' | 'SEVERO';
  criteria: string;
  category: string;
  parameters: string[];
}

export function generateSuggestedLabDiagnoses(
  labs: Array<{ parameter: string; value: string; numericValue?: number; flag?: string; panel?: string }>
): SuggestedLabDiagnosisResult[] {
  const suggested: SuggestedLabDiagnosisResult[] = [];
  const paramMap = new Map<string, number>();

  labs.forEach((l) => {
    const key = (l.parameter || '').toUpperCase().trim();
    const num = typeof l.numericValue === 'number' && !isNaN(l.numericValue)
      ? l.numericValue
      : parseFloat(String(l.value || '').replace(',', '.'));
    if (!isNaN(num)) {
      paramMap.set(key, num);
    }
  });

  const getVal = (...keys: string[]): number | undefined => {
    for (const k of keys) {
      for (const [mapKey, v] of paramMap.entries()) {
        if (mapKey === k || mapKey.includes(k)) return v;
      }
    }
    return undefined;
  };

  const hb = getVal('HB', 'HGB', 'HEMOGLOBINA');
  const vcm = getVal('VCM', 'MCV');
  const hcm = getVal('HCM', 'MCH');
  const gb = getVal('GB', 'WBC', 'LEUCOCITOS');
  const neut = getVal('NEUT', 'SEGMENTADOS');
  const plt = getVal('PLT', 'PLAQUETAS');
  const k = getVal('K', 'POTASIO');
  const na = getVal('NA', 'SODIO');
  const cr = getVal('CR', 'CREATININA');
  const bun = getVal('BUN', 'UREA');
  const p = getVal('FOSFORO', 'FÓSFORO', ' P');
  const ca = getVal('CALCIO', 'CA');
  const glu = getVal('GLUCOSA', 'GLICEMIA', 'GLU');

  // 1. ANEMIA
  if (hb !== undefined && hb < 12.0) {
    let severity: 'LEVE' | 'MODERADO' | 'SEVERO' = 'LEVE';
    if (hb < 8.0) severity = 'SEVERO';
    else if (hb <= 10.9) severity = 'MODERADO';

    let morph = 'NORMOCÍTICA NORMOCRÓMICA';
    if (vcm !== undefined && vcm < 80) {
      morph = (hcm !== undefined && hcm < 27) ? 'MICROCÍTICA HIPOCRÓMICA' : 'MICROCÍTICA';
    } else if (vcm !== undefined && vcm > 100) {
      morph = 'MACROCÍTICA';
    }

    suggested.push({
      id: 'sug-anemia',
      name: `ANEMIA ${morph} ${severity}`,
      severity,
      criteria: `Hb: ${hb} g/dL${vcm ? `, VCM: ${vcm} fL` : ''}${hcm ? `, HCM: ${hcm} pg` : ''}`,
      category: 'Hematología',
      parameters: ['Hb', 'VCM', 'HCM'].filter(p => paramMap.has(p))
    });
  }

  // 2. HIPERKALEMIA
  if (k !== undefined && k > 5.0) {
    const isSevere = k >= 6.0;
    suggested.push({
      id: 'sug-hiperkalemia',
      name: isSevere ? 'HIPERKALEMIA SEVERA' : 'HIPERKALEMIA LEVE',
      severity: isSevere ? 'SEVERO' : 'LEVE',
      criteria: `Potasio sérico: ${k} mEq/L (Normal 3.5 - 5.1)`,
      category: 'Electrolitos',
      parameters: ['Potasio']
    });
  } else if (k !== undefined && k < 3.5) {
    const isSevere = k < 2.8;
    suggested.push({
      id: 'sug-hipokalemia',
      name: isSevere ? 'HIPOKALEMIA SEVERA' : 'HIPOKALEMIA LEVE',
      severity: isSevere ? 'SEVERO' : 'LEVE',
      criteria: `Potasio sérico: ${k} mEq/L (Normal 3.5 - 5.1)`,
      category: 'Electrolitos',
      parameters: ['Potasio']
    });
  }

  // 3. HIPONATREMIA / HIPERNATREMIA
  if (na !== undefined && na < 135) {
    const isSevere = na < 125;
    suggested.push({
      id: 'sug-hiponatremia',
      name: isSevere ? 'HIPONATREMIA SEVERA' : 'HIPONATREMIA LEVE A MODERADA',
      severity: isSevere ? 'SEVERO' : 'MODERADO',
      criteria: `Sodio sérico: ${na} mEq/L (Normal 135 - 145)`,
      category: 'Electrolitos',
      parameters: ['Sodio']
    });
  } else if (na !== undefined && na > 145) {
    const isSevere = na > 155;
    suggested.push({
      id: 'sug-hipernatremia',
      name: isSevere ? 'HIPERNATREMIA SEVERA' : 'HIPERNATREMIA',
      severity: isSevere ? 'SEVERO' : 'MODERADO',
      criteria: `Sodio sérico: ${na} mEq/L`,
      category: 'Electrolitos',
      parameters: ['Sodio']
    });
  }

  // 4. HIPERFOSFATEMIA
  if (p !== undefined && p > 4.5) {
    const isSevere = p >= 7.0;
    suggested.push({
      id: 'sug-hiperfosfatemia',
      name: isSevere ? 'HIPERFOSFATEMIA SEVERA' : 'HIPERFOSFATEMIA',
      severity: isSevere ? 'SEVERO' : 'MODERADO',
      criteria: `Fósforo sérico: ${p} mg/dL (Normal 2.5 - 4.5)`,
      category: 'Electrolitos',
      parameters: ['Fósforo']
    });
  }

  // 5. FUNCIÓN RENAL & AZOTEMIA
  if (cr !== undefined && cr > 1.3) {
    const isSevere = cr >= 3.0;
    const isBUNHigh = bun !== undefined && bun > 40;
    const isPrerenal = bun && cr ? (bun / cr) > 20 : false;

    let renalName = isSevere ? 'DETERIORO RENAL SEVERO / AKIN III' : 'ELEVACIÓN DE CREATININA SÉRICA';
    if (isPrerenal) renalName = 'AZOTEMIA PRERRENAL / DETERIORO RENAL CON BUN/Cr > 20';

    suggested.push({
      id: 'sug-renal',
      name: renalName,
      severity: isSevere ? 'SEVERO' : 'MODERADO',
      criteria: `Creatinina: ${cr} mg/dL${bun ? `, BUN: ${bun} mg/dL` : ''}`,
      category: 'Función Renal',
      parameters: ['Creatinina', 'BUN'].filter(p => paramMap.has(p))
    });
  }

  // 6. TROMBOCITOPENIA
  if (plt !== undefined && plt < 150) {
    let severity: 'LEVE' | 'MODERADO' | 'SEVERO' = 'LEVE';
    if (plt < 50) severity = 'SEVERO';
    else if (plt < 100) severity = 'MODERADO';

    suggested.push({
      id: 'sug-trombocitopenia',
      name: `TROMBOCITOPENIA ${severity}`,
      severity,
      criteria: `Plaquetas: ${plt} x10^3/uL (Normal 150 - 450)`,
      category: 'Hematología',
      parameters: ['Plaquetas']
    });
  }

  // 7. LEUCOCITOSIS / LEUCOPENIA
  if (gb !== undefined && gb > 11.0) {
    const withNeut = neut !== undefined && neut > 70;
    suggested.push({
      id: 'sug-leucocitosis',
      name: `LEUCOCITOSIS${withNeut ? ' CON NEUTROFILIA' : ''}`,
      severity: gb >= 20 ? 'SEVERO' : 'MODERADO',
      criteria: `Leucocitos: ${gb} x10^3/uL${neut ? `, Neutrófilos: ${neut}%` : ''}`,
      category: 'Hematología',
      parameters: ['Leucocitos', 'Neutrófilos'].filter(p => paramMap.has(p))
    });
  } else if (gb !== undefined && gb < 4.0) {
    suggested.push({
      id: 'sug-leucopenia',
      name: gb < 2.0 ? 'LEUCOPENIA SEVERA' : 'LEUCOPENIA',
      severity: gb < 2.0 ? 'SEVERO' : 'MODERADO',
      criteria: `Leucocitos: ${gb} x10^3/uL`,
      category: 'Hematología',
      parameters: ['Leucocitos']
    });
  }

  // 8. HIPOGLUCEMIA / HIPERGLUCEMIA
  if (glu !== undefined && glu < 70) {
    suggested.push({
      id: 'sug-hipoglucemia',
      name: glu < 54 ? 'HIPOGLUCEMIA SEVERA' : 'HIPOGLUCEMIA',
      severity: glu < 54 ? 'SEVERO' : 'MODERADO',
      criteria: `Glucemia: ${glu} mg/dL`,
      category: 'Metabólico',
      parameters: ['Glucosa']
    });
  } else if (glu !== undefined && glu >= 250) {
    suggested.push({
      id: 'sug-hiperglucemia',
      name: 'HIPERGLUCEMIA MARCADA',
      severity: glu >= 350 ? 'SEVERO' : 'MODERADO',
      criteria: `Glucemia: ${glu} mg/dL`,
      category: 'Metabólico',
      parameters: ['Glucosa']
    });
  }

  return suggested;
}

// =========================================================================
// COMPARADOR LONGITUDINAL DE TENDENCIAS Y RESOLUCIÓN (Secciones 14 y 15)
// =========================================================================
export interface LabTrendItem {
  parameter: string;
  previousValue: number;
  currentValue: number;
  direction: 'ASCENDENTE' | 'DESCENDENTE' | 'ESTABLE';
  alertText: string;
  isAlert: boolean;
}

export interface LabResolvedItem {
  condition: string;
  previousAlert: string;
  normalizedValue: string;
  timestamp: string;
}

export function analyzeLabTrendsAndResolutions(
  chronologicalLabs: Array<{ parameter: string; numericValue?: number; value: string; timestamp: string; flag?: string }>
): { trends: LabTrendItem[]; resolved: LabResolvedItem[] } {
  const trends: LabTrendItem[] = [];
  const resolved: LabResolvedItem[] = [];

  // Agrupar por parámetro ordenado por fecha
  const byParam = new Map<string, Array<{ val: number; raw: string; time: string; flag?: string }>>();
  chronologicalLabs.forEach(l => {
    const p = (l.parameter || '').toUpperCase().trim();
    const num = typeof l.numericValue === 'number' && !isNaN(l.numericValue)
      ? l.numericValue
      : parseFloat(String(l.value || '').replace(',', '.'));
    if (!isNaN(num)) {
      const list = byParam.get(p) || [];
      list.push({ val: num, raw: l.value, time: l.timestamp, flag: l.flag });
      byParam.set(p, list);
    }
  });

  byParam.forEach((list, param) => {
    if (list.length >= 2) {
      // Ordenar por tiempo ascendente para ver la evolución
      list.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
      const prev = list[list.length - 2];
      const curr = list[list.length - 1];

      // Detección de tendencia
      const diff = curr.val - prev.val;
      let direction: 'ASCENDENTE' | 'DESCENDENTE' | 'ESTABLE' = 'ESTABLE';
      if (Math.abs(diff) > 0.05 * prev.val) {
        direction = diff > 0 ? 'ASCENDENTE' : 'DESCENDENTE';
      }

      // Alertas específicas de cinética
      if ((param.includes('CREAT') || param === 'CR') && direction === 'ASCENDENTE' && curr.val > prev.val) {
        trends.push({
          parameter: 'Creatinina',
          previousValue: prev.val,
          currentValue: curr.val,
          direction: 'ASCENDENTE',
          alertText: `↑ TENDENCIA ASCENDENTE (${prev.val} -> ${curr.val}): Alerta de deterioro de función renal`,
          isAlert: true
        });
      } else if ((param.includes('HB') || param.includes('HEMO')) && direction === 'DESCENDENTE' && diff <= -1.0) {
        trends.push({
          parameter: 'Hemoglobina',
          previousValue: prev.val,
          currentValue: curr.val,
          direction: 'DESCENDENTE',
          alertText: `↓ DESCENSO DE HEMOGLOBINA (${prev.val} -> ${curr.val} g/dL): Descartar sangrado activo o hemólisis`,
          isAlert: true
        });
      }

      // Detección de resoluciones de alteraciones
      if ((param.includes('POTAS') || param === 'K') && prev.val > 5.2 && curr.val >= 3.5 && curr.val <= 5.0) {
        resolved.push({
          condition: 'HIPERKALEMIA — RESUELTA',
          previousAlert: `K previo: ${prev.val} mEq/L`,
          normalizedValue: `K normalizado: ${curr.val} mEq/L`,
          timestamp: curr.time.slice(0, 16).replace('T', ' ')
        });
      } else if ((param.includes('POTAS') || param === 'K') && prev.val < 3.4 && curr.val >= 3.5 && curr.val <= 5.0) {
        resolved.push({
          condition: 'HIPOKALEMIA — RESUELTA',
          previousAlert: `K previo: ${prev.val} mEq/L`,
          normalizedValue: `K normalizado: ${curr.val} mEq/L`,
          timestamp: curr.time.slice(0, 16).replace('T', ' ')
        });
      } else if ((param.includes('SODI') || param === 'NA') && prev.val < 133 && curr.val >= 135 && curr.val <= 145) {
        resolved.push({
          condition: 'HIPONATREMIA — RESUELTA',
          previousAlert: `Na previo: ${prev.val} mEq/L`,
          normalizedValue: `Na normalizado: ${curr.val} mEq/L`,
          timestamp: curr.time.slice(0, 16).replace('T', ' ')
        });
      }
    }
  });

  return { trends, resolved };
}
