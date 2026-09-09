import Dexie, { type Table } from 'dexie';
import { 
  Patient, 
  MedicalStudy, 
  LabResult, 
  ClinicalProblem, 
  MedicalOrder, 
  PatientEvolution 
} from '../types';

export interface AppSetting {
  id: string;
  value: any;
}

export class EmergencyDatabase extends Dexie {
  patients!: Table<Patient, string>;
  studies!: Table<MedicalStudy, string>;
  labs!: Table<LabResult, string>;
  problems!: Table<ClinicalProblem, string>;
  orders!: Table<MedicalOrder, string>;
  evolutions!: Table<PatientEvolution, string>;
  settings!: Table<AppSetting, string>;

  constructor() {
    super('EmergenciaDrColonDB');
    this.version(1).stores({
      patients: 'id, internalCode, fullName, idDocument, medicalRecordNumber, cubicle, status, triageLevel, arrivalDateTime, isDeleted',
      studies: 'id, patientId, category, status, createdAt',
      labs: 'id, patientId, panel, flag, timestamp',
      problems: 'id, patientId, status, createdAt',
      orders: 'id, patientId, type, status, createdAt',
      evolutions: 'id, patientId, timestamp',
      settings: 'id'
    });
  }
}

export const db = new EmergencyDatabase();
