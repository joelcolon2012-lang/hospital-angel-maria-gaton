import React from 'react';
import type { LabResult } from '../../types';
import { LabPhotoImportModal } from './LabPhotoImportModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientAge?: number;
  patientSex?: string;
  onSaveLabs: (labs: Partial<LabResult>[]) => void;
  onAddInterpretationToEvolution?: (interpretation: string) => void;
}

/** Lectura desde foto/archivo sin inventar valores (ver LabPhotoImportModal). */
export const HemogramPhotoModal: React.FC<Props> = (props) => <LabPhotoImportModal {...props} focus="hemograma" />;

export default HemogramPhotoModal;
