import { Patient, MedicalStudy, LabResult, ClinicalProblem, MedicalOrder, PatientEvolution } from '../types';

// Realistic SVG generator for mock clinical images
function generateMockEcgDataUrl(label: string = 'ECG DI-DII-DIII'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300" viewBox="0 0 600 300">
    <rect width="600" height="300" fill="#fcf6f5"/>
    <!-- ECG Millimeter Grid -->
    <defs>
      <pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse">
        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#fbcaca" stroke-width="0.5"/>
      </pattern>
      <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
        <rect width="50" height="50" fill="url(#smallGrid)"/>
        <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#f87171" stroke-width="1.2"/>
      </pattern>
    </defs>
    <rect width="600" height="300" fill="url(#grid)"/>
    <!-- ECG Trace -->
    <path d="M 10 150 L 50 150 L 60 145 L 70 150 L 80 150 L 85 160 L 95 60 L 105 180 L 115 150 L 130 150 L 145 135 L 165 150 L 210 150 L 220 145 L 230 150 L 240 150 L 245 160 L 255 60 L 265 180 L 275 150 L 290 150 L 305 135 L 325 150 L 370 150 L 380 145 L 390 150 L 400 150 L 405 160 L 415 60 L 425 180 L 435 150 L 450 150 L 465 135 L 485 150 L 540 150 L 550 145 L 560 150 L 570 150 L 575 160 L 585 60 L 595 180" 
          fill="none" stroke="#0F4C5C" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="15" y="15" width="260" height="32" rx="6" fill="#0F4C5C" opacity="0.9"/>
    <text x="25" y="36" fill="#ffffff" font-family="monospace" font-size="14" font-weight="bold">${label} - 25mm/s 10mm/mV</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function generateMockXRayDataUrl(label: string = 'Rx Tórax AP'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <rect width="400" height="400" fill="#0f172a"/>
    <!-- Simulated Rib cage & Cardiac Silhouette -->
    <path d="M 200 40 L 200 360" stroke="#94a3b8" stroke-width="12" stroke-linecap="round" opacity="0.4"/>
    <!-- Ribs -->
    <path d="M 200 90 Q 280 100 330 140 M 200 90 Q 120 100 70 140" stroke="#cbd5e1" stroke-width="9" fill="none" opacity="0.5"/>
    <path d="M 200 130 Q 290 145 350 190 M 200 130 Q 110 145 50 190" stroke="#cbd5e1" stroke-width="10" fill="none" opacity="0.5"/>
    <path d="M 200 170 Q 300 190 360 240 M 200 170 Q 100 190 40 240" stroke="#cbd5e1" stroke-width="10" fill="none" opacity="0.5"/>
    <path d="M 200 210 Q 300 230 350 280 M 200 210 Q 100 230 50 280" stroke="#cbd5e1" stroke-width="9" fill="none" opacity="0.5"/>
    <!-- Heart shadow -->
    <ellipse cx="170" cy="240" rx="65" ry="50" fill="#f8fafc" opacity="0.25"/>
    <text x="20" y="30" fill="#38bdf8" font-family="sans-serif" font-size="14" font-weight="bold">${label}</text>
    <text x="360" y="30" fill="#e2e8f0" font-family="sans-serif" font-size="18" font-weight="bold">R</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const SEED_PATIENTS: Patient[] = [
  {
    id: 'pat-001',
    internalCode: 'EMG-2026-001',
    medicalRecordNumber: 'EXP-88412',
    fullName: 'Carlos Mendoza Ramos',
    idDocument: '001-0982314-2',
    birthDate: '1968-04-12',
    age: 58,
    sex: 'M',
    phone: '809-555-0142',
    emergencyContact: 'Carmen Mendoza (Esposa) - 809-555-0143',
    arrivalDateTime: '2026-09-05 16:30',
    provenance: 'Domicilio / Ambulancia 9-1-1',
    cubicle: 'Trauma / Shock 1',
    triageLevel: 2, // Emergencia
    chiefComplaint: 'Dolor torácico opresivo de 2 horas de evolución irradiado a mandíbula y brazo izquierdo',
    status: 'activos',
    attendingDoctor: 'Dr. Colón',
    createdAt: '2026-09-05 16:30',
    updatedAt: '2026-09-05 17:15',
    vitals: {
      systolicBP: 165,
      diastolicBP: 100,
      map: 122,
      heartRate: 104,
      respiratoryRate: 22,
      temperature: 36.8,
      oxygenSaturation: 93,
      bloodGlucose: 154,
      weight: 84,
      height: 172,
      bmi: 28.4,
      glasgowEye: 4,
      glasgowVerbal: 5,
      glasgowMotor: 6,
      glasgowTotal: 15,
      painScale: 9,
      supplementalOxygen: 'Cánula nasal a 3 L/min',
      hemodynamicStatus: 'Estable',
      allergies: ['Penicilina', 'Cefalosporinas'],
      isPregnant: false,
      anticoagulation: false,
      comorbidities: ['Hipertensión Arterial', 'Dislipidemia', 'Tabaquismo activo (15 paquetes/año)']
    },
    clinicalHistory: {
      reasonForConsultation: 'Dolor torácico opresivo de inicio súbito en reposo.',
      currentIllnessHistory: 'Paciente masculino de 58 años de edad con antecedentes de HTA mal controlada, quien inicia cuadro clínico hace aproximadamente 2 horas caracterizado por dolor precordial opresivo, intensidad 9/10 en escala EVA, con irradiación a mandíbula, cuello y miembro superior izquierdo, acompañado de diaforesis profusa, náuseas y sensación de falta de aire.',
      pathologicalHistory: 'Hipertensión arterial diagnosticada hace 8 años en tratamiento irregular. Tabaquismo.',
      surgicalHistory: 'Apendicectomía a los 22 años sin complicaciones.',
      allergicHistory: 'Alergia severa a Penicilina (erupción cutánea y angioedema previo).',
      habitualMedications: 'Enalapril 20 mg VO c/24h (toma irregular).',
      toxicHabits: 'Tabaco: 10 cigarrillos al día por 20 años. Alcohol ocasional.',
      familyHistory: 'Padre fallecido por infarto agudo de miocardio a los 54 años.',
      obGynHistory: 'No aplica.',
      systemsReview: 'Cardiovascular: precordialgia, palpitaciones. Respiratorio: disnea grado II. Digestivo: náuseas sin vómitos. Resto sin alteraciones referidas.',
      physicalExam: {
        general: 'Paciente diaforético, ansioso, con actitud de Levine (mano en garra sobre el esternón), orientado en tiempo, espacio y persona.',
        cardiovascular: 'Ruidos cardiacos rítmicos, taquicárdicos, R1 y R2 presentes, no soplos ni frote pericárdico audible. Pulsos periféricos simétricos.',
        respiratory: 'Tórax simétrico, expansibilidad conservada. Murmullo vesicular presente bilateralmente, sin ruidos agregados ni estertores.',
        abdominal: 'Blando, depresible, no doloroso a la palpación profunda, ruidos hidroaéreos normales.',
        neurological: 'Glasgow 15/15. Pupilas isocóricas fotorreactivas. Sin déficit focal motor o sensitivo.',
        extremities: 'Eutróficas, sin edemas, llenado capilar 2 segundos.',
        skin: 'Pálida, sudorosa, fría al tacto.',
        otherFindings: 'No ingurgitación yugular a 45 grados.'
      },
      clinicalImpression: '1. Síndrome Coronario Agudo con sospecha de IAM sin elevación del ST (IAMSEST) vs Angina Inestable. 2. Crisis Hipertensiva tipo Urgencia.',
      diagnosticAndTherapeuticPlan: '1. Monitoreo continuo ECG y signos vitales. 2. Reposo absoluto en cama a 45°. 3. Cánula nasal a 3 L/min. 4. Doble antiagregación con Aspirina + Clopidogrel. 5. Analgesia con Nitroglicerina SL. 6. Troponina ultrasensible seriada a las 0h y 2h. 7. Interconsulta urgente con Cardiología.'
    }
  },
  {
    id: 'pat-002',
    internalCode: 'EMG-2026-002',
    medicalRecordNumber: 'EXP-90125',
    fullName: 'Sofía Valenzuela Méndez',
    idDocument: '402-1847192-1',
    birthDate: '2002-08-20',
    age: 24,
    sex: 'F',
    phone: '829-555-7819',
    emergencyContact: 'Marcos Valenzuela (Padre) - 829-555-7820',
    arrivalDateTime: '2026-09-05 17:10',
    provenance: 'Accidente de tránsito / 9-1-1',
    cubicle: 'Trauma / Shock 2',
    triageLevel: 2, // Emergencia
    chiefComplaint: 'Politraumatismo secundario a colisión vehicular frontal (ocupante con cinturón)',
    status: 'activos',
    attendingDoctor: 'Dr. Colón',
    createdAt: '2026-09-05 17:10',
    updatedAt: '2026-09-05 17:40',
    vitals: {
      systolicBP: 100,
      diastolicBP: 65,
      map: 76,
      heartRate: 118,
      respiratoryRate: 24,
      temperature: 36.4,
      oxygenSaturation: 97,
      bloodGlucose: 110,
      weight: 58,
      height: 165,
      bmi: 21.3,
      glasgowEye: 4,
      glasgowVerbal: 4,
      glasgowMotor: 6,
      glasgowTotal: 14,
      painScale: 8,
      supplementalOxygen: 'Mascarilla simple 5 L/min',
      hemodynamicStatus: 'Inestable',
      allergies: ['AINEs (Ketorolaco/Ibuprofeno)'],
      isPregnant: false,
      anticoagulation: false,
      comorbidities: ['Ninguna']
    },
    clinicalHistory: {
      reasonForConsultation: 'Trauma toracoabdominal y en extremidad inferior por colisión.',
      currentIllnessHistory: 'Paciente femenina de 24 años, conductora con cinturón de seguridad colocado, involucrada en colisión vehicular frontal a moderada velocidad con despliegue de bolsas de aire. Ingresa inmovilizada en tabla espinal rígida y collar cervical rígido.',
      pathologicalHistory: 'Negados.',
      surgicalHistory: 'Negados.',
      allergicHistory: 'Alergia a AINEs: broncoespasmo tras toma de ibuprofeno.',
      habitualMedications: 'Anticonceptivos orales.',
      toxicHabits: 'Niega.',
      familyHistory: 'No relevantes.',
      obGynHistory: 'G0P0, FUM hace 14 días.',
      systemsReview: 'Dolor en parrilla costal izquierda y cuadrante superior izquierdo de abdomen. Dolor en muslo derecho.',
      physicalExam: {
        general: 'Vía aérea permeable, columna cervical inmovilizada. Quejumbrosa por dolor.',
        cardiovascular: 'Taquicardia sinusal, ruidos regulares, sin soplos. Pulsos distales débiles pero simétricos.',
        respiratory: 'Dolor a la palpación de 7ma y 8va costillas izquierdas. Murmullo vesicular conservado bilateral.',
        abdominal: 'Equimosis por cinturón de seguridad. Dolor a la descompresión en hipocondrio izquierdo. RHA disminuidos.',
        neurological: 'Glasgow 14/15 (respuesta verbal confusa inicial), pupilas reactivas 3mm.',
        extremities: 'Deformidad y aumento de volumen en tercio medio de muslo derecho.',
        skin: 'Abrasiones dérmicas múltiples en tórax.',
        otherFindings: 'Pelvis estable a la compresión bimanual.'
      },
      clinicalImpression: '1. Politraumatismo cerrado. 2. Sospecha de trauma esplénico cerrado. 3. Sospecha de fractura diafisaria de fémur derecho. 4. Alergia documentada a AINEs.',
      diagnosticAndTherapeuticPlan: '1. Protocolo ATLS ABCDE. 2. 2 vías venosas periféricas 16G. 3. Cristaloides tibios 1000 cc Lactato Ringer. 4. Ecografía FAST urgente en cama. 5. Radiografías de tórax, pelvis y fémur. 6. Paracetamol IV para analgesia (AINEs contraindicados).'
    }
  },
  {
    id: 'pat-003',
    internalCode: 'EMG-2026-003',
    medicalRecordNumber: 'EXP-77201',
    fullName: 'Rogelio Fuentes Peña',
    idDocument: '001-0451239-8',
    birthDate: '1959-01-15',
    age: 67,
    sex: 'M',
    phone: '809-555-3490',
    emergencyContact: 'Teresa Fuentes (Hija) - 809-555-3491',
    arrivalDateTime: '2026-09-05 14:15',
    provenance: 'Consulta Externa',
    cubicle: 'Cubículo Observación 4',
    triageLevel: 3, // Urgencia
    chiefComplaint: 'Dificultad respiratoria progresiva y tos productiva con expectoración verdosa',
    status: 'observacion',
    attendingDoctor: 'Dr. Colón',
    createdAt: '2026-09-05 14:15',
    updatedAt: '2026-09-05 16:50',
    vitals: {
      systolicBP: 138,
      diastolicBP: 85,
      map: 102,
      heartRate: 92,
      respiratoryRate: 26,
      temperature: 38.2,
      oxygenSaturation: 89,
      bloodGlucose: 128,
      weight: 71,
      height: 168,
      bmi: 25.2,
      glasgowEye: 4,
      glasgowVerbal: 5,
      glasgowMotor: 6,
      glasgowTotal: 15,
      painScale: 2,
      supplementalOxygen: 'Venturi al 28% 4 L/min',
      hemodynamicStatus: 'Estable',
      allergies: ['Ninguna conocida'],
      isPregnant: false,
      anticoagulation: false,
      comorbidities: ['EPOC GOLD III', 'Cardiopatía hipertensiva']
    },
    clinicalHistory: {
      reasonForConsultation: 'Disnea de pequeños esfuerzos y fiebre.',
      currentIllnessHistory: 'Paciente masculino de 67 años con diagnóstico conocido de EPOC, quien refiere aumento progresivo de disnea de 4 días de evolución, pasando de clase funcional II a IV (reposo), acompañado de tos con esputo purulento abundante y alzas térmicas no cuantificadas.',
      pathologicalHistory: 'EPOC con oxigenoterapia domiciliaria intermitente. HTA.',
      surgicalHistory: 'Herniorrafia inguinal derecha.',
      allergicHistory: 'Niega alergias medicamentosas.',
      habitualMedications: 'Salmeterol/Fluticasona aerosol, Tiotropio, Losartán 50 mg.',
      toxicHabits: 'Ex fumador de 30 paquetes/año (abandonó hace 2 años).',
      familyHistory: 'No relevantes.',
      obGynHistory: 'No aplica.',
      systemsReview: 'Tiraje intercostal leve, disnea conversacional.',
      physicalExam: {
        general: 'Facies disneica, en posición de trípode, taquipneico.',
        cardiovascular: 'Ruidos cardiacos rítmicos, apagados por tórax enfisematoso.',
        respiratory: 'Tórax en tonel, hiperexpansible. Espiración prolongada, sibilancias espiratorias difusas y roncus bilaterales.',
        abdominal: 'Blando, sin visceromegalias ni dolor.',
        neurological: 'Lúcido, sin focalidad.',
        extremities: 'Acropaquia (dedos en palillo de tambor), sin edemas.',
        skin: 'Tinte cianótico distal leve.',
        otherFindings: 'Uso de musculatura accesoria cervical.'
      },
      clinicalImpression: 'Exacerbación aguda de EPOC tipo I de Anthonisen desencadenada por infección respiratoria baja (Neumonía adquirida en la comunidad vs Bronquitis aguda bacteriana).',
      diagnosticAndTherapeuticPlan: '1. Oxigenoterapia controlada con máscara Venturi al 28% (meta SatO2 88-92%). 2. Nebulizaciones con Salbutamol + Bromuro de Ipratropio c/4h. 3. Metilprednisolona 40 mg IV c/12h. 4. Ceftriaxona 1g IV c/24h + Claritromicina 500 mg VO c/12h. 5. Gases arteriales y Rx de tórax.'
    }
  },
  {
    id: 'pat-004',
    internalCode: 'EMG-2026-004',
    medicalRecordNumber: 'EXP-91504',
    fullName: 'Lucía Morales Cordero',
    idDocument: '402-2394851-0',
    birthDate: '1995-11-03',
    age: 31,
    sex: 'F',
    phone: '829-555-6677',
    emergencyContact: 'José Morales (Hermano) - 829-555-6678',
    arrivalDateTime: '2026-09-05 15:45',
    provenance: 'Domicilio',
    cubicle: 'Cubículo 7',
    triageLevel: 3, // Urgencia
    chiefComplaint: 'Dolor abdominal de 14 horas que inició en epigastrio y migró a fosa ilíaca derecha',
    status: 'pendientes',
    attendingDoctor: 'Dr. Colón',
    createdAt: '2026-09-05 15:45',
    updatedAt: '2026-09-05 17:00',
    vitals: {
      systolicBP: 120,
      diastolicBP: 78,
      map: 92,
      heartRate: 98,
      respiratoryRate: 18,
      temperature: 37.9,
      oxygenSaturation: 99,
      bloodGlucose: 94,
      weight: 62,
      height: 162,
      bmi: 23.6,
      glasgowEye: 4,
      glasgowVerbal: 5,
      glasgowMotor: 6,
      glasgowTotal: 15,
      painScale: 7,
      supplementalOxygen: 'Aire ambiente',
      hemodynamicStatus: 'Estable',
      allergies: ['Sulfonamidas'],
      isPregnant: false,
      anticoagulation: false,
      comorbidities: ['Gastritis erosiva previa']
    },
    clinicalHistory: {
      reasonForConsultation: 'Dolor abdominal agudo con náuseas y febrícula.',
      currentIllnessHistory: 'Paciente femenina de 31 años que presenta dolor abdominal de 14 horas de evolución, de inicio difuso periumbilical y epigástrico tipo cólico sordo, que en las últimas 6 horas migró e intensificó en fosa ilíaca derecha con características continuas y punzantes. Se acompaña de anorexia marcada, dos episodios de vómitos alimentarios y febrícula.',
      pathologicalHistory: 'Gastritis.',
      surgicalHistory: 'Negados.',
      allergicHistory: 'Alergia a Sulfas (rash cutáneo).',
      habitualMedications: 'Omeprazol 20 mg.',
      toxicHabits: 'Niega.',
      familyHistory: 'Madre operada de apendicitis a los 35 años.',
      obGynHistory: 'G1P1, FUM hace 18 días, ciclo regular.',
      systemsReview: 'Digestivo: hiporexia, vómitos, estreñimiento de 2 días. Genitourinario: niega disuria.',
      physicalExam: {
        general: 'Paciente lúcida, colaboradora, que camina flexionando el tronco hacia la derecha (marcha antiálgica).',
        cardiovascular: 'Ruidos normales, taquicardia sinusal leve.',
        respiratory: 'Murmullo vesicular conservado.',
        abdominal: 'Abdomen plano, doloroso a la palpación superficial y profunda en fosa ilíaca derecha. Signo de McBurney positivo. Signo de Blumberg (rebote) francamente positivo. Signo del Psoas positivo.',
        neurological: 'Sin alteraciones.',
        extremities: 'Simétricas, sin edemas.',
        skin: 'Normocoloreada, tibia.',
        otherFindings: 'Tacto vaginal sin dolor a la movilización cervical.'
      },
      clinicalImpression: 'Apendicitis aguda (Score de Alvarado: 8/10 - Muy probable). Descartar patología anexial ginecológica.',
      diagnosticAndTherapeuticPlan: '1. Dieta absoluta (nada por vía oral). 2. Hidratación con Solución Salina 0.9% 1000 cc IV a 125 cc/h. 3. Hemograma, prueba de embarazo rápida (hCG), ecografía abdominal. 4. Interconsulta con Cirugía General.'
    }
  }
];

export const SEED_STUDIES: MedicalStudy[] = [
  {
    id: 'std-001',
    patientId: 'pat-001',
    category: 'Electrocardiograma',
    title: 'ECG 12 Derivaciones - Ingreso',
    anatomicalRegion: 'Cardiovascular / Tórax',
    description: 'ECG tomado a los 5 minutos de llegada en reposo.',
    preliminaryInterpretation: 'Ritmo sinusal a 102 lpm. Infradesnivel del segmento ST de 2 mm en derivaciones V4, V5, V6 y cara inferior (DII, DIII, aVF). Sin elevación de ST.',
    officialResult: 'Isquemia subendocárdica anterolateral e inferior. Sospecha SCACEST/IAMSEST.',
    status: 'Informado',
    tags: ['ECG', 'Isquemia', 'ST infradesnivel', 'Troponinas'],
    imageDataUrl: generateMockEcgDataUrl('ECG INGRESO - Carlos Mendoza'),
    createdAt: '2026-09-05 16:38',
    createdBy: 'Dr. Colón'
  },
  {
    id: 'std-002',
    patientId: 'pat-001',
    category: 'Electrocardiograma',
    title: 'ECG Control - 1 Hora Post Nitratos',
    anatomicalRegion: 'Cardiovascular / Tórax',
    description: 'ECG evolutivo de control tras administración de Nitroglicerina y Doble Antiagregación.',
    preliminaryInterpretation: 'Ritmo sinusal a 88 lpm. Persiste rectificación del ST en derivaciones laterales con mejoría parcial del dolor.',
    officialResult: 'Control con menor depresión del ST.',
    status: 'Informado',
    tags: ['ECG Control', 'Evolutivo'],
    imageDataUrl: generateMockEcgDataUrl('ECG CONTROL 1H - Carlos Mendoza'),
    createdAt: '2026-09-05 17:35',
    createdBy: 'Dr. Colón'
  },
  {
    id: 'std-003',
    patientId: 'pat-002',
    category: 'Radiografía',
    title: 'Radiografía de Tórax Ósea AP',
    anatomicalRegion: 'Tórax / Parrilla costal',
    description: 'Rx de tórax en cama para descartar neumotórax o hemotórax.',
    preliminaryInterpretation: 'Silueta cardiaca normal. Sin neumotórax a tensión. Posible fisura costal 7ma izquierda.',
    officialResult: 'Sin ocupación pleural aguda visible.',
    status: 'Informado',
    tags: ['Rx', 'Trauma', 'Tórax'],
    imageDataUrl: generateMockXRayDataUrl('Rx Tórax AP - Sofía Valenzuela'),
    createdAt: '2026-09-05 17:25',
    createdBy: 'Dr. Colón'
  }
];

export const SEED_LABS: LabResult[] = [
  // Patient 1 - Cardiac
  {
    id: 'lab-001',
    patientId: 'pat-001',
    panel: 'Marcadores Cardiacos',
    parameter: 'Troponina I de alta sensibilidad (hs-cTnI)',
    value: '420',
    numericValue: 420,
    unit: 'ng/L',
    referenceRange: '< 14 ng/L',
    flag: 'critico',
    timestamp: '2026-09-05 17:05',
    source: 'manual'
  },
  {
    id: 'lab-002',
    patientId: 'pat-001',
    panel: 'Marcadores Cardiacos',
    parameter: 'CPK-MB',
    value: '38.5',
    numericValue: 38.5,
    unit: 'ng/mL',
    referenceRange: '0 - 5.0 ng/mL',
    flag: 'alto',
    timestamp: '2026-09-05 17:05',
    source: 'manual'
  },
  {
    id: 'lab-003',
    patientId: 'pat-001',
    panel: 'Química',
    parameter: 'Glucemia en ayunas',
    value: '154',
    numericValue: 154,
    unit: 'mg/dL',
    referenceRange: '70 - 100 mg/dL',
    flag: 'alto',
    timestamp: '2026-09-05 16:45',
    source: 'manual'
  },
  {
    id: 'lab-004',
    patientId: 'pat-001',
    panel: 'Función Renal',
    parameter: 'Creatinina sérica',
    value: '1.1',
    numericValue: 1.1,
    unit: 'mg/dL',
    referenceRange: '0.7 - 1.3 mg/dL',
    flag: 'normal',
    timestamp: '2026-09-05 16:45',
    source: 'manual'
  },
  // Patient 4 - Appendicitis labs
  {
    id: 'lab-005',
    patientId: 'pat-004',
    panel: 'Hemograma',
    parameter: 'Leucocitos totales',
    value: '14,800',
    numericValue: 14800,
    unit: '/mm3',
    referenceRange: '4,500 - 10,000 /mm3',
    flag: 'alto',
    timestamp: '2026-09-05 16:15',
    source: 'manual'
  },
  {
    id: 'lab-006',
    patientId: 'pat-004',
    panel: 'Hemograma',
    parameter: 'Neutrófilos segmentados',
    value: '84',
    numericValue: 84,
    unit: '%',
    referenceRange: '50 - 70 %',
    flag: 'alto',
    timestamp: '2026-09-05 16:15',
    source: 'manual'
  },
  {
    id: 'lab-007',
    patientId: 'pat-004',
    panel: 'Orina',
    parameter: 'hCG en orina (Prueba rápida de embarazo)',
    value: 'Negativa',
    unit: '',
    referenceRange: 'Negativa',
    flag: 'normal',
    timestamp: '2026-09-05 16:10',
    source: 'manual'
  }
];

export const SEED_ORDERS: MedicalOrder[] = [
  {
    id: 'ord-001',
    patientId: 'pat-001',
    type: 'Solución',
    name: 'Solución Salina al 0.9%',
    dose: '500 cc',
    route: 'Intravenosa',
    frequency: 'Para pasar a 40 cc/h (vía permeable)',
    startTime: '2026-09-05 16:40',
    indication: 'Mantenimiento de acceso venoso',
    status: 'Administrada',
    createdAt: '2026-09-05 16:40'
  },
  {
    id: 'ord-002',
    patientId: 'pat-001',
    type: 'Medicamento',
    name: 'Aspirina (Ácido Acetilsalicílico)',
    dose: '300 mg masticada',
    route: 'Vía Oral',
    frequency: 'Dosis única de carga',
    startTime: '2026-09-05 16:42',
    indication: 'Antiagregación plaquetaria inicial en SCA',
    status: 'Administrada',
    createdAt: '2026-09-05 16:42'
  },
  {
    id: 'ord-003',
    patientId: 'pat-001',
    type: 'Medicamento',
    name: 'Clopidogrel',
    dose: '300 mg',
    route: 'Vía Oral',
    frequency: 'Dosis de carga',
    startTime: '2026-09-05 16:43',
    indication: 'Segundo antiagregante plaquetario',
    status: 'Administrada',
    createdAt: '2026-09-05 16:43'
  },
  {
    id: 'ord-004',
    patientId: 'pat-001',
    type: 'Medicamento',
    name: 'Nitroglicerina sublingual',
    dose: '0.5 mg',
    route: 'Sublingual',
    frequency: 'Cada 5 minutos por 3 dosis si persiste dolor',
    startTime: '2026-09-05 16:45',
    indication: 'Vasodilatador coronario para alivio del dolor isquémico',
    status: 'Completada',
    createdAt: '2026-09-05 16:45'
  }
];

export const SEED_EVOLUTIONS: PatientEvolution[] = [
  {
    id: 'evo-001',
    patientId: 'pat-001',
    timestamp: '2026-09-05 17:30',
    doctorName: 'Dr. Colón',
    vitalSignsSummary: 'PA: 142/88 mmHg, FC: 84 lpm, SpO2: 98% con O2 a 3L, Dolor EVA: 3/10',
    clinicalChanges: 'Paciente refiere descenso significativo del dolor precordial opresivo tras 2da tableta de Nitroglicerina y reposo en cama. Sin diaforesis.',
    newResults: 'Troponina hs-cTnI positiva (420 ng/L). ECG de control muestra estabilización del segmento ST.',
    problemReevaluation: 'SCA / IAMSEST de alto riesgo estratificado según score GRACE.',
    updatedDiagnoses: 'Infarto Agudo de Miocardio Sin Elevación del ST (IAMSEST).',
    conduct: 'Se coordina traslado urgente a Unidad de Cuidados Intensivos Coronarios (UCIC) para cateterismo cardiaco temprano. Continuar Enoxaparina 1 mg/kg SC.',
    nextReevaluationTime: '2026-09-05 18:30'
  }
];

export async function seedDatabaseIfEmpty(db: any): Promise<void> {
  const count = await db.patients.count();
  if (count === 0) {
    // 1. Verificar si existe respaldo real del usuario guardado en localStorage
    try {
      if (typeof window !== 'undefined') {
        const backupStr = localStorage.getItem('hr_colon_patients_backup');
        if (backupStr) {
          const backupPatients = JSON.parse(backupStr);
          if (Array.isArray(backupPatients) && backupPatients.length > 0) {
            console.log('[Seed] Restaurando expedientes reales desde respaldo local...');
            await db.patients.bulkAdd(backupPatients);
            return;
          }
        }
      }
    } catch (e) {
      console.warn('[Seed] Error leyendo respaldo local:', e);
    }

    // 2. Solo si el sistema está completamente virgen, sembrar casos modelo
    console.log('Seeding initial clinical database with realistic emergency cases...');
    await db.patients.bulkAdd(SEED_PATIENTS);
    await db.studies.bulkAdd(SEED_STUDIES);
    await db.labs.bulkAdd(SEED_LABS);
    await db.orders.bulkAdd(SEED_ORDERS);
    await db.evolutions.bulkAdd(SEED_EVOLUTIONS);
    console.log('Database successfully seeded.');
  }
}
