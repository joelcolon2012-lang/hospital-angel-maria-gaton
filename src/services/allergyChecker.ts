export interface AllergyConflict {
  hasConflict: boolean;
  matchedAllergen: string;
  matchedMedication: string;
  crossReactivityGroup: string;
  warningMessage: string;
  severity: 'CRÍTICA' | 'ALTA' | 'MODERADA';
}

interface AllergenGroup {
  groupName: string;
  allergyKeywords: string[];
  medicationKeywords: string[];
  warningMessage: string;
}

const ALLERGEN_GROUPS: AllergenGroup[] = [
  {
    groupName: 'Betalactámicos / Penicilinas',
    allergyKeywords: ['penicilina', 'amoxicilina', 'ampicilina', 'betalactamico', 'piperacilina'],
    medicationKeywords: ['penicilina', 'amoxicilina', 'ampicilina', 'ampicilina/sulbactam', 'amoxicilina/clavulanico', 'piperacilina', 'tazobactam', 'ceftriaxona', 'cefazolina', 'cefepima', 'cefalotina', 'meropenem', 'imipenem'],
    warningMessage: 'El paciente tiene alergia registrada a Penicilinas/Betalactámicos. Riesgo de anafilaxia o reactividad cruzada.'
  },
  {
    groupName: 'AINEs (Antiinflamatorios No Esteroides)',
    allergyKeywords: ['aine', 'aines', 'aspirina', 'ibuprofeno', 'ketorolaco', 'diclofenac', 'diclofenaco', 'naproxeno', 'metamizol', 'dipirona'],
    medicationKeywords: ['aspirina', 'acido acetilsalicilico', 'ibuprofeno', 'ketorolaco', 'diclofenaco', 'diclofenac', 'naproxeno', 'metamizol', 'dipirona', 'ketoprofeno', 'meloxicam', 'celecoxib'],
    warningMessage: 'El paciente tiene alergia a AINEs. Riesgo de broncoespasmo, angioedema o reacción anafilactoide severa.'
  },
  {
    groupName: 'Sulfonamidas / Sulfas',
    allergyKeywords: ['sulfa', 'sulfas', 'sulfametoxazol', 'trimetoprim'],
    medicationKeywords: ['bactrim', 'trimetoprim', 'sulfametoxazol', 'sulfadiazina', 'furosemida'],
    warningMessage: 'El paciente tiene alergia registrada a Sulfas. Posible reacción cutánea grave o reactividad cruzada.'
  },
  {
    groupName: 'Opioides',
    allergyKeywords: ['tramadol', 'morfina', 'fentanilo', 'codeina', 'opioide'],
    medicationKeywords: ['tramadol', 'morfina', 'fentanilo', 'codeina', 'hidromorfona', 'oxicodona', 'buprenorfina'],
    warningMessage: 'Alergia registrada a Opioides. Riesgo de depresión respiratoria severa o colapso hemodinámico.'
  },
  {
    groupName: 'Contraste Yodado / Yodo',
    allergyKeywords: ['yodo', 'contraste', 'medio de contraste', 'mariscos'],
    medicationKeywords: ['contraste', 'yodado', 'iopamidol', 'iohexol', 'povidona'],
    warningMessage: 'Antecedente de hipersensibilidad al Yodo o Medio de Contraste. Riesgo de choque anafiláctico en estudios contrastados.'
  }
];

export function checkAllergyConflict(patientAllergies: string[] = [], medicationName: string): AllergyConflict | null {
  if (!medicationName || !patientAllergies || patientAllergies.length === 0) {
    return null;
  }

  const medLower = medicationName.toLowerCase().trim();

  for (const allergy of patientAllergies) {
    const allLower = allergy.toLowerCase().trim();

    // Direct string match
    if (allLower.length > 2 && (medLower.includes(allLower) || allLower.includes(medLower))) {
      return {
        hasConflict: true,
        matchedAllergen: allergy,
        matchedMedication: medicationName,
        crossReactivityGroup: 'Coincidencia directa de fármaco',
        warningMessage: `¡ALERTA ROJA! El paciente presenta alergia explícita a "${allergy}". Prescripción contraindicada salvo justificación extrema.`,
        severity: 'CRÍTICA'
      };
    }

    // Check cross-reactivity groups
    for (const group of ALLERGEN_GROUPS) {
      const allergyMatchesGroup = group.allergyKeywords.some(k => allLower.includes(k));
      const medMatchesGroup = group.medicationKeywords.some(k => medLower.includes(k));

      if (allergyMatchesGroup && medMatchesGroup) {
        return {
          hasConflict: true,
          matchedAllergen: allergy,
          matchedMedication: medicationName,
          crossReactivityGroup: group.groupName,
          warningMessage: `¡ADVERTENCIA DE ALERGIA CRUZADA! (${group.groupName}): ${group.warningMessage}`,
          severity: 'ALTA'
        };
      }
    }
  }

  return null;
}
