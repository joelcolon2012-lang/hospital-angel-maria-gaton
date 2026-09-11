/**
 * ClinicalAIService: Master Architectural AI Facade
 * Hospital Regional Dr. Ángel María Gatón — Dr. Joel Colón
 *
 * Requirement (Phase 14 & 16; Section 41):
 * Independent abstraction layer unifying all AI modules:
 * - ClinicalSearchService (Medical knowledge search)
 * - VisionLabParser (Multimodal lab image parsing)
 * - ClinicalLabInterpreter (Syndromic lab interpretation)
 * - ClinicalSpellChecker (Medical orthography and duplicate phrase detection)
 * - DifferentialDiagnosisService (Reasoned clinical differentials)
 * - TherapeuticDiscussionService (Guideline-anchored discussion)
 * - GuidelineRetrievalService (Evidence catalog)
 */

import {
  parseHemogramFromText,
  parseChemistryFromText,
  HemogramExtractionResult,
  ChemistryExtractionResult,
} from './VisionLabParser';
import {
  interpretHemogram,
  interpretChemistry,
  LabInterpretationResult,
  InterpretationPatientContext,
} from './ClinicalLabInterpreter';
import {
  checkMedicalSpelling,
  removeDuplicatePhrase,
  SpellCheckResult,
} from './ClinicalSpellChecker';
import {
  generateReasonedDifferentials,
  DifferentialAnalysisReport,
} from './DifferentialDiagnosisService';
import {
  generateTherapeuticDiscussion,
  TherapeuticDiscussionReport,
} from './TherapeuticDiscussionService';
import {
  findOfficialGuidelineForDiagnosis,
  VerifiedMedicalGuideline,
} from './GuidelineRetrievalService';
import {
  searchClinicalKnowledge,
  ClinicalSearchResponse,
} from './ClinicalSearchService';

import { Patient, LabResult, MedicalStudy, MedicalOrder } from '../../types';

export class ClinicalAIService {
  // 1. Search Bar Knowledge Retrieval
  static searchKnowledge(query: string): ClinicalSearchResponse {
    return searchClinicalKnowledge(query);
  }

  // 2. Multimodal Lab Parser
  static parseHemogram(rawTextOrOcr: string): HemogramExtractionResult {
    return parseHemogramFromText(rawTextOrOcr);
  }

  static parseChemistry(rawTextOrOcr: string): ChemistryExtractionResult {
    return parseChemistryFromText(rawTextOrOcr);
  }

  // 3. Automated Syndromic Lab Interpretation
  static interpretHemogramData(
    parameters: any[],
    context?: InterpretationPatientContext
  ): LabInterpretationResult {
    return interpretHemogram(parameters, context);
  }

  static interpretChemistryData(
    parameters: any[],
    context?: InterpretationPatientContext
  ): LabInterpretationResult {
    return interpretChemistry(parameters, context);
  }

  // 4. Clinical Spell Checker & Duplicate Phrase Detector
  static checkSpellingAndDuplicates(text: string): SpellCheckResult {
    return checkMedicalSpelling(text);
  }

  static removeDuplicate(text: string, phrase: string): string {
    return removeDuplicatePhrase(text, phrase);
  }

  // 5. Differential Diagnosis Generator
  static getDifferentialDiagnoses(
    patient: Patient,
    labs: LabResult[] = [],
    studies: MedicalStudy[] = []
  ): DifferentialAnalysisReport {
    return generateReasonedDifferentials(patient, labs, studies);
  }

  // 6. Therapeutic Discussion Anchored on Diagnosis #1
  static getTherapeuticDiscussion(
    patient: Patient,
    orders: MedicalOrder[] = [],
    labs: LabResult[] = []
  ): TherapeuticDiscussionReport {
    return generateTherapeuticDiscussion(patient, orders, labs);
  }

  // 7. Official Guideline Retrieval
  static getGuidelineForDiagnosis(diagnosis: string): VerifiedMedicalGuideline | null {
    return findOfficialGuidelineForDiagnosis(diagnosis);
  }
}

export default ClinicalAIService;
