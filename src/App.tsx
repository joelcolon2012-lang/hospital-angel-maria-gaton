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
} from './types';

// Layout
import { Navbar } from './components/layout/Navbar';
import { BottomNav } from './components/layout/BottomNav';
import { PrivacyShield } from './components/layout/PrivacyShield';
import { authService, recordAuditLog } from './services/authService';
import { LoginModal } from './components/auth/LoginModal';
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
import { HospitalNotesModal, HospitalDocType } from './components/documents/HospitalNotesModal';
import { MedicalOrderPrintModal } from './components/documents/MedicalOrderPrintModal';
import { CloudSyncModal } from './components/documents/CloudSyncModal';
import { ShareAppModal } from './components/documents/ShareAppModal';
import { HospitalSettingsModal } from './components/settings/HospitalSettingsModal';
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
} from 'lucide-react';

export default function App() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [studies, setStudies] = useState<MedicalStudy[]>([]);
  const [labs, setLabs] = useState<LabResult[]>([]);
  const [orders, setOrders] = useState<MedicalOrder[]>([]);
  const [evolutions, setEvolutions] = useState<PatientEvolution[]>([]);

  // Navigation & Dossier
  const [activeNavTab, setActiveNavTab] = useState<'dashboard' | 'search' | 'stats' | 'drive'>('dashboard');
  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [activeDossierTab, setActiveDossierTab] = useState<
    'vitals' | 'history' | 'studies' | 'labs' | 'diagnostics' | 'orders' | 'evolutions' | 'disposition'
  >('vitals');

  // Filters & Sorting
  const [selectedStatus, setSelectedStatus] = useState<PatientStatus | 'todos'>('todos');
  const [sortBy, setSortBy] = useState<'severity' | 'arrival' | 'name' | 'cubicle'>('severity');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Privacy
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
  const [hospitalDocType, setHospitalDocType] = useState<HospitalDocType>('emergencia');
  const [isMedicalOrderPrintOpen, setIsMedicalOrderPrintOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isHospitalSettingsOpen, setIsHospitalSettingsOpen] = useState(false);
  const [sidebarNav, setSidebarNav] = useState<SidebarNavId>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Side-by-side compare
  const [compareStudy1, setCompareStudy1] = useState<MedicalStudy | null>(null);
  const [compareStudy2, setCompareStudy2] = useState<MedicalStudy | null>(null);

  // Load database
  const refreshData = async () => {
    await seedDatabaseIfEmpty(db);
    const pList = await db.patients.toArray();
    const sList = await db.studies.toArray();
    const lList = await db.labs.toArray();
    const oList = await db.orders.toArray();
    const eList = await db.evolutions.toArray();

    setPatients(pList);
    setStudies(sList);
    setLabs(lList);
    setOrders(oList);
    setEvolutions(eList);

    // Keep active patient updated if open
    if (activePatient) {
      const updatedActive = pList.find((p) => p.id === activePatient.id);
      if (updatedActive) setActivePatient(updatedActive);
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

      // 2. Traer novedades de la nube y otros dispositivos
      const hadUpdates = await cloudSyncService.pullLatestData();
      if (hadUpdates) {
        await refreshData();
      }

      // 3. Sincronizar hacia la nube SOLO si hay pacientes reales creados localmente y no acabamos de recibir actualización remota
      const localData = await cloudSyncService.getLocalMasterData();
      const hasRealPatients = localData.patients.some((p) => !p.id.startsWith('pat-00'));
      if (hasRealPatients && !hadUpdates) {
        await cloudSyncService.triggerPushSync();
      }
    };

    initializeDataAndSync();

    // 4. Suscribirse a cambios de otros dispositivos vía polling/nube
    const unsubscribe = cloudSyncService.subscribe(() => {
      refreshData();
    });

    return () => unsubscribe();
  }, []);

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
      attendingDoctor: newPatientData.attendingDoctor || 'Dr. Colón',
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

    // 1. Guardar en Dexie DB
    await db.patients.add(newP);
    
    // 2. Guardar respaldo inmediato en localStorage para blindar contra recargas
    await saveLocalBackup();

    // 3. Actualizar estado en pantalla
    await refreshData();
    setActivePatient(newP);

    // 4. Empujar inmediatamente a la nube para que esté en todas las computadoras
    await cloudSyncService.triggerPushSync();
  };

  const handleUpdateVitals = async (updatedVitals: Vitals) => {
    if (!activePatient) return;
    const updated = { ...activePatient, vitals: updatedVitals, updatedAt: new Date().toISOString() };
    await db.patients.put(updated);
    setActivePatient(updated);
    setPatients((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    await saveLocalBackup();
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
    cloudSyncService.scheduleAutoSync();
  };

  const handleStatusChange = async (newStatus: PatientStatus) => {
    if (!activePatient) return;
    const updated = { ...activePatient, status: newStatus, updatedAt: new Date().toISOString() };
    await db.patients.put(updated);
    setActivePatient(updated);
    setPatients((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    await saveLocalBackup();
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
    await cloudSyncService.triggerPushSync();
  };

  // Studies
  const handleAddStudy = async (study: Partial<MedicalStudy>) => {
    const id = `std-${Date.now()}`;
    const fullStudy = { ...study, id } as MedicalStudy;
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
    const fullLab = { ...lab, id } as LabResult;
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
    const fullOrder = { ...ord, id } as MedicalOrder;
    await db.orders.add(fullOrder);
    setOrders((prev) => [fullOrder, ...prev]);
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
    const fullEvo = { ...evo, id } as PatientEvolution;
    await db.evolutions.add(fullEvo);
    setEvolutions((prev) => [fullEvo, ...prev]);
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
      setIsHospitalSettingsOpen(true);
    }
  };

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
        patientCounts={patientCounts}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Compact Apple-style Header */}
        <Header
          currentUser={currentUser}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
          syncStatus={syncStatus}
          activeAreaTitle={activeAreaTitle}
          activePatient={activePatient}
          onSelectActivePatient={() => {}}
          onClearActivePatient={() => setActivePatient(null)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenCalculator={() => setIsCalculatorOpen(true)}
          onOpenShareModal={() => setIsShareModalOpen(true)}
          onOpenCloudSyncModal={() => setIsCloudSyncOpen(true)}
          onOpenGoogleDriveModal={() => setIsGoogleDriveModalOpen(true)}
          onOpenSettings={() => setIsHospitalSettingsOpen(true)}
          onTogglePrivacyShield={() => setIsPrivacyActive((p) => !p)}
          isPrivacyActive={isPrivacyActive}
        />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 pb-20 sm:pb-8">
        {activePatient ? (
          /* ================= PACIENTE: EXPEDIENTE CLÍNICO ================= */
          <div className="space-y-4 animate-fade-in">
            {/* Header del Paciente */}
            <PatientHeader
              patient={activePatient}
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
              onLoadPreviousHistory={handleLoadPreviousHistory}
              onStatusChange={handleStatusChange}
            />

            {/* Dossier Tabs Navigation */}
            <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-slate-200 overflow-x-auto no-scrollbar flex gap-1">
              {dossierTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeDossierTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveDossierTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-[#0F4C5C] text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100'
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
                <ClinicalHistoryTab patient={activePatient} onUpdateHistory={handleUpdateHistory} />
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

            {activeNavTab === 'stats' && (
              <EmergencyStatsView
                patients={patients}
                studiesCount={studies.length}
                labsCount={labs.length}
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
        activeTab={activeNavTab}
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
      />

      {activePatient && (
        <HospitalNotesModal
          patient={activePatient}
          orders={currentPatientOrders}
          labs={currentPatientLabs}
          studies={currentPatientStudies}
          isOpen={isHospitalNotesOpen}
          onClose={() => setIsHospitalNotesOpen(false)}
          initialDocType={hospitalDocType}
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

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onUserChanged={(u) => setCurrentUser(u)}
      />
    </div>
  );
}
