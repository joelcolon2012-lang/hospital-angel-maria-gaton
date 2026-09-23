/**
 * Discusión Terapéutica Basada en Evidencia y Guías Actualizadas
 * Hospital Regional Ángel María Gatón — Servicio de Medicina Interna & Emergencias
 */

export interface DrugDiscussion {
  drugNames: string[]; // Nombres comerciales y genéricos
  primaryGuide: string; // ej. Surviving Sepsis Campaign 2021, AHA/ACC 2023, KDIGO 2024, GOLD 2024
  therapeuticRationale: string; // Justificación clínica y mecanismo
  recommendedDose: string; // Dosis estándar y pauta
  renalHepaticAdjustment: string; // Ajuste renal/hepático
  monitoringAndSafety: string; // Vigilancia y efectos adversos
  discussionSummary: string; // Párrafo redactado para la nota médica
}

export const DRUG_DISCUSSIONS: DrugDiscussion[] = [
  {
    drugNames: ['enoxaparina', 'clexane', 'lovenox'],
    primaryGuide: 'Guías CHEST / AHA-ACC 2023 (Tromboprofilaxis y Síndromes Coronarios)',
    therapeuticRationale: 'Heparina de bajo peso molecular que inhibe predominantemente el Factor Xa. Proporciona una respuesta anticoagulante más predecible que la HNF con menor riesgo de trombocitopenia inducida por heparina (TIH).',
    recommendedDose: 'Profilaxis: 40 mg SC c/24h (o 30 mg SC c/24h en alto riesgo). Tratamiento terapéutico (TEP/SCA): 1 mg/kg SC c/12h.',
    renalHepaticAdjustment: 'Ajuste renal estricto si ClCr < 30 mL/min: reducir profilaxis a 20-30 mg SC c/24h o tratamiento a 1 mg/kg SC c/24h. En diálisis se prefiere HNF.',
    monitoringAndSafety: 'Vigilar sangrado activo, hemoglobina, plaquetas (descartar TIH a los días 4-7). Contraindicado en hemorragia activa o punción espinal reciente.',
    discussionSummary: 'Se indica Enoxaparina como anticoagulante / tromboprofilaxis de elección conforme a guías internacionales, dada su biodisponibilidad superior y perfil de seguridad sobre la HNF, ajustando pauta a la función renal del paciente.',
  },
  {
    drugNames: ['ceftriaxona', 'rocephin'],
    primaryGuide: 'IDSA / ATS Guidelines & Surviving Sepsis Campaign',
    therapeuticRationale: 'Cefalosporina de 3ª generación con potente actividad bactericida frente a Streptococcus pneumoniae, enterobacterias y Neisseria. Excelente penetración en LCR, parénquima pulmonar y vía urinaria.',
    recommendedDose: 'Infecciones habituales: 1 g a 2 g IV cada 24 horas. Meningitis o sepsis grave: 2 g IV cada 12 horas.',
    renalHepaticAdjustment: 'Eliminación dual (renal y biliar). No requiere ajuste en insuficiencia renal aislada ni en hemodiálisis salvo falla biliar concomitante.',
    monitoringAndSafety: 'Vigilar diarrea asociada a Clostridioides difficile, hipersensibilidad a betalactámicos. No coadministrar con soluciones que contengan calcio (Ringer Lactato) por riesgo de precipitación.',
    discussionSummary: 'Se selecciona Ceftriaxona por su espectro de cobertura empírica idónea y dosificación cada 24h, sin requerimiento de ajuste en disfunción renal aislada.',
  },
  {
    drugNames: ['furosemida', 'lasix'],
    primaryGuide: 'Guías ESC / AHA Heart Failure Guidelines 2023',
    therapeuticRationale: 'Diurético del asa que bloquea el cotransportador Na+/K+/2Cl- en la rama ascendente gruesa de Henle. Pilar en la descongestión rápida y alivio de sobrecarga de volumen en falla cardíaca, síndrome nefrótico y ERC.',
    recommendedDose: 'Dosis de inicio en congestión aguda: 20-40 mg IV en bolo. En pacientes con uso crónico oral, la dosis IV inicial debe ser al menos equivalente a su dosis oral previa.',
    renalHepaticAdjustment: 'En ERC con TFG baja se requieren dosis mayores (80-160 mg IV) por menor secreción tubular hacia el sitio de acción luminal.',
    monitoringAndSafety: 'Monitoreo de diuresis horaria, electrolitos (K+, Mg2+, Na+), función renal (BUN/Creatinina) y presión arterial. Riesgo de hipokalemia, alcalosis metabólica y ototoxicidad a dosis elevadas.',
    discussionSummary: 'Furosemida indicada para descongestión activa según las guías de falla cardíaca descompensada, monitorizando estrechamente diuresis, presión arterial y balance electrolítico.',
  },
  {
    drugNames: ['norepinefrina', 'levofed', 'noradrenalina'],
    primaryGuide: 'Surviving Sepsis Campaign 2021 / Guías de Shock Cardiogénico',
    therapeuticRationale: 'Vasopresor de primera línea con acción agonista potente alfa-1 y moderada beta-1. Eleva la resistencia vascular sistémica y la contractilidad cardíaca sin taquicardia excesiva.',
    recommendedDose: 'Infusión continua: Iniciar a 0.05 - 0.1 mcg/kg/min, titulando cada 5-10 minutos hasta alcanzar meta de PAM ≥ 65 mmHg.',
    renalHepaticAdjustment: 'No requiere ajuste por depuración renal/hepática; titulación guiada estrictamente por respuesta hemodinámica clínica.',
    monitoringAndSafety: 'Requiere acceso venoso central (o periférico antebraquial de emergencia transitorio). Monitoreo continuo de PA invasiva o no invasiva frecuente, lactato sérico y perfusión periférica (llenado capilar).',
    discussionSummary: 'Norepinefrina seleccionada como vasopresor de 1ª línea según la campaña Sobreviviendo a la Sepsis, con titulación orientada a mantener PAM ≥ 65 mmHg y restaurar perfusión tisular.',
  },
  {
    drugNames: ['omeprazol', 'pantoprazol', 'esomeprazol'],
    primaryGuide: 'Guías ACG / AGA (Hemorragia Digestiva Alta y Profilaxis de Úlceras por Estrés)',
    therapeuticRationale: 'Inhibidor irreversible de la bomba de protones (H+/K+ ATPasa) gástrica. Eleva el pH gástrico facilitando la agregación plaquetaria y la estabilización del coágulo en hemorragia digestiva, y previene úlceras en pacientes críticos con ventilación mecánica o coagulopatía.',
    recommendedDose: 'Profilaxis: 40 mg IV o VO cada 24h. Sangrado digestivo activo post-endoscopia: 80 mg IV en bolo seguido de 8 mg/h en infusión continua (o 40 mg IV c/12h).',
    renalHepaticAdjustment: 'No requiere ajuste renal. En cirrosis Child-Pugh C considerar reducción a 20 mg/día.',
    monitoringAndSafety: 'Evitar uso prolongado innecesario por riesgo de infección por C. difficile, hipomagnesemia y neumonía nosocomial.',
    discussionSummary: 'Se prescribe IBP con indicación precisa de profilaxis de úlcera por estrés / control de secreción ácida gástrica conforme a directrices de gastroenterología.',
  },
  {
    drugNames: ['aspirina', 'acido acetilsalicilico', 'aas'],
    primaryGuide: 'AHA/ACC Secondary Prevention & ESC Guidelines 2023',
    therapeuticRationale: 'Inhibidor irreversible de la ciclooxigenasa-1 (COX-1), suprimiendo la síntesis de tromboxano A2 y bloqueando la agregación plaquetaria. Piedra angular en cardiopatía isquémica y ACV.',
    recommendedDose: 'Dosis de carga en SCA: 160-325 mg masticada. Dosis de mantenimiento: 81-100 mg VO cada 24h.',
    renalHepaticAdjustment: 'Uso con precaución en ERC avanzada por riesgo de sangrado urémico. Evitar en falla hepática severa con coagulopatía.',
    monitoringAndSafety: 'Vigilar sangrado gastrointestinal, epigastralgia. Contraindicado en úlcera péptica activa o alergia a salicilatos.',
    discussionSummary: 'Aspirina indicada como antiagregante plaquetario estándar para prevención secundaria de eventos isquémicos cardiovasculares según guías internacionales.',
  },
  {
    drugNames: ['clopidogrel', 'plavix'],
    primaryGuide: 'AHA/ACC 2023 & ESC NSTE-ACS Guidelines',
    therapeuticRationale: 'Antagonista del receptor plaquetario P2Y12 de ADP. En combinación con aspirina provee doble antiagregación plaquetaria (DAPT), reduciendo trombosis de stent y recurrencia isquémica.',
    recommendedDose: 'Carga en SCA: 300 mg (pacientes sometidos a fibrinólisis o > 75 años) o 600 mg (intervencionismo coronario percutáneo - ICP). Mantenimiento: 75 mg VO cada 24 horas.',
    renalHepaticAdjustment: 'No requiere ajuste en falla renal. En falla hepática severa monitorizar función hemostática.',
    monitoringAndSafety: 'Vigilar recuento plaquetario y signos de hemorragia. Suspender 5 días antes de cirugía electiva mayor si es clínicamente seguro.',
    discussionSummary: 'Se instaura Clopidogrel para completar pauta de doble antiagregación plaquetaria en el contexto de síndrome coronario agudo o prevención secundaria.',
  },
  {
    drugNames: ['atorvastatina', 'lipitor'],
    primaryGuide: 'AHA/ACC Cholesterol Clinical Guidelines & ESC Dyslipidemia',
    therapeuticRationale: 'Estatina de alta potencia que inhibe la HMG-CoA reductasa. Además de reducir el c-LDL hasta en un 50%, posee efectos pleiotrópicos: estabilización de la placa de ateroma, disminución del estrés oxidativo y antiinflamación vascular.',
    recommendedDose: 'Alta intensidad (SCA / ACV): 40 - 80 mg VO nocturno cada 24 horas.',
    renalHepaticAdjustment: 'Metabolismo hepático (CYP3A4); no requiere ajuste renal. Contraindicado en hepatopatía aguda o transaminasas persistentemente > 3 veces el límite normal.',
    monitoringAndSafety: 'Monitorear enzimas hepáticas (TGO/TGP) y síntomas musculares (mialgias, CK en sospecha de rabdomiólisis).',
    discussionSummary: 'Atorvastatina a dosis de alta intensidad iniciada precozmente conforme al estándar de manejo para estabilización de placa en eventos cardiovasculares agudos.',
  },
  {
    drugNames: ['meropenem', 'merrem'],
    primaryGuide: 'Infectious Diseases Society of America (IDSA) Carbapenems Guidelines',
    therapeuticRationale: 'Carbapenémico de ultra amplio espectro activo contra enterobacterias productoras de betalactamasas de espectro extendido (BLEE), Pseudomonas aeruginosa y anaerobios.',
    recommendedDose: 'Infección intraabdominal o urinaria complicada: 1 g IV cada 8 horas en infusión extendida de 3 horas. Meningitis: 2 g IV cada 8 horas.',
    renalHepaticAdjustment: 'Ajuste obligatorio por función renal: ClCr 26-50 mL/min: 1 g c/12h; ClCr 10-25 mL/min: 500 mg c/12h; ClCr < 10 mL/min: 500 mg c/24h.',
    monitoringAndSafety: 'Menor riesgo convulsivante que imipenem. Control de función renal y biometría hemática.',
    discussionSummary: 'Se reserva Meropenem para infección grave con sospecha o aislamiento de patógenos multirresistentes (BLEE), ajustando pauta a la tasa de filtración glomerular.',
  },
  {
    drugNames: ['insulina', 'insulina regular', 'insulina cristalina', 'humulin r'],
    primaryGuide: 'American Diabetes Association (ADA) Standards of Care in Hospitalized Patients',
    therapeuticRationale: 'Hormona anabólica indispensable para la captación tisular de glucosa, supresión de la lipólisis y gluconeogénesis hepática. Tratamiento de elección en hiperglicemia hospitalaria y cetoacidosis.',
    recommendedDose: 'Cetoacidosis: bolo 0.1 U/kg seguido de infusión 0.1 U/kg/h (o 0.14 U/kg/h sin bolo). Escala móvil hospitalaria según esquema correctivo por glucemias capilares preprandiales.',
    renalHepaticAdjustment: 'En insuficiencia renal avanzada disminuye la depuración renal de insulina; reducir dosis un 25-50% para evitar hipoglicemias graves.',
    monitoringAndSafety: 'Monitoreo de glicemias capilares horarias en infusión continua o preprandiales en sala. Vigilar niveles séricos de Potasio (K+) antes y durante el uso.',
    discussionSummary: 'Insulina regular indicada para el control glicémico intrahospitalario estricto (meta 140-180 mg/dL), previniendo complicaciones infecciosas y retraso en la cicatrización.',
  },
  {
    drugNames: ['transfusion', 'paquete globular', 'concentrado eritrocitario', 'sangre'],
    primaryGuide: 'Guías AABB 2023 / International Consensus on Patient Blood Management',
    therapeuticRationale: 'Estrategias transfusionales restrictivas con indicación precisa en anemia sintomática, sangrado activo o umbral de Hb < 7-8 g/dL en pacientes con cardiopatía isquémica preexistente, previa tipificación y pruebas de compatibilidad cruzada.',
    recommendedDose: 'Transfusión de concentrados eritrocitarios con administración lenta y fraccionada (1-2 paquetes por turno) vigilando datos de sobrecarga de volumen.',
    renalHepaticAdjustment: 'Monitoreo estrecho de sobrecarga circulatoria asociada a transfusión (TACO) en insuficiencia renal o cardiopatía.',
    monitoringAndSafety: 'Vigilancia de signos vitales cada 15-30 minutos, balance hídrico, hemograma post-transfusional y detección temprana de reacciones transfusionales.',
    discussionSummary: 'Según la guía AABB 2023 para transfusión de concentrados eritrocitarios, se favorecen estrategias transfusionales restrictivas permitiendo considerar un umbral cercano a 8 g/dL en pacientes con enfermedad cardiovascular o anemia descompensada, con administración lenta y vigilancia estrecha de signos de sobrecarga circulatoria.',
  },
  {
    drugNames: ['solucion salina', 'cloruro de sodio', 'lactato en ringer', 'ringer lactato', 'hartmann'],
    primaryGuide: 'Guías Internacionales de Fluidoterapia Intravenosa Hospitalaria',
    therapeuticRationale: 'Optimización del volumen intravascular y reposición de pérdidas hidroelectrolíticas mediante cristaloides balanceados, adaptando el volumen al peso y función cardiopulmonar.',
    recommendedDose: 'Mantenimiento: 25-30 mL/kg/día (1,500 - 2,500 mL c/24h) ajustado a pérdidas y respuesta clínica.',
    renalHepaticAdjustment: 'Individualizar en insuficiencia renal y falla cardíaca para prevenir congestión pulmonar y sobrecarga hídrica.',
    monitoringAndSafety: 'Control de diuresis horaria, balance hídrico estricto, electrolitos séricos y mecánica ventilatoria.',
    discussionSummary: 'Según las guías de manejo de fluidoterapia intravenosa, se indica hidratación parenteral con el objetivo de optimizar el volumen intravascular, debiendo individualizarse de acuerdo con peso, diuresis, función renal y estado cardiopulmonar.',
  },
  {
    drugNames: ['ketorolaco', 'toradol'],
    primaryGuide: 'Guías Clínicas de Manejo del Dolor Agudo y Analgesia Multimodal',
    therapeuticRationale: 'Antiinflamatorio no esteroideo de alta potencia analgésica por inhibición potente de COX-1/COX-2. Indicado para dolor agudo severo por tiempo limitado.',
    recommendedDose: '30 mg IV cada 8 horas (máximo 5 días de tratamiento continuo).',
    renalHepaticAdjustment: 'Contraindicado en insuficiencia renal moderada a severa (ClCr < 50 mL/min) y pacientes con riesgo hemorrágico elevado.',
    monitoringAndSafety: 'Monitorear función renal (BUN/Creatinina), diuresis y descartar sangrado gastrointestinal.',
    discussionSummary: 'Para control del dolor agudo se utiliza Ketorolaco por el menor tiempo posible y por un máximo de 5 días dentro de un esquema de analgesia multimodal, vigilando función renal y riesgo de sangrado.',
  },
  {
    drugNames: ['tramadol', 'tramal'],
    primaryGuide: 'Guías OMS de Escala Analgésica y Dolor Moderado-Severo',
    therapeuticRationale: 'Opioide atípico de acción dual: agonista débil de receptores mu-opioides e inhibidor de la recaptación de serotonina y noradrenalina.',
    recommendedDose: '50 - 100 mg IV cada 8 horas en infusión lenta en 1 hora.',
    renalHepaticAdjustment: 'Espaciar intervalo a cada 12 horas si ClCr < 30 mL/min para evitar acumulación de metabolitos activos.',
    monitoringAndSafety: 'Vigilar náuseas, sedación y depresión respiratoria. Ajustar pauta en insuficiencia renal.',
    discussionSummary: 'Se asocia Tramadol en infusión lenta para proveer analgesia multimodal efectiva, vigilando sedación y respuesta clínica.',
  },
  {
    drugNames: ['paracetamol', 'acetaminofen'],
    primaryGuide: 'Guías de Analgesia Multimodal y Premedicación Hospitalaria',
    therapeuticRationale: 'Analgésico y antipirético de acción central con excelente perfil de seguridad gastrointestinal y hematológico.',
    recommendedDose: '1 g IV o VO cada 8 horas (o 30 minutos previo a transfusión como premedicación).',
    renalHepaticAdjustment: 'Reducir dosis diaria máxima a 2-3 g en hepatopatía o desnutrición severa.',
    monitoringAndSafety: 'Monitoreo de enzimas hepáticas en uso prolongado.',
    discussionSummary: 'Se indica Paracetamol como base analgésica segura y premedicación previa a hemoderivados.',
  },
  {
    drugNames: ['difenhidramina', 'benadryl'],
    primaryGuide: 'Protocolos de Premedicación Transfusional y Alergia Aguda',
    therapeuticRationale: 'Antihistamínico antagonista del receptor H1 que previene y atenúa reacciones alérgicas febriles y cutáneas.',
    recommendedDose: '25 - 50 mg (1 ampolla) IV lenta 20-30 minutos antes de la transfusión o infusión.',
    renalHepaticAdjustment: 'No requiere ajuste renal significativo.',
    monitoringAndSafety: 'Vigilar somnolencia y efectos anticolinérgicos leves.',
    discussionSummary: 'Se administra Difenhidramina como premedicación profiláctica para reducir el riesgo de reacciones alérgicas asociadas a la infusión de hemoderivados.',
  },
  {
    drugNames: ['labetalol', 'trandate'],
    primaryGuide: 'Guías AHA/ACC 2024 de Emergencias y Urgencias Hipertensivas',
    therapeuticRationale: 'Bloqueador alfa-1 y beta adrenérgico no selectivo. Reduce la presión arterial preservando el flujo sanguíneo cerebral, renal y coronario.',
    recommendedDose: '10-20 mg IV en bolo lento, repetible cada 10-15 minutos (o infusión 1-2 mg/min) SOS si TAD > 110 mmHg o TAS > 180 mmHg.',
    renalHepaticAdjustment: 'Seguro en falla renal; no produce vasodilatación renal refleja excesiva ni robo coronario.',
    monitoringAndSafety: 'Monitoreo estricto de frecuencia cardíaca (evitar si FC < 60 lpm) y presión arterial.',
    discussionSummary: 'En cuanto al Labetalol intravenoso, se indica como antihipertensivo de elección ante cifras de tensión arterial severas (TAD > 110 mmHg), manteniendo vigilancia clínica y hemodinámica estricta.',
  },
  {
    drugNames: ['bicarbonato de sodio', 'bicarbonato'],
    primaryGuide: 'Guías de Manejo de Trastornos Ácido-Base en Medicina Crítica',
    therapeuticRationale: 'Agente alcalinizante parenteral indicado en acidemia metabólica severa con pH ≤ 7.20 y déficit severo de base.',
    recommendedDose: 'Infusión guiada por gasometría arterial: mEq calculados = 0.5 x peso (kg) x (24 - HCO3 medido).',
    renalHepaticAdjustment: 'Monitorear niveles de sodio y sobrecarga de volumen.',
    monitoringAndSafety: 'Control seriado de gasometría arterial, pH, sodio sérico y potasio.',
    discussionSummary: 'El Bicarbonato de Sodio se indica de forma individualizada sustentado en gasometría arterial ante acidemia metabólica severa (pH ≤ 7.20), realizando controles seriados de pH, electrolitos y estado de volumen.',
  },
];

export function getTherapeuticDiscussion(orderName: string): DrugDiscussion | null {
  if (!orderName) return null;
  const normalized = orderName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  for (const item of DRUG_DISCUSSIONS) {
    for (const name of item.drugNames) {
      const normDrug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (normalized.includes(normDrug)) {
        return item;
      }
    }
  }

  return null;
}

export function generateTherapeuticDiscussionForOrders(orders: { name: string; dose?: string; route?: string; frequency?: string }[]): string {
  if (!orders || orders.length === 0) return '';
  const discussions: string[] = [];

  for (const ord of orders) {
    const disc = getTherapeuticDiscussion(ord.name);
    if (disc) {
      discussions.push(`${disc.discussionSummary} (${disc.primaryGuide}: ${disc.therapeuticRationale})`);
    }
  }

  if (discussions.length === 0) {
    return 'SE INDICA MANEJO INTEGRAL CON CONTROL TENSIONAL Y METABÓLICO, HIDRATACIÓN Y GASTROPROTECCIÓN SEGÚN PROTOCOLOS VIGENTES.';
  }

  return discussions.join(' ');
}
