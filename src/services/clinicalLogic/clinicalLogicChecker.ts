/**
 * DETECTOR DE ERRORES LÓGICO-CLÍNICOS
 * Compara diagnósticos y motivo de consulta con el examen físico, los signos vitales,
 * los paraclínicos, los estudios, el sexo y los medicamentos, y avisa de contradicciones.
 * Nunca cambia datos: solo alerta para que el médico revise.
 */
import type { Patient, LabResult, MedicalStudy, StructuredDiagnosis } from '../../types';

export type IssueSeverity = 'error' | 'alerta' | 'aviso';
export type IssueField =
  | 'general'
  | 'lungs'
  | 'heart'
  | 'abdominal'
  | 'neurological'
  | 'skin'
  | 'upperExtremities'
  | 'lowerExtremities'
  | 'genitals'
  | 'vitals'
  | 'diagnoses'
  | 'labs'
  | 'studies'
  | 'antecedents';

export interface ClinicalIssue {
  id: string;
  severity: IssueSeverity;
  field: IssueField;
  title: string;
  message: string;
}

const fold = (s?: string | null) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase();

// ---------------------------------------------------------------------------
// Categorías diagnósticas (por código CIE-10 o por palabras)
// ---------------------------------------------------------------------------
interface Cat {
  codes: string[];
  kw: RegExp;
}
const CATS: Record<string, Cat> = {
  pneumonia: { codes: ['J12', 'J13', 'J14', 'J15', 'J16', 'J17', 'J18', 'J69', 'U07'], kw: /NEUMONI|BRONCONEUMONI|\bNAC\b|NEUMONITIS/ },
  obstructive: { codes: ['J44.1', 'J45', 'J46', 'J44.0'], kw: /(EPOC|ASMA|BRONCOESPASMO|ENFISEMA).*(EXACERB|CRISIS|AGUDIZ|DESCOMPENS)|(EXACERB|CRISIS|AGUDIZ).*(EPOC|ASMA)|ESTADO ASMATICO|BRONCOESPASMO/ },
  effusion: { codes: ['J90', 'J91'], kw: /DERRAME PLEURAL|HIDROTORAX|EMPIEMA/ },
  pneumothorax: { codes: ['J93'], kw: /NEUMOTORAX/ },
  respFailure: { codes: ['J96', 'J80', 'R09.0'], kw: /INSUFICIENCIA RESPIRATORIA|HIPOXEMI|\bSDRA\b|DISTRES RESPIRATORIO/ },
  heartFailure: { codes: ['I50', 'I11.0', 'I13.0', 'J81'], kw: /INSUFICIENCIA CARDIACA|\bICC\b|EDEMA AGUDO (DE|DEL) PULMON|FALLA CARDIACA/ },
  af: { codes: ['I48'], kw: /FIBRILACION AURICULAR|FLUTTER AURICULAR|ALETEO AURICULAR/ },
  acs: { codes: ['I20.0', 'I21', 'I22', 'I24'], kw: /INFARTO AGUDO (DEL|DE) MIOCARDIO|\bIAM(CEST|SEST)?\b|SINDROME CORONARIO AGUDO|\bSCA(CEST|SEST)?\b|ANGINA INESTABLE/ },
  stroke: { codes: ['I60', 'I61', 'I62', 'I63', 'I64', 'G45', 'G46'], kw: /\bEVC\b|\bACV\b|ICTUS|ACCIDENTE (CEREBRO ?)?VASCULAR|INFARTO CEREBRAL|HEMORRAGIA (INTRAPARENQUIMATOSA|INTRACEREBRAL|SUBARACNOIDEA)|ATAQUE ISQUEMICO TRANSITORIO|\bAIT\b/ },
  meningitis: { codes: ['G00', 'G01', 'G02', 'G03', 'A39.0', 'A87'], kw: /MENINGITIS|MENINGOENCEFALITIS/ },
  acuteAbdomen: { codes: ['K35', 'K36', 'K37', 'K80.0', 'K81.0', 'K85', 'K56', 'K65', 'K57', 'R10.0'], kw: /APENDICITIS|COLECISTITIS|PANCREATITIS|ABDOMEN AGUDO|PERITONITIS|OBSTRUCCION INTESTINAL|OCLUSION INTESTINAL|DIVERTICULITIS|COLANGITIS/ },
  softTissue: { codes: ['L03', 'A46', 'L02', 'E10.5', 'E11.5', 'L89', 'L97', 'M72.6'], kw: /CELULITIS|ERISIPELA|ABSCESO|PIE DIABETICO|ULCERA POR PRESION|FASCITIS/ },
  dvt: { codes: ['I80'], kw: /TROMBOSIS VENOSA|\bTVP\b|TROMBOFLEBITIS/ },
  sepsis: { codes: ['A40', 'A41', 'R65.2', 'R57.2'], kw: /SEPSIS|SEPTICEMIA|(CHOQUE|SHOCK) SEPTICO/ },
  shock: { codes: ['R57', 'T79.4'], kw: /\bCHOQUE\b|\bSHOCK\b/ },
  dehydration: { codes: ['E86'], kw: /DESHIDRATACION|DEPLECION (DEL )?VOLUMEN|HIPOVOLEMIA/ },
  htnCrisis: { codes: ['I16'], kw: /CRISIS HIPERTENSIVA|URGENCIA HIPERTENSIVA|EMERGENCIA HIPERTENSIVA/ },
  hypoglycemia: { codes: ['E16.0', 'E16.1', 'E16.2'], kw: /HIPOGLUCEMIA|HIPOGLICEMIA/ },
  hyperglycemicCrisis: { codes: ['E10.1', 'E11.1', 'E13.1', 'E14.1'], kw: /CETOACIDOSIS|\bCAD\b|ESTADO HIPEROSMOLAR|HIPERGLUCEMIA|HIPERGLICEMIA/ },
  anemia: { codes: ['D50', 'D51', 'D52', 'D53', 'D55', 'D56', 'D57', 'D58', 'D59', 'D60', 'D61', 'D62', 'D63', 'D64'], kw: /ANEMIA/ },
  aki: { codes: ['N17'], kw: /LESION RENAL AGUDA|INSUFICIENCIA RENAL AGUDA|\bLRA\b/ },
  hyponatremia: { codes: ['E87.1'], kw: /HIPONATREMIA/ },
  hyperkalemia: { codes: ['E87.5'], kw: /HIPERPOTASEMIA|HIPERKALEMIA/ },
  hypokalemia: { codes: ['E87.6'], kw: /HIPOPOTASEMIA|HIPOKALEMIA/ },
  tachy: { codes: ['R00.0', 'I47'], kw: /TAQUICARDIA/ },
  brady: { codes: ['R00.1'], kw: /BRADICARDIA/ },
  fever: { codes: ['R50'], kw: /SINDROME FEBRIL|\bFIEBRE\b(?! (TIFOIDEA|DEL DENGUE|AMARILLA|REUMATICA))/ },
  pregnancy: { codes: ['O', 'Z33', 'Z34', 'Z35'], kw: /EMBARAZO|GESTACION|PUERPERIO|PREECLAMPSIA|ECLAMPSIA|\bABORTO\b|AMENAZA DE PARTO/ },
  maleOnly: { codes: ['N40', 'N41', 'N42', 'N43', 'N44', 'N45', 'N46', 'N47', 'N48', 'N49', 'N50', 'N51', 'C61', 'C62', 'C63'], kw: /PROSTAT|ORQUI|TESTIC|HIDROCELE|VARICOCELE|FIMOSIS|DISFUNCION ERECTIL/ },
  femaleOnly: { codes: ['N70', 'N71', 'N72', 'N73', 'N75', 'N76', 'N80', 'N81', 'N83', 'N84', 'N85', 'N86', 'N87', 'N91', 'N92', 'N93', 'N94', 'N95', 'C51', 'C52', 'C53', 'C54', 'C55', 'C56', 'C57', 'C58', 'D25'], kw: /UTERO|UTERINO|OVARI|VAGIN|ENDOMETR|CERVICITIS|CANCER DE CERVIX|MIOMA|MENOPAUSIA|DISMENORREA|AMENORREA/ }
};

interface ActiveDx {
  name: string;
  code?: string;
  source: 'dx' | 'motivo';
}

function matchCat(d: ActiveDx, cat: Cat): boolean {
  const code = fold(d.code).replace(/\s/g, '');
  if (code && cat.codes.some((c) => (c.length === 1 ? code.startsWith(c) : code.startsWith(c)))) return true;
  return cat.kw.test(fold(d.name));
}

// ---------------------------------------------------------------------------
// Lectura del examen físico: vacío / sin hallazgos / con hallazgos
// ---------------------------------------------------------------------------
const NEGATORS = /(^|[\s,;(])(SIN|NO|NI|NIEGA|AUSENCIA DE|NEGATIVO|NEGATIVA)([\s,;:]|$)/g;

/** ¿Aparece algún hallazgo patológico (no negado)? */
export function hasFinding(text: string, kw: RegExp): boolean {
  const T = fold(text);
  if (!T.trim()) return false;
  if (/^\s*\[ALTERADO\]/.test(T) && T.replace(/\[ALTERADO\]\s*:?/, '').trim()) {
    // marcado como alterado por el médico: se toma como hallazgo si además menciona algo del órgano
  }
  const clauses = T.split(/[.;\n]|,\s*(?=[A-Z]+\s)/);
  for (const c of clauses) {
    const re = new RegExp(kw.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(c))) {
      const before = c.slice(0, m.index);
      // negado si hay "SIN/NO/NI..." antes en la misma frase y no hay "CON" después de la negación
      const negs = [...before.matchAll(NEGATORS)];
      if (negs.length) {
        const last = negs[negs.length - 1];
        const after = before.slice((last.index || 0) + last[0].length);
        if (!/\bCON\b|\bPRESENTA\b|\bSE AUSCULTA|\bSE PALPA|\bSE OBSERVA/.test(after)) continue;
      }
      return true;
    }
  }
  return false;
}

type OrganState = 'vacio' | 'sin_hallazgos' | 'con_hallazgos';

const ABN: Record<string, RegExp> = {
  lungs: /CREPIT|ESTERTOR|RONCUS|RONCANT|SIBILAN|SOPLO TUBARICO|HIPOVENTIL|MURMULLO VESICULAR (DISMINUIDO|ABOLIDO|AUSENTE)|\bMATIDEZ|SUBMATIDEZ|FROTE PLEURAL|TIRAJE|MUSCULOS ACCESORIOS|DISMINUCION DEL MURMULLO|ABOLICION|EGOFONIA|BRONCOFONIA|VIBRACIONES VOCALES (AUMENTADAS|DISMINUIDAS|ABOLIDAS)|POLIPNEA|TAQUIPNEA|DIFICULTAD RESPIRATORIA|HIPERRESONAN|TIMPANISMO|CONSOLIDACION|DERRAME/,
  heart: /ARRITMIC|IRREGULAR|SOPLO|GALOPE|TERCER RUIDO|\bS3\b|\bS4\b|TAQUICARD|BRADICARD|FROTE|INGURGITACION|REFLUJO HEPATOYUGULAR|APAGADOS|HIPOFONETICOS/,
  abdominal: /DOLOR|DOLOROSO|DEFENSA|RIGIDEZ|BLUMBERG|MURPHY|MC ?BURNEY|ROVSING|PSOAS|OBTURADOR|REBOTE|DISTENDID|DISTENSION|IRRITACION PERITONEAL|PERISTALSIS (DISMINUIDA|AUSENTE|AUMENTADA)|RUIDOS (HIDROAEREOS )?(DISMINUIDOS|AUSENTES|AUMENTADOS)|ASCITIS|ONDA ASCITICA|MASA|HEPATOMEGALIA|ESPLENOMEGALIA|VISCEROMEGALIA|EN TABLA/,
  neurological: /DEFICIT|HEMIPAR|HEMIPLEJ|PARESIA|PLEJIA|AFASIA|DISARTRIA|DESVIACION DE LA COMISURA|COMISURA LABIAL DESVIADA|ASIMETRIA FACIAL|BABINSKI (\+|POSITIVO)|RIGIDEZ DE NUCA|KERNIG|BRUDZINSKI|SIGNOS MENINGEOS|DESORIENTAD|SOMNOLIENT|ESTUPOR|\bCOMA\b|FOCALIZACION|FOCALIDAD|NIHSS\s*:?\s*[1-9]|ATAXIA|NISTAGMO|ANISOCORIA/,
  skinLimb: /ERITEMA|EDEMA|\bCALOR\b|RUBOR|FLUCTUA|ULCERA|NECROS|SECRECION|CELULITIS|LESION|HERIDA|DOLOR|EMPASTAMIENTO|HOMANS|AUMENTO DE VOLUMEN|IMPOTENCIA FUNCIONAL|DEFORMIDAD|FOVEA|GODET|FLICTENA|ABSCESO|LINFANGITIS|ASIMETRIA/,
  dehydration: /DESHIDRAT|MUCOSAS? (ORAL(ES)? )?SECAS|MUCOSA ORAL SECA|SIGNO DEL PLIEGUE|PLIEGUE CUTANEO POSITIVO|LLENADO CAPILAR (LENTO|RETARDADO|MAYOR|>)|OJOS HUNDIDOS|HIPOHIDRAT/,
  meningeal: /RIGIDEZ DE NUCA|KERNIG|BRUDZINSKI|SIGNOS MENINGEOS (POSITIVOS|PRESENTES)|MENINGISMO/,
  dvtLimb: /EDEMA|EMPASTAMIENTO|HOMANS|AUMENTO DE VOLUMEN|DOLOR|ASIMETRIA|CALOR|ERITEMA|CORDON/
};

function organState(text: string, kw: RegExp): OrganState {
  const T = fold(text).replace(/\[ALTERADO\]\s*:?/g, '').trim();
  if (!T) return 'vacio';
  return hasFinding(T, kw) ? 'con_hallazgos' : 'sin_hallazgos';
}

const num = (v: any): number | undefined => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

function latestLab(labs: LabResult[], re: RegExp): number | undefined {
  const l = (labs || [])
    .filter((x) => re.test(fold(x.parameter)))
    .sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')))[0];
  return l ? num(String(l.value).replace(/^[<>≤≥]=?/, '')) : undefined;
}

// ---------------------------------------------------------------------------
// MOTOR
// ---------------------------------------------------------------------------
export function checkClinicalLogic(p: Patient, labs: LabResult[] = [], studies: MedicalStudy[] = []): ClinicalIssue[] {
  const issues: ClinicalIssue[] = [];
  const add = (i: ClinicalIssue) => {
    if (!issues.some((x) => x.id === i.id)) issues.push(i);
  };
  const h: any = p.clinicalHistory || {};
  const pe: any = h.physicalExam || {};
  const v: any = p.vitals || {};

  // Diagnósticos activos (los "A descartar" no generan contradicciones) + motivo de consulta
  const list: StructuredDiagnosis[] = (p.diagnosesList && p.diagnosesList.length ? p.diagnosesList : h.diagnosesList || []) as StructuredDiagnosis[];
  const dx: ActiveDx[] = list.filter((d) => d.status !== 'A descartar' && d.name).map((d) => ({ name: d.name, code: d.cie10Code, source: 'dx' as const }));
  if (!list.length && h.clinicalImpression) {
    String(h.clinicalImpression)
      .split(/\n|;/)
      .map((x: string) => x.replace(/^\s*(\d+[.)-]|[•●\-*])\s*/, '').trim())
      .filter((x: string) => x && !/^\[/.test(x) && !/DESCARTAR/i.test(x))
      .forEach((x: string) => dx.push({ name: x, source: 'dx' }));
  }
  const motive = [p.chiefComplaint, h.reasonForConsultation].filter(Boolean).join(' ');
  if (motive) dx.push({ name: motive, source: 'motivo' });

  const has = (cat: keyof typeof CATS) => dx.find((d) => matchCat(d, CATS[cat]));
  const label = (d: ActiveDx) => (d.source === 'motivo' ? `el motivo de consulta (“${d.name.slice(0, 60)}”)` : `el diagnóstico “${d.name}”${d.code ? ` (${d.code})` : ''}`);

  const lungs = organState(pe.lungs || pe.respiratory || '', ABN.lungs);
  const heartTxt = pe.heart || pe.cardiovascular || '';
  const heart = organState(heartTxt, ABN.heart);
  const abd = organState(pe.abdominal || pe.abdomen || '', ABN.abdominal);
  const neuroTxt = pe.neurological || '';
  const neuro = organState(neuroTxt, ABN.neurological);
  const limbTxt = [pe.skin, pe.upperExtremities, pe.lowerExtremities, pe.extremities].filter(Boolean).join('. ');
  const limbs = organState(limbTxt, ABN.skinLimb);
  const lowerTxt = pe.lowerExtremities || pe.extremities || '';
  const lower = organState(lowerTxt, ABN.dvtLimb);

  const organRule = (catKey: keyof typeof CATS, state: OrganState, field: IssueField, organ: string, expected: string) => {
    const d = has(catKey);
    if (!d) return;
    if (state === 'sin_hallazgos') {
      add({ id: `${catKey}-${field}`, severity: 'alerta', field, title: `${organ} sin hallazgos`, message: `Por ${label(d)} se esperaría encontrar ${expected}, pero ${organ.toLowerCase()} está descrito sin hallazgos. Revise el examen o el diagnóstico.` });
    } else if (state === 'vacio') {
      add({ id: `${catKey}-${field}-vacio`, severity: 'aviso', field, title: `${organ} sin documentar`, message: `Con ${label(d)} conviene documentar ${organ.toLowerCase()} (${expected}).` });
    }
  };

  // 1) Examen físico vs diagnóstico / motivo
  organRule('pneumonia', lungs, 'lungs', 'Pulmones', 'crepitantes, soplo tubárico, hipoventilación o matidez');
  organRule('obstructive', lungs, 'lungs', 'Pulmones', 'sibilancias, espiración prolongada o hipoventilación');
  organRule('effusion', lungs, 'lungs', 'Pulmones', 'murmullo vesicular disminuido/abolido y matidez');
  organRule('pneumothorax', lungs, 'lungs', 'Pulmones', 'murmullo vesicular abolido e hiperresonancia');
  organRule('acuteAbdomen', abd, 'abdominal', 'Abdomen', 'dolor a la palpación, defensa o signos de irritación peritoneal');
  organRule('stroke', neuro, 'neurological', 'Examen neurológico', 'déficit focal (paresia, disartria, afasia, asimetría facial) y NIHSS');
  organRule('softTissue', limbs, 'skin', 'Piel y extremidades', 'eritema, calor, edema, úlcera o secreción');
  organRule('dvt', lower, 'lowerExtremities', 'Extremidades inferiores', 'edema asimétrico, empastamiento o dolor en pantorrilla');

  const hf = has('heartFailure');
  if (hf && lungs === 'sin_hallazgos' && (lower === 'sin_hallazgos' || lower === 'vacio') && heart !== 'con_hallazgos') {
    add({ id: 'hf-congestion', severity: 'alerta', field: 'lungs', title: 'Insuficiencia cardíaca sin signos de congestión', message: `Con ${label(hf)} no se documentan crepitantes, edema ni ingurgitación yugular. Si está descompensada, revise el examen.` });
  }
  const mening = has('meningitis');
  if (mening && neuroTxt.trim() && !hasFinding(neuroTxt, ABN.meningeal)) {
    add({ id: 'meningitis-signs', severity: 'alerta', field: 'neurological', title: 'Meningitis sin signos meníngeos', message: `Con ${label(mening)} el examen neurológico no menciona rigidez de nuca, Kernig ni Brudzinski.` });
  }
  const af = has('af');
  if (af && /(^|[^A-Z])RITMICOS?|REGULARES/.test(fold(heartTxt)) && !/ARRITMIC|IRREGULAR/.test(fold(heartTxt))) {
    add({ id: 'af-rhythmic', severity: 'alerta', field: 'heart', title: 'FA con ruidos cardíacos rítmicos', message: `Con ${label(af)} el corazón está descrito como “rítmico/regular”. En fibrilación auricular se esperan ruidos arrítmicos.` });
  }
  const deh = has('dehydration');
  const hydroTxt = [pe.general, pe.mouth, pe.skin].filter(Boolean).join('. ');
  if (deh && /NORMOHIDRAT|BIEN HIDRATAD|MUCOSAS? (ORAL(ES)? )?HUMEDAS|HIDRATADO Y PERFUNDIDO/.test(fold(hydroTxt)) && !hasFinding(hydroTxt, ABN.dehydration)) {
    add({ id: 'dehydration-hydrated', severity: 'alerta', field: 'general', title: 'Deshidratación con paciente hidratado', message: `Con ${label(deh)} el examen describe mucosas húmedas / normohidratado.` });
  }

  // 2) Signos vitales vs diagnóstico
  const sbp = num(v.systolicBP);
  const dbp = num(v.diastolicBP);
  const hr = num(v.heartRate);
  const rr = num(v.respiratoryRate);
  const temp = num(v.temperature);
  const spo2 = num(v.oxygenSaturation);
  const glu = num(v.bloodGlucose) ?? latestLab(labs, /GLUCOSA|GLICEMIA|GLUCEMIA/);

  const sep = has('sepsis');
  if (sep && sbp && hr && temp && rr && hr <= 90 && rr <= 20 && temp >= 36 && temp <= 38 && sbp >= 100) {
    add({ id: 'sepsis-normal-vitals', severity: 'alerta', field: 'vitals', title: 'Sepsis con signos vitales normales', message: `Con ${label(sep)} todos los signos vitales están normales (FC ${hr}, FR ${rr}, T ${temp} °C, TA ${sbp}/${dbp ?? '?'}). Revise los signos o el diagnóstico.` });
  }
  const sh = has('shock');
  if (sh && sbp && sbp >= 100) {
    add({ id: 'shock-bp', severity: 'alerta', field: 'vitals', title: 'Choque con presión arterial conservada', message: `Con ${label(sh)} la TA registrada es ${sbp}/${dbp ?? '?'} mmHg.` });
  }
  const crisis = has('htnCrisis');
  if (crisis && sbp && dbp && sbp < 180 && dbp < 110) {
    add({ id: 'htn-crisis-bp', severity: 'alerta', field: 'vitals', title: 'Crisis hipertensiva con TA < 180/110', message: `Con ${label(crisis)} la TA registrada es ${sbp}/${dbp} mmHg (la crisis se define con ≥ 180/110).` });
  }
  const hypo = has('hypoglycemia');
  if (hypo && glu && glu >= 70) add({ id: 'hypo-glu', severity: 'alerta', field: 'vitals', title: 'Hipoglucemia con glucemia ≥ 70', message: `Con ${label(hypo)} la glucemia registrada es ${glu} mg/dL.` });
  const hyper = has('hyperglycemicCrisis');
  if (hyper && glu && glu < 250) add({ id: 'hyper-glu', severity: 'alerta', field: 'vitals', title: 'Crisis hiperglucémica con glucemia < 250', message: `Con ${label(hyper)} la glucemia registrada es ${glu} mg/dL.` });
  const rf = has('respFailure');
  if (rf && spo2 && spo2 >= 94 && !v.supplementalOxygen) add({ id: 'rf-spo2', severity: 'aviso', field: 'vitals', title: 'Insuficiencia respiratoria con SpO2 ≥ 94% al aire', message: `Con ${label(rf)} la SpO2 registrada es ${spo2}% sin oxígeno. Documente gasometría u oxígeno suplementario.` });
  const tachy = has('tachy');
  if (tachy && hr && hr < 100) add({ id: 'tachy-hr', severity: 'alerta', field: 'vitals', title: 'Taquicardia con FC < 100', message: `Con ${label(tachy)} la FC registrada es ${hr} lpm.` });
  const brady = has('brady');
  if (brady && hr && hr > 60) add({ id: 'brady-hr', severity: 'alerta', field: 'vitals', title: 'Bradicardia con FC > 60', message: `Con ${label(brady)} la FC registrada es ${hr} lpm.` });
  const fev = has('fever');
  if (fev && temp && temp < 37.5) add({ id: 'fever-temp', severity: 'aviso', field: 'vitals', title: 'Fiebre sin temperatura elevada', message: `Con ${label(fev)} la temperatura registrada es ${temp} °C (puede haber recibido antipirético: documéntelo).` });

  // Glasgow vs estado de conciencia
  const gcs = num(v.glasgowTotal);
  const consc = fold([pe.general, neuroTxt].join(' '));
  if (gcs && gcs < 15 && /(^|[^A-Z])(ORIENTAD[OA] EN (TIEMPO|LAS TRES|3)|CONSCIENTE, ORIENTAD|ALERTA Y ORIENTAD)/.test(consc) && !/DESORIENT/.test(consc)) {
    add({ id: 'gcs-oriented', severity: 'alerta', field: 'neurological', title: 'Glasgow < 15 con paciente orientado', message: `Glasgow registrado ${gcs}/15, pero el examen describe al paciente consciente y orientado.` });
  }
  if (gcs === 15 && /ESTUPOR|\bCOMA\b|SOMNOLIENT|DESORIENTAD|OBNUBIL/.test(consc)) {
    add({ id: 'gcs-15-altered', severity: 'alerta', field: 'neurological', title: 'Glasgow 15 con alteración de conciencia', message: 'Glasgow registrado 15/15, pero el examen describe somnolencia, desorientación, estupor o coma.' });
  }

  // 3) Paraclínicos vs diagnóstico
  const hb = latestLab(labs, /^HEMOGLOBINA|^HGB|^HB\b/);
  const na = latestLab(labs, /^SODIO|^NA\b/);
  const k = latestLab(labs, /^POTASIO|^K\b/);
  const cr = latestLab(labs, /^CREATININA|^CREAT/);
  const an = has('anemia');
  const hbLimit = p.sex === 'F' ? 12 : 13;
  if (an && hb && hb >= hbLimit) add({ id: 'anemia-hb', severity: 'alerta', field: 'labs', title: 'Anemia con hemoglobina normal', message: `Con ${label(an)} la hemoglobina más reciente es ${hb} g/dL.` });
  if (!an && hb && hb < 8) add({ id: 'hb-no-dx', severity: 'aviso', field: 'diagnoses', title: 'Hemoglobina baja sin diagnóstico de anemia', message: `La hemoglobina más reciente es ${hb} g/dL y no hay diagnóstico de anemia.` });
  const hna = has('hyponatremia');
  if (hna && na && na >= 135) add({ id: 'na-normal', severity: 'alerta', field: 'labs', title: 'Hiponatremia con sodio normal', message: `Con ${label(hna)} el sodio más reciente es ${na} mEq/L.` });
  if (!hna && na && na < 130) add({ id: 'na-no-dx', severity: 'aviso', field: 'diagnoses', title: 'Sodio bajo sin diagnóstico', message: `El sodio más reciente es ${na} mEq/L y no hay diagnóstico de hiponatremia.` });
  const hk = has('hyperkalemia');
  if (hk && k && k <= 5) add({ id: 'k-normal-hyper', severity: 'alerta', field: 'labs', title: 'Hiperpotasemia con potasio ≤ 5', message: `Con ${label(hk)} el potasio más reciente es ${k} mEq/L.` });
  if (!hk && k && k >= 6) add({ id: 'k-high-no-dx', severity: 'aviso', field: 'diagnoses', title: 'Potasio alto sin diagnóstico', message: `El potasio más reciente es ${k} mEq/L y no hay diagnóstico de hiperpotasemia.` });
  const lk = has('hypokalemia');
  if (lk && k && k >= 3.5) add({ id: 'k-normal-hypo', severity: 'alerta', field: 'labs', title: 'Hipopotasemia con potasio ≥ 3.5', message: `Con ${label(lk)} el potasio más reciente es ${k} mEq/L.` });
  const aki = has('aki');
  if (aki && cr && cr < 1.2) add({ id: 'aki-cr', severity: 'aviso', field: 'labs', title: 'Lesión renal aguda con creatinina normal', message: `Con ${label(aki)} la creatinina más reciente es ${cr} mg/dL. Verifique la basal o la diuresis.` });

  // 4) Estudios que deberían existir
  const hasEcg = (studies || []).some((s) => s.category === 'Electrocardiograma');
  const acs = has('acs');
  if (acs && !hasEcg) add({ id: 'acs-ecg', severity: 'aviso', field: 'studies', title: 'SCA sin electrocardiograma registrado', message: `Con ${label(acs)} no hay ECG en Estudios & ECG.` });
  if (acs && !latestLab(labs, /TROPONINA|\bTNI\b|\bTNT\b/)) add({ id: 'acs-trop', severity: 'aviso', field: 'labs', title: 'SCA sin troponina registrada', message: `Con ${label(acs)} no hay troponina en Paraclínicos.` });
  if (af && !hasEcg) add({ id: 'af-ecg', severity: 'aviso', field: 'studies', title: 'FA sin electrocardiograma registrado', message: `Con ${label(af)} no hay ECG registrado.` });
  const pn = has('pneumonia');
  if (pn && !(studies || []).some((s) => /TORAX|TÓRAX|PULMON|CHEST/.test(fold(`${s.title} ${s.anatomicalRegion}`)))) {
    add({ id: 'pneumonia-rx', severity: 'aviso', field: 'studies', title: 'Neumonía sin imagen de tórax', message: `Con ${label(pn)} no hay radiografía/TAC de tórax registrada.` });
  }
  const st = has('stroke');
  if (st && !/NIHSS/.test(fold([neuroTxt, h.clinicalImpression].join(' ')))) add({ id: 'stroke-nihss', severity: 'aviso', field: 'neurological', title: 'EVC sin NIHSS', message: `Con ${label(st)} no se documenta la escala NIHSS.` });

  // 5) Sexo y edad
  const dxOnly = dx.filter((d) => d.source === 'dx');
  const preg = dxOnly.find((d) => matchCat(d, CATS.pregnancy));
  if (preg && p.sex === 'M') add({ id: 'sex-preg', severity: 'error', field: 'diagnoses', title: 'Diagnóstico obstétrico en paciente masculino', message: `“${preg.name}” no corresponde a un paciente de sexo masculino. Revise el sexo o el diagnóstico.` });
  if (preg && p.sex === 'F' && p.age && (p.age > 60 || p.age < 9)) add({ id: 'age-preg', severity: 'alerta', field: 'diagnoses', title: 'Diagnóstico obstétrico poco probable por edad', message: `“${preg.name}” con ${p.age} años de edad.` });
  const male = dxOnly.find((d) => matchCat(d, CATS.maleOnly));
  if (male && p.sex === 'F') add({ id: 'sex-male-dx', severity: 'error', field: 'diagnoses', title: 'Diagnóstico masculino en paciente femenina', message: `“${male.name}” no corresponde a una paciente de sexo femenino.` });
  const fem = dxOnly.find((d) => matchCat(d, CATS.femaleOnly));
  if (fem && p.sex === 'M') add({ id: 'sex-fem-dx', severity: 'error', field: 'diagnoses', title: 'Diagnóstico ginecológico en paciente masculino', message: `“${fem.name}” no corresponde a un paciente de sexo masculino.` });

  // 6) Medicamentos habituales sin el antecedente correspondiente
  const meds = fold(h.habitualMedications);
  const bg = fold([h.pathologicalHistory, ...dx.map((d) => d.name)].join(' '));
  if (/METFORMIN|INSULIN|GLIBENCLAM|GLIMEPIRID|SITAGLIPT|LINAGLIPT|EMPAGLIFLOZ|DAPAGLIFLOZ/.test(meds) && !/DIABET|\bDM\b|\bDM ?[12]\b|E1[0-4]/.test(bg)) {
    add({ id: 'meds-dm', severity: 'aviso', field: 'antecedents', title: 'Antidiabéticos sin diagnóstico de diabetes', message: 'El paciente toma antidiabéticos pero no figura diabetes en antecedentes ni diagnósticos.' });
  }
  if (/LOSARTAN|ENALAPRIL|AMLODIPIN|CAPTOPRIL|VALSARTAN|IRBESARTAN|HIDROCLOROTIAZIDA|NIFEDIPIN|CARVEDILOL/.test(meds) && !/HIPERTENS|\bHTA\b|I1[0-5]|INSUFICIENCIA CARDIACA|\bICC\b/.test(bg)) {
    add({ id: 'meds-hta', severity: 'aviso', field: 'antecedents', title: 'Antihipertensivos sin diagnóstico de hipertensión', message: 'El paciente toma antihipertensivos pero no figura hipertensión en antecedentes ni diagnósticos.' });
  }

  // 7) Diagnósticos repetidos o contradictorios
  const names = dxOnly.map((d) => fold(d.name).replace(/\W+/g, ' ').trim());
  const dup = names.find((n, i) => n && names.indexOf(n) !== i);
  if (dup) add({ id: 'dx-dup', severity: 'aviso', field: 'diagnoses', title: 'Diagnóstico repetido', message: `“${dup}” aparece más de una vez.` });
  const codes = dxOnly.map((d) => fold(d.code)).filter(Boolean);
  if (codes.some((c) => c.startsWith('E10')) && codes.some((c) => c.startsWith('E11'))) add({ id: 'dm1-dm2', severity: 'alerta', field: 'diagnoses', title: 'Diabetes tipo 1 y tipo 2 a la vez', message: 'Hay códigos de diabetes tipo 1 (E10) y tipo 2 (E11) al mismo tiempo.' });
  if (dxOnly.some((d) => /HIPOGLUC|HIPOGLIC/.test(fold(d.name))) && dxOnly.some((d) => /CETOACIDOSIS|HIPEROSMOLAR/.test(fold(d.name)))) add({ id: 'hypo-hyper', severity: 'alerta', field: 'diagnoses', title: 'Hipoglucemia y crisis hiperglucémica a la vez', message: 'Revise: hay diagnósticos de hipoglucemia y de cetoacidosis/estado hiperosmolar simultáneos.' });

  const rank: Record<IssueSeverity, number> = { error: 0, alerta: 1, aviso: 2 };
  return issues.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

export function issuesFor(issues: ClinicalIssue[], field: IssueField): ClinicalIssue[] {
  return issues.filter((i) => i.field === field);
}
