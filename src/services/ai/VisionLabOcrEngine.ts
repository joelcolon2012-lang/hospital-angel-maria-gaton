/**
 * VisionLabOcrEngine: lectura de hemograma y químicas desde fotos o archivos.
 * Delega en labPhotoReader (doble lectura + lector determinista).
 * NUNCA devuelve valores de ejemplo: si no se puede leer, lanza un error claro.
 */
import { HemogramExtractionResult, ChemistryExtractionResult, parseHemogramFromText, parseChemistryFromText } from './VisionLabParser';
import { readLabFiles } from '../labs/labPhotoReader';

async function readAsText(fileOrText: File | string): Promise<string> {
  if (typeof fileOrText === 'string') {
    if (fileOrText.startsWith('data:')) throw new Error('Envíe el archivo, no una imagen en texto.');
    return fileOrText;
  }
  const r = await readLabFiles([fileOrText]);
  if (!r.items.length) throw new Error(r.warnings.join(' ') || 'No se pudo leer el reporte.');
  // Solo valores confirmados por ambas lecturas o del texto del archivo
  return r.items
    .filter((i) => (i.status === 'coincide' || i.status === 'archivo') && i.value)
    .map((i) => `${i.key.replace(/_/g, ' ')} | ${i.value} | ${i.unit} | ${i.ref}`)
    .join('\n');
}

export class VisionLabOcrEngine {
  public static async extractHemogramFromImageOrFile(fileOrText: File | string, _ctx?: { age?: number; sex?: string }): Promise<HemogramExtractionResult> {
    return parseHemogramFromText(await readAsText(fileOrText));
  }

  public static async extractChemistryFromImageOrFile(fileOrText: File | string, _ctx?: { age?: number; sex?: string }): Promise<ChemistryExtractionResult> {
    return parseChemistryFromText(await readAsText(fileOrText));
  }
}

export default VisionLabOcrEngine;
