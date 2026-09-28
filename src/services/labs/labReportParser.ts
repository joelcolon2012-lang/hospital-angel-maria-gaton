/**
 * Lector determinista de reportes de laboratorio (texto -> valores).
 *
 * Reglas de seguridad clínica:
 * - Solo toma números que están escritos junto al nombre del análisis. Nunca inventa ni completa.
 * - No convierte ni "corrige" unidades o magnitudes: si un valor no es fisiológicamente posible
 *   para la unidad habitual, lo marca para verificación en lugar de cambiarlo.
 * - Las abreviaturas cortas (K, NA, CL, CA, P, MG, CR…) solo se aceptan al inicio del renglón o
 *   después de un separador, para no confundir "mg/dL" con magnesio o "Creatinina" con sodio.
 * - Usa la unidad y el rango de referencia impresos en el reporte cuando existen.
 */
import { fold } from '../clinicalImport/noteParser';
import type { LabPanel, LabFlag } from '../../types';

export interface LabDef {
  key: string;
  label: string;
  panel: LabPanel;
  names: string[]; // en MAYÚSCULAS sin acentos
  unit: string;
  ref: string;
  min?: number;
  max?: number;
  critLow?: number;
  critHigh?: number;
  plausible: [number, number];
  percent?: boolean; // diferencial en %
}

export const LAB_CATALOG: LabDef[] = [
  // ----- Hemograma (orden institucional) -----
  { key: 'GB', label: 'Glóbulos Blancos (GB / WBC)', panel: 'Hemograma', names: ['LEUCOCITOS', 'LEUCOS', 'WBC', 'GB', 'GLOBULOS BLANCOS', 'RECUENTO DE LEUCOCITOS', 'LEUCOCITOS TOTALES', 'WHITE BLOOD CELLS'], unit: 'x10³/µL', ref: '4.5 - 11.0', min: 4.5, max: 11, critLow: 2, critHigh: 30, plausible: [0.1, 600] },
  { key: 'RBC', label: 'Glóbulos Rojos (RBC)', panel: 'Hemograma', names: ['ERITROCITOS', 'HEMATIES', 'RBC', 'GR', 'GLOBULOS ROJOS', 'RECUENTO DE ERITROCITOS'], unit: 'x10⁶/µL', ref: '4.0 - 5.5', min: 4, max: 5.5, plausible: [0.3, 9] },
  { key: 'HGB', label: 'Hemoglobina (HGB)', panel: 'Hemograma', names: ['HEMOGLOBINA', 'HGB', 'HB'], unit: 'g/dL', ref: '12.0 - 16.5', min: 12, max: 16.5, critLow: 7, critHigh: 20, plausible: [1, 26] },
  { key: 'HCT', label: 'Hematocrito (HCT)', panel: 'Hemograma', names: ['HEMATOCRITO', 'HCT', 'HTO'], unit: '%', ref: '36.0 - 48.0', min: 36, max: 48, critLow: 20, critHigh: 60, plausible: [4, 80] },
  { key: 'VCM', label: 'Volumen Corpuscular Medio (VCM / MCV)', panel: 'Hemograma', names: ['VCM', 'MCV', 'VOLUMEN CORPUSCULAR MEDIO'], unit: 'fL', ref: '80.0 - 100.0', min: 80, max: 100, plausible: [40, 160] },
  { key: 'HCM', label: 'Hemoglobina Corpuscular Media (HCM / MCH)', panel: 'Hemograma', names: ['HCM', 'MCH', 'HEMOGLOBINA CORPUSCULAR MEDIA'], unit: 'pg', ref: '27.0 - 32.0', min: 27, max: 32, plausible: [8, 60] },
  { key: 'CHCM', label: 'Concentración de HCM (CHCM / MCHC)', panel: 'Hemograma', names: ['CHCM', 'MCHC', 'CONCENTRACION DE HEMOGLOBINA CORPUSCULAR MEDIA', 'CONCENTRACION DE HEMOGLOBINA CORPUSCULAR', 'CONC. HB CORPUSCULAR MEDIA'], unit: 'g/dL', ref: '32.0 - 36.0', min: 32, max: 36, plausible: [15, 50] },
  { key: 'PLT', label: 'Plaquetas (PLT)', panel: 'Hemograma', names: ['PLAQUETAS', 'PLT', 'RECUENTO DE PLAQUETAS', 'PLAQ', 'PLATELETS'], unit: 'x10³/µL', ref: '150 - 450', min: 150, max: 450, critLow: 50, critHigh: 1000, plausible: [1, 2500] },
  { key: 'MPV', label: 'Volumen Plaquetario Medio (MPV / VPM)', panel: 'Hemograma', names: ['MPV', 'VPM', 'VOLUMEN PLAQUETARIO MEDIO'], unit: 'fL', ref: '7.0 - 11.5', min: 7, max: 11.5, plausible: [3, 25] },
  { key: 'NEUT', label: 'Neutrófilos % (NEUT)', panel: 'Hemograma', names: ['NEUTROFILOS', 'NEUTROFILOS SEGMENTADOS', 'SEGMENTADOS', 'NEUT', 'NEU', 'GRANULOCITOS', 'GRAN', 'NEUTROPHILS'], unit: '%', ref: '45.0 - 70.0', min: 45, max: 70, plausible: [0, 100], percent: true },
  { key: 'LINF', label: 'Linfocitos % (LINF / LYM)', panel: 'Hemograma', names: ['LINFOCITOS', 'LINF', 'LINFO', 'LYM', 'LYMPH', 'LYMPHOCYTES'], unit: '%', ref: '20.0 - 45.0', min: 20, max: 45, plausible: [0, 100], percent: true },
  { key: 'MON', label: 'Monocitos % (MON)', panel: 'Hemograma', names: ['MONOCITOS', 'MON', 'MONO', 'MONOCYTES'], unit: '%', ref: '2.0 - 10.0', min: 2, max: 10, plausible: [0, 100], percent: true },
  { key: 'EOS', label: 'Eosinófilos % (EOS)', panel: 'Hemograma', names: ['EOSINOFILOS', 'EOS', 'EOSINOPHILS'], unit: '%', ref: '1.0 - 5.0', min: 1, max: 5, plausible: [0, 100], percent: true },
  { key: 'BAS', label: 'Basófilos % (BAS)', panel: 'Hemograma', names: ['BASOFILOS', 'BAS', 'BASO', 'BASOPHILS'], unit: '%', ref: '0.0 - 2.0', min: 0, max: 2, plausible: [0, 100], percent: true },

  // ----- Química -----
  { key: 'GLUCOSA', label: 'Glucosa en suero', panel: 'Química', names: ['GLUCOSA', 'GLICEMIA', 'GLUCEMIA', 'GLU', 'GLUCOSA EN AYUNAS', 'GLUCOSA SERICA', 'GLUCOSA BASAL', 'GLUCOSE'], unit: 'mg/dL', ref: '70 - 100', min: 70, max: 100, critLow: 54, critHigh: 300, plausible: [5, 2500] },
  { key: 'ALP', label: 'Fosfatasa Alcalina (ALP)', panel: 'Función Hepática', names: ['FOSFATASA ALCALINA', 'ALP', 'FA', 'FAL', 'F. ALCALINA', 'ALKALINE PHOSPHATASE'], unit: 'U/L', ref: '44 - 147', min: 44, max: 147, plausible: [3, 8000] },
  { key: 'AMILASA', label: 'Amilasa sérica', panel: 'Química', names: ['AMILASA', 'AMILASA SERICA', 'AMYLASE'], unit: 'U/L', ref: '28 - 100', min: 28, max: 100, plausible: [1, 20000] },
  { key: 'LIPASA', label: 'Lipasa sérica', panel: 'Química', names: ['LIPASA', 'LIPASA SERICA', 'LIPASE'], unit: 'U/L', ref: '10 - 60', min: 10, max: 60, plausible: [1, 30000] },
  { key: 'BIL-D', label: 'Bilirrubina Directa', panel: 'Función Hepática', names: ['BILIRRUBINA DIRECTA', 'BIL-D', 'BILD', 'BD', 'BIL. DIRECTA', 'BIL DIRECTA'], unit: 'mg/dL', ref: '0.0 - 0.3', min: 0, max: 0.3, plausible: [0, 50] },
  { key: 'BIL-T', label: 'Bilirrubina Total', panel: 'Función Hepática', names: ['BILIRRUBINA TOTAL', 'BIL-T', 'BILT', 'BT', 'BIL. TOTAL', 'BIL TOTAL'], unit: 'mg/dL', ref: '0.2 - 1.2', min: 0.2, max: 1.2, plausible: [0, 70] },
  { key: 'BIL-IND', label: 'Bilirrubina Indirecta', panel: 'Función Hepática', names: ['BILIRRUBINA INDIRECTA', 'BIL-IND', 'BILI', 'BI', 'BIL. INDIRECTA', 'BIL INDIRECTA'], unit: 'mg/dL', ref: '0.2 - 0.8', min: 0.2, max: 0.8, plausible: [0, 50] },
  { key: 'COLESTEROL', label: 'Colesterol Total', panel: 'Química', names: ['COLESTEROL TOTAL', 'COLESTEROL', 'CHOL', 'CHOLESTEROL'], unit: 'mg/dL', ref: '< 200', max: 200, plausible: [20, 2000] },
  { key: 'UREA', label: 'Urea sérica', panel: 'Función Renal', names: ['UREA', 'UREA SERICA'], unit: 'mg/dL', ref: '15 - 45', min: 15, max: 45, plausible: [1, 800] },
  { key: 'CREATININA', label: 'Creatinina sérica', panel: 'Función Renal', names: ['CREATININA', 'CREATININA SERICA', 'CREAT', 'CR', 'CREATININE'], unit: 'mg/dL', ref: '0.6 - 1.2', min: 0.6, max: 1.2, critHigh: 5, plausible: [0.05, 40] },
  { key: 'TGO', label: 'TGO (AST)', panel: 'Función Hepática', names: ['TGO', 'AST', 'ASAT', 'SGOT', 'ASPARTATO AMINOTRANSFERASA', 'TGO/AST', 'AST/TGO'], unit: 'U/L', ref: '10 - 40', min: 10, max: 40, plausible: [1, 50000] },
  { key: 'TGP', label: 'TGP (ALT)', panel: 'Función Hepática', names: ['TGP', 'ALT', 'ALAT', 'SGPT', 'ALANINA AMINOTRANSFERASA', 'TGP/ALT', 'ALT/TGP'], unit: 'U/L', ref: '10 - 45', min: 10, max: 45, plausible: [1, 50000] },
  { key: 'HDL', label: 'Colesterol HDL (C-HDL)', panel: 'Química', names: ['COLESTEROL HDL', 'C-HDL', 'HDL', 'HDL COLESTEROL', 'HDL-C'], unit: 'mg/dL', ref: '> 40', min: 40, plausible: [1, 250] },
  { key: 'LDL', label: 'Colesterol LDL (C-LDL)', panel: 'Química', names: ['COLESTEROL LDL', 'C-LDL', 'LDL', 'LDL COLESTEROL', 'LDL-C'], unit: 'mg/dL', ref: '< 100', max: 100, plausible: [1, 800] },
  { key: 'VLDL', label: 'Colesterol VLDL (C-VLDL)', panel: 'Química', names: ['COLESTEROL VLDL', 'C-VLDL', 'VLDL', 'VLDL COLESTEROL'], unit: 'mg/dL', ref: '< 30', max: 30, plausible: [1, 500] },
  { key: 'TRIGLICERIDOS', label: 'Triglicéridos', panel: 'Química', names: ['TRIGLICERIDOS', 'TG', 'TRIGLICERIDOS SERICOS', 'TRIGLYCERIDES'], unit: 'mg/dL', ref: '< 150', max: 150, plausible: [5, 15000] },
  { key: 'ALBUMINA', label: 'Albúmina sérica', panel: 'Función Hepática', names: ['ALBUMINA', 'ALB', 'ALBUMINA SERICA', 'ALBUMIN'], unit: 'g/dL', ref: '3.5 - 5.0', min: 3.5, max: 5, plausible: [0.5, 8] },
  { key: 'PROTEINAS_TOTALES', label: 'Proteínas Totales', panel: 'Función Hepática', names: ['PROTEINAS TOTALES', 'PROTEINA TOTAL', 'PROTEINAS SERICAS TOTALES', 'TOTAL PROTEIN'], unit: 'g/dL', ref: '6.4 - 8.3', min: 6.4, max: 8.3, plausible: [1, 16] },
  { key: 'GLOBULINA', label: 'Globulina sérica', panel: 'Función Hepática', names: ['GLOBULINA', 'GLOBULINAS', 'GLOB'], unit: 'g/dL', ref: '2.0 - 3.5', min: 2, max: 3.5, plausible: [0.3, 12] },
  { key: 'BUN', label: 'Nitrógeno Ureico en Sangre (BUN)', panel: 'Función Renal', names: ['BUN', 'NITROGENO UREICO', 'NITROGENO UREICO EN SANGRE', 'N. UREICO'], unit: 'mg/dL', ref: '7 - 20', min: 7, max: 20, plausible: [1, 350] },
  { key: 'ACIDO_URICO', label: 'Ácido Úrico', panel: 'Química', names: ['ACIDO URICO', 'AC. URICO', 'AC URICO', 'URIC ACID'], unit: 'mg/dL', ref: '3.5 - 7.2', min: 3.5, max: 7.2, plausible: [0.1, 40] },
  { key: 'LDH', label: 'Deshidrogenasa Láctica (LDH)', panel: 'Química', names: ['LDH', 'DHL', 'DESHIDROGENASA LACTICA', 'LACTATO DESHIDROGENASA'], unit: 'U/L', ref: '140 - 280', min: 140, max: 280, plausible: [10, 50000] },
  { key: 'GGT', label: 'Gamma Glutamil Transferasa (GGT)', panel: 'Función Hepática', names: ['GGT', 'GAMMA GT', 'GAMMA GLUTAMIL TRANSFERASA', 'GAMMA-GT'], unit: 'U/L', ref: '8 - 61', min: 8, max: 61, plausible: [1, 10000] },
  { key: 'HBA1C', label: 'Hemoglobina glicosilada (HbA1c)', panel: 'Química', names: ['HBA1C', 'HB A1C', 'HEMOGLOBINA GLICOSILADA', 'HEMOGLOBINA GLICADA', 'A1C'], unit: '%', ref: '< 5.7', max: 5.7, plausible: [2, 25] },

  // ----- Electrolitos -----
  { key: 'SODIO', label: 'Sodio sérico (Na+)', panel: 'Electrolitos', names: ['SODIO', 'SODIO SERICO', 'NA', 'NA+', 'SODIUM'], unit: 'mEq/L', ref: '135 - 145', min: 135, max: 145, critLow: 120, critHigh: 160, plausible: [80, 220] },
  { key: 'POTASIO', label: 'Potasio sérico (K+)', panel: 'Electrolitos', names: ['POTASIO', 'POTASIO SERICO', 'K', 'K+', 'POTASSIUM'], unit: 'mEq/L', ref: '3.5 - 5.0', min: 3.5, max: 5, critLow: 2.5, critHigh: 6.5, plausible: [0.8, 12] },
  { key: 'CLORO', label: 'Cloro sérico (Cl-)', panel: 'Electrolitos', names: ['CLORO', 'CLORURO', 'CLORUROS', 'CL', 'CL-', 'CHLORIDE'], unit: 'mEq/L', ref: '98 - 106', min: 98, max: 106, plausible: [50, 180] },
  { key: 'CALCIO', label: 'Calcio sérico (Ca)', panel: 'Electrolitos', names: ['CALCIO', 'CALCIO TOTAL', 'CALCIO SERICO', 'CA', 'CA TOTAL', 'CALCIUM'], unit: 'mg/dL', ref: '8.5 - 10.5', min: 8.5, max: 10.5, critLow: 6.5, critHigh: 13, plausible: [2, 22] },
  { key: 'CALCIO_IONICO', label: 'Calcio iónico', panel: 'Electrolitos', names: ['CALCIO IONICO', 'CALCIO IONIZADO', 'CA IONICO', 'CA++ IONICO', 'ICA', 'CA2+'], unit: 'mmol/L', ref: '1.12 - 1.32', min: 1.12, max: 1.32, plausible: [0.2, 4] },
  { key: 'FOSFORO', label: 'Fósforo sérico (P)', panel: 'Electrolitos', names: ['FOSFORO', 'FOSFORO SERICO', 'FOSFATO', 'P', 'PO4', 'PHOSPHORUS'], unit: 'mg/dL', ref: '2.5 - 4.5', min: 2.5, max: 4.5, plausible: [0.2, 25] },
  { key: 'MAGNESIO', label: 'Magnesio sérico (Mg)', panel: 'Electrolitos', names: ['MAGNESIO', 'MAGNESIO SERICO', 'MG', 'MG++', 'MG2+', 'MAGNESIUM'], unit: 'mg/dL', ref: '1.7 - 2.4', min: 1.7, max: 2.4, plausible: [0.2, 12] },

  // ----- Gases arteriales -----
  { key: 'PH', label: 'pH', panel: 'Gases Arteriales', names: ['PH', 'PH ARTERIAL', 'PH VENOSO'], unit: '', ref: '7.35 - 7.45', min: 7.35, max: 7.45, critLow: 7.2, critHigh: 7.6, plausible: [6.5, 8] },
  { key: 'PCO2', label: 'pCO2', panel: 'Gases Arteriales', names: ['PCO2', 'PACO2', 'PVCO2'], unit: 'mmHg', ref: '35 - 45', min: 35, max: 45, plausible: [5, 200] },
  { key: 'PO2', label: 'pO2', panel: 'Gases Arteriales', names: ['PO2', 'PAO2', 'PVO2'], unit: 'mmHg', ref: '80 - 100', min: 80, max: 100, plausible: [5, 800] },
  { key: 'HCO3', label: 'Bicarbonato (HCO3)', panel: 'Gases Arteriales', names: ['HCO3', 'HCO3-', 'BICARBONATO', 'HCO3 ACT', 'HCO3ACT', 'HCO3 STD'], unit: 'mEq/L', ref: '22 - 26', min: 22, max: 26, plausible: [1, 70] },
  { key: 'SATO2', label: 'Saturación de O2', panel: 'Gases Arteriales', names: ['SATO2', 'SAT O2', 'SO2', 'SAO2', 'SAT. O2'], unit: '%', ref: '95 - 100', min: 95, max: 100, plausible: [10, 100] },
  { key: 'LACTATO', label: 'Lactato', panel: 'Gases Arteriales', names: ['LACTATO', 'ACIDO LACTICO', 'LAC', 'LACTATE'], unit: 'mmol/L', ref: '0.5 - 2.0', min: 0.5, max: 2, critHigh: 4, plausible: [0.1, 35] },

  // ----- Marcadores cardiacos -----
  { key: 'TROPONINA', label: 'Troponina', panel: 'Marcadores Cardiacos', names: ['TROPONINA', 'TROPONINA I', 'TROPONINA T', 'TROPONINA US', 'TNI', 'CTNI', 'HS-TNI', 'HS TNI', 'TNT', 'HS-TNT'], unit: 'ng/mL', ref: '< 0.04', plausible: [0, 1000000] },
  { key: 'CKMB', label: 'CK-MB', panel: 'Marcadores Cardiacos', names: ['CK-MB', 'CKMB', 'CPK-MB', 'CPK MB', 'CK MB'], unit: 'U/L', ref: '< 25', max: 25, plausible: [0, 20000] },
  { key: 'CPK', label: 'CPK total', panel: 'Marcadores Cardiacos', names: ['CPK', 'CK', 'CPK TOTAL', 'CK TOTAL', 'CREATINFOSFOQUINASA', 'CREATINQUINASA'], unit: 'U/L', ref: '26 - 192', min: 26, max: 192, plausible: [1, 500000] },
  { key: 'DIMERO_D', label: 'Dímero D', panel: 'Marcadores Cardiacos', names: ['DIMERO D', 'DIMERO-D', 'D-DIMERO', 'D DIMERO', 'DDIMER', 'D-DIMER'], unit: 'ng/mL', ref: '< 500', max: 500, plausible: [0, 200000] },
  { key: 'BNP', label: 'BNP', panel: 'Marcadores Cardiacos', names: ['BNP'], unit: 'pg/mL', ref: '< 100', max: 100, plausible: [0, 100000] },
  { key: 'NTPROBNP', label: 'NT-proBNP', panel: 'Marcadores Cardiacos', names: ['NT-PROBNP', 'NT PROBNP', 'NTPROBNP', 'PROBNP'], unit: 'pg/mL', ref: '< 125', max: 125, plausible: [0, 200000] },

  // ----- Coagulación -----
  { key: 'TP', label: 'Tiempo de protrombina (TP)', panel: 'Coagulación', names: ['TP', 'TIEMPO DE PROTROMBINA', 'T. PROTROMBINA', 'TIEMPO PROTROMBINA'], unit: 'seg', ref: '11 - 13.5', min: 11, max: 13.5, plausible: [5, 200] },
  { key: 'INR', label: 'INR', panel: 'Coagulación', names: ['INR'], unit: '', ref: '0.8 - 1.2', min: 0.8, max: 1.2, critHigh: 5, plausible: [0.5, 20] },
  { key: 'TPT', label: 'Tiempo parcial de tromboplastina (TPT)', panel: 'Coagulación', names: ['TPT', 'TTP', 'TTPA', 'APTT', 'PTT', 'TIEMPO PARCIAL DE TROMBOPLASTINA', 'TIEMPO DE TROMBOPLASTINA PARCIAL'], unit: 'seg', ref: '25 - 35', min: 25, max: 35, plausible: [10, 300] },
  { key: 'FIBRINOGENO', label: 'Fibrinógeno', panel: 'Coagulación', names: ['FIBRINOGENO'], unit: 'mg/dL', ref: '200 - 400', min: 200, max: 400, plausible: [10, 2000] },

  // ----- Inflamación y otros -----
  { key: 'PCR', label: 'Proteína C reactiva (PCR)', panel: 'Otros', names: ['PCR', 'PROTEINA C REACTIVA', 'CRP', 'PCR CUANTITATIVA'], unit: 'mg/L', ref: '< 5', max: 5, plausible: [0, 1000] },
  { key: 'PROCALCITONINA', label: 'Procalcitonina', panel: 'Otros', names: ['PROCALCITONINA', 'PCT'], unit: 'ng/mL', ref: '< 0.5', max: 0.5, plausible: [0, 2000] },
  { key: 'VSG', label: 'Velocidad de sedimentación (VSG)', panel: 'Otros', names: ['VSG', 'ERITROSEDIMENTACION', 'ESR'], unit: 'mm/h', ref: '0 - 20', min: 0, max: 20, plausible: [0, 200] },
  { key: 'FERRITINA', label: 'Ferritina', panel: 'Otros', names: ['FERRITINA'], unit: 'ng/mL', ref: '30 - 400', min: 30, max: 400, plausible: [0, 100000] }
];

export const HEMOGRAM_ORDER = ['GB', 'RBC', 'HGB', 'HCT', 'VCM', 'HCM', 'CHCM', 'PLT', 'MPV', 'NEUT', 'LINF', 'MON', 'EOS', 'BAS'];

export interface ParsedLabValue {
  key: string; // clave del catálogo, o "X:<NOMBRE>" si el análisis no está en el catálogo
  label: string;
  panel: LabPanel;
  value: string; // tal como está impreso (coma decimal -> punto). '' si ilegible
  num?: number;
  unit: string;
  ref: string;
  flag: LabFlag;
  sourceLine: string; // renglón original de donde salió el valor
  illegible?: boolean;
  implausible?: string; // explicación si el valor no es fisiológicamente posible
  printedUnit?: boolean;
  printedRef?: boolean;
}

// ---------------------------------------------------------------------------
const SHORT_OK_BEFORE = /(^|[\s]*[|,;:(\/\-•*·>]|\d\s*[.)]\s*)\s*$/;

interface NameHit {
  def: LabDef;
  start: number;
  end: number;
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const NAME_INDEX: Array<{ def: LabDef; name: string; re: RegExp; short: boolean }> = LAB_CATALOG.flatMap((def) =>
  def.names.map((name) => {
    const endsAlnum = /[A-Z0-9]$/.test(name);
    const re = new RegExp(`(?<![A-Z0-9])${escapeRe(name).replace(/ /g, '\\s+')}${endsAlnum ? '(?![A-Z0-9])' : ''}`, 'g');
    return { def, name, re, short: name.replace(/[^A-Z0-9]/g, '').length <= 2 };
  })
).sort((a, b) => b.name.length - a.name.length);

/** Busca todos los nombres de análisis del renglón (el más largo gana; sin solaparse). */
function findNames(F: string, isCell = false): NameHit[] {
  const hits: NameHit[] = [];
  const taken = new Array(F.length).fill(false);
  for (const n of NAME_INDEX) {
    n.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = n.re.exec(F))) {
      const s = m.index;
      const e = s + m[0].length;
      if (taken.slice(s, e).some(Boolean)) continue;
      if (n.short && !isCell && !SHORT_OK_BEFORE.test(F.slice(0, s))) continue;
      // CA 19-9, CA 125, CA 15-3 son marcadores tumorales, no calcio
      if (n.def.key === 'CALCIO' && /^\s*(?:19|125|15|72|27|242|50)\b/.test(F.slice(e))) continue;
      // "PH" dentro de un texto normal no es pH (se exige un número cerca)
      for (let i = s; i < e; i++) taken[i] = true;
      hits.push({ def: n.def, start: s, end: e });
    }
  }
  return hits.sort((a, b) => a.start - b.start);
}

// Multiplicadores de unidades como "x10^3/uL" o "10³" no son resultados
const MULT_RE = /(?:[X×*]\s*)?10\s*(?:\^|E|\*\*?)\s*[0-9]+|(?:[X×*]\s*)?10[³⁶⁹]/g;
const NUM_RE = /(?<![A-Z0-9.,])([<>≤≥]=?\s*)?(\d{1,3}(?:,\d{3})+(?![.,]?\d)|\d+(?:[.,]\d+)?)(?![0-9])/g;

function blank(s: string) {
  return ' '.repeat(s.length);
}

function normNumber(raw: string): string {
  const r = raw.replace(/\s+/g, '');
  if (/^[<>≤≥]?=?\d{1,3}(,\d{3})+$/.test(r)) return r.replace(/,/g, ''); // separador de miles
  return r.replace(',', '.');
}

/** Primer número del segmento que sea resultado (no un rango de referencia ni un multiplicador). */
function firstResult(seg: string): { raw: string; index: number; end: number } | null {
  const S = seg.replace(MULT_RE, blank);
  NUM_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = NUM_RE.exec(S))) {
    const end = m.index + m[0].length;
    // ¿es el inicio de un rango "4.5 - 11.0"?
    if (/^\s*[-–]\s*\d/.test(S.slice(end)) && !m[1]) {
      const rest = /^\s*[-–]\s*\d+(?:[.,]\d+)?/.exec(S.slice(end));
      NUM_RE.lastIndex = end + (rest ? rest[0].length : 0);
      continue;
    }
    // ¿es el final de un rango?
    if (/\d\s*[-–]\s*$/.test(S.slice(0, m.index))) continue;
    return { raw: (m[1] || '') + m[2], index: m.index, end };
  }
  return null;
}

const UNIT_RE = /^\s*((?:[X×]\s*)?10\s*(?:\^|E)?\s*[0-9³⁶⁹]+\s*\/\s*[µuUmM]?[lL]|[%‰]|(?:mg|g|ng|pg|µg|ug|mEq|mmol|µmol|umol|U|UI|IU|mU|fL|fl|pg|mm|mmHg|seg|s|mL|dL|L|cel|mm3|µL|uL)(?:\s*\/\s*(?:dL|L|mL|µL|uL|h|hr|mm3|kg))?)(?![A-Za-z])/i;
const REF_RE = /(\d+(?:[.,]\d+)?\s*[-–]\s*\d+(?:[.,]\d+)?|[<>≤≥]=?\s*\d+(?:[.,]\d+)?)/;

function refBounds(ref: string): { lo?: number; hi?: number } {
  const r = ref.replace(/,/g, '.');
  let m = /(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/.exec(r);
  if (m) return { lo: +m[1], hi: +m[2] };
  m = /[<≤]=?\s*(\d+(?:\.\d+)?)/.exec(r);
  if (m) return { hi: +m[1] };
  m = /[>≥]=?\s*(\d+(?:\.\d+)?)/.exec(r);
  if (m) return { lo: +m[1] };
  return {};
}

function computeFlag(def: Partial<LabDef>, num: number | undefined, ref: string): LabFlag {
  if (num === undefined || !Number.isFinite(num)) return 'normal';
  if (def.critLow !== undefined && num <= def.critLow) return 'critico';
  if (def.critHigh !== undefined && num >= def.critHigh) return 'critico';
  const b = refBounds(ref);
  const lo = b.lo ?? def.min;
  const hi = b.hi ?? def.max;
  if (lo !== undefined && num < lo) return 'bajo';
  if (hi !== undefined && num > hi) return 'alto';
  return 'normal';
}

function plausibility(def: LabDef, num: number | undefined, unit: string): string | undefined {
  if (num === undefined) return undefined;
  const [lo, hi] = def.plausible;
  if (num >= lo && num <= hi) return undefined;
  if (def.key === 'PLT' && num > 2500) return `Parece estar en /µL (${num} = ${Math.round(num / 1000)} x10³/µL). Verifique la unidad; no se cambió.`;
  if (def.key === 'GB' && num > 600) return `Parece estar en /µL (${num} = ${(num / 1000).toFixed(1)} x10³/µL). Verifique la unidad; no se cambió.`;
  return `Valor fuera de lo posible para ${def.label}${unit ? ` en ${unit}` : ''}. Verifique en la foto; no se cambió.`;
}

function buildValue(def: LabDef, rawValue: string, sourceLine: string, unitTxt?: string, refTxt?: string): ParsedLabValue {
  const illegible = /ILEGIBLE|\?\?|\[\s*\]/i.test(rawValue) || rawValue.trim() === '';
  const value = illegible ? '' : normNumber(rawValue);
  const n = parseFloat(value.replace(/^[<>≤≥]=?/, ''));
  const num = Number.isFinite(n) ? n : undefined;
  const unit = unitTxt && unitTxt.trim() ? unitTxt.trim() : def.unit;
  const ref = refTxt && refTxt.trim() ? refTxt.trim() : def.ref;
  return {
    key: def.key,
    label: def.label,
    panel: def.panel,
    value,
    num,
    unit,
    ref,
    flag: illegible ? 'normal' : computeFlag(def, num, ref),
    sourceLine: sourceLine.trim(),
    illegible,
    implausible: illegible ? undefined : plausibility(def, num, unit),
    printedUnit: Boolean(unitTxt && unitTxt.trim()),
    printedRef: Boolean(refTxt && refTxt.trim())
  };
}

/** Renglón en formato de tabla: NOMBRE | RESULTADO | UNIDAD | REFERENCIA */
function parseTableRow(line: string): ParsedLabValue | null {
  const cols = line.split('|').map((c) => c.trim());
  if (cols.length < 2) return null;
  const nameCell = cols[0];
  const valueCell = cols[1] || '';
  if (!nameCell || /^(NOMBRE|ANALISIS|PRUEBA|FECHA|PACIENTE)\b/i.test(fold(nameCell))) return null;
  const hasNumber = /\d/.test(valueCell);
  const illegible = /ILEGIBLE/i.test(valueCell);
  if (!hasNumber && !illegible) return null;
  const F = fold(nameCell);
  const hits = findNames(F, true);
  // Se toma el nombre que ocupa la mayor parte de la celda
  const best = hits.sort((a, b) => b.end - b.start - (a.end - a.start))[0];
  // "GB: 14 | HB: 11" no es una tabla: el número ya está junto al nombre
  if (best && firstResult(nameCell.slice(best.end))) return null;
  if (!best && /[:=]\s*\d/.test(nameCell)) return null;
  const rawVal = illegible ? '' : (firstResult(valueCell)?.raw ?? '');
  if (!illegible && !rawVal) return null;
  if (best) return buildValue(best.def, rawVal, line, cols[2], cols[3]);
  // Análisis que no está en el catálogo: se conserva tal cual (panel Otros)
  const name = nameCell.replace(/\s+/g, ' ').trim();
  if (name.length < 2 || name.length > 60) return null;
  const pseudo: LabDef = { key: `X:${fold(name)}`, label: name, panel: 'Otros', names: [], unit: '', ref: '', plausible: [-Infinity, Infinity] };
  return buildValue(pseudo, rawVal, line, cols[2], cols[3]);
}

/**
 * Lee todos los valores de laboratorio de un texto.
 * Si un análisis aparece varias veces, se conserva la primera aparición.
 */
export function parseLabText(text: string): ParsedLabValue[] {
  const out: ParsedLabValue[] = [];
  const seen = new Set<string>();
  const push = (v: ParsedLabValue | null) => {
    if (!v || seen.has(v.key)) return;
    seen.add(v.key);
    out.push(v);
  };
  const lines = String(text || '')
    .replace(/\r\n?/g, '\n')
    .split('\n');
  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, '  ');
    if (!line.trim()) continue;
    if (line.includes('|')) {
      const row = parseTableRow(line);
      if (row) {
        push(row);
        continue;
      }
    }
    const F = fold(line);
    const hits = findNames(F);
    for (let i = 0; i < hits.length; i++) {
      const h = hits[i];
      const segEnd = i + 1 < hits.length ? hits[i + 1].start : line.length;
      let seg = line.slice(h.end, segEnd);
      // Diferencial: "NEUT# 5.2" o "NEUTROFILOS ABS" es valor absoluto, no porcentaje
      if (h.def.percent && /^\s*(#|ABS|ABSOLUTO|ABSOLUTOS|TOTAL(?:ES)?\b)/i.test(fold(seg))) continue;
      if (/^\s*[:=]?\s*ILEGIBLE/i.test(fold(seg))) {
        push(buildValue(h.def, '', line));
        continue;
      }
      const r = firstResult(seg);
      if (!r) continue;
      // Nada más que separadores/indicadores entre el nombre y el número (evita tomar números de otra frase)
      if (seg.slice(0, r.index).trim().length > 40) continue;
      const after = seg.slice(r.end);
      const u = UNIT_RE.exec(after);
      const refM = REF_RE.exec(after.slice(u ? u[0].length : 0));
      push(buildValue(h.def, r.raw, line, u ? u[1] : undefined, refM ? refM[1] : undefined));
    }
  }
  return out;
}

export const catalogByKey = (key: string) => LAB_CATALOG.find((d) => d.key === key);

/** Recalcula la alerta (alto/bajo/crítico) de un valor editado por el médico. */
export function flagFor(key: string, value: string, ref: string): LabFlag {
  const def = catalogByKey(key) || {};
  const n = parseFloat(String(value).replace(',', '.').replace(/^[<>≤≥]=?/, ''));
  return computeFlag(def, Number.isFinite(n) ? n : undefined, ref);
}

/** ¿El valor editado es fisiológicamente posible? */
export function plausibilityFor(key: string, value: string, unit: string): string | undefined {
  const def = catalogByKey(key);
  if (!def) return undefined;
  const n = parseFloat(String(value).replace(',', '.').replace(/^[<>≤≥]=?/, ''));
  return plausibility(def, Number.isFinite(n) ? n : undefined, unit);
}
