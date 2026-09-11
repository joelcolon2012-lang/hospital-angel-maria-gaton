/**
 * GuidelineRetrievalService: Official Medical Guidelines Knowledge Base
 * Hospital Regional Dr. Ángel María Gatón — Dr. Joel Colón
 *
 * Requirements (Phases 13 & 14; Sections 1, 30, 31, 32, 51):
 * - Curated repository of verified, official guidelines from:
 *   AHA/ASA, ACC, ESC, IDSA, ATS, KDIGO, ADA, ACG, ESGE, Surviving Sepsis, GINA, GOLD, NICE, WHO.
 * - STRICT CLINICAL RULE: NEVER invent fake citations or future years (no "AHA 2026").
 * - Returns verified title, society, year, URL, and recommendation evidence levels.
 */

export interface VerifiedMedicalGuideline {
  id: string;
  topic: string;
  keywords: string[];
  primaryDiagnosisTerm: string;
  guidelineName: string;
  society: string;
  year: number;
  url: string;
  evidenceLevel: string;
  openingStatement: string; // "SEGÚN LA GUÍA [NOMBRE] [AÑO] PARA EL MANEJO DE [PATOLOGÍA]..."
  keyRecommendations: string[];
  firstLineDrugs: string[];
  secondLineDrugs?: string[];
  vitalTargets: string;
  cautions: string[];
}

export const OFFICIAL_CLINICAL_GUIDELINES: VerifiedMedicalGuideline[] = [
  // 1. EVC Isquémico Agudo (Stroke)
  {
    id: 'stroke_aha_asa_2019_2024',
    topic: 'Evento Vascular Cerebral Isquémico Agudo',
    keywords: ['evc', 'acv', 'ictus', 'isquemico', 'infarto cerebral', 'stroke', 'hemiparesia', 'disartria', 'afasia'],
    primaryDiagnosisTerm: 'EVC ISQUÉMICO AGUDO',
    guidelineName: 'Guidelines for the Early Management of Patients With Acute Ischemic Stroke',
    society: 'American Heart Association / American Stroke Association (AHA/ASA)',
    year: 2019,
    url: 'https://www.ahajournals.org/doi/10.1161/STR.0000000000000211',
    evidenceLevel: 'Clase I, Nivel A',
    openingStatement: 'SEGÚN LA GUÍA AHA/ASA 2019 PARA EL MANEJO TEMPRANO DEL EVENTO VASCULAR CEREBRAL ISQUÉMICO AGUDO...',
    keyRecommendations: [
      'Ventana de fibrinólisis IV: rt-PA o Tenecteplasa dentro de las 4.5 horas del inicio de los síntomas (o última vez visto normal), con PA < 185/110 mmHg previa a infusión.',
      'Trombectomía mecánica urgente en oclusión de gran vaso en circulación anterior dentro de 6 a 24 horas según criterios DAWN/DEFUSE-3.',
      'Doble antiagregación plaquetaria (Aspirina + Clopidogrel) en ictus menor (NIHSS ≤ 3) o AIT de alto riesgo iniciada dentro de las 24 horas y mantenida por 21 días.',
      'Estatinas de alta intensidad (Atorvastatina 80 mg/día) iniciadas precozmente para estabilización de placa.',
    ],
    firstLineDrugs: ['aspirina', 'clopidogrel', 'atorvastatina', 'tenecteplasa', 'alteplasa', 'solucion salina'],
    vitalTargets: 'PA meta < 180/105 mmHg si trombolizado, o permisiva < 220/120 mmHg si no trombolizado. Normoglucemia (140-180 mg/dL).',
    cautions: [
      'Evitar descensos bruscos de la TA para preservar la penumbra isquémica.',
      'No administrar anticoagulantes en dosis plenas en las primeras 24 horas post-trombólisis.',
    ],
  },

  // 2. Sangrado Gastrointestinal Alto
  {
    id: 'upper_gi_bleed_acg_2021',
    topic: 'Hemorragia Digestiva Alta (No Variceal y Variceal)',
    keywords: ['sangrado digestivo', 'hemorragia digestiva', 'melena', 'hematemesis', 'ulcera peptica', 'sangrado alto'],
    primaryDiagnosisTerm: 'SANGRADO DIGESTIVO ALTO',
    guidelineName: 'Management of Patients With Acute Lower and Upper Gastrointestinal Bleeding',
    society: 'American College of Gastroenterology (ACG)',
    year: 2021,
    url: 'https://journals.lww.com/ajg/Fulltext/2021/05000/ACG_Clinical_Guideline__Upper_Gastrointestinal.14.aspx',
    evidenceLevel: 'Recomendación Fuerte, Calidad Moderada',
    openingStatement: 'SEGÚN LA GUÍA ACG 2021 PARA EL MANEJO DE LA HEMORRAGIA DIGESTIVA ALTA...',
    keyRecommendations: [
      'Resucitación hemodinámica con cristaloides antes de la endoscopia; mantener hemoglobina meta ≥ 7.0 g/dL (estrategia restrictiva de transfusión), o ≥ 8.0 g/dL si cardiopatía isquémica activa.',
      'Inhibidor de bomba de protones (Omeprazol o Pantoprazol) 80 mg IV en bolo seguido de 8 mg/h en infusión continua (o 40 mg IV c/12h).',
      'Endoscopia digestiva alta precoz dentro de las primeras 24 horas post-estabilización.',
      'En sospecha de sangrado variceal por cirrosis: agregar Octreótido o Terlipresina y Ceftriaxona profiláctica 1 g/día por 7 días.',
    ],
    firstLineDrugs: ['omeprazol', 'pantoprazol', 'solucion salina', 'ringer lactato', 'ceftriaxona', 'octreotido'],
    vitalTargets: 'PAM ≥ 65 mmHg, FC < 100 lpm, diuresis ≥ 0.5 mL/kg/h.',
    cautions: [
      'Suspender AINEs y antiagregantes plaquetarios durante la fase hemorrágica activa.',
      'Evitar sobretransfusión de glóbulos rojos por riesgo de rebote de hipertensión portal.',
    ],
  },

  // 3. Neumonía Adquirida en la Comunidad (NAC)
  {
    id: 'nac_ats_idsa_2019',
    topic: 'Neumonía Adquirida en la Comunidad',
    keywords: ['neumonia', 'nac', 'infeccion respiratoria', 'condensacion pulmonar', 'curb65', 'tos y fiebre'],
    primaryDiagnosisTerm: 'NEUMONÍA ADQUIRIDA EN LA COMUNIDAD',
    guidelineName: 'Diagnosis and Treatment of Adults with Community-acquired Pneumonia',
    society: 'American Thoracic Society / Infectious Diseases Society of America (ATS/IDSA)',
    year: 2019,
    url: 'https://www.atsjournals.org/doi/10.1164/rccm.201908-1581ST',
    evidenceLevel: 'Recomendación Fuerte, Calidad Moderada a Alta',
    openingStatement: 'SEGÚN LA GUÍA ATS/IDSA 2019 PARA EL DIAGNÓSTICO Y MANEJO DE LA NEUMONÍA ADQUIRIDA EN LA COMUNIDAD...',
    keyRecommendations: [
      'Estratificación mediante CURB-65 o PSI/PORT para definir lugar de manejo (ambulatorio, sala general o UCI).',
      'Tratamiento empírico en sala general: Betalactámico (Ceftriaxona 1-2 g/día o Ampicilina/Sulbactam) + Macrólido (Azitromicina 500 mg/día) o Fluoroquinolona respiratoria en monoterapia.',
      'Iniciar primera dosis antibiótica en la primera hora de ingreso hospitalario.',
      'Duración recomendada de antibioticoterapia: 5 días si el paciente alcanza estabilidad clínica y afebril por ≥ 48 horas.',
    ],
    firstLineDrugs: ['ceftriaxona', 'azitromicina', 'ampicilina sulbactam', 'levofloxacino', 'oxigeno'],
    vitalTargets: 'SpO2 94-98% (o 88-92% en EPOC retendor), FR < 24 rpm, Temp < 37.8 °C.',
    cautions: [
      'No usar fluoroquinolonas si existe sospecha o riesgo elevado de tuberculosis no tratada.',
      'Ajustar dosis de antibióticos a la tasa de filtración glomerular si se detecta disfunción renal.',
    ],
  },

  // 4. Sepsis y Shock Séptico
  {
    id: 'sepsis_surviving_2021',
    topic: 'Sepsis y Shock Séptico',
    keywords: ['sepsis', 'shock septico', 'bacteriemia', 'foco septico', 'sofa', 'lactato elevado'],
    primaryDiagnosisTerm: 'SEPSIS / SHOCK SÉPTICO',
    guidelineName: 'Surviving Sepsis Campaign: International Guidelines for Management of Sepsis and Septic Shock',
    society: 'Surviving Sepsis Campaign (SCCM / ESICM)',
    year: 2021,
    url: 'https://www.sccm.org/Clinical-Resources/Guidelines/Guidelines/Surviving-Sepsis-Guidelines-2021',
    evidenceLevel: 'Recomendación Fuerte, Evidencia Moderada',
    openingStatement: 'SEGÚN LA GUÍA SURVIVING SEPSIS CAMPAIGN 2021 PARA EL MANEJO DE SEPSIS Y SHOCK SÉPTICO...',
    keyRecommendations: [
      'Paquete de la 1ª Hora: Medir lactato sérico, obtener hemocultivos x2 antes de antibióticos, iniciar antimicrobianos de amplio espectro en los primeros 60 minutos.',
      'Reanimación con fluidos cristaloides balanceados a 30 mL/kg en las primeras 3 horas si hay hipotensión o lactato ≥ 4 mmol/L.',
      'Vasopresor de 1ª línea: Norepinefrina para mantener meta de PAM ≥ 65 mmHg.',
      'Si se requiere vasopresor adicional: Vasopresina (hasta 0.03 U/min) y considerar Hidrocortisona 200 mg/día si choque refractario.',
    ],
    firstLineDrugs: ['norepinefrina', 'ceftriaxona', 'meropenem', 'vancomicina', 'solucion salina', 'ringer lactato'],
    vitalTargets: 'PAM ≥ 65 mmHg, Lactato normal o aclaramiento > 20% cada 2h, diuresis ≥ 0.5 mL/kg/h.',
    cautions: [
      'Evitar sobrecarga hídrica no guiada después de la reanimación inicial.',
      'Desescalar cobertura antimicrobiana tan pronto como se disponga de antibiograma.',
    ],
  },

  // 5. Cetoacidosis Diabética (CAD) y Estado Hiperosmolar
  {
    id: 'dka_ada_2024',
    topic: 'Cetoacidosis Diabética y Crisis Hiperglucémicas',
    keywords: ['cetoacidosis', 'cad', 'hiperosmolar', 'diabetes', 'cetoacidosis diabetica', 'cetonas', 'anion gap'],
    primaryDiagnosisTerm: 'CETOACIDOSIS DIABÉTICA (CAD)',
    guidelineName: 'Management of Hyperglycemic Emergencies in Adults: A Consensus Report by the ADA and EASD',
    society: 'American Diabetes Association (ADA)',
    year: 2024,
    url: 'https://diabetesjournals.org/care/article/47/7/1307/156740',
    evidenceLevel: 'Consenso ADA/EASD 2024',
    openingStatement: 'SEGÚN EL REPORTE DE CONSENSO ADA/EASD 2024 PARA EL MANEJO DE EMERGENCIAS HIPERGLUCÉMICAS...',
    keyRecommendations: [
      'Rehidratación con Solución Salina 0.9% a 1000 mL/h en la primera hora; luego titular según sodio corregido.',
      'Insulina regular IV: 0.1 U/kg en bolo seguido de infusión a 0.1 U/kg/h (o 0.14 U/kg/h continua sin bolo), con meta de descenso de glucemia de 50-75 mg/dL por hora.',
      'Regla absoluta del Potasio: No iniciar insulina si K < 3.3 mEq/L; reponer potasio primero para prevenir arritmias mortales.',
      'Agregar Dextrosa 5% cuando la glucemia alcance 200-250 mg/dL para evitar hipoglucemia y permitir el cierre del anión gap.',
      'Criterios de resolución: Glucosa < 200 mg/dL, Bicarbonato ≥ 18 mEq/L, pH venoso > 7.30 y Anion Gap normalizado (≤ 12 mEq/L).',
    ],
    firstLineDrugs: ['insulina', 'solucion salina', 'cloruro de potasio', 'dextrosa'],
    vitalTargets: 'Glucemia 150-200 mg/dL tras fase inicial, K+ 4.0 - 5.0 mEq/L.',
    cautions: [
      'No suspender infusión de insulina antes de administrar la primera dosis de insulina basal subcutánea (traslape con 2h de anticipación).',
      'No usar bicarbonato de rutina salvo pH < 6.90.',
    ],
  },

  // 6. Insuficiencia Cardíaca Aguda Descompensada
  {
    id: 'hf_esc_aha_2023',
    topic: 'Insuficiencia Cardíaca Aguda Descompensada',
    keywords: ['falla cardiaca', 'insuficiencia cardiaca', 'edema pulmonar', 'disnea', 'furosemida'],
    primaryDiagnosisTerm: 'INSUFICIENCIA CARDÍACA AGUDA',
    guidelineName: 'Focused Update of the 2021 ESC Guidelines for the Diagnosis and Treatment of Acute and Chronic Heart Failure',
    society: 'European Society of Cardiology (ESC) / AHA-ACC-HFSA',
    year: 2023,
    url: 'https://academic.oup.com/eurheartj/article/44/37/3627/7245781',
    evidenceLevel: 'Clase I, Nivel B',
    openingStatement: 'SEGÚN LA GUÍA ESC / AHA 2023 PARA EL DIAGNÓSTICO Y TRATAMIENTO DE LA INSUFICIENCIA CARDÍACA AGUDA...',
    keyRecommendations: [
      'Diuréticos del asa intravenosos (Furosemida) como pilar en pacientes con sobrecarga de volumen y congestión; dosis IV inicial al menos equivalente a la dosis oral previa.',
      'Vasodilatadores intravenosos (Nitroglicerina) en pacientes con PAS > 110 mmHg para reducir precarga y poscarga en edema pulmonar.',
      'Ventilación mecánica no invasiva (CPAP/BiPAP) precoz en pacientes con dificultad respiratoria e hipoxemia.',
      'Optimización de los 4 pilares terapéuticos (iSGLT2, ARNI/IECA, Betabloqueador, ARM) antes del egreso hospitalario.',
    ],
    firstLineDrugs: ['furosemida', 'nitroglicerina', 'espironolactona', 'empagliflozina', 'oxigeno'],
    vitalTargets: 'Alivio de disnea, balance hídrico negativo, PAM ≥ 65 mmHg, FC 60-80 lpm.',
    cautions: [
      'Vigilar rigurosamente función renal y niveles de potasio sérico durante la descongestión intensa.',
      'No iniciar o titular betabloqueadores durante la fase de inestabilidad o descompensación hemodinámica aguda.',
    ],
  },
];

/**
 * Busca y recupera la guía clínica oficial más relevante para un diagnóstico dado
 */
export function findOfficialGuidelineForDiagnosis(diagnosisText: string): VerifiedMedicalGuideline | null {
  if (!diagnosisText) return null;

  const normalized = diagnosisText
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  for (const g of OFFICIAL_CLINICAL_GUIDELINES) {
    const matched = g.keywords.some((kw) => {
      const normKw = kw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return normalized.includes(normKw);
    });
    if (matched) return g;
  }

  return null;
}
