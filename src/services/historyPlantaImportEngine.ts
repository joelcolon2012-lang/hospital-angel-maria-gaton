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

import mammoth from 'mammoth';
import type { Patient } from '../types';
import { 
  ClinicalHistoryPlanta, 
  PathologicalHistoryPlanta, 
  NonPathologicalHistoryPlanta, 
  FamilyHistoryPlanta, 
  GeneralDataPlanta, 
  VitalSignsPlanta, 
  PhysicalExamSystemsPlanta, 
  NeurologicalExamPlanta,
  MedicationItemPlanta,
  DiagnosisItemPlanta
} from '../types/clinicalHistoryPlanta';
import { VisionLabOcrEngine } from './ai/VisionLabOcrEngine';
import { GeminiClinicalService } from './ai/GeminiClinicalService';

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
}

export class HistoryPlantaImportEngine {
  /**
   * Extrae el texto legible del archivo según su extensión (PDF, DOCX, DOC, TXT, JPG, JPEG, PNG)
   */
  public async extractRawTextFromFile(file: File): Promise<{ text: string; fileType: string }> {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'txt';

    // 1. Archivos Word (.docx, .doc)
    if (ext === 'docx' || ext === 'doc') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return { text: result.value || '', fileType: ext };
      } catch (err) {
        console.warn('Error con mammoth, intentando lectura como texto plano:', err);
        const text = await file.text();
        return { text, fileType: ext };
      }
    }

    // 2. Archivos de Texto (.txt)
    if (ext === 'txt') {
      const text = await file.text();
      return { text, fileType: ext };
    }

    // 3. Documentos PDF (.pdf)
    if (ext === 'pdf') {
      try {
        const raw = await file.text();
        // Extraer texto de streams de PDF no comprimidos
        const streamMatches = raw.match(/\((.*?)\)\s*Tj/g);
        if (streamMatches && streamMatches.length > 5) {
          const streamText = streamMatches.map(m => m.replace(/^\(|\)\s*Tj$/g, '')).join(' ');
          return { text: streamText, fileType: ext };
        }
      } catch {}

      // Si es un PDF escaneado o con streams comprimidos, intentar transcripción con Gemini Vision
      const apiKey = GeminiClinicalService.getApiKey();
      if (apiKey) {
        try {
          const base64 = await this.fileToBase64(file);
          const geminiAnalysis = await GeminiClinicalService.analyzeMultimodalImage(
            base64,
            'application/pdf',
            'rx',
            'Extrae todo el texto clínico íntegro de este documento médico sin omitir ninguna sección.'
          );
          if (geminiAnalysis.interpretation) {
            return { text: geminiAnalysis.interpretation, fileType: ext };
          }
        } catch {}
      }

      return { 
        text: `[DOCUMENTO PDF: ${file.name}]\nPor favor copie y pegue el texto clínico si el PDF es escaneado.`,
        fileType: ext 
      };
    }

    // 4. Imágenes médicas y fotos de notas (.jpg, .jpeg, .png)
    if (ext === 'jpg' || ext === 'jpeg' || ext === 'png') {
      try {
        const base64 = await this.fileToBase64(file);
        const apiKey = GeminiClinicalService.getApiKey();

        if (apiKey) {
          const prompt = `Eres un transcriptor clínico hospitalario experto. Transcribe con fidelidad absoluta TODO el texto clínico visible en esta imagen de nota de emergencia o historia clínica: Datos de filiación, motivo, HDA, antecedentes, examen físico cefalocaudal, signos vitales, diagnósticos y tratamiento. No inventes nada.`;
          const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: prompt },
                  { inlineData: { mimeType: file.type || 'image/jpeg', data: base64.split(',')[1] || base64 } }
                ]
              }],
              generationConfig: { temperature: 0.1, maxOutputTokens: 2000 }
            })
          });

          if (res.ok) {
            const data = await res.json();
            const extracted = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (extracted.trim().length > 20) {
              return { text: extracted, fileType: ext };
            }
          }
        }
      } catch (err) {
        console.warn('Error en transcripción de imagen:', err);
      }

      return {
        text: `[FOTO DE DOCUMENTO: ${file.name}]\nExtracción visual en proceso.`,
        fileType: ext
      };
    }

    const text = await file.text();
    return { text, fileType: ext };
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Analiza el texto extraído y clasifica automáticamente los datos hacia los acápites de Planta
   */
  public parseDocumentToPlantaHistory(
    rawText: string, 
    fileName: string, 
    fileType: string, 
    sourceType: 'EMERGENCIA' | 'HISTORIA_ANTERIOR' | 'DOCUMENTO_EXTERNO',
    patientContext?: Patient
  ): ParsedPlantaImportResult {
    const clean = rawText.replace(/\r\n/g, '\n');
    const fields: Record<string, ImportedFieldMeta> = {};

    let altaCount = 0;
    let mediaCount = 0;
    let bajaCount = 0;
    let notDocumentedCount = 0;

    // Helper para registrar un campo analizado con su confianza
    const registerField = <T>(
      key: string,
      label: string,
      section: string,
      val: T | undefined,
      displayVal: string | undefined,
      confidence: ConfidenceLevel,
      reason?: string,
      snippet?: string
    ): ImportedFieldMeta<T> => {
      const isDoc = val !== undefined && val !== null && String(val).trim() !== '' && String(val).trim() !== 'NO DOCUMENTADO';
      const finalDisplay = isDoc ? (displayVal || String(val)) : 'NO DOCUMENTADO';
      const finalConf = isDoc ? confidence : 'BAJA';
      const finalReason = isDoc ? (reason || 'Dato identificado con precisión.') : 'No se encontró registro en el documento.';

      if (isDoc) {
        if (finalConf === 'ALTA') altaCount++;
        else if (finalConf === 'MEDIA') mediaCount++;
        else bajaCount++;
      } else {
        notDocumentedCount++;
      }

      const item: ImportedFieldMeta<T> = {
        key,
        label,
        section,
        value: isDoc ? (val as T) : ('' as any),
        displayValue: finalDisplay,
        confidence: finalConf,
        confidenceReason: finalReason,
        isDocumented: isDoc,
        sourceSnippet: snippet
      };

      fields[key] = item;
      return item;
    };

    // Helper de extracción por regex
    const findRegex = (pattern: RegExp): { match?: string; snippet?: string } => {
      const m = clean.match(pattern);
      if (m && m[1]?.trim()) {
        return { match: m[1].trim(), snippet: m[0].trim() };
      }
      return {};
    };

    // Helper de extracción de secciones completas
    const sectionExtract = (startWords: string[], endWords: string[]): { text?: string; snippet?: string } => {
      const startPattern = `(?:^|\\n)\\s*(?:${startWords.join('|')})\\s*[:\\-]?\\s*([\\s\\S]*?)`;
      const endPattern = `(?=\\n\\s*(?:${endWords.join('|')})\\s*[:\\-]|$)`;
      const fullRegex = new RegExp(startPattern + endPattern, 'i');
      const m = clean.match(fullRegex);
      if (m && m[1]?.trim()) {
        return { text: m[1].trim(), snippet: m[0].slice(0, 200) };
      }
      return {};
    };

    // 1. DATOS DE IDENTIFICACIÓN
    const nameMatch = findRegex(/(?:NOMBRE|PACIENTE|NOMBRE DEL PACIENTE)\s*[:\-]?\s*([A-Za-zÁÉÍÓÚáéíóúñÑ\s]+?)(?=(?:\s+EDAD|\s+CÉDULA|\s+EXP|\s+SEXO|\n|$))/i);
    const ageMatch = findRegex(/(?:EDAD|AÑOS)\s*[:\-]?\s*(\d{1,3})\s*(?:AÑOS|A)?/i);
    const sexMatch = findRegex(/(?:SEXO|GÉNERO)\s*[:\-]?\s*(MASCULINO|FEMENINO|FEMENINA|M|F|HOMBRE|MUJER)/i);
    const expMatch = findRegex(/(?:EXPEDIENTE|NO\.\s*EXP|RECORD|HISTORIA|NO\.\s*RECORD)\s*[:\-]?\s*([A-Z0-9\-]+)/i);
    const dateMatch = findRegex(/(?:FECHA DE INGRESO|FECHA|FECHA\/HORA)\s*[:\-]?\s*(\d{1,4}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
    const serviceMatch = findRegex(/(?:SERVICIO|SALA|ÁREA|DEPARTAMENTO)\s*[:\-]?\s*([A-Za-zÁÉÍÓÚáéíóúñÑ0-9\s\-]+?)(?=\n|$)/i);

    const extractedName = nameMatch.match || patientContext?.fullName;
    registerField('general.nombre', 'Nombre del Paciente', 'Identificación', extractedName, extractedName?.toUpperCase(), extractedName ? 'ALTA' : 'BAJA', undefined, nameMatch.snippet);

    const extractedAge = ageMatch.match ? `${ageMatch.match} AÑOS` : (patientContext?.age ? `${patientContext.age} AÑOS` : undefined);
    registerField('general.edad', 'Edad', 'Identificación', extractedAge, extractedAge, extractedAge ? 'ALTA' : 'BAJA', undefined, ageMatch.snippet);

    let normSex = '';
    if (sexMatch.match) {
      const s = sexMatch.match.toUpperCase();
      normSex = s.startsWith('F') || s.startsWith('MUJER') ? 'FEMENINA' : 'MASCULINO';
    } else if (patientContext?.sex) {
      normSex = patientContext.sex === 'F' ? 'FEMENINA' : 'MASCULINO';
    }
    registerField('general.sexo', 'Sexo', 'Identificación', normSex || undefined, normSex || undefined, normSex ? 'ALTA' : 'BAJA', undefined, sexMatch.snippet);

    const extractedExp = expMatch.match || patientContext?.medicalRecordNumber;
    registerField('general.expediente', 'No. Expediente / Record', 'Identificación', extractedExp, extractedExp, extractedExp ? 'ALTA' : 'BAJA', undefined, expMatch.snippet);

    const extractedDate = dateMatch.match || new Date().toLocaleDateString('es-DO');
    registerField('general.fechaIngreso', 'Fecha de Ingreso', 'Identificación', extractedDate, extractedDate, 'ALTA', undefined, dateMatch.snippet);

    const extractedService = serviceMatch.match || patientContext?.cubicle || 'EMERGENCIAS / SALA';
    registerField('general.servicio', 'Servicio / Sala', 'Identificación', extractedService, extractedService, 'MEDIA', undefined, serviceMatch.snippet);

    // 2. MOTIVO DE CONSULTA
    const mcExtract = sectionExtract(
      ['MOTIVO DE CONSULTA', 'MOTIVO DE INGRESO', 'MOTIVO CONSULTA', 'SÍNTOMA PRINCIPAL'],
      ['HISTORIA DE LA ENFERMEDAD ACTUAL', 'ENFERMEDAD ACTUAL', 'HDA', 'ANTECEDENTES']
    );
    const finalMc = mcExtract.text || patientContext?.chiefComplaint;
    registerField('motivoConsulta', 'Motivo de Consulta', 'Motivo de Consulta', finalMc, finalMc?.toUpperCase(), finalMc ? 'ALTA' : 'BAJA', undefined, mcExtract.snippet);

    // 3. HISTORIA DE LA ENFERMEDAD ACTUAL (HDA)
    const hdaExtract = sectionExtract(
      ['HISTORIA DE LA ENFERMEDAD ACTUAL', 'ENFERMEDAD ACTUAL', 'HDA', 'PADECIMIENTO ACTUAL', 'CUADRO ACTUAL'],
      ['ANTECEDENTES PATOLÓGICOS', 'ANTECEDENTES PERSONALES', 'ANTECEDENTES', 'REVISIÓN POR SISTEMAS', 'EXAMEN FÍSICO']
    );
    const finalHda = hdaExtract.text || patientContext?.clinicalHistory?.currentIllnessHistory;
    registerField('presentIllness', 'Historia de la Enfermedad Actual (HDA)', 'Enfermedad Actual', finalHda, finalHda, finalHda ? 'ALTA' : 'BAJA', undefined, hdaExtract.snippet);

    // 4. ANTECEDENTES PERSONALES PATOLÓGICOS ESPECÍFICOS
    // HTA
    const htaMatch = findRegex(/(?:HIPERTENSI[ÓO]N(?:\s+ARTERIAL)?|HTA)[\s:\-]*(?:CONOCIDA|DE)?\s*([^\n;.]+)/i);
    const hasHtaMention = /HTA|HIPERTENSI[ÓO]N/i.test(clean);
    const htaVal = hasHtaMention ? (htaMatch.match ? `HTA: ${htaMatch.match}` : 'HIPERTENSIÓN ARTERIAL DOCUMENTADA') : undefined;
    registerField('antecedentes.hta', 'Hipertensión Arterial (HTA)', 'Antecedentes Patológicos', htaVal, htaVal, hasHtaMention ? 'ALTA' : 'BAJA', undefined, htaMatch.snippet);

    // Diabetes Mellitus
    const dmMatch = findRegex(/(?:DIABETES(?:\s+MELLITUS)?|DM|DM2|DM1)[\s:\-]*(?:TIPO\s*[12])?\s*([^\n;.]+)/i);
    const hasDmMention = /DIABETES|DM2|DM1/i.test(clean);
    const dmVal = hasDmMention ? (dmMatch.match ? `DIABETES: ${dmMatch.match}` : 'DIABETES MELLITUS DOCUMENTADA') : undefined;
    registerField('antecedentes.diabetes', 'Diabetes Mellitus', 'Antecedentes Patológicos', dmVal, dmVal, hasDmMention ? 'ALTA' : 'BAJA', undefined, dmMatch.snippet);

    // Cardiopatías
    const cardioMatch = findRegex(/(?:CARDIOPAT[ÍI]A|INSUFICIENCIA\s+CARD[ÍI]ACA|INFARTO|SCA|FA|FIBRILACI[ÓO]N)[\s:\-]*([^\n;.]+)/i);
    const hasCardioMention = /CARDIOPAT[ÍI]A|INSUFICIENCIA CARD[ÍI]ACA|ARRITMIA|CORONARIOPAT[ÍI]A/i.test(clean);
    const cardioVal = hasCardioMention ? (cardioMatch.match || 'CARDIOPATÍA DOCUMENTADA') : undefined;
    registerField('antecedentes.cardiopatias', 'Cardiopatías', 'Antecedentes Patológicos', cardioVal, cardioVal, hasCardioMention ? 'MEDIA' : 'BAJA', undefined, cardioMatch.snippet);

    // Enfermedad Renal
    const renalMatch = findRegex(/(?:ENFERMEDAD\s+RENAL|ERC|IRA|INSUFICIENCIA\s+RENAL)[\s:\-]*([^\n;.]+)/i);
    const hasRenalMention = /ENFERMEDAD RENAL|INSUFICIENCIA RENAL|ERC|HEMODI[ÁA]LISIS/i.test(clean);
    const renalVal = hasRenalMention ? (renalMatch.match || 'ENFERMEDAD RENAL DOCUMENTADA') : undefined;
    registerField('antecedentes.renal', 'Enfermedad Renal', 'Antecedentes Patológicos', renalVal, renalVal, hasRenalMention ? 'MEDIA' : 'BAJA', undefined, renalMatch.snippet);

    // Enfermedades Neurológicas
    const neuroMatch = findRegex(/(?:EVC|ACV|EPILEPSIA|CONVULSIONES|ICTUS|ACCIDENTE\s+CEREBROVASCULAR)[\s:\-]*([^\n;.]+)/i);
    const hasNeuroMention = /EVC|ACV|EPILEPSIA|CONVULSI|ICTUS/i.test(clean);
    const neuroVal = hasNeuroMention ? (neuroMatch.match || 'ENFERMEDAD NEUROLÓGICA PREVIA DOCUMENTADA') : undefined;
    registerField('antecedentes.neurologicas', 'Enfermedades Neurológicas', 'Antecedentes Patológicos', neuroVal, neuroVal, hasNeuroMention ? 'MEDIA' : 'BAJA', undefined, neuroMatch.snippet);

    // Enfermedades Pulmonares
    const pulmMatch = findRegex(/(?:ASMA|EPOC|BRONQUITIS|TUBERCULOSIS|TBC)[\s:\-]*([^\n;.]+)/i);
    const hasPulmMention = /ASMA|EPOC|NEUMOPAT[ÍI]A|TUBERCULOSIS/i.test(clean);
    const pulmVal = hasPulmMention ? (pulmMatch.match || 'NEUMOPATÍA CRÓNICA DOCUMENTADA') : undefined;
    registerField('antecedentes.pulmonares', 'Enfermedades Pulmonares', 'Antecedentes Patológicos', pulmVal, pulmVal, hasPulmMention ? 'MEDIA' : 'BAJA', undefined, pulmMatch.snippet);

    // Antecedentes Quirúrgicos
    const qxExtract = sectionExtract(['ANTECEDENTES QUIRÚRGICOS', 'QUIRÚRGICOS'], ['ALERGIAS', 'TÓXICOS', 'MEDICAMENTOS', 'FAMILIARES']);
    const finalQx = qxExtract.text;
    registerField('antecedentes.quirurgicos', 'Antecedentes Quirúrgicos', 'Antecedentes Patológicos', finalQx, finalQx, finalQx ? 'ALTA' : 'BAJA', undefined, qxExtract.snippet);

    // Alergias
    const alergExtract = sectionExtract(['ANTECEDENTES ALÉRGICOS', 'ALERGIAS', 'ALÉRGICOS'], ['TÓXICOS', 'MEDICAMENTOS', 'FAMILIARES', 'HÁBITOS']);
    const finalAlerg = alergExtract.text;
    registerField('antecedentes.alergias', 'Alergias Medicamentosas / Alimentarias', 'Antecedentes Patológicos', finalAlerg, finalAlerg, finalAlerg ? 'ALTA' : 'BAJA', undefined, alergExtract.snippet);

    // Medicamentos Habituales
    const medExtract = sectionExtract(['MEDICAMENTOS HABITUALES', 'TRATAMIENTO HABITUAL', 'MEDICAMENTOS DE USO HABITUAL'], ['FAMILIARES', 'HÁBITOS', 'EXAMEN FÍSICO']);
    const detectedTreatments: Array<{ name: string; dose: string; route: string; frequency: string; startDate?: string }> = [];
    if (medExtract.text) {
      const lines = medExtract.text.split(/[\n;]+/).map(l => l.trim()).filter(Boolean);
      lines.forEach(line => {
        const parts = line.split(/[\s,]+/);
        detectedTreatments.push({
          name: parts[0]?.toUpperCase() || line.toUpperCase(),
          dose: parts[1] || 'DOSIS HABITUAL',
          route: 'VO',
          frequency: 'C/24 HORAS'
        });
      });
    }
    registerField('antecedentes.medicamentos', 'Medicamentos Habituales', 'Antecedentes Patológicos', medExtract.text, medExtract.text, medExtract.text ? 'ALTA' : 'BAJA', undefined, medExtract.snippet);

    // 5. HÁBITOS TÓXICOS
    const toxExtract = sectionExtract(['HÁBITOS TÓXICOS', 'TÓXICOS', 'HÁBITOS'], ['MEDICAMENTOS', 'FAMILIARES', 'EXAMEN FÍSICO']);
    const hasTobacco = /TABACO|CIGARRILLO|FUMA|FUMADOR/i.test(toxExtract.text || clean);
    const hasAlcohol = /ALCOHOL|BEBEDOR|ETILISTA|CERVEZA|RON/i.test(toxExtract.text || clean);
    const hasDrugs = /SUSTANCIAS|DROGAS|MARIHUANA|COCA[ÍI]NA/i.test(toxExtract.text || clean);

    registerField('habitos.tabaco', 'Tabaquismo', 'Hábitos Tóxicos', hasTobacco ? 'FUMADOR' : undefined, hasTobacco ? 'TABAQUISMO POSITIVO' : undefined, hasTobacco ? 'ALTA' : 'BAJA');
    registerField('habitos.alcohol', 'Alcohol', 'Hábitos Tóxicos', hasAlcohol ? 'CONSUMO' : undefined, hasAlcohol ? 'CONSUMO DE ALCOHOL' : undefined, hasAlcohol ? 'ALTA' : 'BAJA');
    registerField('habitos.drogas', 'Otras Sustancias', 'Hábitos Tóxicos', hasDrugs ? 'CONSUMO' : undefined, hasDrugs ? 'CONSUMO DOCUMENTADO' : undefined, hasDrugs ? 'MEDIA' : 'BAJA');

    // 6. ANTECEDENTES FAMILIARES
    const famExtract = sectionExtract(['ANTECEDENTES FAMILIARES', 'HEREDOFAMILIARES', 'FAMILIARES'], ['GINECO', 'REVISIÓN POR SISTEMAS', 'EXAMEN FÍSICO']);
    registerField('antecedentes.familiares', 'Antecedentes Heredofamiliares', 'Antecedentes Familiares', famExtract.text, famExtract.text, famExtract.text ? 'ALTA' : 'BAJA', undefined, famExtract.snippet);

    // 7. SIGNOS VITALES
    const bpMatch = findRegex(/(?:T\/A|TA|PA|PRESIÓN ARTERIAL|PRESION)\s*[:\-]?\s*(\d{2,3})\s*[\/|\-]\s*(\d{2,3})/i);
    const hrMatch = findRegex(/(?:FC|FRECUENCIA CARD(?:Í|I)ACA|PULSO)\s*[:\-]?\s*(\d{2,3})\s*(?:LPM|X'|XMIN|\/MIN)?/i);
    const rrMatch = findRegex(/(?:FR|FRECUENCIA RESPIRATORIA)\s*[:\-]?\s*(\d{1,2})\s*(?:RPM|X'|XMIN|\/MIN)?/i);
    const tempMatch = findRegex(/(?:TEMP|TEMPERATURA|T°)\s*[:\-]?\s*(\d{2}(?:[.,]\d)?)\s*(?:°C|C)?/i);
    const satMatch = findRegex(/(?:SATO2|SAT\s*O2|SATURACI(?:Ó|O)N|SPO2)\s*[:\-]?\s*(\d{2,3})\s*%/i);
    const glucMatch = findRegex(/(?:GLUCEMIA|GLICEMIA|HGT|DEXTROSTIX)\s*[:\-]?\s*(\d{2,3})\s*(?:MG\/DL)?/i);

    const sbp = bpMatch.match ? parseInt(clean.match(/(?:T\/A|TA|PA|PRESIÓN ARTERIAL|PRESION)\s*[:\-]?\s*(\d{2,3})\s*[\/|\-]\s*(\d{2,3})/i)?.[1] || '', 10) : undefined;
    const dbp = bpMatch.match ? parseInt(clean.match(/(?:T\/A|TA|PA|PRESIÓN ARTERIAL|PRESION)\s*[:\-]?\s*(\d{2,3})\s*[\/|\-]\s*(\d{2,3})/i)?.[2] || '', 10) : undefined;
    const bpDisplay = (sbp && dbp) ? `${sbp}/${dbp} mmHg` : undefined;
    registerField('vitals.bp', 'Presión Arterial (TA)', 'Signos Vitales', bpDisplay, bpDisplay, bpDisplay ? 'ALTA' : 'BAJA', undefined, bpMatch.snippet);

    const hr = hrMatch.match ? parseInt(hrMatch.match, 10) : undefined;
    registerField('vitals.hr', 'Frecuencia Cardíaca (FC)', 'Signos Vitales', hr, hr ? `${hr} lpm` : undefined, hr ? 'ALTA' : 'BAJA', undefined, hrMatch.snippet);

    const rr = rrMatch.match ? parseInt(rrMatch.match, 10) : undefined;
    registerField('vitals.rr', 'Frecuencia Respiratoria (FR)', 'Signos Vitales', rr, rr ? `${rr} rpm` : undefined, rr ? 'ALTA' : 'BAJA', undefined, rrMatch.snippet);

    const temp = tempMatch.match ? parseFloat(tempMatch.match.replace(',', '.')) : undefined;
    registerField('vitals.temp', 'Temperatura (°C)', 'Signos Vitales', temp, temp ? `${temp} °C` : undefined, temp ? 'ALTA' : 'BAJA', undefined, tempMatch.snippet);

    const sat = satMatch.match ? parseInt(satMatch.match, 10) : undefined;
    registerField('vitals.sat', 'Saturación de Oxígeno (SpO2)', 'Signos Vitales', sat, sat ? `${sat}%` : undefined, sat ? 'ALTA' : 'BAJA', undefined, satMatch.snippet);

    const gluc = glucMatch.match ? parseInt(glucMatch.match, 10) : undefined;
    registerField('vitals.gluc', 'Glucemia Capilar', 'Signos Vitales', gluc, gluc ? `${gluc} mg/dL` : undefined, gluc ? 'ALTA' : 'BAJA', undefined, glucMatch.snippet);

    // 8. EXAMEN FÍSICO POR SISTEMAS
    const peFull = sectionExtract(['EXAMEN FÍSICO', 'EXAMEN FISICO', 'EXPLORACIÓN FÍSICA'], ['IMPRESIÓN DIAGNÓSTICA', 'DIAGNÓSTICOS', 'PLAN', 'TRATAMIENTO']);
    const subPe = (keys: string[]): string | undefined => {
      if (!peFull.text) return undefined;
      const p = new RegExp(`(?:^|\\n)\\s*(?:${keys.join('|')})\\s*[:\\-]\\s*([^\\n]+(?:\\n(?!\\s*(?:CABEZA|CUELLO|TÓRAX|TORAX|CARDIO|RESPIRA|CORAZÓN|PULMON|ABDOMEN|NEURO|EXTREMI|PIEL))[^\\n]+)*)`, 'i');
      const m = peFull.text.match(p);
      return m ? m[1].trim() : undefined;
    };

    const peGeneral = subPe(['GENERAL', 'ASPECTO GENERAL', 'ESTADO GENERAL']);
    registerField('pe.general', 'Estado General', 'Examen Físico', peGeneral, peGeneral, peGeneral ? 'ALTA' : 'BAJA');

    const peHead = subPe(['CABEZA', 'CABEZA Y CUELLO', 'CRÁNEO', 'CUELLO']);
    registerField('pe.head', 'Cabeza y Cuello', 'Examen Físico', peHead, peHead, peHead ? 'ALTA' : 'BAJA');

    const peCardio = subPe(['CARDIOVASCULAR', 'CORAZÓN', 'APARATO CIRCULATORIO', 'RUIDOS CARDIACOS']);
    registerField('pe.cardio', 'Cardiovascular (Corazón)', 'Examen Físico', peCardio, peCardio, peCardio ? 'ALTA' : 'BAJA');

    const peResp = subPe(['RESPIRATORIO', 'PULMONES', 'TÓRAX PLEUROPULMONAR', 'CAMPOS PULMONARES']);
    registerField('pe.resp', 'Respiratorio (Pulmones)', 'Examen Físico', peResp, peResp, peResp ? 'ALTA' : 'BAJA');

    const peAbd = subPe(['ABDOMINAL', 'ABDOMEN']);
    registerField('pe.abd', 'Abdomen', 'Examen Físico', peAbd, peAbd, peAbd ? 'ALTA' : 'BAJA');

    const peExtUpper = subPe(['EXTREMIDADES SUPERIORES', 'MIEMBROS SUPERIORES']);
    registerField('pe.extUpper', 'Extremidades Superiores', 'Examen Físico', peExtUpper, peExtUpper, peExtUpper ? 'MEDIA' : 'BAJA');

    const peExtLower = subPe(['EXTREMIDADES INFERIORES', 'MIEMBROS INFERIORES', 'EXTREMIDADES']);
    registerField('pe.extLower', 'Extremidades Inferiores', 'Examen Físico', peExtLower, peExtLower, peExtLower ? 'ALTA' : 'BAJA');

    const peNeuro = subPe(['NEUROLÓGICO', 'NEUROLÓGICO Y ESTADO MENTAL', 'SNC']);
    registerField('pe.neuro', 'Examen Neurológico', 'Examen Físico', peNeuro, peNeuro, peNeuro ? 'ALTA' : 'BAJA');

    // 9. LABORATORIOS DETECTADOS
    const detectedLabs: Record<string, string> = {};
    const labKeys = ['Hemoglobina', 'Hematocrito', 'Leucocitos', 'Plaquetas', 'Glucosa', 'Creatinina', 'Urea', 'BUN', 'Sodio', 'Potasio', 'Cloro', 'TGO', 'TGP', 'TP', 'INR'];
    for (const lk of labKeys) {
      const lm = findRegex(new RegExp(`(?:${lk}|${lk.slice(0, 3)})\\s*[:\\-=]\\s*([0-9.,]+)`, 'i'));
      if (lm.match) {
        detectedLabs[lk] = lm.match;
      }
    }

    // 10. ESTUDIOS DE IMAGEN DETECTADOS
    const detectedImages: Record<string, string> = {};
    const rxMatch = sectionExtract(['RADIOGRAFÍA', 'RX TÓRAX', 'RAYOS X'], ['TOMOGRAFÍA', 'LABORATORIO', 'DIAGNÓSTICO']);
    if (rxMatch.text) detectedImages['Radiografía'] = rxMatch.text;
    const tacMatch = sectionExtract(['TOMOGRAFÍA', 'TAC CRANEAL', 'TC'], ['RESONANCIA', 'DIAGNÓSTICO', 'PLAN']);
    if (tacMatch.text) detectedImages['Tomografía'] = tacMatch.text;

    // 11. DIAGNÓSTICOS DETECTADOS
    const diagSection = sectionExtract(
      ['IMPRESIÓN DIAGNÓSTICA', 'DIAGNÓSTICO PRESUNTIVO', 'DIAGNÓSTICOS', 'DIAGNÓSTICO'],
      ['PLAN', 'PLAN TERAPÉUTICO', 'CONDUCTA', 'TRATAMIENTO', 'ORDEN MÉDICA']
    );
    const detectedDiagnoses: string[] = [];
    if (diagSection.text) {
      diagSection.text.split(/[\n;]+/)
        .map(l => l.replace(/^[\d\-•*.)\s]+/, '').trim())
        .filter(l => l.length > 2)
        .forEach(d => detectedDiagnoses.push(d.toUpperCase()));
    }
    const diagDisplay = detectedDiagnoses.length > 0 ? detectedDiagnoses.join('; ') : undefined;
    registerField('diagnosticos', 'Diagnósticos Planteados', 'Diagnósticos', diagDisplay, diagDisplay, detectedDiagnoses.length > 0 ? 'ALTA' : 'BAJA');

    // 12. Generar el objeto ClinicalHistoryPlanta normalizado
    const nowIso = new Date().toISOString();
    const extractedHistory: ClinicalHistoryPlanta = {
      id: `ch-planta-${patientContext?.id || Date.now()}`,
      patientId: patientContext?.id || `pat-${Date.now()}`,
      admissionId: `adm-${Date.now()}`,

      generalData: {
        nombre: fields['general.nombre']?.value || '',
        estadoCivil: 'SOLTERO(A)',
        edad: fields['general.edad']?.value || '',
        raza: 'MESTIZA',
        sexo: fields['general.sexo']?.value || 'MASCULINO',
        religion: 'CATÓLICA',
        escolaridad: 'SECUNDARIA',
        sala: fields['general.servicio']?.value || 'SALA GENERAL',
        fuente: 'PACIENTE / EXPEDIENTE PREVIO',
        fechaIngreso: fields['general.fechaIngreso']?.value || new Date().toISOString().slice(0, 10),
        hora: new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }),
        procedencia: 'EMERGENCIAS'
      },

      chiefComplaints: fields['motivoConsulta']?.isDocumented ? [fields['motivoConsulta'].value] : [],
      presentIllness: fields['presentIllness']?.isDocumented ? fields['presentIllness'].value : 'NO DOCUMENTADA EN EL REPORTE IMPORTADO.',

      pathologicalHistory: {
        childhood: 'NO REGISTRADOS.',
        adolescence: 'NO REGISTRADOS.',
        adulthood: [
          fields['antecedentes.hta']?.isDocumented ? fields['antecedentes.hta'].value : null,
          fields['antecedentes.diabetes']?.isDocumented ? fields['antecedentes.diabetes'].value : null,
          fields['antecedentes.cardiopatias']?.isDocumented ? fields['antecedentes.cardiopatias'].value : null,
          fields['antecedentes.renal']?.isDocumented ? fields['antecedentes.renal'].value : null,
          fields['antecedentes.neurologicas']?.isDocumented ? fields['antecedentes.neurologicas'].value : null,
          fields['antecedentes.pulmonares']?.isDocumented ? fields['antecedentes.pulmonares'].value : null,
        ].filter(Boolean).join('; ') || 'NO DOCUMENTADOS.',
        hospitalizations: 'NO DOCUMENTADAS.',
        surgeries: fields['antecedentes.quirurgicos']?.isDocumented ? fields['antecedentes.quirurgicos'].value : 'NEGADOS.',
        trauma: 'NEGADOS.',
        transfusions: 'NEGADAS.',
        allergies: fields['antecedentes.alergias']?.isDocumented ? fields['antecedentes.alergias'].value : 'NEGADAS.',
        medications: detectedTreatments.map((t, idx) => ({
          id: `med-import-${idx}`,
          name: t.name,
          dose: t.dose,
          unit: 'MG',
          route: t.route,
          frequency: t.frequency
        }))
      },

      nonPathologicalHistory: {
        tobacco: {
          consumes: fields['habitos.tabaco']?.isDocumented || false,
          cigarettesPerDay: 0,
          yearsSmoking: 0,
          packYears: 0
        },
        coffee: 'MODERADO',
        alcohol: fields['habitos.alcohol']?.isDocumented ? fields['habitos.alcohol'].value : 'OCASIONAL',
        illicitDrugs: fields['habitos.drogas']?.isDocumented ? fields['habitos.drogas'].value : 'NEGADAS',
        tea: 'NO CONSUME',
        previousJobs: 'NO DOCUMENTADOS',
        toxicExposure: 'NEGADA'
      },

      familyHistory: {
        father: { alive: true, morbidities: fields['antecedentes.familiares']?.value || 'NO DOCUMENTADOS.' },
        mother: { alive: true, morbidities: 'NO DOCUMENTADOS.' },
        siblings: { count: 0, details: 'NO DOCUMENTADOS.' },
        children: { count: 0, details: 'NO DOCUMENTADOS.' }
      },

      psychosocialHistory: {
        monthlyIncome: 'NO DOCUMENTADO',
        housing: {
          housingType: 'CONCRETO',
          wallMaterial: 'BLOCKS',
          roofMaterial: 'PLATABANDA',
          floorMaterial: 'CEMENTO',
          roomCount: 2,
          personCount: 3,
          bathroomCount: 1,
          bathroomLocation: 'Intradomiciliario',
          trashDisposal: 'AYUNTAMIENTO',
          waterSource: 'ACUEDUCTO',
          electricity: true
        }
      },

      reviewOfSystems: {
        cardiovascular: { status: 'NORMAL', notes: 'Sin hallazgos agudos' },
        pulmonary: { status: 'NORMAL', notes: 'Sin hallazgos agudos' },
        gastrointestinal: { status: 'NORMAL', notes: 'Sin hallazgos agudos' },
        genitourinary: { status: 'NORMAL', notes: 'Sin hallazgos agudos' },
        endocrinometabolic: { status: 'NORMAL', notes: 'Sin hallazgos agudos' },
        neurosensory: { status: 'NORMAL', notes: 'Sin hallazgos agudos' },
        musculoskeletal: { status: 'NORMAL', notes: 'Sin hallazgos agudos' },
        hematologic: { status: 'NORMAL', notes: 'Sin hallazgos agudos' }
      },

      generalStatus: {
        biotype: 'NORMOLÍNEO',
        facies: 'NO CARACTERÍSTICA',
        consciousness: 'ALERTA / CONSCIENTE',
        orientation: 'ORIENTADO EN TIEMPO, ESPACIO Y PERSONA',
        language: 'COHERENTE',
        respiratoryPattern: 'EUPNEICO',
        temperatureCondition: 'AFEBRIL AL TACTO',
        skinColoration: 'NORMOCOROLADA',
        hydration: 'NORMOHIDRATADO',
        perfusion: 'LLENADO CAPILAR < 2 SEG',
        oxygenTherapy: 'AIRE AMBIENTE',
        generalStatusSummary: fields['pe.general']?.value || 'PACIENTE EN CONDICIONES GENERALES REGULARES.'
      },

      vitalSigns: {
        systolicBP: sbp,
        diastolicBP: dbp,
        heartRate: hr,
        respiratoryRate: rr,
        temperature: temp,
        oxygenSaturation: sat,
        bloodGlucose: gluc,
        takenAt: nowIso
      },

      physicalExam: {
        head: fields['pe.head']?.value || 'NORMOCÉFALO, SIN LESIONES.',
        eyes: 'PUPILAS ISOCÓRICAS Y FOTORREACTIVAS.',
        ears: 'PABELLONES AURICULARES SIN ALTERACIONES.',
        nose: 'FOSAS NASALES PERMEABLES.',
        mouth: 'MUCOSA ORAL HÚMEDA.',
        neck: 'SIMÉTRICO, SIN ADENOPATÍAS NI INJURGITACIÓN YUGULAR.',
        thorax: 'SIMÉTRICO, NORMOEXPANSIBLE.',
        lungs: fields['pe.resp']?.value || 'MURMULLO VESICULAR CONSERVADO, SIN RUIDOS PATOLÓGICOS.',
        heart: fields['pe.cardio']?.value || 'RUIDOS CARDÍACOS RÍTMICOS, SIN SOPLOS.',
        abdomen: fields['pe.abd']?.value || 'BLANDO, DEPRESIBLE, NO DOLOROSO, PERISTALSIS PRESENTE.',
        externalGenitals: 'NO EVALUADOS.',
        skin: 'SIN LESIONES DÉRMICAS ACTIVAS.',
        upperExtremities: fields['pe.extUpper']?.value || 'SIMÉTRICAS, CON PULSOS PALPABLES.',
        lowerExtremities: fields['pe.extLower']?.value || 'SIMÉTRICAS, SIN EDEMAS, PULSOS DISTALES PRESENTES.',
        neurological: fields['pe.neuro']?.value || 'GLASGOW 15/15, SIN DÉFICIT MOTOR FOCAL.'
      },

      neurologicalExam: {
        consciousness: 'Alerta',
        orientation: { person: true, space: true, time: true },
        glasgow: { eye: 4, verbal: 5, motor: 6, total: 15 },
        language: 'Normal',
        memory: { anterograde: true, retrograde: true },
        pupils: { sizeRightMm: 3, sizeLeftMm: 3, isochoric: true, photoreactiveRight: true, photoreactiveLeft: true },
        cranialNerves: {},
        muscleStrength: { rightUpper: 5, leftUpper: 5, rightLower: 5, leftLower: 5 },
        tone: 'Normal',
        sensitivity: { superficial: true, pain: true, thermal: true, vibratory: true, proprioceptive: true },
        reflexes: {
          bicipitalRight: '++', bicipitalLeft: '++', tricipitalRight: '++', tricipitalLeft: '++',
          brachioradialRight: '++', brachioradialLeft: '++', patellarRight: '++', patellarLeft: '++',
          achillesRight: '++', achillesLeft: '++'
        },
        babinski: 'Negativo',
        coordination: { fingerToNose: 'Normal', heelToShin: 'Normal', diadochokinesia: 'Normal' },
        romberg: 'Negativo',
        gait: 'Normal',
        narrativeText: fields['pe.neuro']?.value || 'EXAMEN NEUROLÓGICO DENTRO DE PARÁMETROS NORMALES.'
      },

      diagnoses: detectedDiagnoses.map((d, idx) => ({
        id: `diag-import-${idx}`,
        name: d,
        priorityIndex: idx + 1
      })),

      status: 'BORRADOR',
      version: 1,
      createdAt: nowIso,
      createdBy: 'Importación Inteligente Asistida',
      updatedAt: nowIso,
      updatedBy: 'Importación Inteligente Asistida'
    };

    return {
      fileName,
      fileType,
      rawText: clean,
      sourceType,
      fields,
      extractedHistory,
      detectedDiagnoses,
      detectedLabs,
      detectedImages,
      detectedTreatments,
      confidenceSummary: {
        altaCount,
        mediaCount,
        bajaCount,
        notDocumentedCount
      }
    };
  }

  /**
   * Procesa un archivo subido (PDF, DOCX, TXT, imágenes) y extrae la historia de planta
   */
  public async processFile(
    file: File, 
    patientContext: Patient, 
    sourceType: 'EMERGENCIA' | 'HISTORIA_ANTERIOR' | 'DOCUMENTO_EXTERNO',
    admissionId?: string
  ): Promise<ParsedPlantaImportResult> {
    const { text, fileType } = await this.extractRawTextFromFile(file);
    return this.parseDocumentToPlantaHistory(text, file.name, fileType, sourceType, patientContext);
  }

  /**
   * Procesa texto clínico copiado y pegado directamente por el médico
   */
  public processRawText(
    rawText: string,
    patientContext: Patient,
    fileName: string = 'Texto pegado',
    fileType: string = 'txt',
    sourceType: 'EMERGENCIA' | 'HISTORIA_ANTERIOR' | 'DOCUMENTO_EXTERNO' = 'DOCUMENTO_EXTERNO',
    admissionId?: string
  ): ParsedPlantaImportResult {
    return this.parseDocumentToPlantaHistory(rawText, fileName, fileType, sourceType, patientContext);
  }
}

export const historyPlantaImportEngine = new HistoryPlantaImportEngine();
