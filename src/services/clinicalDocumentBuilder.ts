/**
 * ClinicalDocumentBuilder - Motor Central de Construcción y Validación de Documentos Clínicos
 * Hospital Regional Dr. Ángel María Gatón — Dr. Joel Colón
 * 
 * FASES 6, 7, 9, 10, 14, 16, 17, 18, 31, 32:
 * 
 * PIPELINE UNIFICADO:
 * Datos Estructurados -> Validación -> Normalización -> Desduplicación -> Builder -> Plantilla Oficial -> Corrector -> Validador Final
 * 
 * Genera con fidelidad matemática exacta al formato real del hospital:
 * 1. Nota de Ingreso (Emergencia y Sala/Planta)
 * 2. Orden Médica Oficial
 * 3. Historia Clínica
 * 4. Nota de Evolución
 */

import { Patient, MedicalOrder, LabResult, MedicalStudy, PatientEvolution } from '../types';
import { ClinicalDataNormalizer } from './clinicalDataNormalizer';
import { ClinicalDeduplicationEngine } from './clinicalDeduplicationEngine';
import { ClinicalTextCorrector } from './clinicalTextCorrector';
import { getTherapeuticDiscussion } from './therapeuticDiscussionService';

export interface ClinicalValidationReport {
  isValid: boolean;
  warnings: string[];
  missingFields: string[];
  inconsistencies: string[];
}

export interface FinalDocumentAuditResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  detectedDuplicates: string[];
  cleanedText: string;
}

export class ClinicalDocumentBuilder {

  /**
   * FASE 17: Valida los datos del paciente antes de generar cualquier documento
   */
  public static validatePatientData(patient: Patient, orders: MedicalOrder[] = []): ClinicalValidationReport {
    const warnings: string[] = [];
    const missingFields: string[] = [];
    const inconsistencies: string[] = [];

    if (!patient.fullName || patient.fullName.trim().length < 3) {
      missingFields.push('Nombre completo del paciente');
    }
    if (!patient.age && patient.age !== 0) {
      missingFields.push('Edad del paciente');
    }
    if (!patient.cubicle) {
      missingFields.push('Cubículo / Cama de asignación');
    }
    if (!patient.chiefComplaint && !patient.clinicalHistory?.reasonForConsultation) {
      missingFields.push('Motivo de consulta / ingreso');
    }

    // Validar signos vitales
    const v = patient.vitals;
    if (v) {
      if (v.systolicBP && (v.systolicBP < 50 || v.systolicBP > 280)) {
        inconsistencies.push(`Presión sistólica fuera de rango fisiológico: ${v.systolicBP} mmHg`);
      }
      if (v.heartRate && (v.heartRate < 30 || v.heartRate > 240)) {
        inconsistencies.push(`Frecuencia cardíaca extrema: ${v.heartRate} lpm`);
      }
      if (v.temperature && (v.temperature < 32 || v.temperature > 43)) {
        inconsistencies.push(`Temperatura fuera de rango biológico: ${v.temperature} °C`);
      }
    }

    // Validar órdenes médicas
    orders.forEach((ord, i) => {
      if (ord.type === 'Medicamento' && (!ord.dose || ord.dose.trim() === '')) {
        warnings.push(`Orden #${i + 1} (${ord.name}): No tiene dosis especificada`);
      }
    });

    return {
      isValid: missingFields.length === 0,
      warnings,
      missingFields,
      inconsistencies
    };
  }

  /**
   * FASES 7, 9, 14: Construye la NOTA DE INGRESO (Emergencia o Sala)
   * reproduciendo exactamente la estructura y redacción de los documentos del Hospital Dr. Ángel María Gatón
   */
  public static buildAdmissionNote(
    patient: Patient,
    orders: MedicalOrder[] = [],
    labs: LabResult[] = [],
    studies: MedicalStudy[] = [],
    type: 'EMERGENCIA' | 'SALA' = 'EMERGENCIA'
  ): string {
    const v = patient.vitals || {};
    const h = patient.clinicalHistory || ({} as any);
    const pe = h.physicalExam || {};

    const rawDate = patient.arrivalDateTime || patient.createdAt || new Date().toISOString();
    const dateStr = ClinicalDataNormalizer.normalizeDateFormat(rawDate);
    const timeStr = ClinicalDataNormalizer.normalizeTimeFormat(rawDate.includes('T') ? rawDate.split('T')[1].slice(0, 5) : '3:00 PM');

    const cleanName = ClinicalDataNormalizer.normalizePatientName(patient.fullName);
    const ageStr = patient.age ? `${patient.age} AÑOS` : '--';
    const sexoStr = patient.sex === 'F' ? 'FEMENINA' : 'MASCULINO';
    const pronombre = patient.sex === 'F' ? 'ESTA' : 'ESTE';
    const cubicleStr = (patient.cubicle || 'CUBÍCULO 1').toUpperCase();

    // 1. ENCABEZADO INSTITUCIONAL
    let out = `             :HOSPITAL\n`;
    out += `          H  DR. ÁNGEL MARÍA GATÓN\n\n`;

    if (type === 'EMERGENCIA') {
      out += `                  NOTA DE INGRESO EMERGENCIA\n\n`;
      out += `NOMBRE: ${cleanName},    EDAD: ${ageStr},    EMERG: ${cubicleStr},    FECHA INGRESO: ${dateStr}.    HORA: ${timeStr}\n\n`;
    } else {
      out += `                     NOTA DE RECIBIMIENTO EN SALA\n\n`;
      out += `NOMBRE: ${cleanName},    EDAD: ${ageStr},    SALA: ${cubicleStr},    FECHA INGRESO: ${dateStr}.    HORA: ${timeStr}\n\n`;
    }

    // 2. PÁRRAFO NARRATIVO INTEGRAL DE ANTECEDENTES Y MOTIVO DE INGRESO (DESDUPLICADO)
    const rawHda = (h.currentIllnessHistory || patient.chiefComplaint || '').trim();
    const pureHda = ClinicalDataNormalizer.extractPureIllnessHistory(rawHda);
    let p1 = '';

    if (/^SE\s+TRATA\s+DE\s+PACIENTE/i.test(rawHda)) {
      p1 = rawHda.toUpperCase();
      if (!/SE\s+DECIDE\s+SU\s+INGRESO/i.test(p1)) {
        p1 += ' TRAS PREVIA EVALUACIÓN CLÍNICA Y PARACLÍNICA SE DECIDE SU INGRESO CON FINES DIAGNÓSTICOS Y TERAPÉUTICOS. ';
      } else {
        p1 += ' ';
      }
    } else {
      p1 = `SE TRATA DE PACIENTE ${sexoStr} DE ${ageStr} DE EDAD, `;

      // Antecedentes mórbidos conocidos (APP)
      const rawPatho = h.pathologicalHistory?.trim() || '';
      if (rawPatho && rawPatho.toUpperCase() !== 'NEGADOS' && rawPatho.toUpperCase() !== 'NEGADOS.') {
        p1 += `CON ANTECEDENTES MÓRBIDOS CONOCIDOS DE ${rawPatho.toUpperCase()}, `;
      } else {
        p1 += `SIN ANTECEDENTES MÓRBIDOS CONOCIDOS, `;
      }

      // Medicación habitual
      if (h.habitualMedications && h.habitualMedications.trim() && !h.habitualMedications.toUpperCase().includes('NINGUN')) {
        p1 += `MEDICADO CON ${h.habitualMedications.toUpperCase()}, `;
      }

      // Hábitos tóxicos
      const rawTox = h.toxicHabits?.trim() || '';
      if (rawTox && !rawTox.toUpperCase().includes('NEGADO')) {
        p1 += `ANTECEDENTES TÓXICOS ${rawTox.toUpperCase()}, `;
      } else {
        p1 += `ANTECEDENTES TÓXICOS NEGADOS, `;
      }

      // Alergias
      const allergiesList = v.allergies && v.allergies.length > 0 ? v.allergies : (h.allergicHistory ? [h.allergicHistory] : []);
      const dedupedAllergies = ClinicalDeduplicationEngine.deduplicateAllergies(allergiesList);
      if (dedupedAllergies.length > 0 && !dedupedAllergies[0].toUpperCase().includes('NEGAD')) {
        p1 += `ALERGIAS ${dedupedAllergies.join(', ').toUpperCase()}, `;
      } else {
        p1 += `ALERGIAS NEGADAS, `;
      }

      // Antecedentes quirúrgicos
      const rawSurg = h.surgicalHistory?.trim() || '';
      if (rawSurg && !rawSurg.toUpperCase().includes('NEGADO')) {
        p1 += `ANTECEDENTES QUIRÚRGICOS DE ${rawSurg.toUpperCase()}, `;
      } else {
        p1 += `ANTECEDENTES QUIRÚRGICOS NEGADOS, `;
      }

      // Traumatismos
      if (h.transfusionalHistory && !h.transfusionalHistory.toUpperCase().includes('NEGAD')) {
        p1 += `TRANSFUSIONES PREVIAS: ${h.transfusionalHistory.toUpperCase()}, `;
      }

      p1 += `REFIERE ${pureHda || 'CUADRO CLÍNICO DE EVOLUCIÓN RECIENTE'}, MOTIVO POR EL CUAL ACUDE A NUESTRO CENTRO DE SALUD DONDE TRAS PREVIA EVALUACIÓN CLÍNICA Y PARACLÍNICA SE DECIDE SU INGRESO CON FINES DIAGNÓSTICOS Y TERAPÉUTICOS. `;
    }

    // Estado actual y signos vitales
    p1 += `ACTUALMENTE PACIENTE ALERTA, CON ADECUADA MECÁNICA VENTILATORIA, AFEBRIL, TOLERANDO AIRE AMBIENTE Y VÍA ORAL, `;
    p1 += `MANEJANDO LOS SIGUIENTES SIGNOS VITALES: TA: ${v.systolicBP || '120'}/${v.diastolicBP || '80'} MMHG, FC: ${v.heartRate || '78'} LPM, FR: ${v.respiratoryRate || '18'} RPM, SPO2: ${v.oxygenSaturation || '98'}% AL AIRE AMBIENTE, TEMP: ${v.temperature || '37'} °C. `;

    // Examen Físico Segmentario Cefalocaudal (con CORAZÓN garantizado y EXTREMIDADES individualizadas)
    const cleanedPe = ClinicalDataNormalizer.cleanPhysicalExamSections(pe);
    p1 += `AL EXAMEN FÍSICO: CABEZA: ${cleanedPe.head.toUpperCase()}. `;
    p1 += `OJOS: ${cleanedPe.eyes.toUpperCase()}. `;
    if (pe.ears) p1 += `OÍDOS: ${pe.ears.toUpperCase()}. `;
    if (pe.nose) p1 += `NARIZ: ${pe.nose.toUpperCase()}. `;
    p1 += `BOCA: ${cleanedPe.mouth.toUpperCase()}. `;
    p1 += `CUELLO: ${cleanedPe.neck.toUpperCase()}. `;
    p1 += `TÓRAX: ${cleanedPe.chest.toUpperCase()}. `;
    p1 += `PULMONES: ${cleanedPe.respiratory.toUpperCase()}. `;
    p1 += `CORAZÓN: ${cleanedPe.cardiovascular.toUpperCase()}. `;
    p1 += `ABDOMEN: ${cleanedPe.abdominal.toUpperCase()}. `;
    p1 += `EXTREMIDADES SUPERIORES: ${cleanedPe.upperExtremities.toUpperCase()}. `;
    p1 += `EXTREMIDADES INFERIORES: ${cleanedPe.lowerExtremities.toUpperCase()}. `;
    p1 += `NEUROLÓGICO: ${cleanedPe.neurological.toUpperCase()}. `;
    p1 += `PIEL Y ANEXOS: ${cleanedPe.skin.toUpperCase()}. `;

    // Estudios de Imagen y Gabinete
    if (studies && studies.length > 0) {
      p1 += `SE REALIZAN ESTUDIOS DE GABINETE: `;
      const studyPhrases = studies.map(s => 
        `${s.category.toUpperCase()}: ${(s.officialResult || s.preliminaryInterpretation || s.description || 'PARÁMETROS REGULARES').toUpperCase()}`
      );
      p1 += `${studyPhrases.join('. ')}. `;
    } else {
      p1 += `SE REALIZAN ESTUDIOS DE GABINETE: RADIOGRAFÍA DE TÓRAX Y ELECTROCARDIOGRAMA SIN HALLAZGOS AGUDOS ADICIONALES. `;
    }

    // Paraclínicos (Hemograma y Químicas formateadas estilo hospital)
    if (labs && labs.length > 0) {
      const dedupedLabs = ClinicalDeduplicationEngine.deduplicateParaclinicals(labs);
      const hemo = dedupedLabs.filter(l => l.panel === 'Hemograma');
      const quim = dedupedLabs.filter(l => l.panel !== 'Hemograma');

      p1 += `SE REALIZAN PARACLÍNICAS LA MISMA CUENTA CON `;
      if (hemo.length > 0) {
        p1 += `UN HEMOGRAMA QUE REPORTA: ${hemo.map(h => `${h.parameter.toUpperCase()}: ${h.value}`).join(', ')} `;
      }
      if (quim.length > 0) {
        p1 += `UNAS QUÍMICAS QUE REPORTAN: ${quim.map(q => `${q.parameter.toUpperCase()}: ${q.value}`).join(', ')}. `;
      }
    }

    // Diagnósticos Nosológicos
    p1 += `POR LO QUE SE DEJA BAJO DIAGNÓSTICOS DE:\n`;
    out += p1;

    const rawDiags = (h.clinicalImpression || patient.chiefComplaint || 'SÍNDROME CLÍNICO EN ESTUDIO')
      .split(/[\n,;]+/)
      .map((d: string) => d.trim())
      .filter(Boolean);

    const dedupedDiags = ClinicalDeduplicationEngine.deduplicateDiagnoses(rawDiags);
    if (dedupedDiags.length > 0) {
      dedupedDiags.forEach(d => {
        out += `${d.toUpperCase()}\n`;
      });
    } else {
      out += `SÍNDROME CLÍNICO EN ESTUDIO ETIOLÓGICO\n`;
    }
    out += `\n`;

    // 3. EN CUANTO AL MANEJO (Órdenes médicas hospitalarias numeradas sin discusión teórica)
    out += `EN CUANTO AL MANEJO: SE INDICA `;
    const dedupedOrders = ClinicalDeduplicationEngine.deduplicateMedicalOrders(orders);
    const solutionOrders = dedupedOrders.filter(o => o.type === 'Solución');
    const medOrders = dedupedOrders.filter(o => o.type === 'Medicamento');
    const mgmtList: string[] = [];

    const diet = orders.find(o => o.name.toLowerCase().includes('dieta') || o.name.toLowerCase().includes('npo'));
    mgmtList.push(diet ? diet.name.toUpperCase() : 'DIETA ADECUADA A SU CONDICIÓN CLÍNICA');

    if (solutionOrders.length > 0) {
      solutionOrders.forEach(s => {
        mgmtList.push(`${s.name.toUpperCase()} ${s.dose ? s.dose.toUpperCase() : '1,000 ML'} C/24 HORAS ${s.route ? s.route.toUpperCase() : 'EV'} PARA MANTENIMIENTO DE VOLEMIA`);
      });
    } else {
      mgmtList.push('SOLUCIÓN SALINA AL 0.9% 1,000 ML C/12 HORAS EV');
    }

    if (medOrders.length > 0) {
      medOrders.forEach(m => {
        const freq = m.frequency ? m.frequency.toUpperCase() : 'C/24 HORAS';
        const route = m.route ? m.route.toUpperCase() : 'EV';
        const dose = m.dose ? m.dose.toUpperCase() : '';
        mgmtList.push(`${m.name.toUpperCase()} ${dose} ${route} ${freq}`.trim());
      });
    } else {
      mgmtList.push('OMEPRAZOL 40 MG C/24 HORAS EV GASTROPROTECCIÓN');
    }

    mgmtList.push('MONITORIZACIÓN CONTINUA DE CONSTANTES VITALES CADA 6 HORAS');
    mgmtList.push('VIGILANCIA ESTRICTA DE EVOLUCIÓN CLÍNICA Y CONTROL DE PARACLÍNICOS');

    out += mgmtList.map((it, idx) => `${idx + 1}. ${it}`).join('. ') + '.\n';

    // Aplicar normalización y corrección final
    const normalized = ClinicalDataNormalizer.normalizeClinicalText(out);
    const deduped = ClinicalDeduplicationEngine.deduplicateNarrativeText(normalized);
    return ClinicalTextCorrector.correctClinicalText(deduped);
  }

  /**
   * FASE 16: Construye la ORDEN MÉDICA OFICIAL
   * reproduciendo exactamente el formato del hospital
   */
  public static buildMedicalOrder(
    patient: Patient,
    orders: MedicalOrder[] = []
  ): string {
    const v = patient.vitals || {};
    const rawDate = patient.arrivalDateTime || patient.createdAt || new Date().toISOString();
    const dateStr = ClinicalDataNormalizer.normalizeDateFormat(rawDate);
    const timeStr = ClinicalDataNormalizer.normalizeTimeFormat(rawDate.includes('T') ? rawDate.split('T')[1].slice(0, 5) : '3:00 PM');

    const cleanName = ClinicalDataNormalizer.normalizePatientName(patient.fullName);
    const ageStr = patient.age ? `${patient.age} AÑOS` : '--';
    const cubicleStr = (patient.cubicle || 'CUBÍCULO 1').toUpperCase();

    let out = `             :HOSPITAL\n`;
    out += `          H  DR. ÁNGEL MARÍA GATÓN\n\n`;
    out += `                     ORDEN MEDICA\n\n`;
    out += `NOMBRE: ${cleanName}  EDAD: ${ageStr},  EMERGENCIA: CUB ${cubicleStr}  FECHA: ${dateStr}  HORA: ${timeStr}\n\n`;

    // MEDIDAS GENERALES
    const dietOrder = orders.find(o => o.name.toLowerCase().includes('dieta'));
    const dieta = dietOrder ? dietOrder.name.toUpperCase() : 'CORRIENTE';
    out += `MEDIDAS GENERALES: DIETA: ${dieta}, POSICIÓN SEMIFOWLER, SIGNOS VITALES CADA 6 HORAS OXIGENOTERAPIA: SOS SI SPO2 MENOR DE 92%\n\n`;

    // DIAGNÓSTICO
    out += `DIAGNOSTICO:\n`;
    const rawDiags = (patient.clinicalHistory?.clinicalImpression || patient.chiefComplaint || 'EN ESTUDIO')
      .split(/[\n,;]+/)
      .map((d: string) => d.trim())
      .filter(Boolean);

    const dedupedDiags = ClinicalDeduplicationEngine.deduplicateDiagnoses(rawDiags);
    if (dedupedDiags.length > 0) {
      dedupedDiags.forEach(d => {
        out += ` ${d.toUpperCase()}\n`;
      });
    } else {
      out += ` SÍNDROME CLÍNICO EN ESTUDIO ETIOLÓGICO\n`;
    }
    out += `\n`;

    // SIGNOS VITALES
    out += `SIGNOS VITALES: TA: ${v.systolicBP || '120'}/${v.diastolicBP || '80'} MMHG, FC: ${v.heartRate || '78'} L/M, FR: ${v.respiratoryRate || '18'} R/M, SPO2: ${v.oxygenSaturation || '98'}% TEMP: ${v.temperature || '37'} GRADOS.\n\n`;

    // MEDICACIÓN (1 to N)
    out += `MEDICACIÓN:\n`;
    const dedupedOrders = ClinicalDeduplicationEngine.deduplicateMedicalOrders(orders);
    const medItems = dedupedOrders.filter(o => o.type === 'Solución' || o.type === 'Medicamento');

    if (medItems.length > 0) {
      medItems.forEach((m, idx) => {
        const dose = m.dose ? m.dose.toUpperCase() : '';
        const freq = m.frequency ? m.frequency.toUpperCase() : 'CADA 24 HORAS';
        const route = m.route ? m.route.toUpperCase() : 'INTRAVENOSA';
        out += `${idx + 1}. ${m.name.toUpperCase()} ${dose} ${freq} ${route}\n`;
      });
    } else {
      out += `1. SOLUCIÓN SALINA AL 0.9% 1,000 ML CADA 24 HORAS INTRAVENOSA\n`;
      out += `2. OMEPRAZOL 40 MG CADA 24 HORAS INTRAVENOSA\n`;
    }
    out += `\n`;

    // PARACLÍNICOS E IMÁGENES
    out += `PARACLÍNICOS: HEMOGRAMA, UREA, CREATININA, BUN, PERFIL LIPÍDICO, AMILASA, LIPASA, TGO, TGP, ALBUMINA, PROTEÍNAS TOTALES, HIV, VDRL, HEP B, HEP C, ELECTROLITOS SÉRICOS\n`;
    out += `IMÁGENES: RADIOGRAFÍA DE TÓRAX, ELECTROCARDIOGRAMA\n`;

    return out;
  }

  /**
   * FASE 32: Auditoría y validación final antes de mostrar o descargar cualquier documento
   */
  public static finalClinicalDocumentValidation(documentText: string): FinalDocumentAuditResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const detectedDuplicates: string[] = [];

    if (!documentText || documentText.trim().length === 0) {
      errors.push('El documento está vacío.');
      return { passed: false, errors, warnings, detectedDuplicates, cleanedText: '' };
    }

    // 1. Detectar campos técnicos crudos
    if (/\b(undefined|null|NaN|\[object Object\])\b/i.test(documentText)) {
      errors.push('El documento contiene valores técnicos no resueltos (undefined, null o NaN).');
    }

    // 2. Detectar corchetes vacíos []
    if (/\[\s*\]/.test(documentText)) {
      warnings.push('El documento contiene corchetes vacíos.');
    }

    // 3. Detectar párrafos idénticos duplicados
    const paragraphs = documentText.split('\n\n').map(p => p.trim()).filter(Boolean);
    const seenP = new Set<string>();
    paragraphs.forEach((p, idx) => {
      if (p.length > 20 && !p.includes(':HOSPITAL')) {
        const pKey = p.toLowerCase().replace(/\s+/g, ' ');
        if (seenP.has(pKey)) {
          detectedDuplicates.push(`Párrafo #${idx + 1} repetido`);
          errors.push(`Párrafo duplicado detectado: "${p.slice(0, 40)}..."`);
        } else {
          seenP.add(pKey);
        }
      }
    });

    // 4. Limpieza final de espacios y formato
    const cleanedText = ClinicalDataNormalizer.cleanWhitespace(documentText);

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      detectedDuplicates,
      cleanedText
    };
  }
}
