/**
 * ParaclinicalParser - Motor de Reconocimiento y Pegado Rápido de Paraclínicos
 * Hospital Regional Dr. Ángel María Gatón — Dr. Joel Colón
 * 
 * FASES 12 y 13:
 * Reconocimiento automático de parámetros, valores y paneles desde texto copiado o digitado:
 * e.g. "GB 11.12, HB 8.4, HCT 24.9, PLT 443, CREAT 8.59, BUN 107.8"
 */

import { LabResult, LabPanel, LabFlag } from '../types';

export interface ParsedLabItem {
  id: string;
  panel: LabPanel;
  parameter: string;
  value: string;
  numericValue?: number;
  unit: string;
  referenceRange: string;
  flag: LabFlag;
  rawTextMatch: string;
}

interface ParameterDefinition {
  canonicalName: string;
  panel: LabPanel;
  unit: string;
  referenceRange: string;
  patterns: RegExp[];
  normalMin?: number;
  normalMax?: number;
}

const PARAMETER_DEFINITIONS: ParameterDefinition[] = [
  // HEMOGRAMA
  {
    canonicalName: 'Glóbulos Blancos (GB / WBC)',
    panel: 'Hemograma',
    unit: 'x10³/µL',
    referenceRange: '4.5 - 11.0 x10³/µL',
    normalMin: 4.5,
    normalMax: 11.0,
    patterns: [/\b(gb|wbc|leucos|leucocitos|globulos\s+blancos)\b[:=\s]+([0-9]+[.,]?[0-9]*)/i]
  },
  {
    canonicalName: 'Hemoglobina (HB / HGB)',
    panel: 'Hemograma',
    unit: 'g/dL',
    referenceRange: '12.0 - 16.0 g/dL',
    normalMin: 12.0,
    normalMax: 16.0,
    patterns: [/\b(hb|hgb|hemoglobina)\b[:=\s]+([0-9]+[.,]?[0-9]*)/i]
  },
  {
    canonicalName: 'Hematocrito (HCT)',
    panel: 'Hemograma',
    unit: '%',
    referenceRange: '36.0 - 48.0 %',
    normalMin: 36.0,
    normalMax: 48.0,
    patterns: [/\b(hct|hematocrito)\b[:=\s]+([0-9]+[.,]?[0-9]*)/i]
  },
  {
    canonicalName: 'Plaquetas (PLT)',
    panel: 'Hemograma',
    unit: 'x10³/µL',
    referenceRange: '150 - 450 x10³/µL',
    normalMin: 150,
    normalMax: 450,
    patterns: [/\b(plt|plaquetas)\b[:=\s]+([0-9]+[.,]?[0-9]*)/i]
  },
  {
    canonicalName: 'Neutrófilos (NEU)',
    panel: 'Hemograma',
    unit: '%',
    referenceRange: '45.0 - 75.0 %',
    normalMin: 45.0,
    normalMax: 75.0,
    patterns: [/\b(neu|neut|neutrofilos|neutr[oó]filos%?)\b[:=\s]+([0-9]+[.,]?[0-9]*)/i]
  },
  {
    canonicalName: 'Linfocitos (LINF)',
    panel: 'Hemograma',
    unit: '%',
    referenceRange: '20.0 - 45.0 %',
    normalMin: 20.0,
    normalMax: 45.0,
    patterns: [/\b(linf|lymp|linfocitos|linfocitos%?)\b[:=\s]+([0-9]+[.,]?[0-9]*)/i]
  },
  {
    canonicalName: 'Glóbulos Rojos (GR / RBC)',
    panel: 'Hemograma',
    unit: 'x10⁶/µL',
    referenceRange: '4.0 - 5.5 x10⁶/µL',
    normalMin: 4.0,
    normalMax: 5.5,
    patterns: [/\b(gr|rbc|globulos\s+rojos|hematies)\b[:=\s]+([0-9]+[.,]?[0-9]*)/i]
  },
  {
    canonicalName: 'Volumen Corpuscular Medio (VCM)',
    panel: 'Hemograma',
    unit: 'fL',
    referenceRange: '80.0 - 100.0 fL',
    normalMin: 80.0,
    normalMax: 100.0,
    patterns: [/\b(vcm|mcv|mvc)\b[:=\s]+([0-9]+[.,]?[0-9]*)/i]
  },
  {
    canonicalName: 'HCM',
    panel: 'Hemograma',
    unit: 'pg',
    referenceRange: '27.0 - 33.0 pg',
    normalMin: 27.0,
    normalMax: 33.0,
    patterns: [/\b(hcm|mch|mhc)\b[:=\s]+([0-9]+[.,]?[0-9]*)/i]
  },

  // QUÍMICA & FUNCIÓN RENAL
  {
    canonicalName: 'Glucosa',
    panel: 'Química',
    unit: 'mg/dL',
    referenceRange: '70 - 105 mg/dL',
    normalMin: 70,
    normalMax: 105,
    patterns: [/\b(glucosa|glicemia|gluc)\b[:=\s]+([0-9]+[.,]?[0-9]*)/i]
  },
  {
    canonicalName: 'Creatinina',
    panel: 'Función Renal',
    unit: 'mg/dL',
    referenceRange: '0.6 - 1.2 mg/dL',
    normalMin: 0.6,
    normalMax: 1.2,
    patterns: [/\b(creat|creatinina|cr)\b[:=\s]+([0-9]+[.,]?[0-9]*)/i]
  },
  {
    canonicalName: 'Urea',
    panel: 'Función Renal',
    unit: 'mg/dL',
    referenceRange: '10 - 50 mg/dL',
    normalMin: 10,
    normalMax: 50,
    patterns: [/\b(urea)\b[:=\s]+([0-9]+[.,]?[0-9]*)/i]
  },
  {
    canonicalName: 'BUN (Nitrógeno Ureico)',
    panel: 'Función Renal',
    unit: 'mg/dL',
    referenceRange: '7 - 20 mg/dL',
    normalMin: 7,
    normalMax: 20,
    patterns: [/\b(bun|nitrogeno\s+ureico)\b[:=\s]+([0-9]+[.,]?[0-9]*)/i]
  },
  {
    canonicalName: 'Sodio (Na)',
    panel: 'Electrolitos',
    unit: 'mEq/L',
    referenceRange: '135 - 145 mEq/L',
    normalMin: 135,
    normalMax: 145,
    patterns: [/\b(na|sodio)\b[:=\s]+([0-9]+[.,]?[0-9]*)/i]
  },
  {
    canonicalName: 'Potasio (K)',
    panel: 'Electrolitos',
    unit: 'mEq/L',
    referenceRange: '3.5 - 5.1 mEq/L',
    normalMin: 3.5,
    normalMax: 5.1,
    patterns: [/\b(k|potasio)\b[:=\s]+([0-9]+[.,]?[0-9]*)/i]
  },
  {
    canonicalName: 'Cloro (Cl)',
    panel: 'Electrolitos',
    unit: 'mEq/L',
    referenceRange: '96 - 108 mEq/L',
    normalMin: 96,
    normalMax: 108,
    patterns: [/\b(cl|cloro)\b[:=\s]+([0-9]+[.,]?[0-9]*)/i]
  },
  {
    canonicalName: 'Calcio (Ca)',
    panel: 'Electrolitos',
    unit: 'mg/dL',
    referenceRange: '8.5 - 10.5 mg/dL',
    normalMin: 8.5,
    normalMax: 10.5,
    patterns: [/\b(calcio|ca)\b[:=\s]+([0-9]+[.,]?[0-9]*)/i]
  },

  // FUNCIÓN HEPÁTICA
  {
    canonicalName: 'TGO / AST',
    panel: 'Función Hepática',
    unit: 'U/L',
    referenceRange: '0 - 40 U/L',
    normalMax: 40,
    patterns: [/\b(tgo|ast)\b[:=\s]+([0-9]+[.,]?[0-9]*)/i]
  },
  {
    canonicalName: 'TGP / ALT',
    panel: 'Función Hepática',
    unit: 'U/L',
    referenceRange: '0 - 41 U/L',
    normalMax: 41,
    patterns: [/\b(tgp|alt)\b[:=\s]+([0-9]+[.,]?[0-9]*)/i]
  },
  {
    canonicalName: 'Bilirrubina Total',
    panel: 'Función Hepática',
    unit: 'mg/dL',
    referenceRange: '0.2 - 1.2 mg/dL',
    normalMax: 1.2,
    patterns: [/\b(bili\s*t|bilirrubina\s+total)\b[:=\s]+([0-9]+[.,]?[0-9]*)/i]
  },
  {
    canonicalName: 'Bilirrubina Directa',
    panel: 'Función Hepática',
    unit: 'mg/dL',
    referenceRange: '0.0 - 0.3 mg/dL',
    normalMax: 0.3,
    patterns: [/\b(bili\s*d|bilirrubina\s+directa)\b[:=\s]+([0-9]+[.,]?[0-9]*)/i]
  },
  {
    canonicalName: 'Albúmina',
    panel: 'Función Hepática',
    unit: 'g/dL',
    referenceRange: '3.5 - 5.0 g/dL',
    normalMin: 3.5,
    normalMax: 5.0,
    patterns: [/\b(albumina|alb[uú]mina)\b[:=\s]+([0-9]+[.,]?[0-9]*)/i]
  },

  // COAGULACIÓN
  {
    canonicalName: 'Tiempo de Protrombina (TP)',
    panel: 'Coagulación',
    unit: 'seg',
    referenceRange: '11.0 - 14.0 seg',
    normalMin: 11.0,
    normalMax: 14.0,
    patterns: [/\b(tp|tiempo\s+de\s+protrombina)\b[:=\s]+([0-9]+[.,]?[0-9]*)/i]
  },
  {
    canonicalName: 'INR',
    panel: 'Coagulación',
    unit: '',
    referenceRange: '0.8 - 1.2',
    normalMin: 0.8,
    normalMax: 1.2,
    patterns: [/\b(inr)\b[:=\s]+([0-9]+[.,]?[0-9]*)/i]
  },
  {
    canonicalName: 'TPT',
    panel: 'Coagulación',
    unit: 'seg',
    referenceRange: '25.0 - 38.0 seg',
    normalMin: 25.0,
    normalMax: 38.0,
    patterns: [/\b(tpt)\b[:=\s]+([0-9]+[.,]?[0-9]*)/i]
  }
];

export class ParaclinicalParser {

  /**
   * Parsea texto libre de laboratorios pegados en bloque o separados por coma
   */
  public static parsePastedLabs(text: string): ParsedLabItem[] {
    if (!text || text.trim().length === 0) return [];

    const foundItems: ParsedLabItem[] = [];
    const usedCanonical = new Set<string>();

    for (const def of PARAMETER_DEFINITIONS) {
      for (const pattern of def.patterns) {
        const match = text.match(pattern);
        if (match && !usedCanonical.has(def.canonicalName)) {
          usedCanonical.add(def.canonicalName);
          const rawVal = match[2].replace(',', '.');
          const numVal = parseFloat(rawVal);

          let flag: LabFlag = 'normal';
          if (!isNaN(numVal)) {
            if (def.normalMin !== undefined && numVal < def.normalMin) {
              flag = 'bajo';
            } else if (def.normalMax !== undefined && numVal > def.normalMax) {
              flag = 'alto';
            }
          }

          foundItems.push({
            id: 'lab-parsed-' + Math.random().toString(36).slice(2, 9),
            panel: def.panel,
            parameter: def.canonicalName,
            value: rawVal,
            numericValue: isNaN(numVal) ? undefined : numVal,
            unit: def.unit,
            referenceRange: def.referenceRange,
            flag,
            rawTextMatch: match[0]
          });

          break; // Uno por definición
        }
      }
    }

    return foundItems;
  }
}
