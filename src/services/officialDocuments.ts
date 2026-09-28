/**
 * DOCUMENTOS OFICIALES — Hospital Regional Dr. Ángel María Gatón
 * ----------------------------------------------------------------
 * Fuente ÚNICA para: vista previa (texto editable), Word (.docx) e impresión directa.
 *
 *  1. Se construye un MODELO del documento con los datos reales del paciente
 *     (nunca se inventan medicamentos, estudios, hallazgos ni horas).
 *  2. El modelo se convierte a TEXTO para la vista previa; el médico puede editarlo.
 *  3. Word e impresión leen ESE MISMO texto (con las ediciones) y lo colocan en el
 *     formato exacto de las plantillas oficiales del hospital: mismas fuentes,
 *     tamaños, márgenes, tamaño de página, logo, viñetas y numeración.
 */

import PizZip from 'pizzip';
import { Patient, MedicalOrder, LabResult, MedicalStudy } from '../types';
import { ClinicalDeduplicationEngine } from './clinicalDeduplicationEngine';
import { extractScalesAndDiagnoses } from './hospitalNoteGenerator';
import { FALLBACK_TEMPLATES, base64ToArrayBuffer } from './templatesFallback';
import { authService } from './authService';

export type OfficialDocKind = 'emergencia' | 'sala' | 'orden' | 'combinada';

export interface NoteModel {
  kind: 'emergencia' | 'sala';
  title: string;
  header: string;
  bodyBefore: string[];
  intro: string;
  diagnoses: string[];
  bodyAfter: string[];
  /** Nombre del médico (usuario en sesión) que se imprime al final. Sin exequátur. */
  signature?: string;
}

export interface OrderModel {
  kind: 'orden';
  dateLine: string;
  title: string;
  header: string;
  medidas: string;
  diagnoses: string[];
  vitals: string;
  medications: string[];
  extras: string[];
}

export type OfficialPart = NoteModel | OrderModel;

export const PAGE_BREAK_MARKER = '[SALTO DE PÁGINA — HOJA DE ORDEN MÉDICA]';

// ---------------------------------------------------------------------------
// Utilidades de fecha, hora y texto
// ---------------------------------------------------------------------------
const up = (s?: string | null) => (s || '').toString().trim().toUpperCase();
const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Interpreta "2026-09-27 10:00", ISO u otros formatos como hora LOCAL (seguro en Safari/iPhone). */
export function parseLocalDateTime(value?: string): Date | null {
  if (!value) return null;
  const m = String(value).trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (m) {
    const hasZone = /Z$|[+-]\d{2}:?\d{2}$/.test(String(value).trim());
    if (hasZone) {
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    }
    return new Date(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0);
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export function formatOfficialDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/** Formato oficial del hospital: "7:00 AM", "2:00 PM". */
export function formatOfficialTime(d: Date): string {
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${ampm}`;
}

function ageText(p: Patient): string {
  return p.age !== undefined && p.age !== null && String(p.age).trim() !== '' ? `${p.age} AÑOS` : 'NO DOCUMENTADA';
}

/** "DE 68 AÑOS DE EDAD" o "DE EDAD NO DOCUMENTADA" (sin inventar la edad). */
function ageClause(p: Patient): string {
  const a = ageText(p);
  return a === 'NO DOCUMENTADA' ? 'DE EDAD NO DOCUMENTADA' : `DE ${a} DE EDAD`;
}

function isWardPatient(p: Patient): boolean {
  const c = (p.cubicle || '').toLowerCase();
  return p.status === 'ingresados' || (Boolean(c) && !c.includes('emerg') && !c.includes('cub') && !c.includes('trauma') && !c.includes('triaje') && !c.includes('observ'));
}

function emergLocation(p: Patient): string {
  const c = up(p.cubicle);
  if (!c) return 'EMERGENCIA';
  return c.includes('EMERG') ? c : `EMERGENCIA - ${c}`;
}

function sexWord(p: Patient) {
  return p.sex === 'F' ? 'FEMENINA' : 'MASCULINO';
}

function examValue(v: any): string {
  if (!v) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'object') {
    const notes = String(v.notes || '').trim();
    if (notes) return notes;
    if (v.status === 'NORMAL') return 'SIN ALTERACIONES';
  }
  return '';
}

/** Examen físico en el orden cefalocaudal del hospital, SÓLO con lo documentado. */
export function officialPhysicalExam(pe: any = {}): string {
  const sections: Array<[string, any]> = [
    ['CABEZA', pe.head],
    ['OJOS', pe.eyes],
    ['OÍDOS', pe.ears],
    ['NARIZ', pe.nose],
    ['BOCA', pe.mouth],
    ['CUELLO', pe.neck],
    ['TÓRAX', pe.thorax ?? pe.chest],
    ['PULMONES', pe.lungs ?? pe.respiratory],
    ['CORAZÓN', pe.cardiovascular ?? pe.heart],
    ['ABDOMEN', pe.abdominal ?? pe.abdomen],
    ['GENITALES EXTERNOS', pe.genitourinary],
    ['TACTO RECTAL', pe.rectalExam],
    ['PIEL Y ANEXOS', pe.skin],
    ['EXTREMIDADES SUPERIORES', pe.upperExtremities],
    ['EXTREMIDADES INFERIORES', pe.lowerExtremities],
    ['EXTREMIDADES', pe.upperExtremities || pe.lowerExtremities ? undefined : pe.extremities],
    ['NEUROLÓGICO', pe.neurological],
    ['OTROS HALLAZGOS', pe.otherFindings]
  ];
  const parts: string[] = [];
  const seen = new Set<string>();
  for (const [label, raw] of sections) {
    const val = up(examValue(raw)).replace(/\.+$/, '');
    if (!val) continue;
    const key = `${label}|${val}`;
    if (seen.has(key)) continue;
    seen.add(key);
    parts.push(`${label}: ${val}`);
  }
  return parts.length ? parts.join('. ') + '.' : '';
}

function generalStatus(p: Patient): string {
  const pe: any = p.clinicalHistory?.physicalExam || {};
  return up(examValue(pe.general) || (p as any).generalStatus || (p.clinicalHistory as any)?.generalStatusSummary).replace(/\.+$/, '');
}

/** Signos vitales para las notas: "TA: 160/95 MMHG, FC: 96 LPM, FR: 19 RPM, SPO2: 96% AA, TEMP: 37 °C". */
function noteVitals(p: Patient): string {
  const v: any = p.vitals || {};
  const n = (x: any) => (x !== undefined && x !== null && !isNaN(Number(x)) && Number(x) > 0 ? Number(x) : null);
  const out: string[] = [];
  if (n(v.systolicBP) && n(v.diastolicBP)) out.push(`TA: ${n(v.systolicBP)}/${n(v.diastolicBP)} MMHG`);
  if (n(v.heartRate)) out.push(`FC: ${n(v.heartRate)} LPM`);
  if (n(v.respiratoryRate)) out.push(`FR: ${n(v.respiratoryRate)} RPM`);
  if (n(v.oxygenSaturation)) out.push(`SPO2: ${n(v.oxygenSaturation)}% ${v.supplementalOxygen ? up(v.supplementalOxygen) : 'AA'}`);
  if (n(v.temperature)) out.push(`TEMP: ${n(v.temperature)} °C`);
  if (n(v.bloodGlucose)) out.push(`GLICEMIA: ${n(v.bloodGlucose)} MG/DL`);
  if (n(v.glasgowTotal)) out.push(`GLASGOW: ${n(v.glasgowTotal)}/15`);
  return out.join(', ');
}

/** Signos vitales para la orden: "SIGNOS VITALES: TA: 140/80 MMHG FC: 90 L/M SAT: 98 % AIRE AMBIENTE TEMP: 37 C FR: 20 R/M. GLICEMIA: 130 MG/DL". */
function orderVitals(p: Patient): string {
  const v: any = p.vitals || {};
  const n = (x: any) => (x !== undefined && x !== null && !isNaN(Number(x)) && Number(x) > 0 ? Number(x) : null);
  const out: string[] = [];
  if (n(v.systolicBP) && n(v.diastolicBP)) out.push(`TA: ${n(v.systolicBP)}/${n(v.diastolicBP)} MMHG`);
  if (n(v.heartRate)) out.push(`FC: ${n(v.heartRate)} L/M`);
  if (n(v.oxygenSaturation)) out.push(`SAT: ${n(v.oxygenSaturation)} % ${v.supplementalOxygen ? up(v.supplementalOxygen) : 'AIRE AMBIENTE'}`);
  if (n(v.temperature)) out.push(`TEMP: ${n(v.temperature)} C`);
  if (n(v.respiratoryRate)) out.push(`FR: ${n(v.respiratoryRate)} R/M`);
  if (!out.length && !n(v.bloodGlucose)) return '';
  let line = `SIGNOS VITALES: ${out.join(' ')}`;
  if (n(v.bloodGlucose)) line += `${out.length ? '.' : ''} GLICEMIA: ${n(v.bloodGlucose)} MG/DL`;
  return line.trim();
}

/** ¿Imprimir el código CIE-10 junto a cada diagnóstico? (preferencia del dispositivo) */
export function cie10InNotes(): boolean {
  try {
    return localStorage.getItem('hr_cie10_en_notas') === '1';
  } catch {
    return false;
  }
}

function diagnosesOf(p: Patient): { diagnoses: string[]; scales: string[] } {
  const h: any = p.clinicalHistory || {};
  const structured: any[] = p.diagnosesList && p.diagnosesList.length ? p.diagnosesList : Array.isArray(h.diagnosesList) ? h.diagnosesList : [];
  const impression = String(h.clinicalImpression || '');
  if (structured.length) {
    const withCodes = cie10InNotes();
    const sorted = [...structured].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    const names = ClinicalDeduplicationEngine.deduplicateDiagnoses(sorted.map((d) => String(d.name || '').trim()).filter(Boolean)) as string[];
    const list = names.map((n) => {
      const d = sorted.find((x) => String(x.name || '').trim() === n);
      const base = up(n).replace(/^\d+[.)-]\s*/, '').replace(/^[•●\-*]\s*/, '');
      return withCodes && d?.cie10Code && !base.includes(d.cie10Code) ? `${base} (${d.cie10Code})` : base;
    });
    const scales = impression ? extractScalesAndDiagnoses(impression).scales.map(up) : [];
    return { diagnoses: list.filter(Boolean), scales };
  }
  if (!impression.trim()) return { diagnoses: [], scales: [] };
  const { scales, diagnoses } = extractScalesAndDiagnoses(impression);
  const list = ClinicalDeduplicationEngine.deduplicateDiagnoses(
    (diagnoses.length ? diagnoses : impression.split(/\n|;/)).map((d: string) => d.trim()).filter(Boolean)
  ).map((d) => up(d).replace(/^\d+[.)-]\s*/, '').replace(/^[•●\-*]\s*/, ''));
  return { diagnoses: list.filter(Boolean), scales: scales.map(up) };
}

function isDiet(o: MedicalOrder) {
  const n = o.name.toLowerCase();
  return n.includes('dieta') || /\bnpo\b/.test(n) || n.includes('nada por boca');
}

function activeOrders(orders: MedicalOrder[]) {
  return ClinicalDeduplicationEngine.deduplicateMedicalOrders(orders.filter((o) => o.status !== 'Suspendida'));
}

/** Formato oficial de un fármaco en la hoja de órdenes: "OMEPRAZOL 40 MG C/24 HORAS EV". */
export function formatOrderLine(o: MedicalOrder): string {
  const parts = [up(o.name), up(o.dose), up(o.frequency), up(o.route)];
  let line = clean(parts.filter(Boolean).join(' '));
  const extra = up(o.specialInstructions || o.notes);
  if (extra) line += ` ${extra}`;
  if (o.treatmentDay) line += ` (DÍA ${o.treatmentDay})`;
  return clean(line);
}

// ---------------------------------------------------------------------------
// 1. MODELOS a partir de los datos del paciente
// ---------------------------------------------------------------------------
function narrativeAntecedents(p: Patient): string {
  const h: any = p.clinicalHistory || {};
  const v: any = p.vitals || {};
  const bits: string[] = [];
  const patho = up(h.pathologicalHistory);
  bits.push(patho && !/^NEGAD/.test(patho) ? `CON ANTECEDENTES MÓRBIDOS CONOCIDOS DE ${patho.replace(/\.+$/, '')}` : 'SIN ANTECEDENTES MÓRBIDOS CONOCIDOS');
  const meds = up(h.habitualMedications);
  if (meds && !/NINGUN|NEGAD/.test(meds)) bits.push(`EN TRATAMIENTO CON ${meds.replace(/\.+$/, '')}`);
  const surg = up(h.surgicalHistory);
  bits.push(surg && !/^NEGAD/.test(surg) ? `ANTECEDENTES QUIRÚRGICOS DE ${surg.replace(/\.+$/, '')}` : 'ANTECEDENTES QUIRÚRGICOS NEGADOS');
  const tox = up(h.toxicHabits);
  bits.push(tox && !/^NEGAD/.test(tox) ? `HÁBITOS TÓXICOS: ${tox.replace(/\.+$/, '')}` : 'HÁBITOS TÓXICOS NEGADOS');
  const allergies = ClinicalDeduplicationEngine.deduplicateAllergies(
    (v.allergies && v.allergies.length ? v.allergies : h.allergicHistory ? [h.allergicHistory] : []) as string[]
  );
  bits.push(allergies.length && !/NEGAD/i.test(allergies[0]) ? `ALERGIAS A ${up(allergies.join(', '))}` : 'ALERGIAS NEGADAS');
  return bits.join(', ');
}

const PANEL_RANK = ['Hemograma', 'Química', 'Función Renal', 'Función Hepática', 'Electrolitos', 'Gases Arteriales', 'Marcadores Cardiacos', 'Coagulación', 'Orina', 'Cultivos', 'Otros'];

function labTime(l: LabResult): number {
  const d = parseLocalDateTime(l.timestamp);
  return d ? d.getTime() : 0;
}

/**
 * Paraclínicos para la nota: todos los registrados, agrupados por panel. Si un parámetro
 * tiene varios resultados se muestran en orden cronológico ("0.02 → 0.15").
 */
function labsSentence(labs: LabResult[], intro: string): string {
  const valid = (labs || []).filter((l) => String(l.parameter || '').trim() && String(l.value ?? '').trim());
  if (!valid.length) return '';
  const dedup = ClinicalDeduplicationEngine.deduplicateParaclinicals(valid as any) as LabResult[];
  const groups = new Map<string, { panel: string; name: string; unit: string; values: Array<{ v: string; t: number }> }>();
  for (const l of dedup) {
    const key = `${up(l.panel)}|${up(l.parameter)}`;
    const g = groups.get(key) || { panel: String(l.panel || 'Otros'), name: up(l.parameter), unit: up(l.unit), values: [] };
    g.values.push({ v: String(l.value).trim(), t: labTime(l) });
    groups.set(key, g);
  }
  const rank = (p: string) => {
    const i = PANEL_RANK.indexOf(p);
    return i < 0 ? 99 : i;
  };
  const items = Array.from(groups.values())
    .sort((a, b) => rank(a.panel) - rank(b.panel))
    .map((g) => {
      const vals = g.values.sort((x, y) => x.t - y.t).map((x) => x.v);
      const uniq = vals.filter((v, i) => i === 0 || v !== vals[i - 1]);
      return clean(`${g.name}: ${uniq.join(' → ')}${g.unit ? ' ' + g.unit : ''}`);
    });
  return `${intro} ${items.join(', ')}.`;
}

/** Descripción de los estudios de imagen (resultado oficial, o hallazgos, o descripción). */
function studiesSentence(studies: MedicalStudy[], intro?: string): string {
  const real = (studies || []).filter((s) => (s.officialResult || s.preliminaryInterpretation || s.description || '').trim());
  if (!real.length) return '';
  const hasEcg = real.some((s) => s.category === 'Electrocardiograma');
  const hasImg = real.some((s) => s.category !== 'Electrocardiograma');
  intro = intro || (hasEcg && hasImg ? 'EN CUANTO A LOS ESTUDIOS DE IMAGEN Y ELECTROCARDIOGRAMA:' : hasEcg ? 'EN CUANTO AL ELECTROCARDIOGRAMA:' : 'EN CUANTO A LOS ESTUDIOS DE IMAGEN:');
  const items = real.map((s) => {
    const name = up(s.title || s.category);
    const txt = up(s.officialResult || s.preliminaryInterpretation || s.description).replace(/\.+$/, '');
    return name ? `${name}: ${txt}` : txt;
  });
  return clean(`${intro} ${items.join('. ')}.`);
}

/** Nombre del médico en sesión para el pie de la nota (sin exequátur). */
export function currentDoctorName(): string {
  try {
    const n = String(authService.getActiveDoctorSignature().name || '').trim();
    return n ? n.toUpperCase() : '';
  } catch {
    return '';
  }
}

/** Discusión terapéutica escrita por el médico (cuadro de diálogo). */
function discussionParagraphs(p: Patient): string[] {
  const t = String((p as any).therapeuticDiscussion || '').trim();
  if (!t) return [];
  return t
    .split(/\n\s*\n/)
    .map((x) => clean(up(x)))
    .filter(Boolean);
}

function managementSentence(orders: MedicalOrder[], prefix: string): string {
  const act = activeOrders(orders);
  const diet = act.find(isDiet);
  const meds = act.filter((o) => (o.type === 'Solución' || o.type === 'Medicamento') && !isDiet(o));
  const items: string[] = [];
  if (diet) items.push(up(diet.name));
  meds.forEach((m) => items.push(formatOrderLine(m)));
  if (!items.length) return `${prefix.split(':')[0]}: SEGÚN HOJA DE ÓRDENES MÉDICAS.`;
  return `${prefix} ${items.map((it) => `SE INDICA ${it}`).join('; ')}.`;
}

export function buildEmergencyNoteModel(p: Patient, orders: MedicalOrder[] = [], labs: LabResult[] = [], studies: MedicalStudy[] = []): NoteModel {
  const arrival = parseLocalDateTime(p.arrivalDateTime) || parseLocalDateTime(p.createdAt) || new Date();
  const header = `NOMBRE: ${up(p.fullName)}. EDAD: ${ageText(p)}, EMERG: ${emergLocation(p)}, FECHA: ${formatOfficialDate(arrival)} HORA: ${formatOfficialTime(arrival)}`;

  const h: any = p.clinicalHistory || {};
  const rawHda = String(h.currentIllnessHistory || '').trim();
  let hea: string;
  if (/^SE\s+TRATA\s+DE\s+PACIENTE/i.test(rawHda)) {
    hea = up(rawHda);
  } else {
    const hdaText = up(rawHda || p.chiefComplaint || h.reasonForConsultation).replace(/\.+$/, '');
    const refiere = !hdaText ? '' : /^(REFIERE|ACUDE|PRESENTA|INICIA)/.test(hdaText) ? `${hdaText}, ` : `REFIERE ${hdaText}, `;
    hea = `SE TRATA DE PACIENTE ${sexWord(p)} ${ageClause(p)}, ${narrativeAntecedents(p)}. ${refiere}MOTIVO POR EL CUAL ES ${p.sex === 'F' ? 'TRAÍDA' : 'TRAÍDO'} A NUESTRO CENTRO DE SALUD, TRAS PREVIA EVALUACIÓN CLÍNICA Y PARACLÍNICA SE DECIDE SU INGRESO CON FINES DIAGNÓSTICOS Y TERAPÉUTICOS.`;
  }

  const status = generalStatus(p);
  const vit = noteVitals(p);
  const exam = officialPhysicalExam(h.physicalExam);
  const { diagnoses, scales } = diagnosesOf(p);
  let examPara = `ACTUALMENTE PACIENTE ${status || 'EN EVALUACIÓN'}${vit ? `, MANEJANDO UNOS SIGNOS VITALES: ${vit}.` : '.'}`;
  if (exam) examPara += ` EN CUANTO AL EXAMEN FÍSICO: ${exam}`;
  if (scales.length) examPara += ` ESCALAS: ${scales.join(', ')}.`;
  const finals: string[] = [];
  const lb = labsSentence(labs, 'LA MISMA CUENTA CON UNAS PARACLÍNICAS QUE REPORTAN:');
  if (lb) finals.push(lb);
  const st = studiesSentence(studies);
  if (st) finals.push(st);

  return {
    kind: 'emergencia',
    title: 'NOTA DE INGRESO EMERGENCIA',
    header,
    bodyBefore: [clean(hea), clean(examPara), ...(finals.length ? [clean(finals.join(' '))] : [])],
    intro: diagnoses.length ? 'POR LO QUE SE DEJA CON DIAGNOSTICOS DE:' : '',
    diagnoses,
    // Después de los diagnósticos solo va la discusión terapéutica que escriba el médico
    bodyAfter: discussionParagraphs(p),
    signature: currentDoctorName()
  };
}

export function buildWardNoteModel(
  p: Patient,
  orders: MedicalOrder[] = [],
  labs: LabResult[] = [],
  studies: MedicalStudy[] = [],
  when: Date = new Date()
): NoteModel {
  const header = `NOMBRE: ${up(p.fullName)} EDAD: ${ageText(p)} FECHA: ${formatOfficialDate(when)} SALA: ${up(p.cubicle) || '--'} HORA: ${formatOfficialTime(when)}`;
  const h: any = p.clinicalHistory || {};
  const hdaText = up(h.currentIllnessHistory || p.chiefComplaint || h.reasonForConsultation).replace(/\.+$/, '');
  const status = generalStatus(p);
  const vit = noteVitals(p);
  const exam = officialPhysicalExam(h.physicalExam);
  const { diagnoses, scales } = diagnosesOf(p);

  const hdaPhrase = !hdaText ? '' : /^(CUADRO|PRESENTAR|PRESENTA)/.test(hdaText) ? ` POR ${hdaText}` : ` POR CUADRO DE ${hdaText}`;
  let body = `SE RECIBE EN SALA PACIENTE ${sexWord(p)} ${ageClause(p)}, ${narrativeAntecedents(p)}, PROCEDENTE DEL SERVICIO DE EMERGENCIAS${hdaPhrase}.`;
  body += ` AL MOMENTO DEL RECIBIMIENTO SE ENCUENTRA ${status || 'EN EVALUACIÓN'}${vit ? `. SIGNOS VITALES: ${vit}.` : '.'}`;
  if (exam) body += ` EXAMEN FÍSICO: ${exam}`;
  if (scales.length) body += ` ESCALAS: ${scales.join(', ')}.`;
  const finals: string[] = [];
  const lb = labsSentence(labs, 'LA MISMA CUENTA CON UNAS ANALÍTICAS QUE REPORTAN:');
  if (lb) finals.push(lb);
  const st = studiesSentence(studies);
  if (st) finals.push(st);
  const paragraphs = [clean(body), ...(finals.length ? [clean(finals.join(' '))] : [])];
  if (diagnoses.length) paragraphs[paragraphs.length - 1] += ' POR LO QUE LA MISMA CUENTA CON LOS SIGUIENTES DIAGNÓSTICOS:';

  return {
    kind: 'sala',
    title: 'NOTA DE RECIBIMIENTO EN SALA',
    header,
    bodyBefore: paragraphs,
    intro: '',
    diagnoses,
    bodyAfter: [managementSentence(orders, 'PLAN: CONTINUAR MANEJO EN SALA POR MEDICINA INTERNA.').replace('MEDICINA INTERNA. SEGÚN', 'MEDICINA INTERNA SEGÚN')],
    signature: currentDoctorName()
  };
}

export function buildOrderModel(p: Patient, orders: MedicalOrder[] = [], when: Date = new Date()): OrderModel {
  const location = isWardPatient(p) ? `SALA: ${up(p.cubicle) || '--'}` : `EMERG: ${emergLocation(p)}`;
  const act = activeOrders(orders);
  const diet = act.find(isDiet);
  const meds = act.filter((o) => (o.type === 'Solución' || o.type === 'Medicamento') && !isDiet(o));
  const studiesOrders = act.filter((o) => o.type === 'Estudio');
  const procs = act.filter((o) => o.type === 'Procedimiento');
  const consults = act.filter((o) => o.type === 'Interconsulta');

  let medidas = up(p.generalMeasures);
  if (medidas) {
    medidas = medidas.startsWith('MEDIDAS GENERALES:') ? medidas : `MEDIDAS GENERALES: ${medidas}`;
  } else {
    const parts: string[] = [];
    if (diet) parts.push(up(diet.name).startsWith('DIETA') || /NPO|NADA POR BOCA/.test(up(diet.name)) ? up(diet.name) : `DIETA ${up(diet.name)}`);
    parts.push('SIGNOS VITALES CADA 6 HORAS');
    medidas = `MEDIDAS GENERALES: ${parts.join(', ')}.`;
  }

  const extras: string[] = [];
  const paraclinics = [
    ...(p.requestedParaclinics || []),
    ...studiesOrders.filter((o) => !/RADIOGRAF|TOMOGRAF|ECOGRAF|SONOGRAF|RESONANCIA|DOPPLER|RX|TAC|USG/i.test(o.name)).map((o) => o.name)
  ].map(up);
  const imaging = [
    ...(p.requestedImaging || []),
    ...studiesOrders.filter((o) => /RADIOGRAF|TOMOGRAF|ECOGRAF|SONOGRAF|RESONANCIA|DOPPLER|RX|TAC|USG/i.test(o.name)).map((o) => o.name)
  ].map(up);
  const uniq = (a: string[]) => Array.from(new Set(a.filter(Boolean)));
  if (uniq(paraclinics).length) extras.push(`PARACLINICOS: ${uniq(paraclinics).join(', ')}.`);
  if (uniq(imaging).length) extras.push(`IMAGENES: ${uniq(imaging).join(', ')}.`);
  if (procs.length) extras.push(`PROCEDIMIENTOS: ${procs.map(formatOrderLine).join(', ')}.`);
  if (consults.length) extras.push(`INTERCONSULTAS: ${consults.map((o) => up(o.name)).join(', ')}.`);

  return {
    kind: 'orden',
    dateLine: `FECHA ${formatOfficialDate(when)}  HORA: ${formatOfficialTime(when)}`,
    title: 'ORDEN MEDICA',
    header: `NOMBRE: ${up(p.fullName)} EDAD: ${ageText(p)}. ${location}`,
    medidas,
    diagnoses: diagnosesOf(p).diagnoses,
    vitals: orderVitals(p),
    medications: meds.map(formatOrderLine),
    extras
  };
}

export function buildOfficialParts(
  kind: OfficialDocKind,
  p: Patient,
  orders: MedicalOrder[] = [],
  labs: LabResult[] = [],
  studies: MedicalStudy[] = []
): OfficialPart[] {
  if (kind === 'emergencia') return [buildEmergencyNoteModel(p, orders, labs, studies)];
  if (kind === 'sala') return [buildWardNoteModel(p, orders, labs, studies)];
  if (kind === 'orden') return [buildOrderModel(p, orders)];
  const note = isWardPatient(p) ? buildWardNoteModel(p, orders, labs, studies) : buildEmergencyNoteModel(p, orders, labs, studies);
  return [note, buildOrderModel(p, orders)];
}

// ---------------------------------------------------------------------------
// 2. TEXTO (vista previa editable) <-> MODELO
// ---------------------------------------------------------------------------
export function serializeParts(parts: OfficialPart[]): string {
  return parts
    .map((part) => {
      if (part.kind === 'orden') {
        const o = part;
        const lines: string[] = [o.dateLine, o.title, o.header, '', o.medidas, ''];
        if (o.diagnoses.length) {
          lines.push('DIAGNÓSTICOS:', ...o.diagnoses.map((d) => `• ${d}`), '');
        }
        if (o.vitals) lines.push(o.vitals, '');
        if (o.medications.length) {
          lines.push('MEDICACIÓN:', ...o.medications.map((m, i) => `${i + 1}. ${m}`), '');
        }
        lines.push(...o.extras);
        return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
      }
      const n = part;
      const out: string[] = [n.title, n.header, ''];
      n.bodyBefore.forEach((b) => out.push(b, ''));
      if (n.intro) out.push(n.intro);
      if (n.diagnoses.length) {
        n.diagnoses.forEach((d, i) => out.push(n.kind === 'sala' ? `${i + 1}. ${d}` : `• ${d}`));
        out.push('');
      }
      n.bodyAfter.forEach((b) => out.push(b, ''));
      return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    })
    .join(`\n\n${PAGE_BREAK_MARKER}\n\n`);
}

const LIST_RE = /^\s*(?:[•●▪◦\-*]|\d{1,2}[.)])\s+/;
const LEGACY_JUNK_RE = /^(:?HOSPITAL|H\s+DR\.?\s+ÁNGEL MARÍA GATÓN|HOSPITAL REGIONAL DR\.? ÁNGEL MARÍA GATÓN|_{5,}|FIRMA DEL M[ÉE]DICO)\s*$/i;

function splitParts(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*(?:\[SALTO DE P[ÁA]GINA[^\]]*\]|\[HOJA OFICIAL[^\]]*\]|={10,}(?:\n.*\[HOJA OFICIAL[^\]]*\]\n={10,})?)\s*\n/i)
    .map((s) => s.replace(/^={10,}\s*$/gm, '').trim())
    .filter(Boolean);
}

function parseNote(text: string, fallbackKind: 'emergencia' | 'sala'): NoteModel {
  const lines = text.split('\n').map((l) => l.replace(/\s+$/, '')).filter((l) => !LEGACY_JUNK_RE.test(l.trim()));
  let i = 0;
  const nextNonEmpty = () => {
    while (i < lines.length && !lines[i].trim()) i++;
    return i < lines.length ? lines[i].trim() : '';
  };
  let title = '';
  let header = '';
  let first = nextNonEmpty();
  if (/^NOTA\s+DE\b/i.test(first)) {
    title = first.toUpperCase();
    i++;
    first = nextNonEmpty();
  }
  if (/^NOMBRE\s*:/i.test(first)) {
    header = first;
    i++;
  }
  const kind: 'emergencia' | 'sala' = /SALA|TRASLADO|RECIBIMIENTO/i.test(title) ? 'sala' : /EMERGENCIA/i.test(title) ? 'emergencia' : fallbackKind;

  // Bloques: párrafos (líneas consecutivas) y listas
  type Block = { type: 'p'; text: string } | { type: 'list'; items: string[] };
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ type: 'p', text: clean(para.join(' ')) });
    para = [];
  };
  for (; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l) {
      flush();
      continue;
    }
    if (LIST_RE.test(l)) {
      flush();
      const item = clean(l.replace(LIST_RE, ''));
      const last = blocks[blocks.length - 1];
      if (last && last.type === 'list') last.items.push(item);
      else blocks.push({ type: 'list', items: [item] });
    } else {
      // Línea que continúa un elemento de lista (sin viñeta) justo debajo
      para.push(l);
    }
  }
  flush();

  const firstList = blocks.findIndex((b) => b.type === 'list');
  const before = (firstList === -1 ? blocks : blocks.slice(0, firstList)).filter((b) => b.type === 'p').map((b) => (b as any).text as string);
  const after: string[] = [];
  const diagnoses: string[] = [];
  if (firstList !== -1) {
    diagnoses.push(...(blocks[firstList] as any).items);
    blocks.slice(firstList + 1).forEach((b) => {
      if (b.type === 'p') after.push(b.text);
      else after.push(...b.items.map((it) => `• ${it}`));
    });
  }
  let intro = '';
  if (kind === 'emergencia' && firstList !== -1 && before.length) {
    const last = before[before.length - 1];
    if (/:\s*$/.test(last) && last.length < 160) {
      intro = last;
      before.pop();
    }
  }
  return {
    kind,
    title: title || (kind === 'sala' ? 'NOTA DE RECIBIMIENTO EN SALA' : 'NOTA DE INGRESO EMERGENCIA'),
    header,
    bodyBefore: before,
    intro,
    diagnoses,
    bodyAfter: after,
    signature: currentDoctorName()
  };
}

function parseOrder(text: string): OrderModel {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => !LEGACY_JUNK_RE.test(l));
  const model: OrderModel = { kind: 'orden', dateLine: '', title: 'ORDEN MEDICA', header: '', medidas: '', diagnoses: [], vitals: '', medications: [], extras: [] };
  let section: 'none' | 'dx' | 'med' | 'medidas' = 'none';
  for (const raw of lines) {
    const l = raw.trim();
    if (!l) {
      if (section === 'medidas') section = 'none';
      continue;
    }
    if (/^FECHA\b/i.test(l) && !model.dateLine) { model.dateLine = l; section = 'none'; continue; }
    if (/^ORDEN(ES)?\s+M[ÉE]DICAS?$/i.test(l)) { model.title = l.toUpperCase(); section = 'none'; continue; }
    if (/^NOMBRE\s*:/i.test(l) && !model.header) { model.header = l; section = 'none'; continue; }
    if (/^MEDIDAS\s+GENERALES\s*:/i.test(l)) { model.medidas = l; section = 'medidas'; continue; }
    if (/^DIAGN[ÓO]STICOS?\s*:?\s*$/i.test(l)) { section = 'dx'; continue; }
    if (/^SIGNOS\s+VITALES\s*:/i.test(l)) { model.vitals = l; section = 'none'; continue; }
    if (/^MEDICACI[ÓO]N(ES)?(\s+Y\s+SOLUCIONES)?\s*:?\s*$/i.test(l)) { section = 'med'; continue; }
    if (/^(PARACL[ÍI]NICOS|IM[ÁA]GENES|PROCEDIMIENTOS|INTERCONSULTAS?|NOTA|OBSERVACIONES)\s*:/i.test(l)) {
      model.extras.push(l);
      section = 'none';
      continue;
    }
    if (section === 'dx') { model.diagnoses.push(clean(l.replace(LIST_RE, ''))); continue; }
    if (section === 'med') { model.medications.push(clean(l.replace(LIST_RE, ''))); continue; }
    if (section === 'medidas') { model.medidas = clean(`${model.medidas} ${l}`); continue; }
    model.extras.push(l);
  }
  return model;
}

/** Lee el texto (posiblemente editado por el médico) y lo convierte en partes del documento. */
export function parseOfficialText(text: string, kind: OfficialDocKind, patient?: Patient): OfficialPart[] {
  const chunks = splitParts(text);
  const noteKind: 'emergencia' | 'sala' = kind === 'sala' || (kind === 'combinada' && patient && isWardPatient(patient)) ? 'sala' : 'emergencia';
  if (kind === 'orden') return [parseOrder(chunks.join('\n\n'))];
  if (kind === 'combinada') {
    // Si falta el separador, buscar dónde empieza la orden
    if (chunks.length === 1) {
      const idx = chunks[0].search(/\n\s*(FECHA\b[^\n]*\n\s*)?ORDEN\s+M[ÉE]DICA\s*\n/i);
      if (idx > 0) return [parseNote(chunks[0].slice(0, idx), noteKind), parseOrder(chunks[0].slice(idx))];
      return [parseNote(chunks[0], noteKind)];
    }
    return [parseNote(chunks[0], noteKind), parseOrder(chunks.slice(1).join('\n\n'))];
  }
  return [parseNote(chunks.join('\n\n'), noteKind)];
}

// ---------------------------------------------------------------------------
// 3. WORD (.docx) con las plantillas oficiales del hospital
// ---------------------------------------------------------------------------
function templateFor(parts: OfficialPart[]): string {
  if (parts.length === 2) {
    return parts[0].kind === 'sala' ? 'COMBINADA SALA + ORDEN MEDICA.docx' : 'COMBINADA EMERGENCIA + ORDEN MEDICA.docx';
  }
  const k = parts[0].kind;
  return k === 'orden' ? 'ORDEN MEDICA.docx' : k === 'sala' ? 'NOTA DE RECIBIMIENTO EN SALA.docx' : 'NOTA DE INGRESO EMERGENCIA.docx';
}

async function loadTemplate(name: string): Promise<ArrayBuffer> {
  const enc = encodeURIComponent(name);
  const base = (import.meta as any).env?.BASE_URL || './';
  for (const u of [`${base}templates/${enc}`, `./templates/${enc}`]) {
    try {
      const r = await fetch(u, { cache: 'no-cache' });
      if (r.ok) {
        const buf = await r.arrayBuffer();
        // Validar que es la plantilla limpia con marcas de rol (no una versión antigua)
        const z = new PizZip(buf);
        if ((z.file('word/document.xml')?.asText() || '').includes('[[')) return buf;
      }
    } catch {}
  }
  if (FALLBACK_TEMPLATES[name]) return base64ToArrayBuffer(FALLBACK_TEMPLATES[name]);
  throw new Error(`No se encontró la plantilla oficial "${name}"`);
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function markerData(parts: OfficialPart[]): Record<string, string | string[]> {
  const data: Record<string, string | string[]> = {};
  for (const part of parts) {
    if (part.kind === 'orden') {
      data.O_DATE = part.dateLine;
      data.O_TITLE = part.title;
      data.O_HEADER = part.header;
      data.O_MEDIDAS = part.medidas;
      data.O_DXLABEL = part.diagnoses.length ? 'DIAGNÓSTICOS:' : '';
      data.O_DXITEM = part.diagnoses;
      data.O_VITALS = part.vitals;
      data.O_MEDLABEL = part.medications.length ? 'MEDICACIÓN:' : '';
      data.O_MEDITEM = part.medications;
      data.O_EXTRA = part.extras;
    } else if (part.kind === 'sala') {
      data.S_TITLE = part.title;
      data.S_HEADER = part.header;
      data.S_BODY = [...part.bodyBefore, ...(part.intro ? [part.intro] : [])];
      data.S_ITEM = part.diagnoses;
      data.S_AFTER = part.bodyAfter;
      data.S_SIGN = part.signature || '';
    } else {
      data.E_TITLE = part.title;
      data.E_HEADER = part.header;
      data.E_BODY = part.bodyBefore;
      data.E_INTRO = part.intro;
      data.E_ITEM = part.diagnoses;
      data.E_AFTER = part.bodyAfter;
      data.E_SIGN = part.signature || '';
    }
  }
  return data;
}

/**
 * Negritas exactas de las plantillas oficiales: en estas líneas sólo van en
 * negrita las etiquetas (los datos del paciente van en letra normal).
 */
const LABEL_BOLD: Record<string, RegExp> = {
  O_HEADER: /(NOMBRE:|EDAD:\s*\d*)/g,
  O_VITALS: /(SIGNOS VITALES:)/g,
  S_HEADER: /(NOMBRE(?=\s*:)|EDAD:|FECHA:|SALA:)/g
};

export interface TextSegment { t: string; b: boolean }

/** Divide una línea en tramos negrita/normal según el marcador de la plantilla. */
export function boldSegments(marker: string, text: string): TextSegment[] {
  const re = LABEL_BOLD[marker];
  if (!re) return [{ t: text, b: true }];
  const out: TextSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(new RegExp(re.source, 'g'))) {
    const i = m.index ?? 0;
    if (!m[0]) continue;
    if (i > last) out.push({ t: text.slice(last, i), b: false });
    out.push({ t: m[0], b: true });
    last = i + m[0].length;
  }
  if (last < text.length) out.push({ t: text.slice(last), b: false });
  return out.length ? out : [{ t: text, b: false }];
}

function richRuns(paragraph: string, marker: string, text: string): string {
  const token = `[[${marker}]]`;
  const runRe = /<w:r\b[^>]*>(?:(?!<\/w:r>)[\s\S])*?<\/w:r>/g;
  for (const m of paragraph.matchAll(runRe)) {
    if (!m[0].includes(token)) continue;
    const run = m[0];
    const rPr = (run.match(/<w:rPr>[\s\S]*?<\/w:rPr>/) || ['<w:rPr></w:rPr>'])[0].replace(/<w:b\/>|<w:bCs\/>/g, '');
    const withB = /<w:rFonts[^>]*\/>/.test(rPr)
      ? rPr.replace(/(<w:rFonts[^>]*\/>)/, '$1<w:b/><w:bCs/>')
      : rPr.replace('<w:rPr>', '<w:rPr><w:b/><w:bCs/>');
    const runs = boldSegments(marker, text)
      .map((sg) => `<w:r>${sg.b ? withB : rPr}<w:t xml:space="preserve">${escapeXml(sg.t)}</w:t></w:r>`)
      .join('');
    return paragraph.replace(run, runs);
  }
  return paragraph.replace(token, escapeXml(text));
}

/** Párrafos centrados de firma (línea + nombre) con el mismo tipo de letra del párrafo modelo. */
function signatureParagraphs(model: string, marker: string, name: string): string[] {
  const center = (xml: string, before: number) => {
    let x = xml.replace(/<w:numPr>[\s\S]*?<\/w:numPr>/g, '').replace(/<w:ind\b[^>]*\/>/g, '');
    x = /<w:jc\b[^>]*\/>/.test(x) ? x.replace(/<w:jc\b[^>]*\/>/, '<w:jc w:val="center"/>') : /<w:pPr>/.test(x) ? x.replace('<w:pPr>', '<w:pPr><w:jc w:val="center"/>') : x.replace(/<w:p\b([^>]*)>/, '<w:p$1><w:pPr><w:jc w:val="center"/></w:pPr>');
    x = x.replace(/<w:spacing\b[^>]*\/>/, '');
    x = x.replace(/<w:pPr>/, `<w:pPr><w:spacing w:before="${before}" w:after="0"/>`);
    return x;
  };
  const token = `[[${marker}]]`;
  const bold = (xml: string) => xml.replace(/<w:rPr>(?![\s\S]*?<w:b\/>)/, '<w:rPr><w:b/><w:bCs/>');
  return [center(model.replace(token, '_______________________________'), 720), bold(center(model.replace(token, escapeXml(name)), 0))];
}

/** Rellena el document.xml: cada párrafo modelo se repite/omite según los datos. */
export function fillTemplateXml(xml: string, data: Record<string, string | string[]>): string {
  const bodyMatch = xml.match(/<w:body>([\s\S]*)<\/w:body>/);
  if (!bodyMatch) return xml;
  const body = bodyMatch[1];
  const items = body.match(/<w:p\b(?:(?!<w:p[\s>])[\s\S])*?<\/w:p>|<w:p\/>|<w:tbl>[\s\S]*?<\/w:tbl>|<w:sectPr[\s\S]*?<\/w:sectPr>/g) || [];
  const out: string[] = [];
  for (const it of items) {
    const m = it.match(/\[\[([A-Z_]+)\]\]/);
    if (!m) {
      out.push(it);
      continue;
    }
    const val = data[m[1]];
    const arr = (Array.isArray(val) ? val : val ? [val] : []).map((s) => String(s).trim()).filter(Boolean);
    for (const text of arr) {
      out.push(LABEL_BOLD[m[1]] ? richRuns(it, m[1], text) : it.replace(`[[${m[1]}]]`, escapeXml(text)));
    }
    // Firma: nombre del médico al final de la nota (sin exequátur)
    const signKey = m[1] === 'E_AFTER' ? 'E_SIGN' : m[1] === 'S_AFTER' ? 'S_SIGN' : '';
    const sign = signKey ? String(data[signKey] || '').trim() : '';
    if (sign) out.push(...signatureParagraphs(it, m[1], sign));
  }
  return xml.replace(/<w:body>[\s\S]*<\/w:body>/, `<w:body>${out.join('')}</w:body>`);
}

export async function buildOfficialDocxBlob(parts: OfficialPart[]): Promise<Blob> {
  const zip = new PizZip(await loadTemplate(templateFor(parts)));
  const xml = zip.file('word/document.xml')!.asText();
  zip.file('word/document.xml', fillTemplateXml(xml, markerData(parts)));
  return zip.generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE'
  }) as Blob;
}

export function officialFileName(parts: OfficialPart[], patient: Patient): string {
  const kind = parts.length === 2 ? 'NOTA_Y_ORDEN_MEDICA' : parts[0].kind === 'orden' ? 'ORDEN_MEDICA' : parts[0].kind === 'sala' ? 'NOTA_RECIBIMIENTO_SALA' : 'NOTA_INGRESO_EMERGENCIA';
  const name = (patient.fullName || 'PACIENTE').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase();
  return `${kind}_${name}_${formatOfficialDate(new Date()).replace(/\//g, '-')}.docx`;
}

export async function downloadOfficialDocx(parts: OfficialPart[], patient: Patient): Promise<void> {
  const blob = await buildOfficialDocxBlob(parts);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = officialFileName(parts, patient);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// ---------------------------------------------------------------------------
// 4. IMPRESIÓN DIRECTA con las mismas medidas de las plantillas
// ---------------------------------------------------------------------------
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const rich = (marker: string, s: string) => boldSegments(marker, s).map((sg) => (sg.b ? `<b>${esc(sg.t)}</b>` : esc(sg.t))).join('');

function logoFor(kind: 'emergencia' | 'sala' | 'orden'): string {
  try {
    const custom = localStorage.getItem('hospital_custom_logo');
    if (custom) return custom;
  } catch {}
  return kind === 'emergencia' ? './logo_oficial_emergencia.jpg' : kind === 'sala' ? './logo_oficial_sala.png' : './logo_oficial_orden.png';
}

export function renderPrintHtml(parts: OfficialPart[]): string {
  const pages = parts.map((part, idx) => {
    const brk = idx > 0 ? ' brk' : '';
    if (part.kind === 'orden') {
      const o = part;
      return `<section class="pg orden${brk}">
        <div class="o-logo"><img src="${logoFor('orden')}" alt="Hospital Dr. Ángel María Gatón"></div>
        <p class="o-date">${esc(o.dateLine)}</p>
        <p class="o-title">${esc(o.title)}</p>
        <p class="o-header">${rich('O_HEADER', o.header)}</p>
        ${o.medidas ? `<p class="o-bold o-medidas">${esc(o.medidas)}</p>` : ''}
        ${o.diagnoses.length ? `<p class="o-bold">DIAGNÓSTICOS:</p><ul class="o-dx">${o.diagnoses.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}
        ${o.vitals ? `<p class="o-vitals o-gap">${rich('O_VITALS', o.vitals)}</p>` : ''}
        ${o.medications.length ? `<p class="o-bold o-medlabel">MEDICACIÓN:</p><ol class="o-med">${o.medications.map((m) => `<li>${esc(m)}</li>`).join('')}</ol>` : ''}
        ${o.extras.map((e) => `<p class="o-extra">${esc(e)}</p>`).join('')}
      </section>`;
    }
    const n = part;
    if (n.kind === 'sala') {
      return `<section class="pg sala${brk}">
        <div class="s-logo"><img src="${logoFor('sala')}" alt="Hospital Dr. Ángel María Gatón"></div>
        <p class="s-title">${esc(n.title)}</p>
        <p class="s-header">${rich('S_HEADER', n.header)}</p>
        ${[...n.bodyBefore, ...(n.intro ? [n.intro] : [])].map((b) => `<p class="s-body">${esc(b)}</p>`).join('')}
        ${n.diagnoses.length ? `<ol class="s-dx">${n.diagnoses.map((d) => `<li>${esc(d)}</li>`).join('')}</ol>` : ''}
        ${n.bodyAfter.map((b) => `<p class="s-body">${esc(b)}</p>`).join('')}
        ${n.signature ? `<div class="sig s-sig"><div class="sig-line"></div><p>${esc(n.signature)}</p></div>` : ''}
      </section>`;
    }
    return `<section class="pg emerg${brk}">
      <div class="e-logo"><img src="${logoFor('emergencia')}" alt="Hospital Dr. Ángel María Gatón"></div>
      <p class="e-title">${esc(n.title)}</p>
      <p class="e-header">${esc(n.header)}</p>
      ${n.bodyBefore.map((b) => `<p class="e-body">${esc(b)}</p>`).join('')}
      ${n.intro ? `<p class="e-body e-intro">${esc(n.intro)}</p>` : ''}
      ${n.diagnoses.length ? `<ul class="e-dx">${n.diagnoses.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}
      ${n.bodyAfter.map((b) => `<p class="e-body e-after">${esc(b)}</p>`).join('')}
      ${n.signature ? `<div class="sig e-sig"><div class="sig-line"></div><p>${esc(n.signature)}</p></div>` : ''}
    </section>`;
  });

  // Medidas tomadas de las plantillas oficiales (.docx)
  const css = `
    @page emerg { size: A4 portrait; margin: 2.54cm; }
    @page sala { size: letter portrait; margin: 2.5cm 3cm; }
    @page orden { size: A4 portrait; margin: 2.54cm 3.17cm; }
    html, body { margin: 0; padding: 0; background: #fff; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    p { margin: 0; }
    .pg { break-inside: auto; }
    .brk { break-before: page; page-break-before: always; }

    .emerg { page: emerg; font-family: Arial, Helvetica, sans-serif; }
    .e-logo { text-align: center; margin: 5pt 0 7.5pt; }
    .e-logo img { width: 5.82cm; height: 1.11cm; object-fit: fill; }
    .e-title { text-align: center; font-weight: bold; font-size: 13pt; margin: 4pt 0 6pt; }
    .e-header { font-weight: bold; font-size: 9.5pt; margin: 3pt 0 7pt; }
    .e-body { font-size: 9pt; text-align: justify; line-height: 1.083; margin-bottom: 5pt; }
    .e-intro { margin-top: 14pt; }
    .e-after { margin-top: 5pt; margin-bottom: 6pt; }
    .e-dx { font-size: 9pt; margin: 0 0 5pt; padding-left: 0; list-style: none; }
    .e-dx li { position: relative; padding-left: 1.27cm; margin-bottom: 2.5pt; }
    .e-dx li::before { content: '●'; position: absolute; left: 0.635cm; font-size: 7pt; top: 1pt; }

    .sala { page: sala; font-family: 'Times New Roman', Times, serif; line-height: 1.08; }
    .s-logo { text-align: center; }
    .s-logo img { width: 6.27cm; height: 1.36cm; object-fit: fill; }
    .s-title { text-align: center; font-weight: bold; font-size: 9pt; margin: 0 0 8pt; }
    .s-header { font-size: 8pt; text-align: justify; margin-bottom: 8pt; }
    .s-body { font-size: 8pt; text-align: justify; margin-bottom: 8pt; }
    .s-dx { font-size: 8pt; margin: 8pt 0; padding-left: 1.27cm; }
    .s-dx li { padding-left: 0.1cm; text-align: justify; }

    .sig { margin-top: 36pt; text-align: center; break-inside: avoid; }
    .sig-line { width: 6.5cm; border-top: 1px solid #000; margin: 0 auto 3pt; }
    .sig p { font-weight: bold; }
    .e-sig p { font-size: 9pt; }
    .s-sig p { font-size: 8pt; }

    .orden { page: orden; font-family: 'Times New Roman', Times, serif; font-size: 9pt; }
    .o-logo { padding-left: 2.82cm; margin: 3.7pt 0 6pt; line-height: 0; }
    .o-logo img { width: 8.93cm; height: 1.56cm; object-fit: fill; }
    .o-date { text-align: center; margin-bottom: 12pt; }
    .o-title { text-align: center; }
    .o-header { text-align: center; margin: 12pt 0 8pt; }
    .o-vitals { text-align: justify; }
    .o-bold { font-weight: bold; text-align: justify; }
    .o-medidas { margin: 12pt 0 8pt; }
    .o-gap { margin-top: 12pt; margin-bottom: 12pt; }
    .o-medlabel { margin-bottom: 8pt; }
    .o-dx, .o-med { margin: 0; padding-left: 1.27cm; }
    .o-dx li, .o-med li { padding-left: 0.1cm; }
    .o-dx { list-style: disc; }
    .o-extra { margin-top: 24pt; }
    .o-extra + .o-extra { margin-top: 4pt; }
    @media screen { body { background: #e5e7eb; } .pg { background: #fff; width: 21cm; min-height: 29.7cm; margin: 16px auto; padding: 2.54cm; box-sizing: border-box; box-shadow: 0 2px 10px rgba(0,0,0,.15); }
      .sala { width: 21.59cm; min-height: 27.94cm; padding: 2.5cm 3cm; } .orden { padding: 2.54cm 3.17cm; } }
  `;
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Documento oficial</title><style>${css}</style></head><body>${pages.join('')}</body></html>`;
}

export function printOfficialParts(parts: OfficialPart[]): void {
  let iframe = document.getElementById('hospital-official-print') as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'hospital-official-print';
    iframe.setAttribute('style', 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;');
    document.body.appendChild(iframe);
  }
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(renderPrintHtml(parts));
  doc.close();
  const go = () => {
    try {
      iframe!.contentWindow?.focus();
      iframe!.contentWindow?.print();
    } catch {
      window.print();
    }
  };
  // Esperar a que carguen los logos antes de imprimir
  const imgs = Array.from(doc.images);
  if (!imgs.length) return void setTimeout(go, 50);
  let pending = imgs.length;
  const done = () => {
    pending -= 1;
    if (pending <= 0) setTimeout(go, 50);
  };
  imgs.forEach((img) => (img.complete ? done() : ((img.onload = done), (img.onerror = done))));
  setTimeout(() => pending > 0 && go(), 2500);
}

// ---------------------------------------------------------------------------
// 5. PDF descargable con las mismas medidas de las plantillas
// ---------------------------------------------------------------------------
const PT = 0.3528; // mm por punto tipográfico
const CM = 10; // mm por cm

async function imageAsDataUrl(url: string): Promise<{ data: string; fmt: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const data: string = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    return { data, fmt: /png/i.test(blob.type) || /\.png/i.test(url) ? 'PNG' : 'JPEG' };
  } catch {
    return null;
  }
}

function officialLogoUrl(kind: 'emergencia' | 'sala' | 'orden'): string {
  try {
    const custom = localStorage.getItem('hospital_custom_logo');
    if (custom) return custom;
  } catch {}
  return kind === 'emergencia' ? './logo_oficial_emergencia.jpg' : kind === 'sala' ? './logo_oficial_sala.png' : './logo_oficial_orden.png';
}

interface PdfLayout {
  format: 'a4' | 'letter';
  top: number; bottom: number; left: number; right: number;
  font: 'helvetica' | 'times';
}

const LAYOUTS: Record<'emergencia' | 'sala' | 'orden', PdfLayout> = {
  emergencia: { format: 'a4', top: 2.54 * CM, bottom: 2.54 * CM, left: 2.54 * CM, right: 2.54 * CM, font: 'helvetica' },
  sala: { format: 'letter', top: 2.5 * CM, bottom: 2.5 * CM, left: 3 * CM, right: 3 * CM, font: 'times' },
  orden: { format: 'a4', top: 2.54 * CM, bottom: 2.54 * CM, left: 3.17 * CM, right: 3.17 * CM, font: 'times' }
};

export async function buildOfficialPdfBlob(parts: OfficialPart[]): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  let doc: any = null;
  let y = 0;
  let L: PdfLayout = LAYOUTS.emergencia;
  let pageW = 0;
  let pageH = 0;

  const newPage = (lay: PdfLayout) => {
    if (!doc) doc = new jsPDF({ unit: 'mm', format: lay.format, orientation: 'portrait' });
    else doc.addPage(lay.format, 'portrait');
    L = lay;
    pageW = doc.internal.pageSize.getWidth();
    pageH = doc.internal.pageSize.getHeight();
    y = lay.top;
  };

  type ParaOpts = {
    size: number; bold?: boolean; align?: 'left' | 'center' | 'justify';
    before?: number; after?: number; line?: number; indent?: number; marker?: string | 'dot';
  };
  const para = (text: string, o: ParaOpts) => {
    if (!text) return;
    const lineH = o.size * PT * (o.line || 1.15);
    doc.setFont(L.font, o.bold ? 'bold' : 'normal');
    doc.setFontSize(o.size);
    y += (o.before || 0) * PT;
    const indent = o.indent || 0;
    const width = pageW - L.left - L.right - indent;
    const lines: string[] = doc.splitTextToSize(text, width);
    lines.forEach((ln, i) => {
      if (y + lineH > pageH - L.bottom) {
        doc.addPage(L.format, 'portrait');
        y = L.top;
        doc.setFont(L.font, o.bold ? 'bold' : 'normal');
        doc.setFontSize(o.size);
      }
      const baseY = y + o.size * PT * 0.85;
      if (i === 0 && o.marker) {
        if (o.marker === 'dot') doc.circle(L.left + indent - 0.635 * CM + 0.6, baseY - o.size * PT * 0.3, o.size * PT * 0.17, 'F');
        else doc.text(o.marker, L.left + indent - 0.635 * CM, baseY);
      }
      const x = L.left + indent;
      if (o.align === 'center') doc.text(ln, pageW / 2, baseY, { align: 'center' });
      else if (o.align === 'justify' && i < lines.length - 1) doc.text(ln, x, baseY, { align: 'justify', maxWidth: width });
      else doc.text(ln, x, baseY);
      y += lineH;
    });
    y += (o.after || 0) * PT;
  };

  /** Párrafo con etiquetas en negrita y datos en normal (mismo criterio que Word). */
  const richPara = (marker: string, text: string, o: ParaOpts) => {
    if (!text) return;
    const lineH = o.size * PT * (o.line || 1.15);
    doc.setFontSize(o.size);
    y += (o.before || 0) * PT;
    const width = pageW - L.left - L.right;
    type W = { t: string; b: boolean; w: number; space: boolean };
    const words: W[] = [];
    for (const sg of boldSegments(marker, text)) {
      doc.setFont(L.font, sg.b ? 'bold' : 'normal');
      for (const piece of sg.t.split(/(\s+)/)) {
        if (!piece) continue;
        const space = /^\s+$/.test(piece);
        words.push({ t: space ? ' ' : piece, b: sg.b, w: doc.getTextWidth(space ? ' ' : piece), space });
      }
    }
    const lines: W[][] = [];
    let cur: W[] = [];
    let curW = 0;
    for (const w of words) {
      if (w.space && !cur.length) continue;
      if (!w.space && curW + w.w > width && cur.length) {
        while (cur.length && cur[cur.length - 1].space) cur.pop();
        lines.push(cur);
        cur = [];
        curW = 0;
      }
      cur.push(w);
      curW += w.w;
    }
    while (cur.length && cur[cur.length - 1].space) cur.pop();
    if (cur.length) lines.push(cur);
    lines.forEach((ln, i) => {
      if (y + lineH > pageH - L.bottom) {
        doc.addPage(L.format, 'portrait');
        y = L.top;
      }
      const baseY = y + o.size * PT * 0.85;
      const total = ln.reduce((a, w) => a + w.w, 0);
      const gaps = ln.filter((w) => w.space).length;
      const extra = o.align === 'justify' && i < lines.length - 1 && gaps ? (width - total) / gaps : 0;
      let x = o.align === 'center' ? L.left + (width - total) / 2 : L.left;
      for (const w of ln) {
        if (!w.space) {
          doc.setFont(L.font, w.b ? 'bold' : 'normal');
          doc.text(w.t, x, baseY);
        }
        x += w.w + (w.space ? extra : 0);
      }
      y += lineH;
    });
    y += (o.after || 0) * PT;
  };

  const logo = async (kind: 'emergencia' | 'sala' | 'orden', w: number, h: number, x: 'center' | number, before = 0, after = 0) => {
    y += before * PT;
    const img = await imageAsDataUrl(officialLogoUrl(kind));
    if (img) {
      const xx = x === 'center' ? (pageW - w) / 2 : L.left + x;
      try { doc.addImage(img.data, img.fmt, xx, y, w, h); } catch {}
    }
    y += h + after * PT;
  };

  for (const part of parts) {
    if (part.kind === 'orden') {
      newPage(LAYOUTS.orden);
      await logo('orden', 8.93 * CM, 1.56 * CM, 2.82 * CM, 3.7, 0);
      y += 6 * PT;
      para(part.dateLine, { size: 9, align: 'center', after: 12 });
      para(part.title, { size: 9, align: 'center' });
      richPara('O_HEADER', part.header, { size: 9, align: 'center', before: 12, after: 8 });
      para(part.medidas, { size: 9, bold: true, align: 'justify', before: 12, after: 8 });
      if (part.diagnoses.length) {
        para('DIAGNÓSTICOS:', { size: 9, bold: true });
        part.diagnoses.forEach((d) => para(d, { size: 9, indent: 1.27 * CM, marker: 'dot' }));
      }
      if (part.vitals) richPara('O_VITALS', part.vitals, { size: 9, align: 'justify', before: 12, after: 12 });
      if (part.medications.length) {
        para('MEDICACIÓN:', { size: 9, bold: true, after: 8 });
        part.medications.forEach((m, i) => para(m, { size: 9, indent: 1.27 * CM, marker: `${i + 1}.` }));
      }
      part.extras.forEach((e, i) => para(e, { size: 9, before: i === 0 ? 24 : 4, align: 'justify' }));
    } else if (part.kind === 'sala') {
      newPage(LAYOUTS.sala);
      await logo('sala', 6.27 * CM, 1.36 * CM, 'center', 0, 2);
      para(part.title, { size: 9, bold: true, align: 'center', after: 8, line: 1.08 });
      richPara('S_HEADER', part.header, { size: 8, align: 'justify', after: 8, line: 1.08 });
      [...part.bodyBefore, ...(part.intro ? [part.intro] : [])].forEach((b) => para(b, { size: 8, align: 'justify', after: 8, line: 1.08 }));
      part.diagnoses.forEach((d, i) => para(d, { size: 8, indent: 1.27 * CM, marker: `${i + 1}.`, line: 1.08, after: i === part.diagnoses.length - 1 ? 8 : 0 }));
      part.bodyAfter.forEach((b) => para(b, { size: 8, align: 'justify', after: 8, line: 1.08 }));
      if (part.signature) {
        para('_______________________________', { size: 8, align: 'center', before: 30 });
        para(part.signature, { size: 8, bold: true, align: 'center' });
      }
    } else {
      newPage(LAYOUTS.emergencia);
      await logo('emergencia', 5.82 * CM, 1.11 * CM, 'center', 5, 7.5);
      para(part.title, { size: 13, bold: true, align: 'center', before: 4, after: 6 });
      para(part.header, { size: 9.5, bold: true, before: 3, after: 7 });
      part.bodyBefore.forEach((b) => para(b, { size: 9, align: 'justify', after: 5, line: 1.083 }));
      if (part.intro) para(part.intro, { size: 9, align: 'justify', before: 14, after: 5, line: 1.083 });
      part.diagnoses.forEach((d) => para(d, { size: 9, indent: 1.27 * CM, marker: 'dot', after: 2.5 }));
      part.bodyAfter.forEach((b) => para(b, { size: 9, align: 'justify', before: 5, after: 6, line: 1.083 }));
      if (part.signature) {
        para('_______________________________', { size: 9, align: 'center', before: 30 });
        para(part.signature, { size: 9, bold: true, align: 'center' });
      }
    }
  }
  if (!doc) newPage(LAYOUTS.emergencia);
  return doc.output('blob') as Blob;
}

export async function downloadOfficialPdf(parts: OfficialPart[], patient: Patient): Promise<void> {
  const blob = await buildOfficialPdfBlob(parts);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = officialFileName(parts, patient).replace(/\.docx$/, '.pdf');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Atajo usado por los botones: construye desde datos o desde el texto editado. */
export function officialPartsFor(kind: OfficialDocKind, patient: Patient, orders: MedicalOrder[] = [], labs: LabResult[] = [], studies: MedicalStudy[] = [], text?: string): OfficialPart[] {
  return text && text.trim() ? parseOfficialText(text, kind, patient) : buildOfficialParts(kind, patient, orders, labs, studies);
}
