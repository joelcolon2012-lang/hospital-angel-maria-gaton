/**
 * VisionLabParser: Multimodal Lab Extraction Engine
 * Hospital Regional Dr. Ángel María Gatón — Servicio de Emergencias y Medicina Interna
 * Dr. Joel Colón
 *
 * Capabilities:
 * - Direct parsing of hemogram and blood chemistry images (JPG, PNG, PDF, HEIC) or text.
 * - Extracts strictly ordered hemogram parameters:
 *   GB, RBC, HGB, HCT, VCM, HCM, CHCM, PLT, MPV, NEUT, LINF, MON, EOS, BAS
 * - Extracts comprehensive chemistry parameters (Glucosa, Urea, Creatinina, Enzimas, Electrolitos, etc.)
 * - Assigns confidence levels ('alta' | 'media' | 'baja' | 'NO IDENTIFICADO')
 * - Never hallucinates unidentifiable values.
 * - Exports formatted horizontal strings (with and without units).
 */

export interface LabParameterDetection {
  key: string;
  label: string;
  value: string; // numeric string or 'NO IDENTIFICADO'
  unit: string;
  referenceRange: string;
  confidence: 'alta' | 'media' | 'baja' | 'NO IDENTIFICADO';
  flag: 'normal' | 'alto' | 'bajo' | 'critico';
  isIdentified: boolean;
}

export interface HemogramExtractionResult {
  parameters: LabParameterDetection[];
  horizontalString: string;
  rawRecognizedText: string;
  timestamp: string;
  confidenceScore: number; // 0 to 100
}

export interface ChemistryExtractionResult {
  parameters: LabParameterDetection[];
  horizontalWithUnits: string;
  horizontalWithoutUnits: string;
  rawRecognizedText: string;
  timestamp: string;
  confidenceScore: number;
}

// 14 Strict Hemogram parameters in the exact mandated order (Requirement 9 & 54)
export const HEMOGRAM_KEYS_ORDER = [
  'GB',
  'RBC',
  'HGB',
  'HCT',
  'VCM',
  'HCM',
  'CHCM',
  'PLT',
  'MPV',
  'NEUT',
  'LINF',
  'MON',
  'EOS',
  'BAS',
] as const;

export interface HemogramKeyDef {
  key: typeof HEMOGRAM_KEYS_ORDER[number];
  label: string;
  aliases: RegExp[];
  unit: string;
  defaultRef: string;
  minNormal: number;
  maxNormal: number;
  criticalLow?: number;
  criticalHigh?: number;
}

export const HEMOGRAM_DEFINITIONS: HemogramKeyDef[] = [
  {
    key: 'GB',
    label: 'Glóbulos Blancos (GB / WBC)',
    aliases: [/(?:leucocitos|wbc|globulos blancos|gb|leucos)[\s:=]+([0-9.,]+)/i, /\b(?:wbc|gb)\b[\s:]*([0-9.,]+)/i],
    unit: 'x10³/µL',
    defaultRef: '4.5 - 11.0',
    minNormal: 4.5,
    maxNormal: 11.0,
    criticalLow: 2.0,
    criticalHigh: 25.0,
  },
  {
    key: 'RBC',
    label: 'Glóbulos Rojos (RBC)',
    aliases: [/(?:eritrocitos|rbc|globulos rojos|hematies)[\s:=]+([0-9.,]+)/i, /\brbc\b[\s:]*([0-9.,]+)/i],
    unit: 'x10⁶/µL',
    defaultRef: '4.0 - 5.5',
    minNormal: 4.0,
    maxNormal: 5.5,
    criticalLow: 2.0,
    criticalHigh: 7.0,
  },
  {
    key: 'HGB',
    label: 'Hemoglobina (HGB)',
    aliases: [/(?:hemoglobina|hgb|hb)[\s:=]+([0-9.,]+)/i, /\b(?:hgb|hb)\b[\s:]*([0-9.,]+)/i],
    unit: 'g/dL',
    defaultRef: '12.0 - 16.5',
    minNormal: 12.0,
    maxNormal: 16.5,
    criticalLow: 7.0,
    criticalHigh: 20.0,
  },
  {
    key: 'HCT',
    label: 'Hematocrito (HCT)',
    aliases: [/(?:hematocrito|hct|hto)[\s:=]+([0-9.,]+)/i, /\b(?:hct|hto)\b[\s:]*([0-9.,]+)/i],
    unit: '%',
    defaultRef: '36.0 - 48.0',
    minNormal: 36.0,
    maxNormal: 48.0,
    criticalLow: 21.0,
    criticalHigh: 60.0,
  },
  {
    key: 'VCM',
    label: 'Volumen Corpuscular Medio (VCM / MCV)',
    aliases: [/(?:volumen corpuscular medio|vcm|mcv)[\s:=]+([0-9.,]+)/i, /\b(?:vcm|mcv)\b[\s:]*([0-9.,]+)/i],
    unit: 'fL',
    defaultRef: '80.0 - 100.0',
    minNormal: 80.0,
    maxNormal: 100.0,
    criticalLow: 65.0,
    criticalHigh: 115.0,
  },
  {
    key: 'HCM',
    label: 'Hemoglobina Corpuscular Media (HCM / MCH)',
    aliases: [/(?:hemoglobina corpuscular media|hcm|mch)[\s:=]+([0-9.,]+)/i, /\b(?:hcm|mch)\b[\s:]*([0-9.,]+)/i],
    unit: 'pg',
    defaultRef: '27.0 - 32.0',
    minNormal: 27.0,
    maxNormal: 32.0,
  },
  {
    key: 'CHCM',
    label: 'Concentración de HCM (CHCM / MCHC)',
    aliases: [/(?:concentracion de hemoglobina corpuscular|chcm|mchc)[\s:=]+([0-9.,]+)/i, /\b(?:chcm|mchc)\b[\s:]*([0-9.,]+)/i],
    unit: 'g/dL',
    defaultRef: '32.0 - 36.0',
    minNormal: 32.0,
    maxNormal: 36.0,
  },
  {
    key: 'PLT',
    label: 'Plaquetas (PLT)',
    aliases: [/(?:plaquetas|plt|recuento de plaquetas)[\s:=]+([0-9.,]+)/i, /\bplt\b[\s:]*([0-9.,]+)/i],
    unit: 'x10³/µL',
    defaultRef: '150 - 450',
    minNormal: 150,
    maxNormal: 450,
    criticalLow: 50,
    criticalHigh: 1000,
  },
  {
    key: 'MPV',
    label: 'Volumen Plaquetario Medio (MPV / VPM)',
    aliases: [/(?:volumen plaquetario medio|mpv|vpm)[\s:=]+([0-9.,]+)/i, /\b(?:mpv|vpm)\b[\s:]*([0-9.,]+)/i],
    unit: 'fL',
    defaultRef: '7.0 - 11.5',
    minNormal: 7.0,
    maxNormal: 11.5,
  },
  {
    key: 'NEUT',
    label: 'Neutrófilos % (NEUT)',
    aliases: [/(?:neutrofilos|segmentados|neut%|neut)[\s:=]+([0-9.,]+)/i, /\bneut(?:rofilos)?\b[\s:]*([0-9.,]+)/i],
    unit: '%',
    defaultRef: '45.0 - 70.0',
    minNormal: 45.0,
    maxNormal: 70.0,
    criticalLow: 20.0,
    criticalHigh: 85.0,
  },
  {
    key: 'LINF',
    label: 'Linfocitos % (LINF / LYM)',
    aliases: [/(?:linfocitos|linf%|linf|lymph%|lym)[\s:=]+([0-9.,]+)/i, /\b(?:linf|lym)\b[\s:]*([0-9.,]+)/i],
    unit: '%',
    defaultRef: '20.0 - 45.0',
    minNormal: 20.0,
    maxNormal: 45.0,
  },
  {
    key: 'MON',
    label: 'Monocitos % (MON)',
    aliases: [/(?:monocitos|mon%|mon)[\s:=]+([0-9.,]+)/i, /\bmon(?:ocitos)?\b[\s:]*([0-9.,]+)/i],
    unit: '%',
    defaultRef: '2.0 - 10.0',
    minNormal: 2.0,
    maxNormal: 10.0,
  },
  {
    key: 'EOS',
    label: 'Eosinófilos % (EOS)',
    aliases: [/(?:eosinofilos|eos%|eos)[\s:=]+([0-9.,]+)/i, /\beos(?:inofilos)?\b[\s:]*([0-9.,]+)/i],
    unit: '%',
    defaultRef: '1.0 - 5.0',
    minNormal: 1.0,
    maxNormal: 5.0,
  },
  {
    key: 'BAS',
    label: 'Basófilos % (BAS)',
    aliases: [/(?:basofilos|bas%|bas)[\s:=]+([0-9.,]+)/i, /\bbas(?:ofilos)?\b[\s:]*([0-9.,]+)/i],
    unit: '%',
    defaultRef: '0.0 - 2.0',
    minNormal: 0.0,
    maxNormal: 2.0,
  },
];

// Chemistry parameters defined in Section 12 & 13
export interface ChemistryDef {
  key: string;
  label: string;
  horizontalKey: string;
  aliases: RegExp[];
  unit: string;
  defaultRef: string;
  minNormal: number;
  maxNormal: number;
  criticalLow?: number;
  criticalHigh?: number;
}

export const CHEMISTRY_DEFINITIONS: ChemistryDef[] = [
  {
    key: 'GLUCOSA',
    label: 'Glucosa en suero',
    horizontalKey: 'GLUCOSA',
    aliases: [/(?:glucosa|glicemia|glic|glu)[\s:=]+([0-9.,]+)/i, /\b(?:glu|glicemia)\b[\s:]*([0-9.,]+)/i],
    unit: 'mg/dL',
    defaultRef: '70 - 100',
    minNormal: 70,
    maxNormal: 100,
    criticalLow: 54,
    criticalHigh: 300,
  },
  {
    key: 'ALP',
    label: 'Fosfatasa Alcalina (ALP)',
    horizontalKey: 'ALP',
    aliases: [/(?:fosfatasa alcalina|alp|falc)[\s:=]+([0-9.,]+)/i, /\b(?:alp|fa)\b[\s:]*([0-9.,]+)/i],
    unit: 'U/L',
    defaultRef: '44 - 147',
    minNormal: 44,
    maxNormal: 147,
  },
  {
    key: 'AMILASA',
    label: 'Amilasa sérica',
    horizontalKey: 'AMILASA',
    aliases: [/(?:amilasa|serum amylase)[\s:=]+([0-9.,]+)/i],
    unit: 'U/L',
    defaultRef: '28 - 100',
    minNormal: 28,
    maxNormal: 100,
    criticalHigh: 300,
  },
  {
    key: 'LIPASA',
    label: 'Lipasa sérica',
    horizontalKey: 'LIPASA',
    aliases: [/(?:lipasa|lipase)[\s:=]+([0-9.,]+)/i],
    unit: 'U/L',
    defaultRef: '10 - 60',
    minNormal: 10,
    maxNormal: 60,
    criticalHigh: 180,
  },
  {
    key: 'BIL-D',
    label: 'Bilirrubina Directa',
    horizontalKey: 'BIL-D',
    aliases: [/(?:bilirrubina directa|bil-d|bd)[\s:=]+([0-9.,]+)/i, /\b(?:bil-d|bd)\b[\s:]*([0-9.,]+)/i],
    unit: 'mg/dL',
    defaultRef: '0.0 - 0.3',
    minNormal: 0.0,
    maxNormal: 0.3,
    criticalHigh: 2.0,
  },
  {
    key: 'BIL-T',
    label: 'Bilirrubina Total',
    horizontalKey: 'BIL-T',
    aliases: [/(?:bilirrubina total|bil-t|bt)[\s:=]+([0-9.,]+)/i, /\b(?:bil-t|bt)\b[\s:]*([0-9.,]+)/i],
    unit: 'mg/dL',
    defaultRef: '0.2 - 1.2',
    minNormal: 0.2,
    maxNormal: 1.2,
    criticalHigh: 15.0,
  },
  {
    key: 'BIL-IND',
    label: 'Bilirrubina Indirecta',
    horizontalKey: 'BIL-IND',
    aliases: [/(?:bilirrubina indirecta|bil-ind|bi)[\s:=]+([0-9.,]+)/i, /\b(?:bil-ind|bi)\b[\s:]*([0-9.,]+)/i],
    unit: 'mg/dL',
    defaultRef: '0.2 - 0.8',
    minNormal: 0.2,
    maxNormal: 0.8,
  },
  {
    key: 'COLESTEROL',
    label: 'Colesterol Total',
    horizontalKey: 'COLESTEROL',
    aliases: [/(?:colesterol total|colesterol|chol)[\s:=]+([0-9.,]+)/i],
    unit: 'mg/dL',
    defaultRef: '< 200',
    minNormal: 120,
    maxNormal: 200,
  },
  {
    key: 'UREA',
    label: 'Urea sérica',
    horizontalKey: 'UREA',
    aliases: [/(?:urea)[\s:=]+([0-9.,]+)/i],
    unit: 'mg/dL',
    defaultRef: '15 - 45',
    minNormal: 15,
    maxNormal: 45,
    criticalHigh: 100,
  },
  {
    key: 'CREATININA',
    label: 'Creatinina sérica',
    horizontalKey: 'CREATININA',
    aliases: [/(?:creatinina|creat|cr)[\s:=]+([0-9.,]+)/i, /\bcr\b[\s:]*([0-9.,]+)/i],
    unit: 'mg/dL',
    defaultRef: '0.6 - 1.2',
    minNormal: 0.6,
    maxNormal: 1.2,
    criticalHigh: 4.0,
  },
  {
    key: 'TGO',
    label: 'TGO (AST)',
    horizontalKey: 'TGO',
    aliases: [/(?:tgo|ast|aspartato aminotransferasa)[\s:=]+([0-9.,]+)/i, /\btgo\b[\s:]*([0-9.,]+)/i],
    unit: 'U/L',
    defaultRef: '10 - 40',
    minNormal: 10,
    maxNormal: 40,
    criticalHigh: 200,
  },
  {
    key: 'TGP',
    label: 'TGP (ALT)',
    horizontalKey: 'TGP',
    aliases: [/(?:tgp|alt|alanina aminotransferasa)[\s:=]+([0-9.,]+)/i, /\btgp\b[\s:]*([0-9.,]+)/i],
    unit: 'U/L',
    defaultRef: '10 - 45',
    minNormal: 10,
    maxNormal: 45,
    criticalHigh: 200,
  },
  {
    key: 'HDL',
    label: 'Colesterol HDL (C-HDL)',
    horizontalKey: 'C-HDL',
    aliases: [/(?:c-hdl|hdl|colesterol hdl)[\s:=]+([0-9.,]+)/i],
    unit: 'mg/dL',
    defaultRef: '> 40',
    minNormal: 40,
    maxNormal: 70,
  },
  {
    key: 'LDL',
    label: 'Colesterol LDL (C-LDL)',
    horizontalKey: 'C-LDL',
    aliases: [/(?:c-ldl|ldl|colesterol ldl)[\s:=]+([0-9.,]+)/i],
    unit: 'mg/dL',
    defaultRef: '< 100',
    minNormal: 50,
    maxNormal: 100,
  },
  {
    key: 'VLDL',
    label: 'Colesterol VLDL (C-VLDL)',
    horizontalKey: 'C-VLDL',
    aliases: [/(?:c-vldl|vldl|colesterol vldl)[\s:=]+([0-9.,]+)/i],
    unit: 'mg/dL',
    defaultRef: '< 30',
    minNormal: 5,
    maxNormal: 30,
  },
  {
    key: 'TRIGLICERIDOS',
    label: 'Triglicéridos',
    horizontalKey: 'TRIGLICÉRIDOS',
    aliases: [/(?:trigliceridos|trigliceridos|tg)[\s:=]+([0-9.,]+)/i, /\btg\b[\s:]*([0-9.,]+)/i],
    unit: 'mg/dL',
    defaultRef: '< 150',
    minNormal: 40,
    maxNormal: 150,
    criticalHigh: 500,
  },
  {
    key: 'ALBUMINA',
    label: 'Albúmina sérica',
    horizontalKey: 'ALBÚMINA',
    aliases: [/(?:albumina|serum albumin)[\s:=]+([0-9.,]+)/i],
    unit: 'g/dL',
    defaultRef: '3.5 - 5.0',
    minNormal: 3.5,
    maxNormal: 5.0,
    criticalLow: 2.5,
  },
  {
    key: 'PROTEINAS_TOTALES',
    label: 'Proteínas Totales',
    horizontalKey: 'PROTEÍNAS TOTALES',
    aliases: [/(?:proteinas totales|proteina total|pt)[\s:=]+([0-9.,]+)/i],
    unit: 'g/dL',
    defaultRef: '6.4 - 8.3',
    minNormal: 6.4,
    maxNormal: 8.3,
  },
  {
    key: 'GLOBULINA',
    label: 'Globulina sérica',
    horizontalKey: 'GLOBULINA',
    aliases: [/(?:globulina|glob)[\s:=]+([0-9.,]+)/i],
    unit: 'g/dL',
    defaultRef: '2.0 - 3.5',
    minNormal: 2.0,
    maxNormal: 3.5,
  },
  {
    key: 'BUN',
    label: 'Nitrógeno Ureico en Sangre (BUN)',
    horizontalKey: 'BUN',
    aliases: [/(?:bun|nitrogeno ureico)[\s:=]+([0-9.,]+)/i, /\bbun\b[\s:]*([0-9.,]+)/i],
    unit: 'mg/dL',
    defaultRef: '7 - 20',
    minNormal: 7,
    maxNormal: 20,
    criticalHigh: 60,
  },
  {
    key: 'SODIO',
    label: 'Sodio sérico (Na+)',
    horizontalKey: 'SODIO',
    aliases: [/(?:sodio|na\+?)[\s:=]+([0-9.,]+)/i, /\bna\b[\s:]*([0-9.,]+)/i],
    unit: 'mEq/L',
    defaultRef: '135 - 145',
    minNormal: 135,
    maxNormal: 145,
    criticalLow: 120,
    criticalHigh: 155,
  },
  {
    key: 'POTASIO',
    label: 'Potasio sérico (K+)',
    horizontalKey: 'POTASIO',
    aliases: [/(?:potasio|k\+?)[\s:=]+([0-9.,]+)/i, /\bk\b[\s:]*([0-9.,]+)/i],
    unit: 'mEq/L',
    defaultRef: '3.5 - 5.0',
    minNormal: 3.5,
    maxNormal: 5.0,
    criticalLow: 2.8,
    criticalHigh: 6.0,
  },
  {
    key: 'CLORO',
    label: 'Cloro sérico (Cl-)',
    horizontalKey: 'CLORO',
    aliases: [/(?:cloro|cl-?)[\s:=]+([0-9.,]+)/i],
    unit: 'mEq/L',
    defaultRef: '98 - 106',
    minNormal: 98,
    maxNormal: 106,
  },
  {
    key: 'CALCIO',
    label: 'Calcio sérico (Ca)',
    horizontalKey: 'CALCIO',
    aliases: [/(?:calcio|ca\+?)[\s:=]+([0-9.,]+)/i],
    unit: 'mg/dL',
    defaultRef: '8.5 - 10.5',
    minNormal: 8.5,
    maxNormal: 10.5,
    criticalLow: 7.0,
    criticalHigh: 12.0,
  },
  {
    key: 'FOSFORO',
    label: 'Fósforo sérico (P)',
    horizontalKey: 'FÓSFORO',
    aliases: [/(?:fosforo|fosfato|p)[\s:=]+([0-9.,]+)/i],
    unit: 'mg/dL',
    defaultRef: '2.5 - 4.5',
    minNormal: 2.5,
    maxNormal: 4.5,
  },
  {
    key: 'MAGNESIO',
    label: 'Magnesio sérico (Mg)',
    horizontalKey: 'MAGNESIO',
    aliases: [/(?:magnesio|mg\+?)[\s:=]+([0-9.,]+)/i],
    unit: 'mg/dL',
    defaultRef: '1.7 - 2.4',
    minNormal: 1.7,
    maxNormal: 2.4,
  },
];

/**
 * Parses raw text extracted from an image or input and formats structured hemogram
 */
export function parseHemogramFromText(text: string): HemogramExtractionResult {
  const lines = text.split(/\r?\n/);
  const parameters: LabParameterDetection[] = [];

  let identifiedCount = 0;

  for (const def of HEMOGRAM_DEFINITIONS) {
    let detectedVal: string | null = null;
    let confidence: LabParameterDetection['confidence'] = 'NO IDENTIFICADO';

    for (const regex of def.aliases) {
      for (const line of lines) {
        const match = line.match(regex);
        if (match && match[1]) {
          detectedVal = match[1].replace(',', '.');
          confidence = 'alta';
          break;
        }
      }
      if (detectedVal) break;
    }

    if (!detectedVal) {
      // Intentar búsqueda tokenizada más flexible
      const looseRegex = new RegExp(`(?:^|\\s)${def.key}[\\s:=]+([0-9.,]+)`, 'i');
      for (const line of lines) {
        const match = line.match(looseRegex);
        if (match && match[1]) {
          detectedVal = match[1].replace(',', '.');
          confidence = 'media';
          break;
        }
      }
    }

    let flag: LabParameterDetection['flag'] = 'normal';
    const isIdentified = detectedVal !== null;

    if (isIdentified) {
      identifiedCount++;
      const num = parseFloat(detectedVal!);
      if (!isNaN(num)) {
        if (def.criticalLow !== undefined && num <= def.criticalLow) {
          flag = 'critico';
        } else if (def.criticalHigh !== undefined && num >= def.criticalHigh) {
          flag = 'critico';
        } else if (num < def.minNormal) {
          flag = 'bajo';
        } else if (num > def.maxNormal) {
          flag = 'alto';
        }
      }
    }

    parameters.push({
      key: def.key,
      label: def.label,
      value: detectedVal || 'NO IDENTIFICADO',
      unit: def.unit,
      referenceRange: def.defaultRef,
      confidence,
      flag,
      isIdentified,
    });
  }

  // Generate horizontal string strictly ordered:
  // GB: X | RBC: X | HGB: X | HCT: X | VCM: X | HCM: X | CHCM: X | PLT: X | MPV: X | NEUT: X | LINF: X | MON: X | EOS: X | BAS: X
  const horizontalSegments = parameters.map((p) => `${p.key}: ${p.value}`);
  const horizontalString = horizontalSegments.join(' | ');

  const confidenceScore = Math.round((identifiedCount / HEMOGRAM_DEFINITIONS.length) * 100);

  return {
    parameters,
    horizontalString,
    rawRecognizedText: text,
    timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
    confidenceScore,
  };
}

/**
 * Parses raw text extracted from an image or input and formats structured blood chemistries
 */
export function parseChemistryFromText(text: string): ChemistryExtractionResult {
  const lines = text.split(/\r?\n/);
  const parameters: LabParameterDetection[] = [];

  let identifiedCount = 0;

  for (const def of CHEMISTRY_DEFINITIONS) {
    let detectedVal: string | null = null;
    let confidence: LabParameterDetection['confidence'] = 'NO IDENTIFICADO';

    for (const regex of def.aliases) {
      for (const line of lines) {
        const match = line.match(regex);
        if (match && match[1]) {
          detectedVal = match[1].replace(',', '.');
          confidence = 'alta';
          break;
        }
      }
      if (detectedVal) break;
    }

    if (!detectedVal) {
      // Intentar búsqueda tokenizada flexible
      const looseRegex = new RegExp(`(?:^|\\s)${def.key}[\\s:=]+([0-9.,]+)`, 'i');
      for (const line of lines) {
        const match = line.match(looseRegex);
        if (match && match[1]) {
          detectedVal = match[1].replace(',', '.');
          confidence = 'media';
          break;
        }
      }
    }

    let flag: LabParameterDetection['flag'] = 'normal';
    const isIdentified = detectedVal !== null;

    if (isIdentified) {
      identifiedCount++;
      const num = parseFloat(detectedVal!);
      if (!isNaN(num)) {
        if (def.criticalLow !== undefined && num <= def.criticalLow) {
          flag = 'critico';
        } else if (def.criticalHigh !== undefined && num >= def.criticalHigh) {
          flag = 'critico';
        } else if (num < def.minNormal) {
          flag = 'bajo';
        } else if (num > def.maxNormal) {
          flag = 'alto';
        }
      }
    }

    parameters.push({
      key: def.key,
      label: def.label,
      value: detectedVal || 'NO IDENTIFICADO',
      unit: def.unit,
      referenceRange: def.defaultRef,
      confidence,
      flag,
      isIdentified,
    });
  }

  // Generar formatos horizontales según Secciones 12 y 13
  // Con unidades: GLUCOSA: 120 mg/dL | CREATININA: 1.2 mg/dL ...
  const withUnitsSegments = parameters
    .filter((p) => p.isIdentified)
    .map((p) => `${p.key}: ${p.value} ${p.unit}`);

  // Sin unidades: GLUCOSA: 120 | CREATININA: 1.2 ...
  const withoutUnitsSegments = parameters
    .filter((p) => p.isIdentified)
    .map((p) => `${p.key}: ${p.value}`);

  const horizontalWithUnits = withUnitsSegments.length > 0 ? withUnitsSegments.join(' | ') : 'Sin datos identificados';
  const horizontalWithoutUnits = withoutUnitsSegments.length > 0 ? withoutUnitsSegments.join(' | ') : 'Sin datos identificados';

  const confidenceScore = Math.round((identifiedCount / CHEMISTRY_DEFINITIONS.length) * 100);

  return {
    parameters,
    horizontalWithUnits,
    horizontalWithoutUnits,
    rawRecognizedText: text,
    timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
    confidenceScore,
  };
}
