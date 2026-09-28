/**
 * Servicio Especializado: Generador de Nota de Ingreso en Planta
 * a partir de la Historia Clínica de Planta
 * Hospital Regional Dr. Ángel María Gatón - Dr. Joel Colón
 */

import { db } from '../db/dexieDb';
import { Patient, ClinicalHistoryPlanta, PatientEvolution, LabResult, MedicalStudy, MedicalOrder } from '../types';
import { authService } from './authService';
import { buildWardNoteModel, serializeParts, parseOfficialText, downloadOfficialDocx, downloadOfficialPdf } from './officialDocuments';

const meaningful = (v?: string | null) => {
  const t = String(v || '').trim();
  return t && !/^(NO REGISTRAD|NO DOCUMENTAD|PENDIENTE)/i.test(t) ? t : '';
};

/**
 * Convierte la Historia Clínica de Planta en un "paciente" para el motor oficial de notas.
 * Solo se usan datos documentados (nunca se rellenan valores normales por defecto).
 */
export function plantaHistoryAsPatient(history: ClinicalHistoryPlanta, patient: Patient): Patient {
  const g: any = history.generalData || {};
  const p: any = history.pathologicalHistory || {};
  const np: any = history.nonPathologicalHistory || {};
  const pe: any = history.physicalExam || {};
  const neuro: any = history.neurologicalExam || {};
  const vs: any = history.vitalSigns || {};
  const ageNum = parseInt(String(g.edad || '').replace(/[^\d]/g, ''), 10);
  const meds = Array.isArray(p.medications)
    ? p.medications
        .map((m: any) => [m.name, m.dose, m.unit, m.frequency, m.route].map((x) => String(x || '').trim()).filter(Boolean).join(' '))
        .filter(Boolean)
        .join(', ')
    : '';
  const tox: string[] = [];
  if (np.tobacco?.consumes) tox.push('TABAQUISMO');
  if (meaningful(np.otherNotes)) tox.push(np.otherNotes);
  const vitals: any = { ...(patient.vitals || {}) };
  for (const k of ['systolicBP', 'diastolicBP', 'heartRate', 'respiratoryRate', 'temperature', 'oxygenSaturation', 'bloodGlucose', 'weight', 'height']) {
    if (typeof vs[k] === 'number' && vs[k] > 0) vitals[k] = vs[k];
  }
  const ch: any = patient.clinicalHistory || {};
  return {
    ...patient,
    fullName: meaningful(g.nombre) || patient.fullName,
    age: Number.isFinite(ageNum) ? ageNum : patient.age,
    sex: /FEM/i.test(String(g.sexo || '')) ? 'F' : /MASC/i.test(String(g.sexo || '')) ? 'M' : patient.sex,
    cubicle: meaningful(g.sala) || patient.cubicle,
    chiefComplaint: (history.chiefComplaints || []).filter(Boolean).join(', ') || patient.chiefComplaint,
    vitals,
    clinicalHistory: {
      ...ch,
      currentIllnessHistory: meaningful(history.presentIllness) || ch.currentIllnessHistory || '',
      pathologicalHistory: meaningful(p.adulthood) || ch.pathologicalHistory || '',
      surgicalHistory: meaningful(p.surgeries) || ch.surgicalHistory || '',
      allergicHistory: meaningful(p.allergies) || ch.allergicHistory || '',
      habitualMedications: meds || ch.habitualMedications || '',
      toxicHabits: tox.join(', ') || ch.toxicHabits || '',
      physicalExam: {
        ...(ch.physicalExam || {}),
        general: meaningful(history.generalStatus?.generalStatusSummary) || ch.physicalExam?.general || '',
        head: pe.head || '',
        eyes: pe.eyes || '',
        ears: pe.ears || '',
        nose: pe.nose || '',
        mouth: pe.mouth || '',
        neck: pe.neck || '',
        thorax: pe.thorax || '',
        lungs: pe.lungs || '',
        heart: pe.heart || '',
        cardiovascular: pe.heart || '',
        abdominal: pe.abdomen || '',
        genitourinary: pe.externalGenitals || '',
        skin: pe.skin || '',
        upperExtremities: pe.upperExtremities || '',
        lowerExtremities: pe.lowerExtremities || '',
        neurological: meaningful(neuro.narrativeText) || pe.neurological || ''
      }
    } as any,
    diagnosesList: (history.diagnoses || []).length
      ? history.diagnoses.map((d, i) => ({ id: d.id || `dx-${i}`, name: d.name, status: 'Confirmado', type: i === 0 ? 'Primario' : 'Secundario', orderIndex: i } as any))
      : patient.diagnosesList
  };
}

/**
 * NOTA DE RECIBIMIENTO EN SALA a partir de la Historia de Planta, en el formato oficial
 * del hospital: incluye al final las paraclínicas y la descripción de las imágenes.
 */
export function generateNotaIngresoPlantaText(
  history: ClinicalHistoryPlanta,
  patient?: Patient,
  labs: LabResult[] = [],
  studies: MedicalStudy[] = [],
  orders: MedicalOrder[] = []
): string {
  const base: Patient = patient || ({ id: history.patientId, fullName: history.generalData?.nombre || '', sex: 'M', cubicle: '', arrivalDateTime: '', provenance: '', triageLevel: 3, chiefComplaint: '', status: 'ingresados', attendingDoctor: '', internalCode: '', createdAt: '', updatedAt: '' } as any);
  const merged = plantaHistoryAsPatient(history, base);
  return serializeParts([buildWardNoteModel(merged, orders, labs, studies)]);
}

/** Carga paraclínicas, estudios de imagen y órdenes del paciente para la nota. */
export async function loadPatientClinicalData(patientId: string): Promise<{ labs: LabResult[]; studies: MedicalStudy[]; orders: MedicalOrder[] }> {
  const [labs, studies, orders] = await Promise.all([
    db.labs.where('patientId').equals(patientId).toArray().catch(() => [] as LabResult[]),
    db.studies.where('patientId').equals(patientId).toArray().catch(() => [] as MedicalStudy[]),
    db.orders.filter((o: any) => o.patientId === patientId).toArray().catch(() => [] as MedicalOrder[])
  ]);
  return { labs: labs.filter((l: any) => !l.isDeleted), studies: studies.filter((s: any) => !s.isDeleted), orders: orders.filter((o: any) => !o.isDeleted) };
}

/**
 * Guarda la Nota de Ingreso generada en el expediente del paciente
 * (IndexedDB: tabla evolutions y actualiza datos en tabla patients)
 */
export async function saveNotaIngresoPlantaToPatient(
  history: ClinicalHistoryPlanta,
  patient: Patient,
  noteText: string
): Promise<void> {
  const curUser = authService.getCurrentUser();
  const doctorName = curUser?.name || 'Dr. Joel Colón';

  // 1. Crear entrada en Evoluciones del paciente
  const evolutionEntry: PatientEvolution = {
    id: 'evo-ingreso-' + Date.now(),
    patientId: patient.id,
    timestamp: new Date().toISOString(),
    doctorName,
    vitalSignsSummary: [
      history.vitalSigns.systolicBP && history.vitalSigns.diastolicBP ? `TA: ${history.vitalSigns.systolicBP}/${history.vitalSigns.diastolicBP}` : '',
      history.vitalSigns.heartRate ? `FC: ${history.vitalSigns.heartRate}` : '',
      history.vitalSigns.respiratoryRate ? `FR: ${history.vitalSigns.respiratoryRate}` : '',
      history.vitalSigns.oxygenSaturation ? `SpO2: ${history.vitalSigns.oxygenSaturation}%` : '',
      history.vitalSigns.temperature ? `Temp: ${history.vitalSigns.temperature}°C` : ''
    ].filter(Boolean).join(' | ') || 'Sin signos vitales documentados',
    clinicalChanges: 'INGRESO FORMAL EN PLANTA A PARTIR DE HISTORIA CLÍNICA DE PLANTA.',
    newResults: 'Historia clínica completa levantada y validada.',
    problemReevaluation: noteText,
    updatedDiagnoses: history.diagnoses.map(d => d.name).join('; '),
    conduct: 'Manejo en sala según órdenes médicas oficiales.'
  };

  await db.evolutions.add(evolutionEntry);

  // 2. Sincronizar datos con el paciente central
  const updatedClinicalHistory = {
    ...(patient.clinicalHistory || {}),
    reasonForConsultation: history.chiefComplaints?.join(', ') || patient.clinicalHistory?.reasonForConsultation || '',
    currentIllnessHistory: history.presentIllness || patient.clinicalHistory?.currentIllnessHistory || '',
    pathologicalHistory: history.pathologicalHistory.adulthood || patient.clinicalHistory?.pathologicalHistory || '',
    surgicalHistory: history.pathologicalHistory.surgeries || patient.clinicalHistory?.surgicalHistory || '',
    allergicHistory: history.pathologicalHistory.allergies || patient.clinicalHistory?.allergicHistory || '',
    clinicalImpression: history.diagnoses.map(d => d.name).join('; ') || patient.clinicalHistory?.clinicalImpression || ''
  };

  await db.patients.update(patient.id, {
    clinicalHistory: updatedClinicalHistory as any,
    status: 'ingresados',
    cubicle: history.generalData.sala || patient.cubicle
  });
}

/**
 * Word (.docx) con la plantilla oficial NOTA DE RECIBIMIENTO EN SALA (nombre del médico, sin exequátur).
 */
export async function exportNotaIngresoPlantaDocx(history: ClinicalHistoryPlanta, noteText: string, patient?: Patient): Promise<void> {
  const p = patient ? plantaHistoryAsPatient(history, patient) : ({ fullName: history.generalData?.nombre || 'PACIENTE' } as Patient);
  await downloadOfficialDocx(parseOfficialText(noteText, 'sala', p), p);
}

/**
 * PDF con las mismas medidas de la plantilla oficial.
 */
export async function exportNotaIngresoPlantaPdf(history: ClinicalHistoryPlanta, noteText: string, patient?: Patient): Promise<void> {
  const p = patient ? plantaHistoryAsPatient(history, patient) : ({ fullName: history.generalData?.nombre || 'PACIENTE' } as Patient);
  await downloadOfficialPdf(parseOfficialText(noteText, 'sala', p), p);
}
