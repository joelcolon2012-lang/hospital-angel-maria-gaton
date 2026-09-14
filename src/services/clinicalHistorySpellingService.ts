/**
 * Motor de Corrección Ortográfica y Gramatical Médica Especializada
 * Hospital Regional Dr. Ángel María Gatón - Dr. Joel Colón
 *
 * Analiza textos clínicos en español, detecta tildes omitidas, errores de digitación y concordancia,
 * protegiendo estrictamente dosis, unidades, medicamentos, valores numéricos, siglas y lateralidades.
 */

import { ClinicalHistoryPlanta, SpellingCorrectionProposal } from '../types';

export class ClinicalHistorySpellingService {

  // Diccionario médico de correcciones seguras conocidas
  private medicalDictionary: Record<string, string> = {
    // Acentos y tildes médicas
    'normocefalo': 'normocéfalo',
    'normocefala': 'normocéfala',
    'anecterico': 'anictérico',
    'anicterico': 'anictérico',
    'anicterica': 'anictérica',
    'visceromegalia': 'visceromegalia',
    'visceromegalias': 'visceromegalias',
    'osteotendinoso': 'osteotendinoso',
    'osteotendinosos': 'osteotendinosos',
    'microcitica': 'microcítica',
    'microcitico': 'microcítico',
    'hipocromica': 'hipocrómica',
    'hipocromico': 'hipocrómico',
    'isquemico': 'isquémico',
    'isquemica': 'isquémica',
    'hemiparesia': 'hemiparesia',
    'disartria': 'disartria',
    'hiperglucemia': 'hiperglucemia',
    'hipoglucemia': 'hipoglucemia',
    'hipertension': 'hipertensión',
    'hipotension': 'hipotensión',
    'pulmon': 'pulmón',
    'pulmones': 'pulmones',
    'torax': 'tórax',
    'corazon': 'corazón',
    'estestertores': 'estertores',
    'estertores': 'estertores',
    'murmuyo': 'murmullo',
    'ingurgitacion': 'ingurgitación',
    'peristalsis': 'peristalsis',
    'isocoricas': 'isocóricas',
    'isocorica': 'isocórica',
    'anisocoricas': 'anisocóricas',
    'fotorreactivas': 'fotorreactivas',
    'fotoreactivas': 'fotorreactivas',
    'diadococinesia': 'diadococinesia',
    'diadococinecia': 'diadococinesia',
    'arreflexia': 'arreflexia',
    'hiporreflexia': 'hiporreflexia',
    'hiperreflexia': 'hiperreflexia',
    'crepitantes': 'crepitantes',
    'subcrepitantes': 'subcrepitantes',
    'sibilancias': 'sibilancias',
    'roncus': 'roncus',
    'eupneico': 'eupneico',
    'taquipneico': 'taquipneico',
    'bradipneico': 'bradipneico',
    'bradicardico': 'bradicárdico',
    'taquicardico': 'taquicárdico',
    'cardiopatia': 'cardiopatía',
    'nefropatia': 'nefropatía',
    'retinopatia': 'retinopatía',
    'neuropatia': 'neuropatía',
    'cronica': 'crónica',
    'cronico': 'crónico',
    'aguda': 'aguda',
    'agudo': 'agudo',
    'cefalico': 'cefálico',
    'cefalica': 'cefálica',
    'quirurgico': 'quirúrgico',
    'quirurgica': 'quirúrgica',
    'traumatico': 'traumático',
    'traumatica': 'traumática',
    'alergico': 'alérgico',
    'alergica': 'alérgica',
    'transfusional': 'transfusional',
    'transfusionales': 'transfusionales',
    'patologico': 'patológico',
    'patologica': 'patológica',
    'patologicos': 'patológicos',
    'patologicas': 'patológicas',
    'farmacologico': 'farmacológico',
    'farmacologica': 'farmacológica',
    'diagnostico': 'diagnóstico',
    'diagnosticos': 'diagnósticos'
  };

  // Siglas y unidades protegidas que jamás deben alterarse
  private protectedTokens = new Set([
    'MG', 'G', 'KG', 'MCG', 'ML', 'UI', 'MEQ', 'MMHG', 'L/MIN', 'R/MIN', 'C', 'F',
    'EV', 'IV', 'VO', 'SC', 'IM', 'SL', 'PRN', 'STAT', 'SOS',
    'HTA', 'DM', 'DM1', 'DM2', 'EVC', 'ACV', 'EPOC', 'ERC', 'IRA', 'IAM', 'ICC', 'FA',
    'AHA', 'ADA', 'KDIGO', 'GOLD', 'GLASGOW', 'NIHSS', 'DANIELS', 'EVA',
    'MSD', 'MSI', 'MID', 'MII', 'AO', 'RV', 'RM', 'PCR', 'VSG', 'TGO', 'TGP', 'DHL',
    'BUN', 'HB', 'HTO', 'VCM', 'HCM', 'CHCM', 'RDW', 'PO2', 'PCO2', 'HCO3', 'BE', 'SPO2'
  ]);

  /**
   * Determina si una palabra está protegida y no debe ser modificada
   */
  private isProtected(word: string): boolean {
    const clean = word.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!clean) return true;
    if (/^\d+$/.test(clean)) return true; // Números
    if (/^\d+([.,]\d+)?(MG|G|ML|KG|MCG|UI|MMHG|%|C)$/i.test(clean)) return true; // Dosis/unidades compuestas
    if (this.protectedTokens.has(clean)) return true; // Siglas protegidas
    return false;
  }

  /**
   * Analiza un texto clínico y genera propuestas de corrección
   */
  public analyzeText(text: string, sectionId: string, fieldKey: string): SpellingCorrectionProposal[] {
    if (!text || typeof text !== 'string') return [];

    const proposals: SpellingCorrectionProposal[] = [];
    const words = text.split(/\s+/);

    words.forEach((rawWord, idx) => {
      // Remover puntuación periférica
      const match = rawWord.match(/^([¿¡("']*)([a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]+)([.,;:!?)'"]*)$/);
      if (!match) return;

      const prefix = match[1];
      const coreWord = match[2];
      const suffix = match[3];

      if (this.isProtected(coreWord)) return;

      const lower = coreWord.toLowerCase();
      if (this.medicalDictionary[lower]) {
        const correctCore = this.medicalDictionary[lower];
        // Conservar mayúsculas o capitalización
        let finalProposed = correctCore;
        if (coreWord === coreWord.toUpperCase()) {
          finalProposed = correctCore.toUpperCase();
        } else if (coreWord[0] === coreWord[0].toUpperCase()) {
          finalProposed = correctCore.charAt(0).toUpperCase() + correctCore.slice(1);
        }

        if (finalProposed !== coreWord) {
          // Context snippet
          const startIdx = Math.max(0, idx - 3);
          const endIdx = Math.min(words.length, idx + 4);
          const snippet = words.slice(startIdx, endIdx).join(' ');

          proposals.push({
            id: `spell-${sectionId}-${fieldKey}-${idx}-${Date.now()}`,
            originalWord: coreWord,
            proposedWord: finalProposed,
            contextSnippet: `...${snippet}...`,
            sectionId,
            fieldKey,
            accepted: true
          });
        }
      }
    });

    return proposals;
  }

  /**
   * Analiza todos los campos editables de la Historia Clínica Planta
   */
  public analyzeHistory(history: ClinicalHistoryPlanta): SpellingCorrectionProposal[] {
    const allProposals: SpellingCorrectionProposal[] = [];

    const check = (text: string, sectionId: string, fieldKey: string) => {
      if (text) {
        const res = this.analyzeText(text, sectionId, fieldKey);
        allProposals.push(...res);
      }
    };

    // 1. Motivos de consulta
    history.chiefComplaints?.forEach((c, idx) => {
      check(c, 'sec-motivos-consulta', `chiefComplaint-${idx}`);
    });

    // 2. HDA
    check(history.presentIllness, 'sec-enfermedad-actual', 'presentIllness');

    // 3. Antecedentes patológicos
    check(history.pathologicalHistory.childhood, 'sec-patologicos', 'childhood');
    check(history.pathologicalHistory.adolescence, 'sec-patologicos', 'adolescence');
    check(history.pathologicalHistory.adulthood, 'sec-patologicos', 'adulthood');
    check(history.pathologicalHistory.hospitalizations, 'sec-patologicos', 'hospitalizations');
    check(history.pathologicalHistory.surgeries, 'sec-patologicos', 'surgeries');
    check(history.pathologicalHistory.trauma, 'sec-patologicos', 'trauma');
    check(history.pathologicalHistory.transfusions, 'sec-patologicos', 'transfusions');
    check(history.pathologicalHistory.allergies, 'sec-patologicos', 'allergies');

    // 4. No patológicos
    check(history.nonPathologicalHistory.previousJobs, 'sec-no-patologicos', 'previousJobs');
    check(history.nonPathologicalHistory.toxicExposure, 'sec-no-patologicos', 'toxicExposure');

    // 5. Examen físico por sistemas
    const pe = history.physicalExam;
    if (pe) {
      Object.entries(pe).forEach(([key, val]) => {
        check(val as string, 'sec-examen-fisico', key);
      });
    }

    // 6. Diagnósticos
    history.diagnoses?.forEach((d, idx) => {
      check(d.name, 'sec-diagnosticos', `diagnosis-${idx}`);
    });

    return allProposals;
  }
}

export const clinicalHistorySpellingService = new ClinicalHistorySpellingService();
