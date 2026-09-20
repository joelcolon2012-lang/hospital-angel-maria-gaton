import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Patient,
  MedicalOrder,
  LabResult,
  PendingTask,
  PatientEvolution,
  GuardiaClinicalBed,
  User,
  BedStatusCode,
  ClinicalHistory,
  StructuredDiagnosis
} from '../../types';
import { db } from '../../db/dexieDb';
import { centralSyncService } from '../../services/centralSyncService';
import { exportGuardiaToWord, printGuardiaPdf, GuardiaExportData } from '../../services/guardiaExportService';
import { generateSuggestedLabDiagnoses } from '../../services/ai/ClinicalLabInterpreter';

import { GuardiaHeader } from './GuardiaHeader';
import { GuardiaHorizontalTable, RowUpdateNotification } from './GuardiaHorizontalTable';
import { GuardiaBedCardView } from './GuardiaBedCardView';
import { FastPatientDrawer } from './FastPatientDrawer';
import { AddPendingModal } from './AddPendingModal';
import { AddLabModal } from './AddLabModal';
import { TrendChartModal } from './TrendChartModal';
import { AdmitPatientModal } from './AdmitPatientModal';
import { AddOrderModal } from './AddOrderModal';
import { QuickEvolutionModal } from './QuickEvolutionModal';
import { QuickDiagnosisModal } from './QuickDiagnosisModal';
import { QuickEditChiefComplaintModal } from './QuickEditChiefComplaintModal';

interface Props {
  patients: Patient[];
  labs: LabResult[];
  orders: MedicalOrder[];
  pendingTasks: PendingTask[];
  evolutions: PatientEvolution[];
  currentUser?: User;
  initialPatientId?: string;
  onSelectPatientDossier?: (patient: Patient, tab?: 'vitals' | 'history' | 'studies' | 'labs' | 'diagnostics' | 'orders' | 'evolutions' | 'disposition') => void;
  onOpenEvolutionModal?: (patient: Patient) => void;
  onOpenOrderModal?: (patient: Patient) => void;
  onOpenHistoryModal?: (patient: Patient) => void;
  onRefreshData: () => Promise<void>;
}

// Normalizador de códigos de cama clínicos para evitar discrepancias tipográficas
function normalizeBedCode(raw: string): string {
  if (!raw) return '';
  const cleaned = raw.toUpperCase().replace(/\s+/g, ' ').trim();

  // Coincidencias tipo "307 C1", "307-C1", "307-1", "307C1", "CAMA 307 C1"
  const match = cleaned.match(/(?:CAMA\s+|SALA\s+)?(30[1-9]|31[0-7])[\s\-_/]*(?:C|CAMA)?[\s\-_/]*([12]|C1|C2)\b/i);
  if (match) {
    const room = match[1];
    let bedNum = match[2].toUpperCase();
    if (bedNum === '1') bedNum = 'C1';
    if (bedNum === '2') bedNum = 'C2';
    return `${room} ${bedNum}`;
  }
  return cleaned;
}

export const GuardiaMedicinaInternaView: React.FC<Props> = ({
  patients,
  labs,
  orders,
  pendingTasks,
  evolutions,
  currentUser,
  initialPatientId,
  onSelectPatientDossier,
  onOpenEvolutionModal,
  onOpenOrderModal,
  onOpenHistoryModal,
  onRefreshData
}) => {
  // Estados de vista y filtros
  const [service, setService] = useState<'MEDICINA_INTERNA_I' | 'MEDICINA_INTERNA_II' | 'TODAS'>('TODAS');
  const [viewMode, setViewMode] = useState<'TABLA' | 'CAMAS'>('TABLA');
  const [isGuardMode, setIsGuardMode] = useState<boolean>(() => {
    return localStorage.getItem('guardia_night_mode') === 'true';
  });
  const [selectedWard, setSelectedWard] = useState<string>('TODAS');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Estados de modales y drawers
  const [drawerPatient, setDrawerPatient] = useState<Patient | null>(null);
  const [isAddPendingOpen, setIsAddPendingOpen] = useState<boolean>(false);
  const [pendingPreselectedPatientId, setPendingPreselectedPatientId] = useState<string | undefined>();
  const [isAddLabOpen, setIsAddLabOpen] = useState<boolean>(false);
  const [labPreselectedPatientId, setLabPreselectedPatientId] = useState<string | undefined>();
  const [trendModal, setTrendModal] = useState<{
    isOpen: boolean;
    patientName: string;
    parameterName: string;
    labs: LabResult[];
  }>({
    isOpen: false,
    patientName: '',
    parameterName: '',
    labs: []
  });

  // Sugerencias descartadas por el usuario en esta sesión
  const [discardedSuggestions, setDiscardedSuggestions] = useState<Set<string>>(new Set());

  // Estados de modales de acción directa en guardia (Ingreso, Diagnóstico, Órdenes, Evolución, Motivo)
  const [isAdmitPatientOpen, setIsAdmitPatientOpen] = useState<boolean>(false);
  const [admitBedCode, setAdmitBedCode] = useState<string | undefined>();
  const [selectedActionPatient, setSelectedActionPatient] = useState<Patient | null>(null);
  const [isAddOrderOpen, setIsAddOrderOpen] = useState<boolean>(false);
  const [isQuickEvolutionOpen, setIsQuickEvolutionOpen] = useState<boolean>(false);
  const [isQuickDiagnosisOpen, setIsQuickDiagnosisOpen] = useState<boolean>(false);
  const [isEditComplaintOpen, setIsEditComplaintOpen] = useState<boolean>(false);
  const [filterOnlyPatients, setFilterOnlyPatients] = useState<boolean>(false);

  // Notificación de pulso de actualización remota (Sección 30)
  const [lastRemoteUpdate, setLastRemoteUpdate] = useState<RowUpdateNotification | null>(null);

  // Auto-foco y carga en tiempo real cuando se redirige desde el Dashboard para un paciente específico
  useEffect(() => {
    if (initialPatientId) {
      const target = patients.find((p) => p.id === initialPatientId);
      if (target) {
        setDrawerPatient(target);
        // Mantener selectedWard en TODAS para no ocultar a los demás pacientes
        setSelectedWard('TODAS');
      }
    }
  }, [initialPatientId, patients]);

  // Si el paciente en el drawer se actualiza remotamente, mantener sus datos frescos
  useEffect(() => {
    if (drawerPatient) {
      const updated = patients.find((p) => p.id === drawerPatient.id);
      if (updated && updated !== drawerPatient) {
        setDrawerPatient(updated);
      }
    }
  }, [patients, drawerPatient]);

  // Guardar preferencia de modo guardia
  const handleToggleGuardMode = () => {
    setIsGuardMode((prev) => {
      const next = !prev;
      localStorage.setItem('guardia_night_mode', String(next));
      return next;
    });
  };

  // Escuchar eventos en tiempo real de sincronización central (SSE de otros médicos)
  useEffect(() => {
    const handleCentralUpdate = (e: any) => {
      const detail = e.detail;
      if (!detail) return;

      let patientId = '';
      let author = 'Dr. Joel Colón';

      if (detail.payload) {
        if (detail.payload.patientId) patientId = detail.payload.patientId;
        else if (detail.payload.id && detail.payload.id.startsWith('pat-')) patientId = detail.payload.id;
        else if (detail.payload.patient?.id) patientId = detail.payload.patient.id;
        else if (detail.payload.task?.patientId) patientId = detail.payload.task.patientId;
        else if (detail.payload.lab?.patientId) patientId = detail.payload.lab.patientId;

        if (detail.payload.user?.name) author = detail.payload.user.name;
        else if (detail.payload.editor?.name) author = detail.payload.editor.name;
        else if (detail.payload.updatedBy) author = detail.payload.updatedBy;
      }

      if (patientId) {
        setLastRemoteUpdate({
          patientId,
          updatedBy: author,
          timestamp: Date.now()
        });
      }

      // Refrescar datos locales de forma silenciosa
      onRefreshData().catch(console.warn);
    };

    window.addEventListener('hospital_central_data_changed', handleCentralUpdate);
    return () => {
      window.removeEventListener('hospital_central_data_changed', handleCentralUpdate);
    };
  }, [onRefreshData]);

  // Mapa de pacientes activos
  const patientsMap = useMemo(() => {
    const map = new Map<string, Patient>();
    patients.forEach((p) => {
      map.set(p.id, p);
    });
    return map;
  }, [patients]);

  // Generación y mapeo de camas con orden numérico natural y presencia de TODOS los pacientes
  const { allBeds, availableWards } = useMemo(() => {
    const wardsSet = new Set<string>();

    // 1. Generar 34 camas base: 301 C1 a 317 C2
    const baseBeds: GuardiaClinicalBed[] = [];
    for (let r = 301; r <= 317; r++) {
      const roomStr = String(r);
      wardsSet.add(roomStr);
      const bedService = r >= 309 ? 'MEDICINA_INTERNA_II' : 'MEDICINA_INTERNA_I';

      (['C1', 'C2'] as const).forEach((bNum) => {
        baseBeds.push({
          code: `${r} ${bNum}`,
          room: roomStr,
          bedNumber: bNum,
          service: bedService,
          status: 'DISPONIBLE'
        });
      });
    }

    // Mapa de camas base por código normalizado
    const bedsMap = new Map<string, GuardiaClinicalBed>();
    baseBeds.forEach((b) => {
      bedsMap.set(b.code, { ...b });
    });

    // 2. Mapear pacientes a camas
    const assignedPatientIds = new Set<string>();
    const activePatients = patients.filter((p) => !p.isDeleted && !p.isArchived);

    // Primero: Pacientes con cubículo asignado explícito a salas 301-317
    activePatients.forEach((p) => {
      const norm = normalizeBedCode(p.cubicle || '');
      if (norm && bedsMap.has(norm)) {
        const bed = bedsMap.get(norm)!;
        bed.status = 'OCUPADA';
        bed.patientId = p.id;
        bed.patientName = p.fullName;
        bed.triageLevel = p.triageLevel;
        assignedPatientIds.add(p.id);
      }
    });

    // Segundo: TODOS los demás pacientes activos del hospital sin cama 301-317 asignada
    // (Garantiza que ABSOLUTAMENTE TODOS LOS PACIENTES se desplieguen en la guardia)
    const extraBeds: GuardiaClinicalBed[] = [];
    activePatients.forEach((p) => {
      if (assignedPatientIds.has(p.id)) return;

      const cubRaw = (p.cubicle || '').trim();
      let roomName = 'EMG';
      if (/shock|trauma/i.test(cubRaw)) roomName = 'SHOCK';
      else if (/observaci[oó]n|obs/i.test(cubRaw)) roomName = 'OBS';
      else if (/sala/i.test(cubRaw)) roomName = 'SALA';
      else if (cubRaw) {
        const firstToken = cubRaw.split(/[\s\-_/]/)[0];
        roomName = firstToken || 'EMG';
      } else {
        roomName = p.status === 'ingresados' ? 'SALA' : 'EMG';
      }

      wardsSet.add(roomName);

      const patientService = p.service?.includes('MEDICINA_INTERNA_II')
        ? 'MEDICINA_INTERNA_II'
        : 'MEDICINA_INTERNA_I';

      const bedCode = cubRaw || `CAMA ${p.internalCode || p.id.slice(-4)}`;

      extraBeds.push({
        code: bedCode,
        room: roomName,
        bedNumber: 'C1',
        service: patientService,
        status: 'OCUPADA',
        patientId: p.id,
        patientName: p.fullName,
        triageLevel: p.triageLevel
      });
      assignedPatientIds.add(p.id);
    });

    // 3. Orden: Camas ocupadas con pacientes PRIMERO para visualización inmediata, luego camas disponibles
    const allBedList = [...Array.from(bedsMap.values()), ...extraBeds];
    allBedList.sort((a, b) => {
      const aHasPat = Boolean(a.patientId);
      const bHasPat = Boolean(b.patientId);

      // Si una tiene paciente y la otra no, la que tiene paciente va primero
      if (aHasPat && !bHasPat) return -1;
      if (!aHasPat && bHasPat) return 1;

      // Si ambas tienen paciente o ambas están libres, ordenar por sala y cama
      const roomA = parseInt(a.room, 10);
      const roomB = parseInt(b.room, 10);

      if (!isNaN(roomA) && !isNaN(roomB)) {
        if (roomA !== roomB) return roomA - roomB;
        return a.bedNumber.localeCompare(b.bedNumber);
      }
      if (!isNaN(roomA)) return -1;
      if (!isNaN(roomB)) return 1;
      return a.code.localeCompare(b.code);
    });

    const sortedWards = Array.from(wardsSet).sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      if (!isNaN(numA)) return -1;
      if (!isNaN(numB)) return 1;
      return a.localeCompare(b);
    });

    return { allBeds: allBedList, availableWards: sortedWards };
  }, [patients]);

  // Filtrado de camas según servicio, pabellón, búsqueda y filtro de pacientes
  const filteredBeds = useMemo(() => {
    return allBeds.filter((bed) => {
      // Filtro de solo pacientes si está activo
      if (filterOnlyPatients && !bed.patientId) {
        return false;
      }

      // Filtro de Servicio
      if (service !== 'TODAS') {
        const patient = bed.patientId ? patientsMap.get(bed.patientId) : undefined;
        const matchesBed = bed.service === service;
        const matchesPatient = patient?.service === service;
        if (!matchesBed && !matchesPatient) {
          return false;
        }
      }

      // Filtro de Pabellón (Normalizar 'TODAS' y 'TODOS')
      const isAllWards = !selectedWard || selectedWard === 'TODAS' || selectedWard === 'TODOS';
      if (!isAllWards && bed.room !== selectedWard) {
        return false;
      }

      // Filtro de Búsqueda de texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const bedMatch = bed.code.toLowerCase().includes(q) || bed.room.toLowerCase().includes(q);
        if (bedMatch) return true;

        if (bed.patientId) {
          const pat = patientsMap.get(bed.patientId);
          if (pat) {
            const nameMatch = pat.fullName.toLowerCase().includes(q);
            const idMatch = (pat.idDocument || '').toLowerCase().includes(q);
            const recordMatch = (pat.medicalRecordNumber || '').toLowerCase().includes(q);
            const complaintMatch = (pat.chiefComplaint || '').toLowerCase().includes(q);
            const clinicalDiagMatch =
              (pat.clinicalHistory?.diagnosesList || []).some((d) => d.name.toLowerCase().includes(q)) ||
              (pat.diagnosesList || []).some((d) => d.name.toLowerCase().includes(q)) ||
              (pat.clinicalHistory?.clinicalImpression || '').toLowerCase().includes(q);
            return nameMatch || idMatch || recordMatch || complaintMatch || clinicalDiagMatch;
          }
        }
        return false;
      }

      return true;
    });
  }, [allBeds, filterOnlyPatients, service, selectedWard, searchQuery, patientsMap]);

  // Cálculo del censo hospitalario (Sección 5)
  const census = useMemo(() => {
    const totalBeds = allBeds.length;
    let occupied = 0;
    let available = 0;

    allBeds.forEach((b) => {
      if (b.status === 'DISPONIBLE' && !b.patientId) available++;
      else occupied++;
    });

    const activePatientsCount = patients.filter((p) => !p.isDeleted && !p.isArchived).length;

    const todayStr = new Date().toISOString().slice(0, 10);
    let newAdmissions = 0;
    let transfers = 0;
    let discharges = 0;
    let deaths = 0;

    patients.forEach((p) => {
      const arrDate = (p.arrivalDateTime || '').slice(0, 10);
      if (arrDate === todayStr && p.status === 'ingresados') newAdmissions++;
      if (
        p.status === 'trasladados' ||
        p.status === 'referidos' ||
        p.disposition?.outcome === 'Referimiento'
      ) {
        transfers++;
      }
      if (
        p.status === 'alta' ||
        p.status === 'egresados' ||
        p.disposition?.outcome === 'Alta'
      ) {
        discharges++;
      }
      if (
        p.disposition?.outcome === 'Fallecimiento' ||
        (p.status as any) === 'fallecidos'
      ) {
        deaths++;
      }
    });

    return {
      totalPatients: activePatientsCount,
      totalBeds,
      availableBeds: available,
      newAdmissions,
      transfers,
      discharges,
      deaths
    };
  }, [allBeds, patients]);

  // Manejador para refrescar datos centrales
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshData();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Manejador de confirmación de diagnóstico de laboratorio sugerido (Sección 15 & 16)
  const handleConfirmSuggestedDiagnosis = async (patient: Patient, diagName: string) => {
    try {
      const existingList = patient.diagnosesList || patient.clinicalHistory?.diagnosesList || [];
      const alreadyExists = existingList.some(
        (d) => d.name.trim().toLowerCase() === diagName.trim().toLowerCase()
      );

      if (alreadyExists) return;

      const newStructuredDiag: StructuredDiagnosis = {
        id: `diag-sug-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: diagName.trim(),
        status: 'Confirmado',
        type: 'Secundario',
        notes: 'Confirmado desde Diagnóstico Sugerido de Laboratorio (Guardia)',
        orderIndex: existingList.length + 1
      };

      const updatedHistory: ClinicalHistory = patient.clinicalHistory
        ? {
            ...patient.clinicalHistory,
            diagnosesList: [...existingList, newStructuredDiag],
            clinicalImpression: patient.clinicalHistory.clinicalImpression
              ? `${patient.clinicalHistory.clinicalImpression} | ${diagName}`
              : diagName
          }
        : {
            reasonForConsultation: patient.chiefComplaint || '',
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
              abdominal: '',
              skin: '',
              neurological: ''
            },
            clinicalImpression: diagName,
            diagnosticAndTherapeuticPlan: '',
            diagnosesList: [newStructuredDiag]
          };

      const updatedPatient: Patient = {
        ...patient,
        clinicalHistory: updatedHistory,
        diagnosesList: [...existingList, newStructuredDiag]
      };

      await db.patients.put(updatedPatient);
      const author = currentUser?.name || 'Dr. Joel Colón';
      await centralSyncService.updatePatient(updatedPatient, author);
      await onRefreshData();
    } catch (err) {
      console.error('[Guardia] Error confirmando diagnóstico sugerido:', err);
    }
  };

  // Manejador para descartar diagnóstico sugerido en sesión
  const handleDiscardSuggestedDiagnosis = (patient: Patient, diagName: string) => {
    const key = `${patient.id}:${diagName.toLowerCase()}`;
    setDiscardedSuggestions((prev) => new Set(prev).add(key));
  };

  // Preparar datos para exportación Word y PDF
  const prepareExportData = useCallback((): GuardiaExportData => {
    const now = new Date();
    const guardDate = now.toLocaleDateString('es-DO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const currentHour = now.getHours();
    const shift =
      currentHour >= 7 && currentHour < 15
        ? 'Mañana (07:00 - 15:00)'
        : currentHour >= 15 && currentHour < 23
        ? 'Tarde (15:00 - 23:00)'
        : 'Noche (23:00 - 07:00)';

    const rows = filteredBeds.map((bed) => {
      const pat = bed.patientId ? patientsMap.get(bed.patientId) : undefined;
      const patLabs = pat ? labs.filter((l) => l.patientId === pat.id) : [];
      const patOrders = pat ? orders.filter((o) => o.patientId === pat.id && o.status !== 'Suspendida') : [];
      const patTasks = pat ? pendingTasks.filter((t) => t.patientId === pat.id) : [];

      // Diagnósticos clínicos activos
      const activeDx: string[] = [];
      const dList = pat?.diagnosesList || pat?.clinicalHistory?.diagnosesList;
      if (dList && dList.length > 0) {
        dList.forEach((d) => activeDx.push(d.name));
      } else if (pat?.clinicalHistory?.clinicalImpression) {
        activeDx.push(pat.clinicalHistory.clinicalImpression);
      }

      // Diagnósticos sugeridos por laboratorio
      const suggested = pat ? generateSuggestedLabDiagnoses(patLabs) : [];
      const validSuggested = suggested
        .filter((s) => !discardedSuggestions.has(`${pat?.id}:${s.name.toLowerCase()}`))
        .filter((s) => !activeDx.some((a) => a.toLowerCase() === s.name.toLowerCase()))
        .map((s) => s.name);

      return {
        bedCode: bed.code,
        patient: pat,
        chiefComplaint: pat?.chiefComplaint || '--',
        diagnoses: activeDx,
        suggestedDiagnoses: validSuggested,
        labs: patLabs,
        orders: patOrders,
        pendingTasks: patTasks
      };
    });

    const serviceTitle =
      service === 'MEDICINA_INTERNA_I'
        ? 'Medicina Interna I (Salas 301 a 308)'
        : service === 'MEDICINA_INTERNA_II'
        ? 'Medicina Interna II (Salas 309 a 317)'
        : 'Medicina Interna I y II (Salas 301 a 317)';

    return {
      serviceName: serviceTitle,
      guardDate,
      shift,
      attendingDoctor: currentUser?.name || 'Dr. Joel Colón',
      totalPatients: census.totalPatients,
      totalBeds: census.totalBeds,
      availableBeds: census.availableBeds,
      newAdmissions: census.newAdmissions,
      transfers: census.transfers,
      discharges: census.discharges,
      deaths: census.deaths,
      patients: rows
    };
  }, [
    filteredBeds,
    patientsMap,
    labs,
    orders,
    pendingTasks,
    discardedSuggestions,
    service,
    currentUser,
    census
  ]);

  const handleExportWord = () => {
    const data = prepareExportData();
    exportGuardiaToWord(data);
  };

  const handlePrintPdf = () => {
    const data = prepareExportData();
    printGuardiaPdf(data);
  };

  // Pacientes disponibles para crear tareas o añadir paraclínicas
  const availablePatients = useMemo(() => {
    return patients.filter((p) => !p.isDeleted && !p.isArchived);
  }, [patients]);

  return (
    <div
      className={`min-h-screen transition-colors duration-200 pb-16 ${
        isGuardMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100/70 text-slate-900'
      }`}
    >
      {/* Contenedor Fluido con ancho amplio optimizado para tabla horizontal */}
      <div className="max-w-[1700px] mx-auto px-2 sm:px-4 py-4 space-y-4">
        {/* Cabecera Clínica & Panel de Control de Guardia */}
        <GuardiaHeader
          service={service}
          onChangeService={setService}
          guardDate={new Date().toLocaleDateString('es-DO', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          })}
          shift={
            new Date().getHours() >= 7 && new Date().getHours() < 15
              ? 'Mañana (07:00 - 15:00)'
              : new Date().getHours() >= 15 && new Date().getHours() < 23
              ? 'Tarde (15:00 - 23:00)'
              : 'Noche (23:00 - 07:00)'
          }
          attendingDoctor={currentUser?.name || 'Dr. Joel Colón'}
          totalPatients={census.totalPatients}
          totalBeds={census.totalBeds}
          availableBeds={census.availableBeds}
          newAdmissions={census.newAdmissions}
          transfers={census.transfers}
          discharges={census.discharges}
          deaths={census.deaths}
          viewMode={viewMode}
          onChangeViewMode={setViewMode}
          isGuardMode={isGuardMode}
          onToggleGuardMode={handleToggleGuardMode}
          selectedWard={selectedWard}
          onChangeWard={setSelectedWard}
          availableWards={availableWards}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterOnlyPatients={filterOnlyPatients}
          onToggleOnlyPatients={setFilterOnlyPatients}
          onOpenAddPending={() => {
            setPendingPreselectedPatientId(undefined);
            setIsAddPendingOpen(true);
          }}
          onOpenAddLab={() => {
            setLabPreselectedPatientId(undefined);
            setIsAddLabOpen(true);
          }}
          onOpenAdmitPatient={() => {
            setAdmitBedCode(undefined);
            setIsAdmitPatientOpen(true);
          }}
          onExportWord={handleExportWord}
          onPrintPdf={handlePrintPdf}
          onRefresh={handleManualRefresh}
          isRefreshing={isRefreshing}
        />

        {/* Vista Principal: TABLA HORIZONTAL CLÍNICA (Predeterminada) */}
        {viewMode === 'TABLA' ? (
          <GuardiaHorizontalTable
            beds={filteredBeds}
            patientsMap={patientsMap}
            labs={labs}
            orders={orders}
            pendingTasks={pendingTasks}
            currentUser={currentUser ? { name: currentUser.name, role: currentUser.role } : undefined}
            lastRemoteUpdate={lastRemoteUpdate}
            onSelectPatient={(patient) => setDrawerPatient(patient)}
            onOpenAddPending={(patient) => {
              setPendingPreselectedPatientId(patient.id);
              setIsAddPendingOpen(true);
            }}
            onOpenAddLab={(patient) => {
              setLabPreselectedPatientId(patient.id);
              setIsAddLabOpen(true);
            }}
            onOpenAdmitToBed={(bed) => {
              setAdmitBedCode(bed.code);
              setIsAdmitPatientOpen(true);
            }}
            onOpenAddOrder={(patient) => {
              setSelectedActionPatient(patient);
              setIsAddOrderOpen(true);
            }}
            onOpenQuickEvolution={(patient) => {
              setSelectedActionPatient(patient);
              setIsQuickEvolutionOpen(true);
            }}
            onOpenQuickDiagnosis={(patient) => {
              setSelectedActionPatient(patient);
              setIsQuickDiagnosisOpen(true);
            }}
            onOpenEditComplaint={(patient) => {
              setSelectedActionPatient(patient);
              setIsEditComplaintOpen(true);
            }}
            onOpenTrendModal={(patientName, paramName, pLabs) => {
              setTrendModal({
                isOpen: true,
                patientName,
                parameterName: paramName,
                labs: pLabs
              });
            }}
            onOpenEvolutionModal={(patient) => {
              if (onOpenEvolutionModal) onOpenEvolutionModal(patient);
              else if (onSelectPatientDossier) onSelectPatientDossier(patient, 'evolutions');
            }}
            onOpenOrderModal={(patient) => {
              if (onOpenOrderModal) onOpenOrderModal(patient);
              else if (onSelectPatientDossier) onSelectPatientDossier(patient, 'orders');
            }}
            onOpenHistoryModal={(patient) => {
              if (onOpenHistoryModal) onOpenHistoryModal(patient);
              else if (onSelectPatientDossier) onSelectPatientDossier(patient, 'history');
            }}
            onConfirmSuggestedDiagnosis={handleConfirmSuggestedDiagnosis}
            onDiscardSuggestedDiagnosis={handleDiscardSuggestedDiagnosis}
          />
        ) : (
          /* Vista Secundaria: CAMAS CLÍNICAS POR PABELLÓN */
          <GuardiaBedCardView
            beds={filteredBeds}
            patientsMap={patientsMap}
            pendingTasks={pendingTasks}
            labs={labs}
            onSelectPatient={(patient) => setDrawerPatient(patient)}
            onOpenAddPending={(patient) => {
              setPendingPreselectedPatientId(patient.id);
              setIsAddPendingOpen(true);
            }}
            onOpenAdmitToBed={(bed) => {
              setAdmitBedCode(bed.code);
              setIsAdmitPatientOpen(true);
            }}
          />
        )}
      </div>

      {/* Drawer Lateral Rápido del Paciente (Sección 32) */}
      <FastPatientDrawer
        isOpen={Boolean(drawerPatient)}
        onClose={() => setDrawerPatient(null)}
        patient={drawerPatient}
        labs={labs}
        orders={orders}
        pendingTasks={pendingTasks}
        evolutions={evolutions}
        onOpenFullDossier={(patient) => {
          setDrawerPatient(null);
          if (onSelectPatientDossier) onSelectPatientDossier(patient, 'vitals');
        }}
        onOpenAddPending={(patient) => {
          setPendingPreselectedPatientId(patient.id);
          setIsAddPendingOpen(true);
        }}
        onOpenAddLab={(patient) => {
          setLabPreselectedPatientId(patient.id);
          setIsAddLabOpen(true);
        }}
      />

      {/* Modal para Crear Pendiente Clínico con Prioridad y Horario */}
      <AddPendingModal
        isOpen={isAddPendingOpen}
        onClose={() => setIsAddPendingOpen(false)}
        patients={availablePatients}
        preselectedPatientId={pendingPreselectedPatientId}
        currentUser={currentUser ? { name: currentUser.name, role: currentUser.role } : undefined}
        onTaskCreated={async () => {
          await onRefreshData();
        }}
      />

      {/* Modal para Carga de Paraclínicas con Validación Médica */}
      <AddLabModal
        isOpen={isAddLabOpen}
        onClose={() => setIsAddLabOpen(false)}
        patients={availablePatients}
        preselectedPatientId={labPreselectedPatientId}
        currentUser={currentUser ? { name: currentUser.name, role: currentUser.role } : undefined}
        onLabSaved={async () => {
          await onRefreshData();
        }}
      />

      {/* Modal de Curvas de Tendencia Paraclínica Longitudinal */}
      <TrendChartModal
        isOpen={trendModal.isOpen}
        onClose={() => setTrendModal((prev) => ({ ...prev, isOpen: false }))}
        patientName={trendModal.patientName}
        parameterName={trendModal.parameterName}
        labs={trendModal.labs}
      />

      {/* Modal para Ingresar o Asignar Paciente Directo a Cama de Guardia */}
      <AdmitPatientModal
        isOpen={isAdmitPatientOpen}
        onClose={() => setIsAdmitPatientOpen(false)}
        availableBeds={allBeds}
        preselectedBedCode={admitBedCode}
        existingPatients={patients}
        currentUser={currentUser}
        onSuccess={async () => {
          await onRefreshData();
        }}
      />

      {/* Modal para Prescribir Órdenes Médicas / Antibióticos [D-X] */}
      <AddOrderModal
        isOpen={isAddOrderOpen}
        onClose={() => {
          setIsAddOrderOpen(false);
          setSelectedActionPatient(null);
        }}
        patient={selectedActionPatient}
        currentUser={currentUser}
        onOrderSaved={async () => {
          await onRefreshData();
        }}
      />

      {/* Modal para Nota Rápida de Evolución Médica de Guardia */}
      <QuickEvolutionModal
        isOpen={isQuickEvolutionOpen}
        onClose={() => {
          setIsQuickEvolutionOpen(false);
          setSelectedActionPatient(null);
        }}
        patient={selectedActionPatient}
        currentUser={currentUser}
        onEvolutionSaved={async () => {
          await onRefreshData();
        }}
      />

      {/* Modal para Agregar Diagnóstico Nosológico Clínico */}
      <QuickDiagnosisModal
        isOpen={isQuickDiagnosisOpen}
        onClose={() => {
          setIsQuickDiagnosisOpen(false);
          setSelectedActionPatient(null);
        }}
        patient={selectedActionPatient}
        currentUser={currentUser}
        onDiagnosisSaved={async () => {
          await onRefreshData();
        }}
      />

      {/* Modal para Edición Rápida de Motivo de Consulta / Ingreso */}
      <QuickEditChiefComplaintModal
        isOpen={isEditComplaintOpen}
        onClose={() => {
          setIsEditComplaintOpen(false);
          setSelectedActionPatient(null);
        }}
        patient={selectedActionPatient}
        currentUser={currentUser}
        onSaved={async () => {
          await onRefreshData();
        }}
      />
    </div>
  );
};
