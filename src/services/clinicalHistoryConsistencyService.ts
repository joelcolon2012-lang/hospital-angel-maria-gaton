/**
 * Motor de Revisión de Coherencia y Discordancias Clínicas
 * Hospital Regional Dr. Ángel María Gatón - Dr. Joel Colón
 *
 * Emite advertencias y alertas clínicas inteligentes sin modificar datos automáticamente.
 */

import { ClinicalHistoryPlanta, ClinicalInconsistencyAlert } from '../types';

export class ClinicalHistoryConsistencyService {

  public reviewConsistency(history: ClinicalHistoryPlanta): ClinicalInconsistencyAlert[] {
    const alerts: ClinicalInconsistencyAlert[] = [];

    // 1. Discordancia de Sexo entre Datos Generales y Narrativa HDA
    const sexGen = (history.generalData.sexo || '').toUpperCase();
    const hda = (history.presentIllness || '').toUpperCase();
    if (sexGen === 'MASCULINO' && hda.includes('PACIENTE FEMENINA')) {
      alerts.push({
        id: 'sex-mismatch-f',
        type: 'DANGER',
        title: 'Posible Discordancia de Sexo',
        description: 'Los Datos Generales indican sexo MASCULINO, pero la Historia de la Enfermedad Actual describe "paciente femenina".',
        sectionId: 'sec-enfermedad-actual'
      });
    } else if (sexGen === 'FEMENINA' && hda.includes('PACIENTE MASCULINO')) {
      alerts.push({
        id: 'sex-mismatch-m',
        type: 'DANGER',
        title: 'Posible Discordancia de Sexo',
        description: 'Los Datos Generales indican sexo FEMENINA, pero la Historia de la Enfermedad Actual describe "paciente masculino".',
        sectionId: 'sec-enfermedad-actual'
      });
    }

    // 2. Discordancia de Lateralidad (HDA vs Examen Neurológico)
    const hdaHasRightWeakness = /DEBILIDAD.*DERECH|HEMIPARESIA.*DERECH|PLEJIA.*DERECH|HEMIPAR.*DER/i.test(hda);
    const hdaHasLeftWeakness = /DEBILIDAD.*IZQUIERD|HEMIPARESIA.*IZQUIERD|PLEJIA.*IZQUIERD|HEMIPAR.*IZQ/i.test(hda);
    const neuro = history.neurologicalExam;
    if (neuro) {
      const ms = neuro.muscleStrength;
      const leftLowerScore = (ms.leftUpper < 5 || ms.leftLower < 5);
      const rightLowerScore = (ms.rightUpper < 5 || ms.rightLower < 5);

      if (hdaHasRightWeakness && leftLowerScore && !rightLowerScore) {
        alerts.push({
          id: 'lat-mismatch-right',
          type: 'WARNING',
          title: 'Posible Inconsistencia de Lateralidad',
          description: 'La Historia de Enfermedad Actual describe debilidad del hemicuerpo DERECHO, pero el examen neurológico registra déficit motor en hemicuerpo IZQUIERDO.',
          sectionId: 'sec-neurologico'
        });
      } else if (hdaHasLeftWeakness && rightLowerScore && !leftLowerScore) {
        alerts.push({
          id: 'lat-mismatch-left',
          type: 'WARNING',
          title: 'Posible Inconsistencia de Lateralidad',
          description: 'La Historia de Enfermedad Actual describe debilidad del hemicuerpo IZQUIERDO, pero el examen neurológico registra déficit motor en hemicuerpo DERECHO.',
          sectionId: 'sec-neurologico'
        });
      }

      // 3. Discordancia entre Estado de Conciencia y Escala de Glasgow
      if (neuro.consciousness === 'Alerta' && neuro.glasgow.total < 14) {
        alerts.push({
          id: 'glasgow-high-alert',
          type: 'WARNING',
          title: 'Discordancia Conciencia vs Glasgow',
          description: `El estado de conciencia está registrado como "Alerta", pero la puntuación de Glasgow calculada es de ${neuro.glasgow.total}/15 (esperado 14-15/15).`,
          sectionId: 'sec-neurologico'
        });
      } else if ((neuro.consciousness === 'Coma' || neuro.consciousness === 'Estupor') && neuro.glasgow.total > 10) {
        alerts.push({
          id: 'glasgow-low-coma',
          type: 'DANGER',
          title: 'Discordancia Conciencia vs Glasgow',
          description: `El estado de conciencia está registrado como "${neuro.consciousness}", pero la puntuación de Glasgow calculada es de ${neuro.glasgow.total}/15.`,
          sectionId: 'sec-neurologico'
        });
      }
    }

    // 4. Diagnósticos duplicados
    const diags = history.diagnoses || [];
    const diagNames = diags.map(d => d.name.trim().toUpperCase());
    const duplicates = diagNames.filter((item, index) => diagNames.indexOf(item) !== index);
    if (duplicates.length > 0) {
      alerts.push({
        id: 'dup-diagnoses',
        type: 'WARNING',
        title: 'Diagnósticos Duplicados',
        description: `Existen diagnósticos duplicados en la lista: "${duplicates[0]}".`,
        sectionId: 'sec-diagnosticos'
      });
    }

    // 5. Alergias vs Medicamentos habituales
    const allergyText = (history.pathologicalHistory.allergies || '').toUpperCase();
    const meds = history.pathologicalHistory.medications || [];
    meds.forEach(m => {
      const mName = m.name.toUpperCase();
      if ((allergyText.includes('PENICILINA') || allergyText.includes('BETALACTAMICO')) && 
          (mName.includes('PENICILINA') || mName.includes('AMOXICILINA') || mName.includes('AMPICILINA') || mName.includes('CEFTRIAXONA'))) {
        alerts.push({
          id: `allergy-conflict-${m.id}`,
          type: 'DANGER',
          title: 'Conflicto Crítico de Alergia a Fármaco',
          description: `Se detectó antecedente alérgico ("${allergyText}") y el paciente tiene prescrito/habitual "${mName}".`,
          sectionId: 'sec-patologicos'
        });
      }
    });

    // 6. Signos vitales con valores de alerta clínica
    const vit = history.vitalSigns;
    if (vit) {
      if (vit.systolicBP && vit.systolicBP >= 180) {
        alerts.push({
          id: 'vitals-hta-crisis',
          type: 'WARNING',
          title: 'Crisis Hipertensiva Potencial',
          description: `La presión arterial sistólica (${vit.systolicBP} mmHg) sugiere emergencia/urgencia hipertensiva.`,
          sectionId: 'sec-signos-vitales'
        });
      }
      if (vit.oxygenSaturation && vit.oxygenSaturation < 90) {
        alerts.push({
          id: 'vitals-desat',
          type: 'DANGER',
          title: 'Hipoxemia Severa',
          description: `Saturación de O2 al ${vit.oxygenSaturation}% (menor a 90%). Evaluar requerimiento de oxigenoterapia.`,
          sectionId: 'sec-signos-vitales'
        });
      }
    }

    // 7. Incongruencia en Tabaquismo
    const tob = history.nonPathologicalHistory.tobacco;
    if (tob) {
      if (!tob.consumes && (tob.cigarettesPerDay > 0 || tob.yearsSmoking > 0)) {
        alerts.push({
          id: 'tobacco-contradiction',
          type: 'INFO',
          title: 'Datos de Tabaquismo para Verificar',
          description: `Se indicó que no consume tabaco, pero se registraron ${tob.cigarettesPerDay} cigarrillos/día o ${tob.yearsSmoking} años de consumo (IPA ${tob.packYears}). Verificar si se trata de exfumador.`,
          sectionId: 'sec-no-patologicos'
        });
      }
    }

    return alerts;
  }
}

export const clinicalHistoryConsistencyService = new ClinicalHistoryConsistencyService();
