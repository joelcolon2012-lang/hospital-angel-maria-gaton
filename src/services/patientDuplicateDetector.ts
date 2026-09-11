import { Patient } from '../types';

export interface DuplicateMatchResult {
  isDuplicate: boolean;
  matchedPatient: Patient | null;
  matchReasons: string[];
}

/**
 * Normaliza cadenas quitando acentos y espacios extras
 */
const normalizeStr = (str?: string): string => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

/**
 * Limpia números y caracteres especiales (deja solo dígitos)
 */
const cleanDigits = (str?: string): string => {
  if (!str) return '';
  return str.replace(/\D/g, '');
};

export const checkPatientDuplicates = (
  candidate: {
    id?: string;
    fullName: string;
    birthDate?: string;
    age?: number | string;
    idDocument?: string;
    medicalRecordNumber?: string;
    phone?: string;
  },
  existingPatients: Patient[]
): DuplicateMatchResult => {
  const normName = normalizeStr(candidate.fullName);
  const cleanDoc = cleanDigits(candidate.idDocument);
  const cleanRec = normalizeStr(candidate.medicalRecordNumber);
  const cleanPhone = cleanDigits(candidate.phone);
  const birthDate = candidate.birthDate?.trim();

  for (const p of existingPatients) {
    // Si estamos editando, ignorar al mismo paciente
    if (candidate.id && p.id === candidate.id) continue;

    const reasons: string[] = [];

    // 1. Cédula o Documento de Identidad
    const pDoc = cleanDigits(p.idDocument);
    if (cleanDoc.length >= 7 && pDoc.length >= 7 && cleanDoc === pDoc) {
      reasons.push(`Misma Cédula / Documento: ${p.idDocument}`);
    }

    // 2. Número de Expediente Clínico
    const pRec = normalizeStr(p.medicalRecordNumber);
    if (cleanRec.length >= 3 && pRec.length >= 3 && cleanRec === pRec) {
      reasons.push(`Mismo Número de Expediente: ${p.medicalRecordNumber}`);
    }

    // 3. Teléfono de contacto
    const pPhone = cleanDigits(p.phone);
    if (cleanPhone.length >= 7 && pPhone.length >= 7 && cleanPhone === pPhone) {
      reasons.push(`Mismo Teléfono: ${p.phone}`);
    }

    // 4. Nombre Completo
    const pName = normalizeStr(p.fullName);
    if (normName.length > 5 && pName.length > 5 && normName === pName) {
      if (birthDate && p.birthDate && birthDate === p.birthDate) {
        reasons.push(`Mismo Nombre y Fecha de Nacimiento (${birthDate})`);
      } else {
        reasons.push(`Mismo Nombre Completo: "${p.fullName}"`);
      }
    }

    if (reasons.length > 0) {
      return {
        isDuplicate: true,
        matchedPatient: p,
        matchReasons: reasons,
      };
    }
  }

  return {
    isDuplicate: false,
    matchedPatient: null,
    matchReasons: [],
  };
};
