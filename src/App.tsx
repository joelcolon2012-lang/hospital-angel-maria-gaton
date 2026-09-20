import React, { useState, useEffect } from 'react';
import { db } from './db/dexieDb';
import { seedDatabaseIfEmpty } from './db/seedData';
import {
  Patient,
  PatientStatus,
  MedicalStudy,
  LabResult,
  MedicalOrder,
  PatientEvolution,
  Vitals,
  ClinicalHistory,
  FinalDisposition,
  AuditLogEntry,
} from './types';

// Layout
import { Navbar } from './components/layout/Navbar';
import { BottomNav } from './components/layout/BottomNav';
import { PrivacyShield } from './components/layout/PrivacyShield';
import { authService, recordAuditLog } from './services/authService';
import { LoginModal } from './components/auth/LoginModal';
import { UserProfileModal } from './components/auth/UserProfileModal';
import { centralSyncService } from './services/centralSyncService';
import { PreviousHistoryImportModal } from './components/documents/PreviousHistoryImportModal';
import { User } from './types';

// Dashboard
import { DashboardStats } from './components/dashboard/DashboardStats';
import { TriageFilter } from './components/dashboard/TriageFilter';
import { PatientCard } from './components/dashboard/PatientCard';
import { PatientSearchView } from './components/dashboard/PatientSearchView';
import { EmergencyStatsView } from './components/dashboard/EmergencyStatsView';
import { AttentionRequiredSection } from './components/dashboard/AttentionRequiredSection';
import { Sidebar, SidebarNavId } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { EpidemiologyView } from './components/epidemiology/EpidemiologyView';
import { PatientAIAnalysisModal } from './components/ai/PatientAIAnalysisModal';

// Registration
import { QuickRegisterModal } from './components/registration/QuickRegisterModal';

// Patient Dossier
import { PatientHeader } from './components/patient-detail/PatientHeader';
import { TriageVitalsTab } from './components/patient-detail/TriageVitalsTab';
import { ClinicalHistoryTab } from './components/patient-detail/ClinicalHistoryTab';
import { StudiesGalleryTab } from './components/patient-detail/StudiesGalleryTab';
import { LabsTab } from './components/patient-detail/LabsTab';
import { DiagnosticAssistantTab } from './components/patient-detail/DiagnosticAssistantTab';
import { MedicalOrdersTab } from './components/patient-detail/MedicalOrdersTab';
import { EvolutionsTab } from './components/patient-detail/EvolutionsTab';
import { FinalDispositionTab } from './components/patient-detail/FinalDispositionTab';

// Modals
import { DocumentExporterModal } from './components/documents/DocumentExporterModal';
import { GoogleDriveModal } from './components/documents/GoogleDriveModal';
import { ImageCompareModal } from './components/image-tools/ImageCompareModal';
import { QuickCalculatorBar } from './components/common/QuickCalculatorBar';
import { UnifiedClinicalDocumentModal, UnifiedDocType } from './components/documents/UnifiedClinicalDocumentModal';
import { HospitalNotesModal, HospitalDocType } from './components/documents/HospitalNotesModal';
import { MedicalOrderPrintModal } from './components/documents/MedicalOrderPrintModal';
import { CloudSyncModal } from './components/documents/CloudSyncModal';
import { ShareAppModal } from './components/documents/ShareAppModal';
import { HospitalSettingsModal } from './components/settings/HospitalSettingsModal';
import { SendToGuardiaModal } from './components/guardia/SendToGuardiaModal';
import { ClinicalHistoryPlantaModal } from './components/history-planta/ClinicalHistoryPlantaModal';
import { MobileDrawerMenu } from './components/layout/MobileDrawerMenu';
import { StrokeAnalyticsDashboard } from './components/stroke/StrokeAnalyticsDashboard';
import { StrokeRegistryModal } from './components/stroke/StrokeRegistryModal';
import { StrokeAutoPromptModal } from './components/stroke/StrokeAutoPromptModal';
import { strokeRegistryService } from './services/strokeRegistryService';
import { guardiaAppService } from './services/guardiaAppService';
import { cloudSyncService } from './services/cloudSyncService';

import {
  Activity,
  FileText,
  Image as ImageIcon,
  TestTube2,
  Sparkles,
  Pill,
  Clock,
  LogOut,
  UserPlus,
  ChevronDown,
} from 'lucide-react';

export default function App() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [studies, setStudies] = useState<MedicalStudy[]>([]);
  const [labs, setLabs] = useState<LabResult[]>([]);
  const [orders, setOrders] = useState<MedicalOrder[]>([]);
  const [evolutions, setEvolutions] = useState<PatientEvolution[]>([]);

  // Navigation & Dossier
  const [activeNavTab, setActiveNavTab] = useState<'dashboard' | 'search' | 'stats' | 'drive' | 'epidemiologia' | 'strokeRegistry'>('dashboard');
  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isStrokeModalOpen, setIsStrokeModalOpen] = useState(false);
  const [patientForStroke, setPatientForStroke] = useState<Patient | null>(null);
  const [dismissedStrokePatientIds, setDismissedStrokePatientIds] = useState<Set<string>>(new Set());
  const [showStrokePrompt, setShowStrokePrompt] = useState(false);
  const [detectedStrokeTerm, setDetectedStrokeTerm] = useState('Diagnóstico Vascular / EVC');
  const [settingsInitialTab, setSettingsInitialTab] = useState<'barra_superior' | 'usuarios'>('barra_superior');
  const [activeDossierTab, setActiveDossierTab] = useState<
    'vitals' | 'history' | 'studies' | 'labs' | 'diagnostics' | 'orders' | 'evolutions' | 'disposition'
  >('vitals');

  // AI Multimodal Suite
  const [isAiAnalysisModalOpen, setIsAiAnalysisModalOpen] = useState(false);
  const [aiSuiteInitialTab, setAiSuiteInitialTab] = useState<'notas' | 'rx' | 'tac' | 'gases' | 'ecg'>('notas');

  // Filters & Sorting
  const [selectedStatus, setSelectedStatus] = useState<PatientStatus | 'todos'>('todos');
  const [sortBy, setSortBy] = useState<'severity' | 'arrival' | 'name' | 'cubicle'>('severity');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Privacy
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(authService.isAuthenticated());
  const [currentUser, setCurrentUser] = useState<User>(authService.getCurrentUser());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isPreviousHistoryModalOpen, setIsPreviousHistoryModalOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'saving' | 'saved' | 'offline'>('saved');
  const [viewArchived, setViewArchived] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isDocumentExportModalOpen, setIsDocumentExportModalOpen] = useState(false);
  const [isGoogleDriveModalOpen, setIsGoogleDriveModalOpen] = useState(false);
  const [isPrivacyActive, setIsPrivacyActive] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false);
  const [isHospitalNotesOpen, setIsHospitalNotesOpen] = useState(false);
  const [hospitalDocType, setHospitalDocType] = useState<UnifiedDocType>('emergencia');
  const [isMedicalOrderPrintOpen, setIsMedicalOrderPrintOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isHospitalSettingsOpen, setIsHospitalSettingsOpen] = useState(false);
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);
  const [isSendToGuardiaOpen, setIsSendToGuardiaOpen] = useState(false);
  const [patientForGuardia, setPatientForGuardia] = useState<Patient | null>(null);
  const [isHistoryPlantaOpen, setIsHistoryPlantaOpen] = useState(false);
  const [patientForHistoryPlanta, setPatientForHistoryPlanta] = useState<Patient | null>(null);
  const [sidebarNav, setSidebarNav] = useState<SidebarNavId>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Side-by-side compare
  const [compareStudy1, setCompareStudy1] = useState<MedicalStudy | null>(null);
  const [compareStudy2, setCompareStudy2] = useState<MedicalStudy | null>(null);

  // Load database
  const refreshData = async () => {
    try {
      await seedDatabaseIfEmpty(db);
      let pList = await db.patients.toArray();

      // Auto-reparación si por alguna razón la lista local no tiene pacientes o falta Joel Colón
      if (pList.length === 0 || !pList.some((p) => p.id === 'pat-1788843084862')) {
        try {
          const baseUrl = (import.meta as any).env?.BASE_URL || './';
          const res = await fetch(`${baseUrl}hospital_master_db.json?t=${Date.now()}`);
          if (res.ok) {
            let text = await res.text();
            if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
            const json = JSON.parse(text);
            const masterData = json.data || json;
            if (masterData && Array.isArray(masterData.patients)) {
              await db.patients.bulkPut(masterData.patients);
              if (masterData.studies) await db.studies.bulkPut(masterData.studies);
              if (masterData.labs) await db.labs.bulkPut(masterData.labs);
              if (masterData.orders) await db.orders.bulkPut(masterData.orders);
              if (masterData.evolutions) await db.evolutions.bulkPut(masterData.evolutions);
              pList = await db.patients.toArray();
            }
          }
        } catch (e) {
          console.warn('[refreshData] Fallback fetch master DB:', e);
        }
      }

      const sList = await db.studies.toArray();
      const lList = await db.labs.toArray();
      const oList = await db.orders.toArray();
      const eList = await db.evolutions.toArray();

      setPatients(pList);
      setStudies(sList);
      setLabs(lList);
      setOrders(oList);
      setEvolutions(eList);

      // Keep active patient updated if open (sin interrumpir la escritura activa del usuario)
      if (activePatient) {
        const isUserActivelyTyping =
          typeof document !== 'undefined' &&
          (document.activeElement?.tagName === 'INPUT' ||
           document.activeElement?.tagName === 'TEXTAREA' ||
           (document.activeElement as HTMLElement)?.isContentEditable);

        if (!isUserActivelyTyping) {
          const updatedActive = pList.find((p) => p.id === activePatient.id);
          if (updatedActive) setActivePatient(updatedActive);
        }
      }

      if (pList.length > 0) {
        try {
          localStorage.setItem('hr_colon_patients_backup', JSON.stringify(pList));
        } catch {}
      }
    } catch (err) {
      console.error('[RefreshData Error]', err);
    }
  };

  const saveLocalBackup = async () => {
    try {
      const allP = await db.patients.toArray();
      localStorage.setItem('hr_colon_patients_backup', JSON.stringify(allP));
    } catch {}
  };

  useEffect(() => {
    const initializeDataAndSync = async () => {
      // 1. Cargar datos locales inmediatamente (para visualización instantánea)
      await refreshData();

      // 2. Inicializar sincronización con backend central en Render (SSE y persistencia indestructible)
      centralSyncService.init();

      // 3. Traer novedades de la nube y otros dispositivos
      const hadUpdates = await cloudSyncService.pullLatestData();
      if (hadUpdates) {
        await refreshData();
      }

      // 4. Sincronizar hacia la nube SOLO si hay pacientes reales creados localmente y no acabamos de recibir actualización remota
      const localData = await cloudSyncService.getLocalMasterData();
      const hasRealPatients = localData.patients.some((p) => !p.id.startsWith('pat-00'));
      if (hasRealPatients && !hadUpdates) {
        await cloudSyncService.triggerPushSync();
      }
    };

    initializeDataAndSync();

    // 5. Suscribirse a cambios en tiempo real del backend central y de otros dispositivos vía SSE
    const handleCentralDataChange = () => {
      refreshData();
    };
    window.addEventListener('hospital_central_data_changed', handleCentralDataChange);

    const unsubscribe = cloudSyncService.subscribe(() => {
      refreshData();
    });

    return () => {
      window.removeEventListener('hospital_central_data_changed', handleCentralDataChange);
      unsubscribe();
    };
  }, []);

  // Escuchar cambios de estado de autenticación y de usuario activo
  useEffect(() => {
    const handleAuthChange = () => {
      setIsAuthenticated(authService.isAuthenticated());
      setCurrentUser(authService.getCurrentUser());
    };
    window.addEventListener('hospital_auth_state_changed', handleAuthChange);
    window.addEventListener('hospital_user_changed', handleAuthChange);
    return () => {
      window.removeEventListener('hospital_auth_state_changed', handleAuthChange);
      window.removeEventListener('hospital_user_changed', handleAuthChange);
    };
  }, []);

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
  };

  // Filter & Sort Logic
  const filteredPatients = patients
    .filter((p) => {
      if (viewArchived) {
        return p.isDeleted || p.isArchived;
      }
      if (p.isDeleted || p.isArchived) return false;
      const matchesStatus = selectedStatus === 'todos' || p.status === selectedStatus;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        p.fullName.toLowerCase().includes(q) ||
        p.internalCode.toLowerCase().includes(q) ||
        (p.medicalRecordNumber && p.medicalRecordNumber.toLowerCase().includes(q)) ||
        p.cubicle.toLowerCase().includes(q) ||
        p.chiefComplaint.toLowerCase().includes(q);

      return matchesStatus && matchesQuery;
    })
    .sort((a, b) => {
      if (sortBy === 'severity') {
        return a.triageLevel - b.triageLevel; // Level 1 first
      } else if (sortBy === 'arrival') {
        return b.arrivalDateTime.localeCompare(a.arrivalDateTime); // Most recent first
      } else if (sortBy === 'name') {
        return a.fullName.localeCompare(b.fullName);
      } else if (sortBy === 'cubicle') {
        return a.cubicle.localeCompare(b.cubicle);
      }
      return 0;
    });

  // Patient Actions
  const handleSaveNewPatient = async (newPatientData: Partial<Patient>) => {
    const id = `pat-${Date.now()}`;
    const newP: Patient = {
      id,
      internalCode: newPatientData.internalCode || `EMG-${Date.now()}`,
      fullName: newPatientData.fullName || 'Sin nombre',
      sex: newPatientData.sex || 'M',
      arrivalDateTime: newPatientData.arrivalDateTime || new Date().toISOString(),
      provenance: newPatientData.provenance || 'Domicilio',
      cubicle: newPatientData.cubicle || 'Triaje',
      triageLevel: newPatientData.triageLevel || 3,
      chiefComplaint: newPatientData.chiefComplaint || '',
      status: 'activos',
      attendingDoctor: newPatientData.attendingDoctor || currentUser.name || 'Dr. Joel Colón',
      createdBy: currentUser.name || 'Dr. Joel Colón',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      age: newPatientData.age,
      medicalRecordNumber: newPatientData.medicalRecordNumber,
      idDocument: newPatientData.idDocument,
      phone: newPatientData.phone,
      emergencyContact: newPatientData.emergencyContact,
      vitals: newPatientData.vitals,
      clinicalHistory: {
        reasonForConsultation: newPatientData.chiefComplaint || '',
        currentIllnessHistory: '',
        pathologicalHistory: '',
        surgicalHistory: '',
        allergicHistory: '',
        habitualMedications: '',
        toxicHabits: '',
        familyHistory: '',
        obGynHistory: '',
        systemsReview: '',
        physicalExam: {
          general: '',
          cardiovascular: '',
          respiratory: '',
          abdominal: '',
          neurological: '',
          extremities: '',
          skin: '',
          otherFindings: '',
        },
        clinicalImpression: '',
        diagnosticAndTherapeuticPlan: '',
      },
    };

    // 1. Optimistic UI update immediately
    setPatients((prev) => [newP, ...prev.filter((p) => p.id !== newP.id)]);
    setActivePatient(newP);
    setIsRegisterModalOpen(false);

    try {
      // 2. Guardar en Dexie DB con put para prevenir errores de constraint
      await db.patients.put(newP);
      
      // 3. Guardar respaldo local
      await saveLocalBackup();

      // 4. Refrescar datos
      await refreshData();
    } catch (err) {
      console.error('Error saving patient locally:', err);
    }

    // 5. Empujar al backend central y a la nube asíncronamente sin bloquear la UI
    centralSyncService.createPatient(newP).catch(console.warn);
    cloudSyncService.triggerPushSync().catch((err) => {
      console.warn('Background sync warning:', err);
    });
  };

  const handleEditPatient = async (
    updatedPatientData: Partial<Patient>,
    changes: { field: string; oldVal: any; newVal: any }[]
  ) => {
    if (!activePatient) return;
    const nowIso = new Date().toISOString();

    const updated: Patient = {
      ...activePatient,
      ...updatedPatientData,
      id: activePatient.id, // ASEGURAR QUE PRESERVA EXACTAMENTE EL MISMO ID
      internalCode: activePatient.internalCode,
      updatedAt: nowIso,
      updatedBy: currentUser.name || 'Dr. Joel Colón',
    };

    // 1. Guardar en Dexie DB
    await db.patients.put(updated);

    // 2. Registrar en Auditoría si hubo cambios
    if (changes && changes.length > 0) {
      try {
        const auditEntry: AuditLogEntry = {
          id: `audit-${Date.now()}`,
          timestamp: nowIso,
          userId: currentUser.id || 'usr-admin-colon',
          userName: currentUser.name || 'Dr. Joel Colón',
          userRole: currentUser.role || 'ADMINISTRADOR',
          action: 'MODIFICAR',
          patientId: activePatient.id,
          fieldPath: 'datos_demograficos',
          oldValue: changes.map((c) => ({ [c.field]: c.oldVal })),
          newValue: changes.map((c) => ({ [c.field]: c.newVal })),
          details: `Modificación de datos del paciente: ${changes.map((c) => c.field).join(', ')}`,
        };
        await db.auditLogs.add(auditEntry);
      } catch (err) {
        console.warn('Error registrando auditoría:', err);
      }
    }

    // 3. Actualizar estado en memoria
    setActivePatient(updated);
    setPatients((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    await saveLocalBackup();

    // 4. Empujar inmediatamente al backend central y a la nube
    centralSyncService.updatePatient(updated).catch(console.warn);
    await cloudSyncService.triggerPushSync();
  };

  const handleUpdateVitals = async (updatedVitals: Vitals) => {
    if (!activePatient) return;
    const updated = { ...activePatient, vitals: updatedVitals, updatedAt: new Date().toISOString() };
    await db.patients.put(updated);
    setActivePatient(updated);
    setPatients((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    await saveLocalBackup();
    centralSyncService.updatePatient(updated).catch(console.warn);
    cloudSyncService.scheduleAutoSync();
  };

  const handleUpdateHistory = async (updatedHistory: ClinicalHistory) => {
    if (!activePatient) return;
    const updated = {
      ...activePatient,
      clinicalHistory: updatedHistory,
      updatedAt: new Date().toISOString(),
    };
    await db.patients.put(updated);
    setActivePatient(updated);
    setPatients((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    await saveLocalBackup();
    centralSyncService.updatePatient(updated).catch(console.warn);
    cloudSyncService.scheduleAutoSync();
  };

  const handleStatusChange = async (newStatus: PatientStatus) => {
    if (!activePatient) return;
    const updated = { ...activePatient, status: newStatus, updatedAt: new Date().toISOString() };
    await db.patients.put(updated);
    setActivePatient(updated);
    setPatients((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    await saveLocalBackup();
    centralSyncService.updatePatient(updated).catch(console.warn);
    cloudSyncService.scheduleAutoSync();
  };

  const handleSaveDisposition = async (disp: FinalDisposition, newStatus: PatientStatus) => {
    if (!activePatient) return;
    const updated = {
      ...activePatient,
      disposition: disp,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
    await db.patients.put(updated);
    setActivePatient(updated);
    setPatients((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    await saveLocalBackup();
    centralSyncService.updatePatient(updated).catch(console.warn);
    await cloudSyncService.triggerPushSync();
  };

  // Studies
  const handleAddStudy = async (study: Partial<MedicalStudy>) => {
    const id = `std-${Date.now()}`;
    const fullStudy = {
      ...study,
      id,
      registeredBy: currentUser.name || 'Dr. Joel Colón',
      doctorName: currentUser.name || 'Dr. Joel Colón',
    } as MedicalStudy;
    await db.studies.add(fullStudy);
    setStudies((prev) => [fullStudy, ...prev]);
    cloudSyncService.scheduleAutoSync();
  };

  const handleDeleteStudy = async (studyId: string) => {
    await db.studies.delete(studyId);
    setStudies((prev) => prev.filter((s) => s.id !== studyId));
    cloudSyncService.scheduleAutoSync();
  };

  // Labs
  const handleAddLab = async (lab: Partial<LabResult>) => {
    const id = `lab-${Date.now()}`;
    const fullLab = {
      ...lab,
      id,
      registeredBy: currentUser.name || 'Dr. Joel Colón',
      doctorName: currentUser.name || 'Dr. Joel Colón',
    } as LabResult;
    await db.labs.add(fullLab);
    setLabs((prev) => [fullLab, ...prev]);
    cloudSyncService.scheduleAutoSync();
  };

  const handleDeleteLab = async (labId: string) => {
    await db.labs.delete(labId);
    setLabs((prev) => prev.filter((l) => l.id !== labId));
    cloudSyncService.scheduleAutoSync();
  };

  // Orders
  const handleAddOrder = async (ord: Partial<MedicalOrder>) => {
    const id = `ord-${Date.now()}`;
    const fullOrder = {
      ...ord,
      id,
      doctorName: ord.doctorName || currentUser.name || 'Dr. Joel Colón',
      prescribedBy: currentUser.name || 'Dr. Joel Colón',
    } as MedicalOrder;
    await db.orders.add(fullOrder);
    setOrders((prev) => [fullOrder, ...prev]);
    centralSyncService.createOrder(fullOrder).catch(console.warn);
    cloudSyncService.scheduleAutoSync();
  };

  const handleEditOrder = async (orderId: string, updatedData: Partial<MedicalOrder>) => {
    await db.orders.update(orderId, updatedData);
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...updatedData } : o)));
    cloudSyncService.scheduleAutoSync();
  };

  const handleUpdateOrderStatus = async (orderId: string, status: any) => {
    await db.orders.update(orderId, { status });
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
    cloudSyncService.scheduleAutoSync();
  };

  const handleDeleteOrder = async (orderId: string) => {
    await db.orders.delete(orderId);
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    cloudSyncService.scheduleAutoSync();
  };

  // Evolutions
  const handleAddEvolution = async (evo: Partial<PatientEvolution>) => {
    const id = `evo-${Date.now()}`;
    const fullEvo = {
      ...evo,
      id,
      doctorName: evo.doctorName || currentUser.name || 'Dr. Joel Colón',
    } as PatientEvolution;
    await db.evolutions.add(fullEvo);
    setEvolutions((prev) => [fullEvo, ...prev]);
    centralSyncService.createEvolution(fullEvo).catch(console.warn);
    cloudSyncService.scheduleAutoSync();
  };

  const handleDeleteEvolution = async (evoId: string) => {
    await db.evolutions.delete(evoId);
    setEvolutions((prev) => prev.filter((e) => e.id !== evoId));
    cloudSyncService.scheduleAutoSync();
  };

  // Cargar Historia Clínica Anterior
  const handleLoadPreviousHistory = () => {
    setIsPreviousHistoryModalOpen(true);
  };

  const handleApplyImportedHistory = async (updated: Patient) => {
    setSyncStatus('saving');
    await db.patients.put(updated);
    setActivePatient(updated);
    setPatients((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    await recordAuditLog({
      action: 'IMPORTAR_HISTORIA',
      patientId: updated.id,
      details: `Historia previa importada y validada por ${currentUser.name}`,
    });
    cloudSyncService.scheduleAutoSync();
    setTimeout(() => setSyncStatus('saved'), 800);
  };

  // Transferencia & Admisión a Guardia Clínica (Medicina Interna)
  const handleOpenGuardiaForPatient = (p: Patient) => {
    setPatientForGuardia(p);
    setIsSendToGuardiaOpen(true);
  };

  const handleOpenHistoryPlantaForPatient = (p?: Patient) => {
    const target = p || activePatient;
    if (!target) return;
    setPatientForHistoryPlanta(target);
    setIsHistoryPlantaOpen(true);
  };

  const handleGuardiaAdmitSuccess = async (targetBedCode: string) => {
    if (!patientForGuardia) return;
    const nowIso = new Date().toISOString();
    const updated: Patient = {
      ...patientForGuardia,
      cubicle: targetBedCode,
      status: 'ingresados',
      updatedAt: nowIso,
      updatedBy: currentUser.name || 'Dr. Joel Colón',
    };
    await db.patients.put(updated);
    if (activePatient?.id === updated.id) {
      setActivePatient(updated);
    }
    setPatients((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    await recordAuditLog({
      action: 'MODIFICAR',
      patientId: updated.id,
      details: `Ingresado en Sala: Cama ${targetBedCode} y transferido a Guardia Clínica por ${currentUser.name}`,
    });
    await saveLocalBackup();
    await cloudSyncService.triggerPushSync();
  };

  const handleRestorePatient = async (patientId: string) => {
    if (currentUser.role !== 'ADMINISTRADOR') {
      alert('Solo el Administrador tiene permiso para restaurar expedientes.');
      return;
    }
    const p = patients.find((x) => x.id === patientId);
    if (!p) return;
    const updated = { ...p, isDeleted: false, isArchived: false, updatedAt: new Date().toISOString() };
    await db.patients.put(updated);
    setPatients((prev) => prev.map((x) => (x.id === patientId ? updated : x)));
    if (activePatient?.id === patientId) setActivePatient(updated);
    await recordAuditLog({
      action: 'RESTAURAR',
      patientId: p.id,
      details: `Expediente restaurado por ${currentUser.name}`,
    });
    alert(`Expediente de ${p.fullName} restaurado exitosamente.`);
  };

  const handleDeletePatient = async (patientId: string) => {
    const p = patients.find((x) => x.id === patientId);
    if (!p) return;
    const updated = { ...p, isDeleted: true, updatedAt: new Date().toISOString() };
    await db.patients.put(updated);
    if (activePatient?.id === patientId) setActivePatient(null);
    setPatients((prev) => prev.filter((x) => x.id !== patientId));
    await recordAuditLog({
      action: 'ELIMINAR_SUAVE',
      patientId: p.id,
      details: `Expediente archivado por ${currentUser.name}`,
    });
    await saveLocalBackup();
    await cloudSyncService.triggerPushSync();
  };

  // Patient scoped data
  const currentPatientStudies = studies.filter((s) => s.patientId === activePatient?.id);
  const currentPatientLabs = labs.filter((l) => l.patientId === activePatient?.id);
  const currentPatientOrders = orders.filter((o) => o.patientId === activePatient?.id);
  const currentPatientEvolutions = evolutions.filter((e) => e.patientId === activePatient?.id);

  const patientCounts = {
    active: patients.filter((p) => !p.isArchived && !p.isDeleted && p.status !== 'alta').length,
    emergency: patients.filter((p) => !p.isArchived && !p.isDeleted && p.status === 'activos').length,
    ward: patients.filter((p) => !p.isArchived && !p.isDeleted && p.status === 'ingresados').length,
  };

  const activeAreaTitle = activePatient
    ? `Expediente: ${activePatient.fullName}`
    : selectedStatus === 'ingresados'
    ? 'Sala / Hospitalización'
    : selectedStatus === 'activos'
    ? 'Servicio de Emergencias'
    : selectedStatus === 'pendientes'
    ? 'Estudios Pendientes'
    : activeNavTab === 'stats'
    ? 'Estadísticas Clínicas'
    : activeNavTab === 'strokeRegistry'
    ? 'Registro de Eventos Cerebrovasculares (EVC)'
    : activeNavTab === 'epidemiologia'
    ? 'Epidemiología & Patologías'
    : activeNavTab === 'search'
    ? 'Búsqueda de Pacientes'
    : 'Tablero General';

  const handleSelectSidebarNav = (id: SidebarNavId) => {
    setSidebarNav(id);
    if (id === 'dashboard' || id === 'patients') {
      setActiveNavTab('dashboard');
      setSelectedStatus('todos');
      setActivePatient(null);
    } else if (id === 'emergencies') {
      setActiveNavTab('dashboard');
      setSelectedStatus('activos');
      setActivePatient(null);
    } else if (id === 'ward') {
      setActiveNavTab('dashboard');
      setSelectedStatus('ingresados');
      setActivePatient(null);
    } else if (id === 'strokeRegistry') {
      setActiveNavTab('strokeRegistry');
      setActivePatient(null);
    } else if (id === 'epidemiology') {
      setActiveNavTab('epidemiologia');
      setActivePatient(null);
    } else if (id === 'labs') {
      if (activePatient) {
        setActiveDossierTab('labs');
      } else {
        setActiveNavTab('dashboard');
      }
    } else if (id === 'studies') {
      if (activePatient) {
        setActiveDossierTab('studies');
      } else {
        setActiveNavTab('dashboard');
      }
    } else if (id === 'notes') {
      if (activePatient) {
        setHospitalDocType('emergencia');
        setIsHospitalNotesOpen(true);
      } else {
        alert('Selecciona un paciente del tablero para ver sus Notas de Ingreso.');
      }
    } else if (id === 'orders') {
      if (activePatient) {
        setHospitalDocType('orden');
        setIsHospitalNotesOpen(true);
      } else {
        alert('Selecciona un paciente del tablero para ver u emitir su Orden Médica.');
      }
    } else if (id === 'files') {
      setIsGoogleDriveModalOpen(true);
    } else if (id === 'settings') {
      setSettingsInitialTab('barra_superior');
      setIsHospitalSettingsOpen(true);
    }
  };

  const handleMobileDrawerNavigate = (sectionId: string) => {
    if (sectionId === 'dashboard') {
      setActiveNavTab('dashboard');
      setSelectedStatus('todos');
      setActivePatient(null);
    } else if (sectionId === 'patients') {
      setActiveNavTab('search');
      setActivePatient(null);
    } else if (sectionId === 'ward') {
      setActiveNavTab('dashboard');
      setSelectedStatus('ingresados');
      setActivePatient(null);
    } else if (sectionId === 'history-planta') {
      if (activePatient) {
        handleOpenHistoryPlantaForPatient(activePatient);
      } else if (patients.length > 0) {
        handleOpenHistoryPlantaForPatient(patients[0]);
      } else {
        alert('Debe tener al menos un paciente registrado.');
      }
    } else if (sectionId === 'nota-ingreso') {
      if (activePatient) {
        setHospitalDocType('emergencia');
        setIsHospitalNotesOpen(true);
      } else {
        alert('Seleccione un paciente para ver su Nota de Ingreso.');
      }
    } else if (sectionId === 'evolutions') {
      if (activePatient) {
        setActiveDossierTab('evolutions');
      } else {
        alert('Seleccione un paciente para revisar o crear evoluciones.');
      }
    } else if (sectionId === 'orders') {
      if (activePatient) {
        setHospitalDocType('orden');
        setIsHospitalNotesOpen(true);
      } else {
        alert('Seleccione un paciente para revisar u ordenar indicaciones.');
      }
    } else if (sectionId === 'stats') {
      setActiveNavTab('stats');
      setActivePatient(null);
    } else if (sectionId === 'epidemiology') {
      setActiveNavTab('epidemiologia');
      setActivePatient(null);
    }
  };

  // Detección automática de términos de EVC en paciente activo
  useEffect(() => {
    if (!activePatient) {
      setShowStrokePrompt(false);
      return;
    }
    if (dismissedStrokePatientIds.has(activePatient.id)) {
      setShowStrokePrompt(false);
      return;
    }

    const clinicalTexts = [
      activePatient.chiefComplaint,
      activePatient.clinicalHistory?.clinicalImpression,
      ...(activePatient.diagnosesList?.map((d) => d.name) || []),
    ]
      .filter(Boolean)
      .join(' ');

    if (strokeRegistryService.detectStrokeKeywords(clinicalTexts)) {
      setDetectedStrokeTerm('Diagnóstico Vascular Cerebral / EVC');
      setShowStrokePrompt(true);
    } else {
      setShowStrokePrompt(false);
    }
  }, [activePatient, dismissedStrokePatientIds]);

  // Dossier Tabs Navigation Config
  const dossierTabs = [
    { id: 'vitals', label: 'Triaje & Constantes', icon: Activity },
    { id: 'history', label: 'Historia Clínica', icon: FileText },
    { id: 'studies', label: 'Estudios & ECG', icon: ImageIcon, count: currentPatientStudies.length },
    { id: 'labs', label: 'Paraclínicos', icon: TestTube2, count: currentPatientLabs.length },
    { id: 'diagnostics', label: 'Apoyo Diagnóstico', icon: Sparkles },
    { id: 'orders', label: 'Órdenes & Fármacos', icon: Pill, count: currentPatientOrders.length },
    { id: 'evolutions', label: 'Evoluciones', icon: Clock, count: currentPatientEvolutions.length },
    { id: 'disposition', label: 'Disposición Final', icon: LogOut },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-row font-sans">
      {/* Privacy Shield */}
      <PrivacyShield
        isManualActive={isPrivacyActive}
        onDeactivate={() => setIsPrivacyActive(false)}
      />

      {/* Desktop Minimalist Sidebar */}
      <Sidebar
        activeNav={sidebarNav}
        onSelectNav={handleSelectSidebarNav}
        onOpenNewPatient={() => setIsRegisterModalOpen(true)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        onLogout={handleLogout}
        patientCounts={patientCounts}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Compact Apple-style Header */}
        <Header
          currentUser={currentUser}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
          onOpenUserProfile={() => setIsUserProfileModalOpen(true)}
          onLogout={handleLogout}
          syncStatus={syncStatus}
          activeAreaTitle={activeAreaTitle}
          activePatient={activePatient}
          onSelectActivePatient={() => {}}
          onClearActivePatient={() => setActivePatient(null)}
          onSelectPatient={(p) => setActivePatient(p)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenCalculator={() => setIsCalculatorOpen(true)}
          onOpenShareModal={() => setIsShareModalOpen(true)}
          onOpenCloudSyncModal={() => setIsCloudSyncOpen(true)}
          onOpenGoogleDriveModal={() => setIsGoogleDriveModalOpen(true)}
          onOpenSettings={() => setIsHospitalSettingsOpen(true)}
          onOpenEpidemiology={() => {
            setActivePatient(null);
            setActiveNavTab('epidemiologia');
          }}
          onOpenAiSuite={() => {
            setIsAiAnalysisModalOpen(true);
          }}
          onOpenGuardiaApp={() => {
            if (activePatient) {
              handleOpenGuardiaForPatient(activePatient);
            } else {
              guardiaAppService.redirectToGuardia();
            }
          }}
          onTogglePrivacyShield={() => setIsPrivacyActive((p) => !p)}
          isPrivacyActive={isPrivacyActive}
          onToggleMobileMenu={() => setIsMobileDrawerOpen(true)}
        />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 pb-20 sm:pb-8">
        {activePatient ? (
          /* ================= PACIENTE: EXPEDIENTE CLÍNICO ================= */
          <div className="space-y-4 animate-fade-in">
            {/* Header del Paciente */}
            <PatientHeader
              patient={activePatient}
              existingPatients={patients}
              onBack={() => setActivePatient(null)}
              onOpenDocumentExport={() => setIsDocumentExportModalOpen(true)}
              onOpenHospitalNotes={() => {
                setHospitalDocType('emergencia');
                setIsHospitalNotesOpen(true);
              }}
              onOpenMedicalOrder={() => {
                setHospitalDocType('orden');
                setIsHospitalNotesOpen(true);
              }}
              onOpenAiSuite={() => {
                setIsAiAnalysisModalOpen(true);
              }}
              onOpenGuardiaModal={() => handleOpenGuardiaForPatient(activePatient)}
              onOpenHistoryPlanta={() => handleOpenHistoryPlantaForPatient(activePatient)}
              onLoadPreviousHistory={handleLoadPreviousHistory}
              onStatusChange={handleStatusChange}
              onEditPatient={handleEditPatient}
              onSelectPatient={setActivePatient}
            />

            {/* Mobile Quick Dossier Tab Selector (Salto Directo en 1 Toque para iPhone y Android) */}
            <div className="sm:hidden bg-white rounded-2xl p-2.5 shadow-2xs border border-slate-200">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 px-1">
                Sección Activa del Expediente:
              </label>
              <div className="relative">
                <select
                  value={activeDossierTab}
                  onChange={(e) => setActiveDossierTab(e.target.value as any)}
                  className="w-full bg-slate-50 text-slate-900 font-bold text-xs py-2.5 pl-3 pr-8 rounded-xl border border-slate-200 shadow-2xs focus:ring-2 focus:ring-[#0F4C5C] focus:border-[#0F4C5C] appearance-none cursor-pointer touch-manipulation min-h-[42px]"
                >
                  {dossierTabs.map((tab) => (
                    <option key={tab.id} value={tab.id}>
                      {tab.label} {tab.count !== undefined && tab.count > 0 ? `(${tab.count})` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Dossier Tabs Navigation con Desplazamiento Táctil Fluido */}
            <div className="bg-white rounded-2xl p-1.5 shadow-2xs border border-slate-200 overflow-x-auto no-scrollbar flex gap-1 touch-pan-x scroll-smooth select-none">
              {dossierTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeDossierTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveDossierTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all touch-manipulation min-h-[38px] shrink-0 active:scale-95 ${
                      isActive
                        ? 'bg-[#0F4C5C] text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-300' : 'text-slate-500'}`} />
                    <span>{tab.label}</span>
                    {tab.count !== undefined && tab.count > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab Contents */}
            <div className="mt-4">
              {activeDossierTab === 'vitals' && (
                <TriageVitalsTab patient={activePatient} onUpdateVitals={handleUpdateVitals} />
              )}
              {activeDossierTab === 'history' && (
                <ClinicalHistoryTab 
                  patient={activePatient} 
                  onUpdateHistory={handleUpdateHistory} 
                  onOpenHistoryPlanta={() => handleOpenHistoryPlantaForPatient(activePatient)}
                />
              )}
              {activeDossierTab === 'studies' && (
                <StudiesGalleryTab
                  patientId={activePatient.id}
                  studies={currentPatientStudies}
                  onAddStudy={handleAddStudy}
                  onDeleteStudy={handleDeleteStudy}
                  onOpenCompare={(s1, s2) => {
                    setCompareStudy1(s1);
                    setCompareStudy2(s2);
                  }}
                />
              )}
              {activeDossierTab === 'labs' && (
                <LabsTab
                  patientId={activePatient.id}
                  patientName={activePatient.fullName}
                  patientAge={activePatient.age}
                  patientSex={activePatient.sex}
                  labs={currentPatientLabs}
                  onAddLab={handleAddLab}
                  onDeleteLab={handleDeleteLab}
                />
              )}
              {activeDossierTab === 'diagnostics' && (
                <DiagnosticAssistantTab
                  patient={activePatient}
                  labs={currentPatientLabs}
                  studies={currentPatientStudies}
                  onUpdateDiagnoses={(diagSummary) => {
                    const currentHist = activePatient.clinicalHistory || {
                      reasonForConsultation: activePatient.chiefComplaint || '',
                      currentIllnessHistory: '',
                      pathologicalHistory: '',
                      surgicalHistory: '',
                      allergicHistory: '',
                      habitualMedications: '',
                      toxicHabits: '',
                      familyHistory: '',
                      obGynHistory: '',
                      systemsReview: '',
                      physicalExam: {
                        general: '',
                        cardiovascular: '',
                        respiratory: '',
                        abdominal: '',
                        neurological: '',
                        extremities: '',
                        skin: '',
                        otherFindings: '',
                      },
                      clinicalImpression: '',
                      diagnosticAndTherapeuticPlan: '',
                    };
                    handleUpdateHistory({ ...currentHist, clinicalImpression: diagSummary });
                  }}
                />
              )}
              {activeDossierTab === 'orders' && (
                <MedicalOrdersTab
                  patient={activePatient}
                  orders={currentPatientOrders}
                  onAddOrder={handleAddOrder}
                  onEditOrder={handleEditOrder}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  onDeleteOrder={handleDeleteOrder}
                />
              )}
              {activeDossierTab === 'evolutions' && (
                <EvolutionsTab
                  patient={activePatient}
                  evolutions={currentPatientEvolutions}
                  onAddEvolution={handleAddEvolution}
                  onDeleteEvolution={handleDeleteEvolution}
                />
              )}
              {activeDossierTab === 'disposition' && (
                <FinalDispositionTab
                  patient={activePatient}
                  onSaveDisposition={handleSaveDisposition}
                  onOpenGuardiaModal={() => handleOpenGuardiaForPatient(activePatient)}
                />
              )}
            </div>
          </div>
        ) : (
          /* ================= VISTAS PRINCIPALES ================= */
          <div>
            {activeNavTab === 'dashboard' && (
              <div className="space-y-4">
                {/* Stats Top Banner & Metric Cards */}
                <DashboardStats
                  patients={patients}
                  onOpenRegister={() => setIsRegisterModalOpen(true)}
                  selectedStatus={selectedStatus as any}
                  onSelectFilter={(st) => {
                    if (st === 'criticos') {
                      setSelectedStatus('todos');
                      setSortBy('severity');
                    } else {
                      setSelectedStatus(st as any);
                    }
                  }}
                />

                {/* Zona: Pacientes que requieren atención inmediata */}
                <AttentionRequiredSection
                  patients={patients}
                  studies={studies}
                  labs={labs}
                  onSelectPatient={(p) => setActivePatient(p)}
                />

                {/* Filters and Search */}
                <TriageFilter
                  selectedStatus={selectedStatus}
                  onSelectStatus={setSelectedStatus}
                  sortBy={sortBy}
                  onSortChange={setSortBy}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                />

                {/* Patients List Cards */}
                {filteredPatients.length === 0 ? (
                  <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 text-slate-500 shadow-sm">
                    <UserPlus className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-slate-800">No hay pacientes con este filtro</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Puedes registrar un nuevo paciente o cambiar el estado seleccionado en las pestañas superiores.
                    </p>
                    <button
                      onClick={() => setIsRegisterModalOpen(true)}
                      className="mt-4 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md"
                    >
                      + Registrar Paciente
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {filteredPatients.map((patient) => (
                      <PatientCard
                        key={patient.id}
                        patient={patient}
                        onSelect={(p) => setActivePatient(p)}
                        onDelete={handleDeletePatient}
                        onOpenGuardia={handleOpenGuardiaForPatient}
                        onOpenHistoryPlanta={handleOpenHistoryPlantaForPatient}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeNavTab === 'search' && (
              <PatientSearchView
                patients={patients}
                onSelectPatient={(p) => setActivePatient(p)}
              />
            )}

            {activeNavTab === 'epidemiologia' && (
              <EpidemiologyView
                patients={patients}
                onSelectPatient={(p) => setActivePatient(p)}
              />
            )}

            {activeNavTab === 'stats' && (
              <EmergencyStatsView
                patients={patients}
                studiesCount={studies.length}
                labsCount={labs.length}
              />
            )}

            {activeNavTab === 'strokeRegistry' && (
              <StrokeAnalyticsDashboard
                onBack={() => setActiveNavTab('dashboard')}
                onSelectPatientById={(patientId) => {
                  const p = patients.find(x => x.id === patientId);
                  if (p) setActivePatient(p);
                }}
              />
            )}

            {activeNavTab === 'drive' && (
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm max-w-2xl mx-auto text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center mx-auto text-emerald-600">
                  <Activity className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-black text-slate-900">Gestión de Respaldo & Google Drive</h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Sincroniza tus historias clínicas en PDF directamente a tu cuenta de Google Drive o realiza copias de seguridad de los registros locales.
                </p>
                <button
                  onClick={() => setIsGoogleDriveModalOpen(true)}
                  className="px-6 py-3 bg-[#0F4C5C] hover:bg-petrol-800 text-white font-bold rounded-xl text-xs shadow-md"
                >
                  Abrir Configuración de Google Drive
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Action Button (FAB) for Mobile Quick Evolution */}
      {activePatient && (
        <button
          onClick={() => setActiveDossierTab('evolutions')}
          className="fixed right-4 bottom-18 sm:bottom-6 z-30 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 rounded-full shadow-2xl flex items-center gap-2 font-bold text-xs border-2 border-white transition-transform active:scale-95"
          title="Nueva evolución"
        >
          <Clock className="w-4 h-4" />
          <span>+ Evolución</span>
        </button>
      )}

      {/* Permanent Medical Disclaimer Footer */}
      <footer className="bg-slate-100 border-t border-slate-200 py-2.5 px-4 text-center text-[11px] text-slate-500 hidden sm:block">
        Herramienta de documentación y apoyo clínico. No sustituye el juicio médico ni los protocolos institucionales.
      </footer>

      {/* Mobile Fixed Bottom Navigation */}
      <BottomNav
        activeTab={activeNavTab === 'strokeRegistry' ? 'stats' : activeNavTab}
        onChangeTab={(t) => {
          setActivePatient(null);
          setActiveNavTab(t);
          if (t === 'drive') setIsGoogleDriveModalOpen(true);
        }}
        onOpenRegister={() => setIsRegisterModalOpen(true)}
      />
      </div>

      {/* Modals */}
      <QuickRegisterModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSavePatient={handleSaveNewPatient}
        existingPatients={patients}
        onOpenExistingPatient={(p) => {
          setActivePatient(p);
          setIsRegisterModalOpen(false);
        }}
      />

      {activePatient && (
        <DocumentExporterModal
          isOpen={isDocumentExportModalOpen}
          onClose={() => setIsDocumentExportModalOpen(false)}
          patient={activePatient}
          labs={currentPatientLabs}
          orders={currentPatientOrders}
          evolutions={currentPatientEvolutions}
        />
      )}

      <GoogleDriveModal
        isOpen={isGoogleDriveModalOpen}
        onClose={() => setIsGoogleDriveModalOpen(false)}
        onRefreshData={refreshData}
        activePatient={activePatient}
        orders={currentPatientOrders}
        labs={currentPatientLabs}
      />

      {compareStudy1 && compareStudy2 && (
        <ImageCompareModal
          study1={compareStudy1}
          study2={compareStudy2}
          onClose={() => {
            setCompareStudy1(null);
            setCompareStudy2(null);
          }}
        />
      )}

      <QuickCalculatorBar
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
      />

      <CloudSyncModal
        isOpen={isCloudSyncOpen}
        onClose={() => setIsCloudSyncOpen(false)}
        onOpenGoogleDrive={() => setIsGoogleDriveModalOpen(true)}
        onDataRestored={refreshData}
      />

      <ShareAppModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      <HospitalSettingsModal
        isOpen={isHospitalSettingsOpen}
        onClose={() => setIsHospitalSettingsOpen(false)}
        initialTab={settingsInitialTab}
      />

      {activePatient && (
        <UnifiedClinicalDocumentModal
          patient={activePatient}
          orders={currentPatientOrders}
          labs={currentPatientLabs}
          studies={currentPatientStudies}
          evolutions={currentPatientEvolutions}
          isOpen={isHospitalNotesOpen}
          onClose={() => setIsHospitalNotesOpen(false)}
          initialDocType={hospitalDocType}
          onSavePatientEvolution={async (text) => {
            if (activePatient) {
              await handleAddEvolution({
                patientId: activePatient.id,
                timestamp: new Date().toISOString(),
                doctorName: currentUser.name || 'Dr. Joel Colón',
                vitalSignsSummary: 'Signos vitales registrados al momento de la nota',
                clinicalChanges: text,
                newResults: '',
                problemReevaluation: 'Documento clínico archivado en evoluciones',
                updatedDiagnoses: activePatient.chiefComplaint || '',
                conduct: 'Continuar plan terapéutico hospitalario'
              });
            }
          }}
        />
      )}

      {activePatient && (
        <MedicalOrderPrintModal
          patient={activePatient}
          orders={currentPatientOrders}
          isOpen={isMedicalOrderPrintOpen}
          onClose={() => setIsMedicalOrderPrintOpen(false)}
        />
      )}

      {activePatient && (
        <PreviousHistoryImportModal
          patient={activePatient}
          isOpen={isPreviousHistoryModalOpen}
          onClose={() => setIsPreviousHistoryModalOpen(false)}
          onApplyHistory={handleApplyImportedHistory}
        />
      )}

      {/* Control de Acceso Obligatorio: Si no hay sesión activa, bloquea la pantalla completa */}
      {!isAuthenticated && (
        <LoginModal
          isOpen={true}
          canClose={false}
          onClose={() => {}}
          onUserChanged={(u) => {
            setCurrentUser(u);
            setIsAuthenticated(true);
          }}
        />
      )}

      {/* Modal para cambiar usuario o ver credenciales cuando ya está autenticado */}
      {isAuthenticated && (
        <LoginModal
          isOpen={isLoginModalOpen}
          canClose={true}
          onClose={() => setIsLoginModalOpen(false)}
          onUserChanged={(u) => setCurrentUser(u)}
        />
      )}

      {/* Modal Mi Perfil (Médicos activos pueden editar datos, PIN y foto) */}
      <UserProfileModal
        isOpen={isUserProfileModalOpen}
        onClose={() => setIsUserProfileModalOpen(false)}
        currentUser={currentUser}
        onUserUpdated={(u) => {
          setCurrentUser(u);
        }}
      />

      <PatientAIAnalysisModal
        isOpen={isAiAnalysisModalOpen}
        onClose={() => setIsAiAnalysisModalOpen(false)}
        patient={activePatient}
        initialTab={aiSuiteInitialTab}
        onInsertToEvolution={activePatient ? (noteText) => {
          handleAddEvolution({
            patientId: activePatient.id,
            timestamp: new Date().toISOString(),
            doctorName: currentUser.name || 'Dr. Joel Colón',
            vitalSignsSummary: '',
            clinicalChanges: noteText,
            newResults: '',
            problemReevaluation: '',
            updatedDiagnoses: activePatient.clinicalHistory?.clinicalImpression || activePatient.chiefComplaint || '',
            conduct: '',
          });
        } : undefined}
        onInsertToNote={activePatient ? (fullNote) => {
          const currentHist = activePatient.clinicalHistory || {
            reasonForConsultation: activePatient.chiefComplaint || '',
            currentIllnessHistory: '',
            pathologicalHistory: '',
            surgicalHistory: '',
            allergicHistory: '',
            habitualMedications: '',
            toxicHabits: '',
            familyHistory: '',
            obGynHistory: '',
            systemsReview: '',
            physicalExam: {
              general: '',
              cardiovascular: '',
              respiratory: '',
              abdominal: '',
              neurological: '',
              extremities: '',
              skin: '',
              otherFindings: '',
            },
            clinicalImpression: '',
            diagnosticAndTherapeuticPlan: '',
          };
          handleUpdateHistory({ ...currentHist, clinicalImpression: fullNote });
        } : undefined}
      />

      {patientForGuardia && (
        <SendToGuardiaModal
          isOpen={isSendToGuardiaOpen}
          onClose={() => {
            setIsSendToGuardiaOpen(false);
            setPatientForGuardia(null);
          }}
          patient={patientForGuardia}
          orders={orders.filter((o) => o.patientId === patientForGuardia.id)}
          labs={labs.filter((l) => l.patientId === patientForGuardia.id)}
          evolutions={evolutions.filter((e) => e.patientId === patientForGuardia.id)}
          currentUser={currentUser}
          onAdmitSuccess={handleGuardiaAdmitSuccess}
        />
      )}

      {patientForHistoryPlanta && (
        <ClinicalHistoryPlantaModal
          isOpen={isHistoryPlantaOpen}
          onClose={() => {
            setIsHistoryPlantaOpen(false);
            setPatientForHistoryPlanta(null);
          }}
          patient={patientForHistoryPlanta}
          onPatientUpdated={(updated) => {
            setActivePatient(updated);
            setPatients((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          }}
        />
      )}

      {/* Menú Lateral Desplegable Móvil Táctil (iPhone y Android) */}
      <MobileDrawerMenu
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        currentUser={currentUser}
        patientCounts={patientCounts}
        onNavigate={handleMobileDrawerNavigate}
        onOpenNewPatient={() => setIsRegisterModalOpen(true)}
        onOpenSettings={() => {
          setSettingsInitialTab('barra_superior');
          setIsHospitalSettingsOpen(true);
        }}
        onOpenUsersManagement={() => {
          setSettingsInitialTab('usuarios');
          setIsHospitalSettingsOpen(true);
        }}
        onOpenStrokeRegistry={() => {
          setActiveNavTab('strokeRegistry');
          setActivePatient(null);
        }}
        onLogout={handleLogout}
      />

      {/* Detección Automática de Eventos Cerebrovasculares */}
      {showStrokePrompt && activePatient && (
        <StrokeAutoPromptModal
          isOpen={showStrokePrompt}
          patient={activePatient}
          detectedTerm={detectedStrokeTerm}
          onClose={() => {
            setShowStrokePrompt(false);
            setDismissedStrokePatientIds((prev) => new Set(prev).add(activePatient.id));
          }}
          onAccept={() => {
            setShowStrokePrompt(false);
            setDismissedStrokePatientIds((prev) => new Set(prev).add(activePatient.id));
            setPatientForStroke(activePatient);
            setIsStrokeModalOpen(true);
          }}
        />
      )}

      {/* Modal de Registro y Edición de EVC */}
      {isStrokeModalOpen && (
        <StrokeRegistryModal
          isOpen={isStrokeModalOpen}
          onClose={() => {
            setIsStrokeModalOpen(false);
            setPatientForStroke(null);
          }}
          patient={patientForStroke}
          onSaved={() => {
            cloudSyncService.scheduleAutoSync();
          }}
        />
      )}
    </div>
  );
}
