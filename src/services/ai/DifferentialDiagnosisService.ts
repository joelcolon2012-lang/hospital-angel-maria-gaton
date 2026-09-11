/**
 * DifferentialDiagnosisService: AI-Powered Clinical Differential Generator
 * Hospital Regional Dr. Ángel María Gatón — Dr. Joel Colón
 *
 * Requirements (Phases 12 & 16; Sections 27, 28, 29):
 * - Analyzes comprehensive patient data:
 *   Age, Sex, Chief Complaint, HDA, Vitals, Physical Exam, Labs, Studies, Current Diagnoses.
 * - Formats differentials with:
 *   1. DIAGNÓSTICO
 *   - Argumentos a favor
 *   - Argumentos en contra
 *   - Estudios para confirmarlo / descartarlo
 *   - Urgencia clínica: ALTA, MEDIA, BAJA
 * - STRICT SAFETY RULE (Section 29):
 *   - AI NEVER automatically modifies or adds diagnoses without physician confirmation.
 *   - Physician must explicitly click "AGREGAR A IMPRESIÓN DIAGNÓSTICA".
 */

import { Patient, LabResult, MedicalStudy } from '../../types';
import { extractPatientLabMetrics } from '../clinicalScaleEngine';

export interface ReasonedDifferentialDiagnosis {
  id: string;
  diagnosisName: string;
  cie10Code?: string;
  argumentsInFavor: string[];
  argumentsAgainst: string[];
  confirmatoryStudies: string[];
  urgencyLevel: 'ALTA' | 'MEDIA' | 'BAJA';
  rationaleSummary: string;
}

export interface DifferentialAnalysisReport {
  patientId: string;
  primaryImpression: string;
  differentials: ReasonedDifferentialDiagnosis[];
  clinicalConsistencyWarnings: string[];
  timestamp: string;
}

/**
 * Evaluates patient history, vitals, exam, and paraclinical data to construct reasoned differential diagnoses
 */
export function generateReasonedDifferentials(
  patient: Patient,
  labs: LabResult[] = [],
  studies: MedicalStudy[] = []
): DifferentialAnalysisReport {
  const differentials: ReasonedDifferentialDiagnosis[] = [];
  const warnings: string[] = [];

  const history = patient.clinicalHistory;
  const vitals = patient.vitals;
  const labMetrics = extractPatientLabMetrics(labs);

  const complaint = (patient.chiefComplaint || history?.reasonForConsultation || '').toLowerCase();
  const hda = (history?.currentIllnessHistory || '').toLowerCase();
  const primaryDiag = (history?.clinicalImpression || patient.chiefComplaint || '').toLowerCase();

  const combinedText = `${complaint} ${hda} ${primaryDiag}`;

  // ==========================================================================
  // 1. ESCENARIO NEUROLÓGICO: DÉFICIT FOCAL / SOSPECHA DE EVC / ACV
  // ==========================================================================
  if (
    combinedText.includes('hemipares') ||
    combinedText.includes('disartria') ||
    combinedText.includes('afasia') ||
    combinedText.includes('evc') ||
    combinedText.includes('acv') ||
    combinedText.includes('ictus') ||
    combinedText.includes('deficit motor') ||
    combinedText.includes('desviacion de comisura')
  ) {
    differentials.push({
      id: 'diff-evc-isq',
      diagnosisName: 'EVC ISQUÉMICO AGUDO (INFARTO CEREBRAL)',
      cie10Code: 'I63.9',
      argumentsInFavor: [
        'Instauración súbita de déficit neurológico focal (hemiparesia / disartria / asimetría facial).',
        vitals?.systolicBP && vitals.systolicBP > 140
          ? `Presión arterial elevada (${vitals.systolicBP}/${vitals.diastolicBP} mmHg), factor de riesgo vascular cardinal.`
          : 'Presencia de factores de riesgo cardiovascular o edad de riesgo.',
        patient.age && patient.age >= 60 ? `Edad del paciente (${patient.age} años) de alta prevalencia vascular.` : 'Cuadro agudo consistente.',
      ],
      argumentsAgainst: [
        'No permite descartar sangrado intracraneal sin neuroimagen axial urgente.',
        'Descartar hipoglicemia como mímico de ictus antes de cualquier conducta invasiva.',
      ],
      confirmatoryStudies: [
        'TAC simple de cráneo sin contraste de emergencia (regla de oro inicial para descartar hemorragia).',
        'Angio-TAC de vasos intra y extracraneales (identificar oclusión de gran vaso / candidato a trombectomía).',
        'Glicemia capilar inmediata a la cabecera del paciente.',
        'Resonancia Magnética (secuencias DWI / FLAIR) si ventana dudosa.',
      ],
      urgencyLevel: 'ALTA',
      rationaleSummary: 'Emergencia tiempo-dependiente. Evaluar ventana de reperfusión (rt-PA/Tenecteplasa ≤ 4.5h o trombectomía ≤ 24h).',
    });

    differentials.push({
      id: 'diff-evc-hem',
      diagnosisName: 'HEMORRAGIA INTRACRANEAL / EVC HEMORRÁGICO',
      cie10Code: 'I61.9',
      argumentsInFavor: [
        'Déficit neurológico focal agudo en presencia de cifras tensionales severas.',
        combinedText.includes('cefalea') ? 'Presencia de cefalea intensa concomitante.' : 'Frecuente asociación con crisis hipertensiva.',
        vitals?.glasgowTotal && vitals.glasgowTotal < 14 ? 'Deterioro precoz del nivel de conciencia.' : 'Potencial compromiso encefálico.',
      ],
      argumentsAgainst: [
        'Clínicamente indistinguible con certeza del infarto isquémico sin tomografía.',
      ],
      confirmatoryStudies: [
        'TAC simple de cráneo urgente (hiperdensidad parenquimatosa o ventricular inmediata).',
        'Tiempo de Protrombina (TP/INR), TPT y recuento de plaquetas (descartar coagulopatía o efecto anticoagulante).',
      ],
      urgencyLevel: 'ALTA',
      rationaleSummary: 'Control tensional precoz agresivo (meta PAS 130-140 mmHg) y reversión de anticoagulación si aplica.',
    });

    differentials.push({
      id: 'diff-stroke-mimic',
      diagnosisName: 'MÍMICO DE ICTUS / HIPOGLUCEMIA GRAVE O CRISIS CONVULSIVA CON PARÁLISIS DE TODD',
      cie10Code: 'E16.2 / G40.9',
      argumentsInFavor: [
        labMetrics['glucose'] && labMetrics['glucose'] < 70
          ? `Glicemia sérica disminuida (${labMetrics['glucose']} mg/dL).`
          : 'La hipoglucemia es el mímico metabólico más frecuente de focalización neurológica.',
        'Parálisis posictal transitoria tras evento comicial no presenciado.',
      ],
      argumentsAgainst: [
        labMetrics['glucose'] && labMetrics['glucose'] >= 100
          ? 'Niveles de glucosa en rango normal descartan hipoglucemia aguda.'
          : 'Ausencia de antecedentes conocidos de epilepsia.',
      ],
      confirmatoryStudies: [
        'Glucemia capilar cuantitativa inmediata.',
        'Electroencefalograma (EEG) diferido si se sospecha estado no convulsivo.',
      ],
      urgencyLevel: 'MEDIA',
      rationaleSummary: 'Regla básica de seguridad: medir glucemia capilar en todo paciente con déficit neurológico agudo.',
    });
  }

  // ==========================================================================
  // 2. ESCENARIO DIGESTIVO: SANGRADO GASTROINTESTINAL
  // ==========================================================================
  if (
    combinedText.includes('melena') ||
    combinedText.includes('hematemesis') ||
    combinedText.includes('sangrado') ||
    combinedText.includes('epigastralgia') ||
    combinedText.includes('ulcera')
  ) {
    differentials.push({
      id: 'diff-sangrado-ulcera',
      diagnosisName: 'ÚLCERA PÉPTICA SANGRANTE (GÁSTRICA / DUODENAL)',
      cie10Code: 'K27.4',
      argumentsInFavor: [
        'Evidencia de sangrado digestivo alto manifestado por melena o hematemesis.',
        labMetrics['hgb'] && labMetrics['hgb'] < 11 ? `Descenso de hemoglobina (${labMetrics['hgb']} g/dL).` : 'Riesgo de hemorragia activa.',
        labMetrics['bun'] && labMetrics['bun'] > 20 ? `Elevación de BUN sérico (${labMetrics['bun']} mg/dL) por reabsorción de proteínas sanguíneas.` : 'Azotemia prerrenal frecuente.',
      ],
      argumentsAgainst: [
        'Requiere visualización endoscópica directa para clasificar grado de Forrest.',
      ],
      confirmatoryStudies: [
        'Endoscopia digestiva alta (Panendoscopia oral) dentro de las primeras 24 horas.',
        'Tipificación sanguínea y pruebas cruzadas (reserva de hemoderivados).',
        'Hemograma seriado de control cada 6 a 12 horas.',
      ],
      urgencyLevel: 'ALTA',
      rationaleSummary: 'Causa número 1 de sangrado digestivo alto no variceal. Iniciar IBP intravenoso a dosis altas y resucitación con cristaloides.',
    });

    differentials.push({
      id: 'diff-sangrado-variceal',
      diagnosisName: 'HEMORRAGIA POR VÁRICES ESOFÁGICAS / GASTRICAS (CIRROSIS)',
      cie10Code: 'I85.0',
      argumentsInFavor: [
        combinedText.includes('cirrosis') || combinedText.includes('hepatopatia') ? 'Antecedente de hepatopatía crónica / hipertensión portal.' : 'Frecuente en pacientes con consumo etílico o estigmas hepáticos.',
        labMetrics['plt'] && labMetrics['plt'] < 150 ? `Trombocitopenia concomitante (${labMetrics['plt']} x10³/µL), sugestiva de hiperesplenismo.` : 'Signos indirectos de hepatopatía.',
      ],
      argumentsAgainst: [
        'No hay evidencia confirmada de várices sin endoscopia.',
      ],
      confirmatoryStudies: [
        'Endoscopia digestiva alta diagnóstica y terapéutica (ligadura de várices).',
        'Perfil hepático completo, bilirrubinas y tiempos de coagulación (TP/INR).',
      ],
      urgencyLevel: 'ALTA',
      rationaleSummary: 'Mortalidad elevada. Si hay sospecha iniciar Octreótido en bolo e infusión + Ceftriaxona profiláctica.',
    });
  }

  // ==========================================================================
  // 3. ESCENARIO RESPIRATORIO: DISNEA / TOS / FIEBRE / CONDENSACIÓN
  // ==========================================================================
  if (
    combinedText.includes('neumonia') ||
    combinedText.includes('nac') ||
    combinedText.includes('disnea') ||
    combinedText.includes('tos') ||
    combinedText.includes('crepitant') ||
    combinedText.includes('fiebre')
  ) {
    differentials.push({
      id: 'diff-nac',
      diagnosisName: 'NEUMONÍA ADQUIRIDA EN LA COMUNIDAD (NAC)',
      cie10Code: 'J18.9',
      argumentsInFavor: [
        'Sintomatología respiratoria baja (tos, expectoración o disnea) con síndrome febril o respuesta inflamatoria.',
        vitals?.respiratoryRate && vitals.respiratoryRate >= 24 ? `Taquipnea clínica documentada (${vitals.respiratoryRate} rpm).` : 'Compromiso de mecánica ventilatoria.',
        labMetrics['wbc'] && labMetrics['wbc'] > 11 ? `Leucocitosis reactiva (${labMetrics['wbc']} x10³/µL).` : 'Paraclínicos compatibles con infección.',
      ],
      argumentsAgainst: [
        'Requiere confirmación radiológica con infiltrado alveolar o consolidación.',
      ],
      confirmatoryStudies: [
        'Radiografía de tórax PA y lateral (o Tomografía de tórax si duda diagnóstica).',
        'Hemograma, PCR y Procalcitonina.',
        'Hemocultivos x2 y antígenos urinarios para Legionella / Neumococo si CURB-65 ≥ 2.',
      ],
      urgencyLevel: 'ALTA',
      rationaleSummary: 'Estratificar mediante escala CURB-65 o PSI/PORT para definir sitio de tratamiento y antibioterapia empírica rápida.',
    });

    differentials.push({
      id: 'diff-tep',
      diagnosisName: 'TROMBOEMBOLISMO PULMONAR (TEP)',
      cie10Code: 'I26.9',
      argumentsInFavor: [
        'Disnea súbita inexplicada con taquipnea o hipoxemia.',
        vitals?.heartRate && vitals.heartRate > 100 ? `Taquicardia sinusal (${vitals.heartRate} lpm).` : 'Parámetros hemodinámicos alterados.',
      ],
      argumentsAgainst: [
        'Menos probable si el cuadro es de varios días con tos purulenta y fiebre alta franca.',
      ],
      confirmatoryStudies: [
        'Escala de Wells para TEP / Regla de Ginebra.',
        'Dímero D ultrasensible (alto valor predictivo negativo si Wells no elevado).',
        'Angio-TAC de arterias pulmonares (método definitivo de elección).',
      ],
      urgencyLevel: 'ALTA',
      rationaleSummary: 'Diagnóstico crítico de no perder. Descartar con Angio-TAC si probabilidad moderada a alta.',
    });
  }

  // ==========================================================================
  // REVISIÓN DE CONSISTENCIA CLÍNICA (Sección 34)
  // ==========================================================================
  if (combinedText.includes('hiperkalemia') && labMetrics['potassium'] !== undefined && labMetrics['potassium'] <= 4.5) {
    warnings.push(`POSIBLE INCONSISTENCIA CLÍNICA: Diagnóstico menciona Hiperkalemia pero el potasio registrado es normal o bajo (${labMetrics['potassium']} mEq/L).`);
  }

  if (combinedText.includes('anemia severa') && labMetrics['hgb'] !== undefined && labMetrics['hgb'] >= 10.0) {
    warnings.push(`POSIBLE INCONSISTENCIA CLÍNICA: Diagnóstico menciona Anemia Severa pero la hemoglobina registrada es de ${labMetrics['hgb']} g/dL (no cumple criterio severo < 8 g/dL).`);
  }

  if (combinedText.includes('cetoacidosis') && labMetrics['glucose'] !== undefined && labMetrics['glucose'] < 140) {
    warnings.push(`POSIBLE INCONSISTENCIA CLÍNICA: Diagnóstico menciona Cetoacidosis pero la glucemia registrada es normal (${labMetrics['glucose']} mg/dL). Descartar CAD euglucémica por iSGLT2.`);
  }

  // Diagnóstico por defecto general si no encaja en plantillas específicas
  if (differentials.length === 0) {
    differentials.push({
      id: 'diff-sindrome-general',
      diagnosisName: 'SÍNDROME CLÍNICO EN ESTUDIO',
      cie10Code: 'R69',
      argumentsInFavor: [
        `Motivo de consulta: ${patient.chiefComplaint || 'No especificado'}.`,
        'Signos vitales y estado clínico actual requieren seguimiento paraclínico.',
      ],
      argumentsAgainst: ['Datos paraclínicos aún pendientes de completarse.'],
      confirmatoryStudies: [
        'Hemograma completo y química sanguínea básica.',
        'Radiografía de tórax y Electrocardiograma de 12 derivaciones.',
        'Examen general de orina.',
      ],
      urgencyLevel: 'MEDIA',
      rationaleSummary: 'Completar paraclínicos iniciales para orientar etiología precisa.',
    });
  }

  return {
    patientId: patient.id,
    primaryImpression: patient.clinicalHistory?.clinicalImpression || patient.chiefComplaint || 'Sin diagnóstico registrado',
    differentials,
    clinicalConsistencyWarnings: warnings,
    timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
  };
}
