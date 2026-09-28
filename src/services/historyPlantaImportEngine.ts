/**
 * Motor de Importación Asistida para Historia Clínica de Planta
 * Hospital Regional Dr. Ángel María Gatón — Dr. Joel Colón
 *
 * Flujo:
 * Archivo cargado (PDF, DOC, DOCX, TXT, JPG, JPEG, PNG)
 * ↓ Extracción de información (Mammoth / Text / Vision OCR)
 * ↓ Identificación de datos clínicos
 * ↓ Normalización clínica
 * ↓ Clasificación de cada dato con nivel de confianza (ALTA, MEDIA, BAJA)
 * ↓ Asignación rigurosa de "NO DOCUMENTADO" a campos ausentes (CERO ALUCINACIONES)
 * ↓ Migración automática a acápites de Planta
 * ↓ Vista previa para revisión médica obligatoria
 */

import type { Patient } from '../types';
import type { ClinicalHistoryPlanta } from '../types/clinicalHistoryPlanta';
import { parseClinicalNote, fold, type ParsedNote } from './clinicalImport/noteParser';
import { extractTextFromClinicalFile } from './clinicalImport/fileText';
import { clinicalHistoryPlantaService } from './clinicalHistoryPlantaService';

export type ConfidenceLevel = 'ALTA' | 'MEDIA' | 'BAJA';
export interface ImportedFieldMeta<T = any> {
  key: string;
  label: string;
  section: string;
  value: T;
  displayValue: string;
  confidence: ConfidenceLevel;
  confidenceReason?: string;
  isDocumented: boolean; // true si está documentado, false si es "NO DOCUMENTADO"
  sourceSnippet?: string;
}

export interface ParsedPlantaImportResult {
  fileName: string;
  fileType: string;
  rawText: string;
  sourceType: 'EMERGENCIA' | 'HISTORIA_ANTERIOR' | 'DOCUMENTO_EXTERNO';
  fields: Record<string, ImportedFieldMeta>;
  extractedHistory: ClinicalHistoryPlanta;
  detectedDiagnoses: string[];
  detectedLabs: Record<string, string>;
  detectedImages: Record<string, string>;
  detectedTreatments: Array<{ name: string; dose: string; route: string; frequency: string; startDate?: string }>;
  confidenceSummary: {
    altaCount: number;
    mediaCount: number;
    bajaCount: number;
    notDocumentedCount: number;
  };
  warnings: string[];
  extractionMethod?: string;
}

export class HistoryPlantaImportEngine {
  /** Texto legible de cualquier archivo (Word, PDF con texto o escaneado, fotos, RTF, texto). */
  public async extractRawTextFromFile(file: File): Promise<{ text: string; fileType: string; method?: string; warnings: string[] }> {
    const r = await extractTextFromClinicalFile(file);
    return { text: r.text, fileType: r.fileType, method: r.method, warnings: r.warnings };
  }

  /**
   * Distribuye la nota por acápites y la SUPERPONE sobre la historia existente
   * (o la historia inicial estándar). Solo cambia lo que el documento trae escrito;
   * nunca inventa hallazgos ni borra lo que el médico ya tenía.
   */
  public parseDocumentToPlantaHistory(
    rawText: string,
    fileName: string,
    fileType: string,
    sourceType: 'EMERGENCIA' | 'HISTORIA_ANTERIOR' | 'DOCUMENTO_EXTERNO',
    patientContext?: Patient,
    admissionId?: string,
    baseHistory?: ClinicalHistoryPlanta | null,
    extraWarnings: string[] = [],
    method?: string
  ): ParsedPlantaImportResult {
    const clean = (rawText || '').replace(/\r\n/g, '\n');
    const note: ParsedNote = parseClinicalNote(clean);
    const fields: Record<string, ImportedFieldMeta> = {};
    const count = { alta: 0, media: 0, baja: 0, nd: 0 };

    const reg = (key: string, label: string, section: string, value: any, confKey?: string) => {
      const txt = value == null ? '' : Array.isArray(value) ? value.join('; ') : String(value);
      const isDoc = txt.trim() !== '';
      const conf: ConfidenceLevel = isDoc ? (note.confidence[confKey || ''] || 'ALTA') : 'BAJA';
      if (!isDoc) count.nd++;
      else if (conf === 'ALTA') count.alta++;
      else if (conf === 'MEDIA') count.media++;
      else count.baja++;
      fields[key] = {
        key,
        label,
        section,
        value: isDoc ? value : '',
        displayValue: isDoc ? txt : 'NO DOCUMENTADO',
        confidence: conf,
        confidenceReason: !isDoc ? 'No se encontró en el documento.' : conf === 'ALTA' ? 'Tomado del acápite con su título.' : 'Deducido de la redacción: verifique.',
        isDocumented: isDoc
      };
    };

    const I = note.identification;
    const A = note.antecedents;
    const V = note.vitals;
    const E = note.physicalExam;
    const up = (s?: string) => (s ? s.trim().toUpperCase() : '');

    reg('general.nombre', 'Nombre', 'Datos generales', I.fullName, 'identification.fullName');
    reg('general.edad', 'Edad', 'Datos generales', I.age != null ? `${I.age} AÑOS` : I.ageText, 'identification.age');
    reg('general.sexo', 'Sexo', 'Datos generales', I.sex ? (I.sex === 'F' ? 'FEMENINA' : 'MASCULINO') : undefined, 'identification.sex');
    reg('general.servicio', 'Sala', 'Datos generales', I.location, 'identification.location');
    reg('motivo', 'Motivo de consulta', 'Motivo', note.chiefComplaints.length ? note.chiefComplaints : note.reasonForConsultation, 'reasonForConsultation');
    reg('hda', 'Historia de la enfermedad actual', 'HEA', note.currentIllness, 'currentIllness');
    reg('app.narrative', 'Antecedentes patológicos', 'Antecedentes', A.pathological || A.general, A.pathological ? 'antecedents.pathological' : 'antecedents.general');
    reg('app.quirurgicos', 'Quirúrgicos', 'Antecedentes', A.surgical, 'antecedents.surgical');
    reg('app.alergias', 'Alérgicos', 'Antecedentes', A.allergic, 'antecedents.allergic');
    reg('app.medicamentos', 'Medicamentos', 'Antecedentes', A.medications, 'antecedents.medications');
    reg('app.toxicos', 'Tóxicos', 'Antecedentes', A.toxic, 'antecedents.toxic');
    reg('app.familiares', 'Familiares', 'Antecedentes', A.family, 'antecedents.family');
    const ta = V.systolicBP && V.diastolicBP ? `${V.systolicBP}/${V.diastolicBP} mmHg` : undefined;
    reg('vital.ta', 'Signos vitales', 'Signos vitales', [ta, V.heartRate && `FC ${V.heartRate}`, V.respiratoryRate && `FR ${V.respiratoryRate}`, V.temperature && `T ${V.temperature}`, V.oxygenSaturation && `SatO2 ${V.oxygenSaturation}%`].filter(Boolean).join(' · '), 'vitals.systolicBP');
    const examText = [E.general, E.head, E.neck, E.thorax, E.lungs, E.heart, E.abdominal, E.extremities, E.upperExtremities, E.lowerExtremities, E.neurological, E.full].filter(Boolean).join(' ');
    reg('pe.general', 'Examen físico', 'Examen físico', examText, 'physicalExam.general');
    reg('diagnoses', 'Diagnósticos', 'Diagnósticos', note.diagnoses, 'diagnoses');

    // Base: la historia que ya existe (se respeta) o la historia inicial estándar del programa
    const base: ClinicalHistoryPlanta = JSON.parse(
      JSON.stringify(baseHistory || (patientContext ? clinicalHistoryPlantaService.createInitialHistory(patientContext, admissionId) : null))
    );
    const h: any = base;
    if (!h) throw new Error('No hay paciente para construir la historia.');

    // Datos generales
    h.generalData = h.generalData || {};
    if (I.fullName) h.generalData.nombre = up(I.fullName);
    if (I.age != null) h.generalData.edad = `${I.age} AÑOS`;
    else if (I.ageText) h.generalData.edad = up(I.ageText);
    if (I.sex) h.generalData.sexo = I.sex === 'F' ? 'FEMENINA' : 'MASCULINO';
    if (I.location) h.generalData.sala = up(I.location);

    // Motivos y HEA
    const complaints = note.chiefComplaints.length ? note.chiefComplaints : note.reasonForConsultation ? [note.reasonForConsultation] : [];
    if (complaints.length) h.chiefComplaints = complaints.map(up);
    if (note.currentIllness) h.presentIllness = up(note.currentIllness);

    // Antecedentes
    h.pathologicalHistory = h.pathologicalHistory || {};
    const PH = h.pathologicalHistory;
    if (A.pathological || A.general) PH.adulthood = up(A.pathological || A.general);
    if (A.surgical) PH.surgeries = up(A.surgical);
    if (A.allergic) PH.allergies = up(A.allergic);
    if (A.transfusional) PH.transfusions = up(A.transfusional);
    if (A.traumatic) PH.trauma = up(A.traumatic);
    if (A.hospitalizations) PH.hospitalizations = up(A.hospitalizations);
    if (A.medications) {
      const existing: any[] = Array.isArray(PH.medications) ? PH.medications : [];
      const names = new Set(existing.map((m) => fold(String(m.name || '')).trim()));
      A.medications
        .split(/[\n;,]+/)
        .map((m) => m.trim())
        .filter((m) => m.length > 2 && !/^(NIEGA|NEGAD|NINGUN)/.test(fold(m)))
        .forEach((m, i) => {
          if (names.has(fold(m).trim())) return;
          existing.push({ id: `med-import-${Date.now()}-${i}`, name: up(m), dose: '', unit: '', route: '', frequency: '' });
        });
      PH.medications = existing;
    }
    if (A.toxic) {
      h.nonPathologicalHistory = h.nonPathologicalHistory || {};
      const t = fold(A.toxic);
      const neg = /^(NIEGA|NEGAD|NINGUN|NO\b)/.test(t);
      if (!neg && /TABAC|FUMA|CIGARR/.test(t)) h.nonPathologicalHistory.tobacco = { ...(h.nonPathologicalHistory.tobacco || {}), consumes: true };
      h.nonPathologicalHistory.otherNotes = up(A.toxic);
    }
    if (A.family) {
      h.familyHistory = h.familyHistory || {};
      h.familyHistory.otherRelevant = up(A.family);
    }

    // Signos vitales: solo los documentados
    const vs: any = { ...(h.vitalSigns || {}) };
    let vAny = false;
    for (const k of ['systolicBP', 'diastolicBP', 'heartRate', 'respiratoryRate', 'temperature', 'oxygenSaturation', 'bloodGlucose', 'weight', 'height'] as const) {
      const v = (V as any)[k];
      if (typeof v === 'number' && Number.isFinite(v)) {
        vs[k] = v;
        vAny = true;
      }
    }
    if (vAny) {
      vs.takenAt = new Date().toISOString();
      if (vs.weight && vs.height) vs.bmi = Math.round((vs.weight / Math.pow(vs.height / 100, 2)) * 10) / 10;
      h.vitalSigns = vs;
    }

    // Estado general y examen físico
    if (E.general) {
      h.generalStatus = h.generalStatus || {};
      h.generalStatus.generalStatusSummary = up(E.general);
    }
    h.physicalExam = h.physicalExam || {};
    const PE = h.physicalExam;
    const map: Array<[string | undefined, string]> = [
      [E.head, 'head'],
      [E.eyes, 'eyes'],
      [E.ears, 'ears'],
      [E.nose, 'nose'],
      [E.mouth, 'mouth'],
      [E.neck, 'neck'],
      [E.thorax, 'thorax'],
      [E.lungs, 'lungs'],
      [E.heart, 'heart'],
      [E.abdominal, 'abdomen'],
      [E.genitals, 'externalGenitals'],
      [E.skin, 'skin'],
      [E.upperExtremities || E.extremities, 'upperExtremities'],
      [E.lowerExtremities || E.extremities, 'lowerExtremities'],
      [E.neurological, 'neurological']
    ];
    for (const [v, k] of map) if (v && v.trim()) PE[k] = up(v);
    if (E.neurological) {
      h.neurologicalExam = h.neurologicalExam || {};
      h.neurologicalExam.narrativeText = up(E.neurological);
    }
    if (typeof V.glasgowTotal === 'number' && h.neurologicalExam?.glasgow) {
      h.neurologicalExam.glasgow = { ...h.neurologicalExam.glasgow, total: V.glasgowTotal };
    }

    // Diagnósticos: se agregan sin duplicar
    if (note.diagnoses.length) {
      const cur: any[] = Array.isArray(h.diagnoses) ? h.diagnoses : [];
      const names = new Set(cur.map((d) => fold(String(d.name || '')).trim()));
      note.diagnoses.forEach((d, i) => {
        if (names.has(fold(d).trim())) return;
        cur.push({ id: `diag-import-${Date.now()}-${i}`, name: up(d), priorityIndex: cur.length + 1 });
      });
      h.diagnoses = cur;
    }

    const nowIso = new Date().toISOString();
    h.updatedAt = nowIso;
    h.updatedBy = 'Importación de documento';

    const detectedLabs: Record<string, string> = {};
    if (note.labs) detectedLabs['Paraclínicos'] = note.labs;
    const detectedImages: Record<string, string> = {};
    if (note.imaging) detectedImages['Imágenes'] = note.imaging;

    return {
      fileName,
      fileType,
      rawText: clean,
      sourceType,
      fields,
      extractedHistory: base,
      detectedDiagnoses: note.diagnoses.map(up),
      detectedLabs,
      detectedImages,
      detectedTreatments: [],
      confidenceSummary: { altaCount: count.alta, mediaCount: count.media, bajaCount: count.baja, notDocumentedCount: count.nd },
      warnings: [...extraWarnings, ...note.warnings],
      extractionMethod: method
    };
  }

  public async processFile(
    file: File,
    patientContext: Patient,
    sourceType: 'EMERGENCIA' | 'HISTORIA_ANTERIOR' | 'DOCUMENTO_EXTERNO',
    admissionId?: string,
    baseHistory?: ClinicalHistoryPlanta | null
  ): Promise<ParsedPlantaImportResult> {
    const r = await this.extractRawTextFromFile(file);
    if (!r.text || r.text.trim().length < 10) {
      throw new Error(r.warnings.join(' ') || 'El archivo no contiene texto legible. Pegue el texto de la nota.');
    }
    return this.parseDocumentToPlantaHistory(r.text, file.name, r.fileType, sourceType, patientContext, admissionId, baseHistory, r.warnings, r.method);
  }

  public processRawText(
    rawText: string,
    patientContext: Patient,
    fileName: string = 'Texto pegado',
    fileType: string = 'txt',
    sourceType: 'EMERGENCIA' | 'HISTORIA_ANTERIOR' | 'DOCUMENTO_EXTERNO' = 'DOCUMENTO_EXTERNO',
    admissionId?: string,
    baseHistory?: ClinicalHistoryPlanta | null
  ): ParsedPlantaImportResult {
    return this.parseDocumentToPlantaHistory(rawText, fileName, fileType, sourceType, patientContext, admissionId, baseHistory);
  }
}

export const historyPlantaImportEngine = new HistoryPlantaImportEngine();
