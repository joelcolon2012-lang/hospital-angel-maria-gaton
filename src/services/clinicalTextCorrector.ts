/**
 * ClinicalTextCorrector - Corrector Ortográfico y Gramatical Clínico Conservador
 * Hospital Regional Dr. Ángel María Gatón — Dr. Joel Colón
 * 
 * FASE 11:
 * Corrige ortografía, acentuación, puntuación, errores de digitación y concordancia básica.
 * DEBE SER ESTRICTAMENTE CONSERVADOR:
 * - NO inventar síntomas ni diagnósticos
 * - NO cambiar números, dosis, vías ni medicamentos
 * - NO interpretar paraclínicos ni inventar datos
 * - El significado clínico debe permanecer exactamente igual.
 */

// Diccionario de corrección ortográfica médica conservadora
const CLINICAL_SPELLING_CORRECTIONS: Record<string, string> = {
  // Errores de digitación frecuentes
  'paciete': 'paciente',
  'pacinte': 'paciente',
  'paciene': 'paciente',
  'anos': 'años',
  'ano': 'año',
  'sintomas': 'síntomas',
  'sintoma': 'síntoma',
  'sintomatologia': 'sintomatología',
  'dolor toracico': 'dolor torácico',
  'toracico': 'torácico',
  'toracica': 'torácica',
  'pleuritico': 'pleurítico',
  'pleuritica': 'pleurítica',
  'evolucion': 'evolución',
  'asociado disnea': 'asociado a disnea',
  'asociada disnea': 'asociada a disnea',
  'disnea': 'disnea',
  'ortopnea': 'ortopnea',
  'cefalea': 'cefalea',
  'vomito': 'vómito',
  'vomitos': 'vómitos',
  'nausea': 'náusea',
  'nauseas': 'náuseas',
  'diarrea': 'diarrea',
  'astenia': 'astenia',
  'adinamia': 'adinamia',
  'hiporexia': 'hiporexia',
  'perdida': 'pérdida',
  'frecuencia cardiaca': 'frecuencia cardíaca',
  'cardiaca': 'cardíaca',
  'cardiaco': 'cardíaco',
  'cardiacos': 'cardíacos',
  'ritmicos': 'rítmicos',
  'ritmico': 'rítmico',
  'murmullo vesicular': 'murmullo vesicular',
  'estertores': 'estertores',
  'sibilancias': 'sibilancias',
  'roncus': 'roncus',
  'crepitantes': 'crepitantes',
  'isocoricas': 'isocóricas',
  'fotorreactivas': 'fotorreactivas',
  'anictéricas': 'anictéricas',
  'anidtericas': 'anictéricas',
  'anitericas': 'anictéricas',
  'palpacion': 'palpación',
  'auscultacion': 'auscultación',
  'inspeccion': 'inspección',
  'percusion': 'percusión',
  'normocefalo': 'normocéfalo',
  'normocefala': 'normocéfala',
  'hipotension': 'hipotensión',
  'hipertension': 'hipertensión',
  'hipertension arterial': 'hipertensión arterial',
  'diabetes mellitus': 'diabetes mellitus',
  'neumonia': 'neumonía',
  'insuficiencia renal': 'insuficiencia renal',
  'enfermedad renal cronica': 'enfermedad renal crónica',
  'cronico': 'crónico',
  'cronica': 'crónica',
  'agudo': 'agudo',
  'aguda': 'aguda',
  'quirurgico': 'quirúrgico',
  'quirurgicos': 'quirúrgicos',
  'quirurgica': 'quirúrgica',
  'toxico': 'tóxico',
  'toxicos': 'tóxicos',
  'alergico': 'alérgico',
  'alergicos': 'alérgicos',
  'alergia': 'alergia',
  'alergias': 'alergias',
  'terapeutico': 'terapéutico',
  'terapeuticos': 'terapéuticos',
  'terapeutica': 'terapéutica',
  'diagnostico': 'diagnóstico',
  'diagnosticos': 'diagnósticos',
  'hemograma': 'hemograma',
  'quimica': 'química',
  'quimicas': 'químicas',
  'electrocardiograma': 'electrocardiograma',
  'radiografia': 'radiografía',
  'tomografia': 'tomografía',
  'sonografia': 'sonografía',
  'ecocardiograma': 'ecocardiograma',
  'dimero': 'dímero',
  'fovea': 'fóvea',
  'globoso': 'globoso',
  'depresible': 'depresible',
  'peristalsis': 'peristalsis',
  'extremidades': 'extremidades',
  'simetricas': 'simétricas',
  'simetrico': 'simétrico',
  'asimetrico': 'asimétrico',
  'asimetricas': 'asimétricas',
  'neurologico': 'neurológico',
  'neurologica': 'neurológica',
  'consciente': 'consciente',
  'alerta': 'alerta',
  'orientado': 'orientado',
  'orientada': 'orientada',
  'reflejos': 'reflejos',
  'osteotendinosos': 'osteotendinosos',
};

export class ClinicalTextCorrector {

  /**
   * Aplica correcciones ortográficas y gramaticales conservadoras
   * preservando íntegramente números, nombres de fármacos, dosis y unidades.
   */
  public static correctClinicalText(text: string): string {
    if (!text) return '';

    let processed = text.trim();

    // 1. Reemplazos de palabras y frases conocidas sin alterar números ni unidades
    for (const [target, replacement] of Object.entries(CLINICAL_SPELLING_CORRECTIONS)) {
      // Coincidencia exacta de palabras límite
      const regex = new RegExp(`\\b${target}\\b`, 'gi');
      processed = processed.replace(regex, (match) => {
        // Mantener mayúscula inicial si el original la tenía
        if (match[0] === match[0].toUpperCase() && match.slice(1) === match.slice(1).toLowerCase()) {
          return replacement.charAt(0).toUpperCase() + replacement.slice(1);
        }
        if (match === match.toUpperCase()) {
          return replacement.toUpperCase();
        }
        return replacement.toLowerCase();
      });
    }

    // 2. Mayúscula al inicio del texto
    if (processed.length > 0) {
      processed = processed.charAt(0).toUpperCase() + processed.slice(1);
    }

    // 3. Mayúscula después de punto y seguido
    processed = processed.replace(/(\.\s+)([a-zñáéíóú])/g, (_, p1, p2) => `${p1}${p2.toUpperCase()}`);

    // 4. Asegurar punto final si termina en letra o número
    if (/[a-zA-Z0-9áéíóúñÁÉÍÓÚÑ]$/.test(processed)) {
      processed += '.';
    }

    return processed;
  }

  public static correctMedicalGrammarAndSpelling(text: string): string {
    return this.correctClinicalText(text);
  }
}
