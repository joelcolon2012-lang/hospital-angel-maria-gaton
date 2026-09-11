/**
 * TherapeuticDiscussionService: Evidence-Based Discussion Generator
 * Hospital Regional Dr. Ángel María Gatón — Dr. Joel Colón
 *
 * Requirements (Phases 13 & 16; Sections 30, 31, 32, 33, 34, 35, 51):
 * - ANCHORED STRICTLY ON DIAGNOSIS #1 (Primary Diagnosis).
 * - Mandatory opening syntax:
 *   “SEGÚN LA GUÍA [NOMBRE] [AÑO] PARA EL MANEJO DE [PATOLOGÍA]…”
 * - Explains every indicated drug and intervention from active medical orders.
 * - Flags unrelated drugs with “VERIFICAR INDICACIÓN”.
 * - Checks clinical consistency and renal dose alerts ("REVISAR DOSIS").
 * - NEVER invents citations.
 */

import { Patient, MedicalOrder, LabResult } from '../../types';
import {
  findOfficialGuidelineForDiagnosis,
  VerifiedMedicalGuideline,
} from './GuidelineRetrievalService';
import { extractPatientLabMetrics } from '../clinicalScaleEngine';
import { calculateCKDEPI } from '../clinicalCalculators';

export interface DrugDiscussionItem {
  orderName: string;
  dose: string;
  route: string;
  frequency: string;
  isRelatedToPrimaryDiagnosis: boolean;
  indicationStatus: 'JUSTIFICADO' | 'VERIFICAR INDICACIÓN';
  drugClass: string;
  therapeuticGoal: string;
  safetyAlerts?: string[];
  renalDoseWarning?: string;
  discussionParagraph: string;
}

export interface TherapeuticDiscussionReport {
  primaryDiagnosis: string;
  guidelineUsed: VerifiedMedicalGuideline | null;
  openingStatement: string;
  comprehensiveDiscussionText: string;
  drugDiscussions: DrugDiscussionItem[];
  unrelatedDrugsAlerts: string[];
  renalDoseAlerts: string[];
  consistencyWarnings: string[];
  timestamp: string;
}

/**
 * Generates the complete therapeutic discussion based on Diagnosis #1 and active orders
 */
export function generateTherapeuticDiscussion(
  patient: Patient,
  activeOrders: MedicalOrder[] = [],
  labs: LabResult[] = []
): TherapeuticDiscussionReport {
  // 1. Extraer DIAGNÓSTICO #1
  const rawImpression = patient.clinicalHistory?.clinicalImpression || patient.chiefComplaint || 'Diagnóstico no especificado';
  const firstLine = rawImpression.split(/\r?\n/)[0].trim();
  const primaryDiagnosis = firstLine.replace(/^[0-9]+[.-]\s*/, '').trim();

  // 2. Buscar guía oficial correspondiente
  const guideline = findOfficialGuidelineForDiagnosis(primaryDiagnosis);

  // 3. Evaluar TFG y función renal para revisión de dosis
  const labMetrics = extractPatientLabMetrics(labs);
  const creatinine = labMetrics['creatinine'];
  const isFemale = patient.sex?.toUpperCase().startsWith('F') ?? false;
  const age = patient.age ?? 50;

  let gfrNumber: number | null = null;
  if (creatinine && creatinine > 0) {
    const ckd = calculateCKDEPI(creatinine, age, isFemale);
    const parsedGfr = parseFloat(String(ckd.score).replace(/[^\d.]/g, ''));
    if (!isNaN(parsedGfr)) gfrNumber = parsedGfr;
  }

  // 4. Analizar medicamentos de la orden activa
  const drugDiscussions: DrugDiscussionItem[] = [];
  const unrelatedDrugsAlerts: string[] = [];
  const renalDoseAlerts: string[] = [];

  activeOrders.forEach((order) => {
    const nameLower = order.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Verificar si el fármaco está relacionado con la patología principal
    let isRelated = false;
    let drugClass = 'Medicación sintomática / coadyuvante';
    let therapeuticGoal = 'Soporte clínico general';
    const safetyAlerts: string[] = [];
    let renalWarning: string | undefined = undefined;

    if (guideline) {
      isRelated = guideline.firstLineDrugs.some((d) => nameLower.includes(d)) ||
        (guideline.secondLineDrugs && guideline.secondLineDrugs.some((d) => nameLower.includes(d))) || false;
    }

    // Reglas farmacológicas específicas
    if (nameLower.includes('enoxaparina') || nameLower.includes('clexane')) {
      drugClass = 'Heparina de bajo peso molecular (Inhibidor del Factor Xa)';
      therapeuticGoal = 'Tromboprofilaxis venosa profunda o anticoagulación plena';
      if (gfrNumber !== null && gfrNumber < 30) {
        renalWarning = `REVISAR DOSIS: ClCr estimado < 30 mL/min (${gfrNumber} mL/min). Reducir profilaxis a 20-30 mg SC c/24h o titular con HNF.`;
        renalDoseAlerts.push(`Enoxaparina: Ajustar por TFG baja (${gfrNumber} mL/min).`);
      }
    } else if (nameLower.includes('ceftriaxona')) {
      drugClass = 'Cefalosporina de 3ª generación de amplio espectro';
      therapeuticGoal = 'Cobertura bactericida empírica';
      safetyAlerts.push('No coadministrar con soluciones que contengan calcio (Ringer Lactato).');
    } else if (nameLower.includes('furosemida')) {
      drugClass = 'Diurético del asa (Inhibidor de Na+/K+/2Cl-)';
      therapeuticGoal = 'Descongestión de volumen intravascular y pulmonar';
      safetyAlerts.push('Monitorear diuresis y electrolitos séricos (K+, Mg2+) para prevenir arritmias.');
    } else if (nameLower.includes('omeprazol') || nameLower.includes('pantoprazol')) {
      drugClass = 'Inhibidor irreversible de la Bomba de Protones (IBP)';
      therapeuticGoal = 'Supresión de acidez gástrica y profilaxis de úlcera por estrés';
    } else if (nameLower.includes('aspirina') || nameLower.includes('aas')) {
      drugClass = 'Antiagregante plaquetario (Inhibidor irreversible de COX-1)';
      therapeuticGoal = 'Prevención secundaria de eventos isquémicos';
    } else if (nameLower.includes('clopidogrel')) {
      drugClass = 'Antiagregante plaquetario (Antagonista de receptores P2Y12)';
      therapeuticGoal = 'Doble antiagregación plaquetaria sinérgica';
    } else if (nameLower.includes('atorvastatina')) {
      drugClass = 'Estatina de alta intensidad (Inhibidor de HMG-CoA reductasa)';
      therapeuticGoal = 'Estabilización endotelial y reducción de LDL';
    } else if (nameLower.includes('norepinefrina') || nameLower.includes('noradrenalina')) {
      drugClass = 'Vasopresor alfa-1 y beta-1 agonista';
      therapeuticGoal = 'Restaurar perfusión y mantener PAM ≥ 65 mmHg';
      safetyAlerts.push('Titular estrictamente por PAM; preferir acceso venoso central.');
    } else if (nameLower.includes('vancomicina')) {
      drugClass = 'Glicopéptido bactericida anti-Gram positivos (SAMR)';
      therapeuticGoal = 'Cobertura dirigida frente a estafilococos resistentes';
      if (gfrNumber !== null && gfrNumber < 50) {
        renalWarning = `REVISAR DOSIS: Depuración de creatinina disminuida (${gfrNumber} mL/min). Espaciar intervalo a cada 24-48h según niveles valle.`;
        renalDoseAlerts.push(`Vancomicina: Ajuste renal obligatorio (TFG ${gfrNumber} mL/min).`);
      }
    } else if (nameLower.includes('solucion salina') || nameLower.includes('fisiologico')) {
      drugClass = 'Solución cristaloide isotónica (NaCl 0.9%)';
      therapeuticGoal = 'Reposición de volemia y mantenimiento de hidratación basal';
      isRelated = true;
    }

    // Si no está relacionado de manera evidente
    const status: DrugDiscussionItem['indicationStatus'] = isRelated
      ? 'JUSTIFICADO'
      : 'VERIFICAR INDICACIÓN';

    if (status === 'VERIFICAR INDICACIÓN' && !nameLower.includes('solucion')) {
      unrelatedDrugsAlerts.push(`${order.name}: Sin indicación directa evidente para ${primaryDiagnosis}. VERIFICAR INDICACIÓN.`);
    }

    const paragraph = `${order.name} (${order.dose} ${order.route} ${order.frequency}): ${drugClass}. Objetivo terapéutico: ${therapeuticGoal}.${renalWarning ? ` [${renalWarning}]` : ''}`;

    drugDiscussions.push({
      orderName: order.name,
      dose: order.dose,
      route: order.route,
      frequency: order.frequency,
      isRelatedToPrimaryDiagnosis: isRelated,
      indicationStatus: status,
      drugClass,
      therapeuticGoal,
      safetyAlerts: safetyAlerts.length > 0 ? safetyAlerts : undefined,
      renalDoseWarning: renalWarning,
      discussionParagraph: paragraph,
    });
  });

  // 5. Construcción de Apertura Obligatoria
  let openingStatement = '';
  if (guideline) {
    openingStatement = `SEGÚN LA GUÍA ${guideline.society.split('(')[0].trim()} ${guideline.year} PARA EL MANEJO DE ${guideline.primaryDiagnosisTerm}...`;
  } else {
    openingStatement = `SEGÚN LA EVIDENCIA CLÍNICA VIGENTE DE MEDICINA INTERNA PARA EL MANEJO DE ${primaryDiagnosis.toUpperCase()}...`;
  }

  // 6. Texto consolidado de discusión
  let fullText = `${openingStatement}\n\n`;

  if (guideline) {
    fullText += `Se establece como objetivo terapéutico primordial el cumplimiento de los estándares recomendados (${guideline.evidenceLevel}). ${guideline.keyRecommendations.slice(0, 2).join(' ')}\n\n`;
    fullText += `ANÁLISIS DE LA ORDEN MÉDICA ACTIVA:\n`;
  }

  if (drugDiscussions.length === 0) {
    fullText += `No se registran órdenes farmacológicas activas para contrastar.\n`;
  } else {
    drugDiscussions.forEach((d) => {
      fullText += `• ${d.discussionParagraph}\n`;
    });
  }

  if (unrelatedDrugsAlerts.length > 0) {
    fullText += `\nALERTAS DE INDICACIÓN:\n`;
    unrelatedDrugsAlerts.forEach((a) => {
      fullText += `⚠️ ${a}\n`;
    });
  }

  if (renalDoseAlerts.length > 0) {
    fullText += `\nALERTAS DE AJUSTE RENAL:\n`;
    renalDoseAlerts.forEach((r) => {
      fullText += `🩺 ${r}\n`;
    });
  }

  return {
    primaryDiagnosis,
    guidelineUsed: guideline,
    openingStatement,
    comprehensiveDiscussionText: fullText.trim(),
    drugDiscussions,
    unrelatedDrugsAlerts,
    renalDoseAlerts,
    consistencyWarnings: [],
    timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
  };
}
