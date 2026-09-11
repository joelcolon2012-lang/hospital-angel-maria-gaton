import { db } from '../db/dexieDb';
import { cloudSyncService } from './cloudSyncService';

export interface Cephalo16System {
  id: string;
  name: string;
  category: string;
  defaultNormal: string;
  quickOptions: string[];
}

export const OFFICIAL_16_SYSTEMS: Cephalo16System[] = [
  {
    id: 'general',
    name: '1. Estado General',
    category: 'General',
    defaultNormal: 'Paciente en aceptables condiciones generales, alerta, consciente, orientado en tiempo, espacio y persona, cooperador, normocoloreado, hidratado, eupneico.',
    quickOptions: [
      'Alerta, orientado en 3 esferas, cooperador, hidratado y normocoloreado',
      'Agudamente enfermo, quejumbroso, diaforético, pálido',
      'Crónicamente enfermo, emaciado, regular estado de nutrición',
      'Somnoliento, responde a estímulos verbales, desorientado en tiempo',
      'Estuporoso, responde únicamente a estímulos dolorosos intensos',
      'Comatoso, sin respuesta a estímulos verbales ni dolorosos',
      'Facies álgica, quejumbroso, facie pálida terrosa',
    ],
  },
  {
    id: 'head',
    name: '2. Cabeza',
    category: 'Cabeza y Cuello',
    defaultNormal: 'Normocéfalo, sin hematomas ni hundimientos, adecuada implantación pilosa.',
    quickOptions: [
      'Normocéfalo, sin deformidades óseas ni hematomas subgaleales',
      'Hematoma subgaleal en región parietal izquierda',
      'Herida contusa lineal en región frontal suturada sin signos de infección',
      'Signos de traumatismo craneoencefálico leve en región occipital',
      'Alopecia difusa, implantación pilosa conservada',
    ],
  },
  {
    id: 'eyes',
    name: '3. Ojos',
    category: 'Cabeza y Cuello',
    defaultNormal: 'Pupilas isocóricas y fotorreactivas a la luz de 3 mm bilateral, escleras anictéricas, conjuntivas normocoloreadas.',
    quickOptions: [
      'Pupilas isocóricas, fotorreactivas de 3 mm bilateral',
      'Anisocoria: pupila derecha midriática arreactiva de 5 mm',
      'Miosis puntiforme bilateral reactiva (sospecha opioides)',
      'Escleras ictéricas (+/++++), conjuntivas pálidas (anemia)',
      'Hemorragia subconjuntival traumática en ojo izquierdo',
      'Reflejo corneal presente y simétrico bilateral',
    ],
  },
  {
    id: 'ears',
    name: '4. Oídos',
    category: 'Cabeza y Cuello',
    defaultNormal: 'Pabellones auriculares bien implantados, conductos auditivos externos permeables, sin otorragia ni otorrea.',
    quickOptions: [
      'Pabellones auriculares normoimplantados, CAE permeables bilateral',
      'Otorragia activa en oído derecho post-trauma craneal',
      'Otorrea seropurulenta fétida en oído izquierdo',
      'Signo de Battle (equimosis mastoidea retroauricular) negativo',
      'Tapón de cerumen obstructivo bilateral',
    ],
  },
  {
    id: 'nose',
    name: '5. Nariz',
    category: 'Cabeza y Cuello',
    defaultNormal: 'Fosas nasales permeables, sin secreciones patológicas, mucosa normocoloreada, sin epistaxis.',
    quickOptions: [
      'Fosas nasales permeables, sin secreciones patológicas ni epistaxis',
      'Epistaxis anterior activa autolimitada',
      'Rinorrea hialina serosa profusa bilateral',
      'Rinorraquia (líquido cefalorraquídeo claro post-trauma)',
      'Desviación septal nasal hacia fosa derecha',
    ],
  },
  {
    id: 'mouth',
    name: '6. Boca',
    category: 'Cabeza y Cuello',
    defaultNormal: 'Mucosa oral húmeda y normocoloreada, lengua móvil y centrada, piezas dentales en regular estado, faringe no congestiva.',
    quickOptions: [
      'Mucosa oral hidratada, lengua normoglosa centrada, faringe limpia',
      'Mucosa oral intensamente deshidratada, lengua saburral seca',
      'Faringe hiperémica congestiva con placas pultáceas amigdalinas',
      'Edema angioneurótico de labios y úvula (angioedema)',
      'Edéntulo total / parcial con o sin prótesis dental',
      'Mordedura lingual lateral compatible con crisis convulsiva',
    ],
  },
  {
    id: 'neck',
    name: '7. Cuello',
    category: 'Cabeza y Cuello',
    defaultNormal: 'Simétrico, móvil, no doloroso, sin ingurgitación yugular a 45°, sin adenopatías palpables, pulsos carotídeos rítmicos.',
    quickOptions: [
      'Simétrico, móvil, no doloroso, sin ingurgitación yugular ni soplos',
      'Ingurgitación yugular grado II/IV a 45 grados, reflujo hepatoyugular (+)',
      'Rigidez de nuca presente, signos de Kernig y Brudzinski positivos',
      'Soplo carotídeo sistólico audible en región carotídea derecha',
      'Bocio difuso grado I palpable, no doloroso',
      'Adenopatía cervical anterior dolorosa de 2 cm móvil',
    ],
  },
  {
    id: 'thorax',
    name: '8. Tórax',
    category: 'Tórax y Cardiorrespiratorio',
    defaultNormal: 'Tórax simétrico, normoexpansible, sin deformidades, sin dolor a la palpación de arcos costales.',
    quickOptions: [
      'Simétrico, normoexpansible, sin deformidades ni dolor costal',
      'Dolor exquisito a la palpación en 5to y 6to arco costal anterior izquierdo',
      'Enfisema subcutáneo palpable en región supraclavicular y hemitórax',
      'Tórax en tonel con diámetro anteroposterior aumentado (EPOC)',
      'Tiraje intercostal y retracción subcostal moderada',
      'Herida por arma blanca / de fuego en región torácica',
    ],
  },
  {
    id: 'lungs',
    name: '9. Pulmones',
    category: 'Tórax y Cardiorrespiratorio',
    defaultNormal: 'Campos pulmonares normoventilados bilateralmente, murmullo vesicular conservado en ambos hemitórax, sin estertores ni sibilancias.',
    quickOptions: [
      'Normoventilados, murmullo vesicular conservado bilateral sin ruidos agregados',
      'Estertores crepitantes basales bilaterales con broncofonía',
      'Sibilancias espiratorias y roncus diseminados bilateralmente',
      'Hipoventilación y matidez basal derecha compatible con derrame pleural',
      'Abolición del murmullo vesicular y timpanismo en hemitórax derecho (neumotórax)',
      'Estertores húmedos de pequeñas y medianas burbujas bibasales',
      'Uso marcado de musculatura accesoria con aleteo nasal',
    ],
  },
  {
    id: 'heart',
    name: '10. Corazón',
    category: 'Tórax y Cardiorrespiratorio',
    defaultNormal: 'Ruidos cardíacos rítmicos y regulares, R1 y R2 normofonéticos en los 4 focos auscultatorios, sin soplos, galopes ni roces.',
    quickOptions: [
      'Ruidos cardíacos rítmicos y regulares, R1-R2 normofonéticos, sin soplos',
      'Arritmia completa sugestiva de fibrilación auricular, sin soplos',
      'Soplo holosistólico grado III/VI en foco mitral irradiado a axila',
      'Soplo mesosistólico eyectivo grado II/VI en foco aórtico',
      'R3 audible en foco mitral (ritmo de galope ventricular)',
      'Ruidos cardíacos apagados hipofonéticos (derrame pericárdico)',
      'Roce pericárdico audible en mesocardio con el paciente inclinado',
    ],
  },
  {
    id: 'abdominal',
    name: '11. Abdomen',
    category: 'Abdomen y Digestivo',
    defaultNormal: 'Abdomen blando, depresible, no doloroso a la palpación superficial ni profunda, RHA normoactivos, sin visceromegalias ni irritación peritoneal.',
    quickOptions: [
      'Blando, depresible, no doloroso, RHA presentes normoactivos, no megalias',
      'Dolor a la palpación en fosa ilíaca derecha con Blumberg y Rovsing positivos',
      'Dolor en hipocondrio derecho con signo de Murphy positivo',
      'Dolor epigástrico en faja irradiado a dorso con defensa muscular',
      'Abdomen distendido, doloroso difusamente, RHA de lucha metálicos',
      'Abdomen en tabla con contractura involuntaria generalizada (peritonitis)',
      'Hepatomegalia palpable a 3 cm bajo reborde costal, consistencia lisa',
      'Ascitis moderada con onda ascítica y matidez cambiante positiva',
    ],
  },
  {
    id: 'genitals',
    name: '12. Genitales',
    category: 'Genital y Urinario',
    defaultNormal: 'Genitales externos normoconfigurados según edad y sexo, sin lesiones dérmicas, sin secreciones patológicas.',
    quickOptions: [
      'Genitales externos sin lesiones ni secreciones patológicas',
      'Sonda vesical Foley a cistoflo con orina clara / hematúrica / colúrica',
      'Hematuria macroscópica con presencia de coágulos',
      'Dolor testicular agudo con reflejo cremastérico abolido (sospecha torsión)',
      'Sangrado genital activo transvaginal escaso / moderado',
      'Lesión ulcerada indolora en glande / labios (sospecha chancro)',
    ],
  },
  {
    id: 'skin',
    name: '13. Piel y Anexos',
    category: 'Tegumentario',
    defaultNormal: 'Piel normotérmica, elástica, turgencia conservada, llenado capilar menor de 2 segundos, sin lesiones, rash ni petequias.',
    quickOptions: [
      'Piel elástica, normotérmica, turgencia conservada, llenado capilar < 2s',
      'Palidez mucocutánea generalizada marcada (+++/++++)',
      'Ictericia cutáneo-mucosa franca con coluria y acolia',
      'Exantema maculopapular eritematoso pruriginoso confluente',
      'Petequias y equimosis espontáneas en miembros inferiores (púrpura)',
      'Diaforesis profusa fría con piel moteada (livedo reticularis / shock)',
      'Úlcera por presión estadio II en región sacra con bordes limpios',
    ],
  },
  {
    id: 'upperExtremities',
    name: '14. Extremidades Superiores',
    category: 'Músculo-Esquelético',
    defaultNormal: 'Simétricas, móviles, tono y fuerza muscular 5/5 bilateral, pulsos radiales presentes y simétricos, sin edema ni deformidades.',
    quickOptions: [
      'Simétricas, móviles, tono y trofismo conservados, fuerza 5/5 bilateral',
      'Monoparesia braquial derecha con fuerza muscular 2/5 (EVC)',
      'Plejía braquial izquierda con flacidez inicial y reflejos abolidos',
      'Deformidad ósea y crepitación dolorosa en antebrazo post-traumatismo',
      'Temblor de reposo asimétrico en cuenta de monedas en mano derecha',
    ],
  },
  {
    id: 'lowerExtremities',
    name: '15. Extremidades Inferiores',
    category: 'Músculo-Esquelético',
    defaultNormal: 'Simétricas, sin deformidades, arcos de movilidad conservados, fuerza 5/5 bilateral, pulsos pedios palpables, sin edema.',
    quickOptions: [
      'Simétricas, fuerza 5/5, pulsos pedios palpables, sin edema bilateral',
      'Edema con fóvea grado II/IV bilateral hasta tercio medio de piernas',
      'Edema asimétrico en miembro inferior izquierdo doloroso con Homans (+)',
      'Monoparesia crural derecha con fuerza 3/5 y signo de Babinski (+)',
      'Úlcera venosa supramaleolar interna de bordes irregulares con exudado',
      'Pulsos pedios y tibiales posteriores ausentes con frialdad distal (isquemia)',
    ],
  },
  {
    id: 'neurological',
    name: '16. Neurológico',
    category: 'Neurológico',
    defaultNormal: 'Alerta, consciente, Glasgow 15/15, orientado en tiempo, espacio y persona, pares craneales conservados sin déficit motor focal, marcha estable.',
    quickOptions: [
      'Alerta, orientado en 3 esferas, Glasgow 15/15, sin focalidad neurológica',
      'Hemiparesia facio-braquio-crural derecha armónica espástica, Babinski (+)',
      'Afasia mixta motora y sensitiva de inicio súbito (EVC agudo)',
      'Disartria moderada con asimetría facial izquierda por parálisis facial central',
      'Glasgow 8/15 (Ocular 2, Verbal 2, Motor 4) con protección de vía aérea requerida',
      'Ataxia de la marcha con dismetría y disdiadococinesia ipsilateral',
      'Rigidez en rueda dentada con bradicinesia e hipomimia facial',
    ],
  },
];

const SETTINGS_KEY = 'custom_normal_physical_exam';

/**
 * Obtiene el examen físico normal configurado por el Dr. Colón (o el default si no ha configurado uno)
 */
export const getCustomNormalPhysicalExam = async (): Promise<Record<string, string>> => {
  try {
    const settingItem = await db.settings.get(SETTINGS_KEY);
    if (settingItem && settingItem.value) {
      return typeof settingItem.value === 'string'
        ? JSON.parse(settingItem.value)
        : settingItem.value;
    }
  } catch (err) {
    console.warn('Error leyendo examen físico normal de BD:', err);
  }

  // Retornar defaults
  const defaults: Record<string, string> = {};
  OFFICIAL_16_SYSTEMS.forEach((s) => {
    defaults[s.id] = s.defaultNormal;
  });
  return defaults;
};

/**
 * Guarda el examen físico normal personalizado por el usuario
 */
export const saveCustomNormalPhysicalExam = async (
  examData: Record<string, string>
): Promise<void> => {
  await db.settings.put({
    id: SETTINGS_KEY,
    value: examData,
  });

  // Programar sincronización en la nube
  cloudSyncService.scheduleAutoSync();
};
