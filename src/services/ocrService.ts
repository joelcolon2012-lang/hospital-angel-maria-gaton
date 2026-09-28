/**
 * Servicio de Extracción y Transcripción de Paraclínicos desde Imágenes o Texto
 * Hospital Regional Ángel María Gatón — Dr. Colón
 */

export interface ExtractedLabItem {
  parameter: string;
  value: string;
  unit: string;
  flag?: 'normal' | 'alto' | 'bajo' | 'critico';
  referenceRange?: string;
  panel: 'Hemograma' | 'Química' | 'Electrolitos' | 'Función Renal' | 'Gases Arteriales' | 'Marcadores Cardiacos' | 'Otros';
}

export interface ExtractedParaclinicalReport {
  rawText: string;
  items: ExtractedLabItem[];
  summaryText: string; // Formateado listo para nota de ingreso o evolución
}

import { parseLabText } from './labs/labReportParser';

const PANELS: ExtractedLabItem['panel'][] = ['Hemograma', 'Química', 'Electrolitos', 'Función Renal', 'Gases Arteriales', 'Marcadores Cardiacos', 'Otros'];

/**
 * Reconoce los valores de un texto de paraclínicos (lector determinista, sin inventar).
 */
export function parseParaclinicalText(rawText: string): ExtractedParaclinicalReport {
  const items: ExtractedLabItem[] = parseLabText(rawText)
    .filter((v) => v.value && !v.illegible)
    .map((v) => ({
      parameter: v.label,
      value: v.value,
      unit: v.unit,
      flag: v.flag,
      referenceRange: v.ref,
      panel: (PANELS as string[]).includes(v.panel) ? (v.panel as ExtractedLabItem['panel']) : v.panel === 'Función Hepática' ? 'Química' : 'Otros'
    }));
  const summaryText = items.length
    ? items.map((i) => `${i.parameter}: ${i.value} ${i.unit} ${i.flag !== 'normal' ? `[${i.flag?.toUpperCase()}]` : ''}`).join(', ')
    : rawText.trim();
  return { rawText, items, summaryText };
}
