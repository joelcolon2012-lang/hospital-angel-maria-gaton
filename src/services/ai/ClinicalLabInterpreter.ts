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
