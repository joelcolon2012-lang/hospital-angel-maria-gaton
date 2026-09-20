import Dexie, { type Table } from 'dexie';
import { 
  Patient, 
  MedicalStudy, 
  LabResult, 
  ClinicalProblem, 
  MedicalOrder, 
  PatientEvolution,
  AuditLogEntry,
  User,
  SourceDocument,
  ClinicalNoteRecord,
  StrokeRecord,
  AISearchHistoryItem,
  PendingTask
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
  pendingTasks!: Table<PendingTask, string>;
  settings!: Table<AppSetting, string>;
  auditLogs!: Table<AuditLogEntry, string>;
  users!: Table<User, string>;
  sourceDocuments!: Table<SourceDocument, string>;
  clinicalNotes!: Table<ClinicalNoteRecord, string>;
  clinicalHistoriesPlanta!: Table<any, string>;
  clinicalHistoryVersions!: Table<any, string>;
  strokeRegistry!: Table<StrokeRecord, string>;
  aiSearchHistory!: Table<AISearchHistoryItem, string>;

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

    this.version(2).stores({
      patients: 'id, internalCode, fullName, idDocument, medicalRecordNumber, cubicle, status, triageLevel, arrivalDateTime, isDeleted, isArchived',
      studies: 'id, patientId, category, status, createdAt',
      labs: 'id, patientId, panel, flag, timestamp',
      problems: 'id, patientId, status, createdAt',
      orders: 'id, patientId, type, status, createdAt',
      evolutions: 'id, patientId, timestamp',
      settings: 'id',
      auditLogs: 'id, timestamp, userId, patientId, action',
      users: 'id, email, role',
      sourceDocuments: 'id, patientId, uploadedAt',
      clinicalNotes: 'id, patientId, noteType, status, createdAt'
    });

    this.version(3).stores({
      patients: 'id, internalCode, fullName, idDocument, medicalRecordNumber, cubicle, status, triageLevel, arrivalDateTime, isDeleted, isArchived',
      studies: 'id, patientId, category, status, createdAt',
      labs: 'id, patientId, panel, flag, timestamp',
      problems: 'id, patientId, status, createdAt',
      orders: 'id, patientId, type, status, createdAt',
      evolutions: 'id, patientId, timestamp',
      settings: 'id',
      auditLogs: 'id, timestamp, userId, patientId, action',
      users: 'id, email, role',
      sourceDocuments: 'id, patientId, uploadedAt',
      clinicalNotes: 'id, patientId, noteType, status, createdAt',
      clinicalHistoriesPlanta: 'id, patientId, admissionId, status, version, createdAt, updatedAt',
      clinicalHistoryVersions: 'id, clinicalHistoryId, patientId, admissionId, version, createdAt'
    });

    this.version(4).stores({
      patients: 'id, internalCode, fullName, idDocument, medicalRecordNumber, cubicle, status, triageLevel, arrivalDateTime, isDeleted, isArchived',
      studies: 'id, patientId, category, status, createdAt',
      labs: 'id, patientId, panel, flag, timestamp',
      problems: 'id, patientId, status, createdAt',
      orders: 'id, patientId, type, status, createdAt',
      evolutions: 'id, patientId, timestamp',
      settings: 'id',
      auditLogs: 'id, timestamp, userId, patientId, action, recordId',
      users: 'id, email, role, isActive, isDeleted',
      sourceDocuments: 'id, patientId, uploadedAt',
      clinicalNotes: 'id, patientId, noteType, status, createdAt',
      clinicalHistoriesPlanta: 'id, patientId, admissionId, status, version, createdAt, updatedAt',
      clinicalHistoryVersions: 'id, clinicalHistoryId, patientId, admissionId, version, createdAt',
      strokeRegistry: 'id, patientId, strokeType, eventDate, inHospitalMortality, createdAt, updatedAt'
    });

    this.version(5).stores({
      patients: 'id, internalCode, fullName, idDocument, medicalRecordNumber, cubicle, status, triageLevel, arrivalDateTime, isDeleted, isArchived',
      studies: 'id, patientId, category, status, createdAt',
      labs: 'id, patientId, panel, flag, timestamp',
      problems: 'id, patientId, status, createdAt',
      orders: 'id, patientId, type, status, createdAt',
      evolutions: 'id, patientId, timestamp',
      settings: 'id',
      auditLogs: 'id, timestamp, userId, patientId, action, recordId',
      users: 'id, email, role, isActive, isDeleted',
      sourceDocuments: 'id, patientId, uploadedAt',
      clinicalNotes: 'id, patientId, noteType, status, createdAt',
      clinicalHistoriesPlanta: 'id, patientId, admissionId, status, version, createdAt, updatedAt',
      clinicalHistoryVersions: 'id, clinicalHistoryId, patientId, admissionId, version, createdAt',
      strokeRegistry: 'id, patientId, strokeType, eventDate, inHospitalMortality, createdAt, updatedAt',
      aiSearchHistory: 'id, userId, timestamp, mode'
    });

    this.version(6).stores({
      patients: 'id, internalCode, fullName, idDocument, medicalRecordNumber, cubicle, status, triageLevel, arrivalDateTime, isDeleted, isArchived',
      studies: 'id, patientId, category, status, createdAt',
      labs: 'id, patientId, panel, flag, timestamp',
      problems: 'id, patientId, status, createdAt',
      orders: 'id, patientId, type, status, createdAt',
      evolutions: 'id, patientId, timestamp',
      pendingTasks: 'id, patientId, bedCode, priority, status, category, date, time, createdAt',
      settings: 'id',
      auditLogs: 'id, timestamp, userId, patientId, action, recordId',
      users: 'id, email, role, isActive, isDeleted',
      sourceDocuments: 'id, patientId, uploadedAt',
      clinicalNotes: 'id, patientId, noteType, status, createdAt',
      clinicalHistoriesPlanta: 'id, patientId, admissionId, status, version, createdAt, updatedAt',
      clinicalHistoryVersions: 'id, clinicalHistoryId, patientId, admissionId, version, createdAt',
      strokeRegistry: 'id, patientId, strokeType, eventDate, inHospitalMortality, createdAt, updatedAt',
      aiSearchHistory: 'id, userId, timestamp, mode'
    });
  }
}

export const db = new EmergencyDatabase();

