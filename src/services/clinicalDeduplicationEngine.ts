/**
 * ClinicalDeduplicationEngine - Motor de Desduplicación Clínica por Categorías
 * Hospital Regional Dr. Ángel María Gatón — Dr. Joel Colón
 * 
 * FASE 5:
 * Trabaja por CATEGORÍAS INDEPENDIENTES:
 * - Diagnósticos
 * - Antecedentes
 * - Medicamentos / Órdenes
 * - Síntomas
 * - Paraclínicos
 * - Alergias
 * 
 * REGLAS FUNDAMENTALES:
 * 1. Antes de eliminar dos elementos aparentemente duplicados con información diferente,
 *    CONSERVAR LA VERSIÓN MÁS COMPLETA (ej. "HTA" vs "HTA de 20 años tratada con enalapril").
 * 2. NUNCA combinar conceptos médicos diferentes ("HTA" y "DM2" permanecen independientes).
 * 3. En medicamentos, NUNCA eliminar órdenes con dosis o indicaciones diferentes
 *    (ej. Bolo de 80 mg vs Mantenimiento de 40 mg cada 12 horas).
 */

import { MedicalOrder, LabResult, StandardParaclinicalItem } from '../types';

/**
 * Normaliza internamente una clave médica para comparación semántica:
 * remueve tildes, signos de puntuación y pasa a minúsculas
 */
function toSemanticKey(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export class ClinicalDeduplicationEngine {

  /**
   * Desduplica una lista de diagnósticos nosológicos.
   * Si existen dos diagnósticos donde uno es una versión abreviada o incompleta del otro,
   * se conserva la versión más rica y completa.
   * Conceptos diferentes nunca se combinan.
   */
  public static deduplicateDiagnoses(diagnoses: string[]): string[] {
    if (!diagnoses || diagnoses.length <= 1) return diagnoses || [];

    const cleanedList = diagnoses
      .map(d => d.replace(/^[•\-*\d.\s]+/, '').trim())
      .filter(Boolean);

    const result: string[] = [];

    // Ordenar de mayor a menor longitud para que el más completo tenga prioridad
    const sorted = [...cleanedList].sort((a, b) => b.length - a.length);

    for (const item of sorted) {
      const semItem = toSemanticKey(item);
      if (!semItem) continue;

      // Verificar si ya existe un diagnóstico en result que sea semánticamente idéntico
      // o que contenga este término como subconcepto claro
      const alreadyCovered = result.some(existing => {
        const semExisting = toSemanticKey(existing);
        if (semExisting === semItem) return true;

        // Subconcepto exacto (ej. "hta" dentro de "hipertension arterial hta estadio ii")
        const wordsExisting = semExisting.split(' ');
        const wordsItem = semItem.split(' ');

        // Si item tiene pocas palabras y todas están contenidas en existing
        if (wordsItem.length <= 3 && wordsItem.every(w => wordsExisting.includes(w))) {
          return true;
        }

        return false;
      });

      if (!alreadyCovered) {
        result.push(item);
      }
    }

    // Retornar en el orden de prioridad original
    return cleanedList.filter(d => result.some(r => toSemanticKey(r) === toSemanticKey(d)));
  }

  /**
   * Desduplica órdenes médicas y prescripciones.
   * Elimina duplicados 100% idénticos (mismo fármaco, dosis, vía y frecuencia).
   * CONSERVA órdenes del mismo fármaco si varían en dosis, vía o frecuencia (ej. bolo vs infusión continua).
   */
  public static deduplicateMedicalOrders(orders: MedicalOrder[]): MedicalOrder[] {
    if (!orders || orders.length <= 1) return orders || [];

    const seenSignature = new Set<string>();
    const result: MedicalOrder[] = [];

    for (const ord of orders) {
      const nameKey = toSemanticKey(ord.name);
      const doseKey = toSemanticKey(ord.dose || '');
      const routeKey = toSemanticKey(ord.route || '');
      const freqKey = toSemanticKey(ord.frequency || '');
      const typeKey = ord.type || 'Medicamento';

      // Firma exacta de la orden clínica
      const signature = `${typeKey}|${nameKey}|${doseKey}|${routeKey}|${freqKey}`;

      if (!seenSignature.has(signature)) {
        seenSignature.add(signature);
        result.push(ord);
      }
    }

    return result;
  }

  /**
   * Desduplica antecedentes médicos patológicos.
   * Si existe un antecedente simple y otro detallado del mismo problema,
   * conserva el detallado.
   */
  public static deduplicateAntecedents(antecedents: string[]): string[] {
    if (!antecedents || antecedents.length <= 1) return antecedents || [];

    const cleaned = antecedents.map(a => a.trim()).filter(Boolean);
    const sorted = [...cleaned].sort((a, b) => b.length - a.length);
    const retained: string[] = [];

    for (const ant of sorted) {
      const semAnt = toSemanticKey(ant);
      if (!semAnt) continue;

      const isSubsumed = retained.some(existing => {
        const semEx = toSemanticKey(existing);
        if (semEx === semAnt) return true;

        // Si existing contiene todas las palabras clave del antecedente menor
        const words = semAnt.split(' ');
        if (words.length <= 3 && words.every(w => semEx.includes(w))) {
          return true;
        }
        return false;
      });

      if (!isSubsumed) {
        retained.push(ant);
      }
    }

    return retained;
  }

  /**
   * Desduplica lista de alergias
   */
  public static deduplicateAllergies(allergies: string[]): string[] {
    if (!allergies || allergies.length <= 1) return allergies || [];

    const seen = new Set<string>();
    const result: string[] = [];

    for (const al of allergies) {
      const key = toSemanticKey(al)
        .replace(/^alergia a la /i, '')
        .replace(/^alergia al /i, '')
        .replace(/^alergia a /i, '')
        .trim();

      if (key && !seen.has(key)) {
        seen.add(key);
        result.push(al.trim());
      }
    }

    return result;
  }

  /**
   * Desduplica resultados de paraclínicos evitando registros redundantes del mismo parámetro
   * en la misma fecha y hora
   */
  public static deduplicateParaclinicals<T extends { parameter: string; timestamp?: string; value: string }>(
    labs: T[]
  ): T[] {
    if (!labs || labs.length <= 1) return labs || [];

    const seen = new Set<string>();
    const result: T[] = [];

    for (const lab of labs) {
      const pKey = toSemanticKey(lab.parameter);
      const vKey = toSemanticKey(lab.value);
      const tKey = lab.timestamp ? lab.timestamp.slice(0, 16) : '';
      const signature = `${pKey}|${vKey}|${tKey}`;

      if (!seen.has(signature)) {
        seen.add(signature);
        result.push(lab);
      }
    }

    return result;
  }

  /**
   * Limpia y desduplica párrafos y oraciones repetidas en un texto narrativo
   */
  public static deduplicateNarrativeText(text: string): string {
    if (!text) return '';

    let result = text;

    // 1. Eliminar duplicación inicial de presentación ("SE TRATA DE PACIENTE ... REFIERE ... SE TRATA DE PACIENTE ...")
    const doublePresentationRegex = /^[\s\S]*?SE\s+TRATA\s+DE\s+PACIENTE[\s\S]*?\bREFIERE\s+(?:PACIENTE\s+QUE\s+(?:EST[EA]\s+)?)?(SE\s+TRATA\s+DE\s+PACIENTE[\s\S]*)/i;
    const matchDouble = result.match(doublePresentationRegex);
    if (matchDouble) {
      result = matchDouble[1].trim();
    }

    // 2. Normalizar y consolidar variantes acumuladas de cierre de ingreso al final de la narrativa
    const hasAdmissionClosing = /MOTIVOS?\s+POR\s+(?:LOS?\s+)?CUAL(?:ES)?|SE\s+DECIDE\s+SU\s+INGRESO|TRAS\s+(?:PREVIA\s+)?EVALUACI[OÓ]N/i.test(result);
    if (hasAdmissionClosing) {
      result = result.replace(/[,;\s.]*\b(?:MOTIVOS?\s+POR\s+(?:LOS?\s+)?CUAL(?:ES)?|SE\s+DECIDE\s+SU\s+INGRESO)[\s\S]*$/i, '').trim();
      result = result.replace(/[,;\s.]*\bTRAS\s+(?:PREVIA\s+)?EVALUACI[OÓ]N[\s\S]*$/i, '').trim();
      result = result.replace(/[,;\s.]*$/, '').trim();
      result += '. MOTIVO POR EL CUAL ES TRAÍDO A NUESTRO CENTRO DE SALUD. TRAS PREVIA EVALUACIÓN CLÍNICA Y PARACLÍNICA SE DECIDE SU INGRESO CON FINES DIAGNÓSTICOS Y TERAPÉUTICOS.';
    }

    const lines = result.split('\n');
    const seenLines = new Set<string>();
    const dedupedLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        dedupedLines.push('');
        continue;
      }

      // Preservar líneas de encabezado institucional
      if (trimmed.includes(':HOSPITAL') || trimmed.includes('H  DR.') || trimmed.includes('H DR.') || trimmed.length < 5) {
        dedupedLines.push(line);
        continue;
      }

      const upper = toSemanticKey(trimmed);
      if (seenLines.has(upper)) {
        continue; // Omitir línea idéntica repetida
      }
      seenLines.add(upper);

      // Desduplicar oraciones idénticas dentro de la misma línea
      if (line.includes('.')) {
        const sentences = line.split(/(?<=\.)\s+/);
        const seenSentences = new Set<string>();
        const dedupedSentences: string[] = [];

        for (const s of sentences) {
          const sKey = toSemanticKey(s);
          if (!sKey) continue;
          if (!seenSentences.has(sKey)) {
            seenSentences.add(sKey);
            dedupedSentences.push(s.trim());
          }
        }
        dedupedLines.push(dedupedSentences.join(' '));
      } else {
        dedupedLines.push(line);
      }
    }

    let finalStr = dedupedLines.join('\n');
    finalStr = finalStr.replace(/\b(paciente)\s+\1\b/gi, '$1');
    finalStr = finalStr.replace(/\b(masculino|femenina|femenino)\s+\1\b/gi, '$1');
    finalStr = finalStr.replace(/\b(de)\s+\1\b/gi, '$1');
    finalStr = finalStr.replace(/\bESTÁ\s+SE\b/gi, 'ESTA SE');
    finalStr = finalStr.replace(/\|\s*/g, '');
    finalStr = finalStr.replace(/\.\s*\./g, '.');
    finalStr = finalStr.replace(/,\s*,/g, ',');
    finalStr = finalStr.replace(/\s+([.,;:])/g, '$1');
    finalStr = finalStr.replace(/[ ]{2,}/g, ' ');

    return finalStr;
  }
}
