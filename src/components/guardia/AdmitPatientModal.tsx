import React, { useState, useMemo } from 'react';
import { Patient, GuardiaClinicalBed, TriageLevel, User } from '../../types';
import { db } from '../../db/dexieDb';
import { centralSyncService } from '../../services/centralSyncService';
import { X, UserPlus, Bed, Search, CheckCircle2, ArrowRightLeft, Sparkles, Building2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  availableBeds: GuardiaClinicalBed[];
  preselectedBedCode?: string;
  existingPatients: Patient[];
  currentUser?: User;
  onSuccess: () => Promise<void>;
}

export const AdmitPatientModal: React.FC<Props> = ({
  isOpen,
  onClose,
  availableBeds,
  preselectedBedCode,
  existingPatients,
  currentUser,
  onSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'TRANSFER' | 'NEW'>('TRANSFER');
  const [selectedBedCode, setSelectedBedCode] = useState<string>(preselectedBedCode || availableBeds[0]?.code || '301 C1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modo Transferencia desde Emergencia / Planta
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [patientSearch, setPatientSearch] = useState<string>('');

  // Modo Nuevo Paciente
  const [newPatientData, setNewPatientData] = useState({
    fullName: '',
    idDocument: '',
    medicalRecordNumber: '',
    age: '',
    sex: 'M' as 'M' | 'F' | 'Otro',
    chiefComplaint: '',
    initialDiagnosis: '',
    triageLevel: 3 as TriageLevel,
    provenance: 'Emergencias'
  });

  // Actualizar cama seleccionada cuando cambie preselectedBedCode
  React.useEffect(() => {
    if (preselectedBedCode) {
      setSelectedBedCode(preselectedBedCode);
    }
  }, [preselectedBedCode]);

  if (!isOpen) return null;

  // Filtrar pacientes activos que no tengan aún esta cama asignada
  const unassignedPatients = existingPatients.filter((p) => {
    if (p.isDeleted || p.isArchived) return false;
    if (patientSearch.trim()) {
      const q = patientSearch.toLowerCase().trim();
      const matchName = p.fullName.toLowerCase().includes(q);
      const matchDoc = (p.idDocument || '').toLowerCase().includes(q);
      const matchRec = (p.medicalRecordNumber || '').toLowerCase().includes(q);
      return matchName || matchDoc || matchRec;
    }
    return true;
  });

  const selectedBedObj = availableBeds.find((b) => b.code === selectedBedCode);

  // Manejador: Asignar paciente existente a la cama
  const handleAssignExistingPatient = async () => {
    if (!selectedPatientId) {
      alert('Por favor selecciona un paciente de la lista.');
      return;
    }
    if (!selectedBedCode) {
      alert('Por favor selecciona una cama de destino.');
      return;
    }

    setIsSubmitting(true);
    try {
      const targetPatient = existingPatients.find((p) => p.id === selectedPatientId);
      if (!targetPatient) throw new Error('Paciente no encontrado.');

      const roomNum = parseInt(selectedBedCode.split(' ')[0], 10);
      const targetService = roomNum >= 309 ? 'MEDICINA_INTERNA_II' : 'MEDICINA_INTERNA_I';

      const updatedPatient: Patient = {
        ...targetPatient,
        cubicle: selectedBedCode,
        status: 'ingresados',
        service: targetService,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.name || 'Dr. Joel Colón'
      };

      await db.patients.put(updatedPatient);
      await centralSyncService.updatePatient(updatedPatient, currentUser?.name || 'Dr. Joel Colón');
      await onSuccess();
      onClose();
    } catch (err: any) {
      alert('Error al asignar cama al paciente: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manejador: Registrar y crear nuevo paciente directamente en la cama
  const handleCreateNewPatient = async () => {
    if (!newPatientData.fullName.trim()) {
      alert('El nombre del paciente es obligatorio.');
      return;
    }
    if (!selectedBedCode) {
      alert('Por favor selecciona una cama para el paciente.');
      return;
    }

    setIsSubmitting(true);
    try {
      const roomNum = parseInt(selectedBedCode.split(' ')[0], 10);
      const targetService = roomNum >= 309 ? 'MEDICINA_INTERNA_II' : 'MEDICINA_INTERNA_I';
      const now = new Date().toISOString();
      const newId = `pat-${Date.now()}`;
      const code = `MI-${new Date().getFullYear()}-${String(existingPatients.length + 1).padStart(3, '0')}`;

      const createdPatient: Patient = {
        id: newId,
        internalCode: code,
        medicalRecordNumber: newPatientData.medicalRecordNumber || `REC-${Date.now().toString().slice(-5)}`,
        fullName: newPatientData.fullName.trim().toUpperCase(),
        idDocument: newPatientData.idDocument.trim(),
        age: parseInt(newPatientData.age, 10) || 0,
        sex: newPatientData.sex,
        arrivalDateTime: now.slice(0, 16).replace('T', ' '),
        provenance: newPatientData.provenance,
        cubicle: selectedBedCode,
        triageLevel: newPatientData.triageLevel,
        chiefComplaint: newPatientData.chiefComplaint.trim() || 'Ingreso directo a Medicina Interna',
        status: 'ingresados',
        attendingDoctor: currentUser?.name || 'Dr. Joel Colón',
        service: targetService,
        createdAt: now,
        updatedAt: now,
        createdBy: currentUser?.name || 'Dr. Joel Colón',
        clinicalHistory: {
          reasonForConsultation: newPatientData.chiefComplaint.trim() || 'Ingreso directo a Medicina Interna',
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
          clinicalImpression: newPatientData.initialDiagnosis.trim() || 'En estudio clínico de Medicina Interna',
          diagnosticAndTherapeuticPlan: '',
          diagnosesList: newPatientData.initialDiagnosis.trim()
            ? [
                {
                  id: `diag-${Date.now()}`,
                  name: newPatientData.initialDiagnosis.trim(),
                  status: 'Confirmado',
                  type: 'Primario',
                  notes: 'Diagnóstico de ingreso a guardia',
                  orderIndex: 1
                }
              ]
            : []
        },
        diagnosesList: newPatientData.initialDiagnosis.trim()
          ? [
              {
                id: `diag-${Date.now()}`,
                name: newPatientData.initialDiagnosis.trim(),
                status: 'Confirmado',
                type: 'Primario',
                notes: 'Diagnóstico de ingreso a guardia',
                orderIndex: 1
              }
            ]
          : []
      };

      await db.patients.put(createdPatient);
      await centralSyncService.createPatient(createdPatient, currentUser?.name || 'Dr. Joel Colón');
      await onSuccess();
      onClose();
    } catch (err: any) {
      alert('Error al registrar paciente: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in select-none">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="bg-[#0F4C5C] px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-800/80 flex items-center justify-center border border-teal-500/40">
              <UserPlus className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-tight">Ingresar Paciente a Guardia de Medicina Interna</h3>
              <p className="text-[11px] text-teal-200">Asignar cama clínica o registrar nuevo ingreso directo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-teal-200 hover:text-white hover:bg-teal-800/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector de Cama de Destino Fijo Superior */}
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bed className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-700">Cama de Destino:</span>
            <select
              value={selectedBedCode}
              onChange={(e) => setSelectedBedCode(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-3 py-1 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
            >
              {availableBeds.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.code} ({b.status === 'DISPONIBLE' ? 'Libre' : 'Ocupada'} - Sala {b.room})
                </option>
              ))}
            </select>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
            {parseInt(selectedBedCode.split(' ')[0] || '0', 10) >= 309
              ? 'Medicina Interna II'
              : 'Medicina Interna I'}
          </span>
        </div>

        {/* Pestañas de Modo */}
        <div className="flex border-b border-slate-200 px-5 bg-white">
          <button
            onClick={() => setActiveTab('TRANSFER')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'TRANSFER'
                ? 'border-[#0F4C5C] text-[#0F4C5C]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Asignar Paciente Existente</span>
          </button>
          <button
            onClick={() => setActiveTab('NEW')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'NEW'
                ? 'border-[#0F4C5C] text-[#0F4C5C]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Registrar Nuevo Paciente</span>
          </button>
        </div>

        {/* Contenido según pestaña */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'TRANSFER' ? (
            <div className="space-y-3">
              {/* Buscador de Paciente */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  placeholder="Buscar paciente por nombre, cédula o récord..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
                />
              </div>

              {/* Lista de Pacientes Seleccionables */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[280px] overflow-y-auto divide-y divide-slate-100 bg-white">
                {unassignedPatients.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No se encontraron pacientes activos con ese criterio.
                  </div>
                ) : (
                  unassignedPatients.map((p) => {
                    const isSelected = selectedPatientId === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPatientId(p.id)}
                        className={`p-3 cursor-pointer flex items-center justify-between transition-colors ${
                          isSelected ? 'bg-teal-50/80 border-l-4 border-[#0F4C5C]' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-slate-900">{p.fullName}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold bg-slate-100 text-slate-600">
                              {p.cubicle || 'Sin cama'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span>{p.age} años</span>
                            <span>•</span>
                            <span>{p.sex}</span>
                            <span>•</span>
                            <span>Céd: {p.idDocument || '--'}</span>
                            <span>•</span>
                            <span>Réc: {p.medicalRecordNumber || '--'}</span>
                          </div>
                          <div className="text-[10px] text-slate-600 italic line-clamp-1">
                            Dx/Motivo: {p.clinicalHistory?.clinicalImpression || p.chiefComplaint || 'En estudio'}
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* Formulario para Nuevo Paciente Directo a Guardia */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  value={newPatientData.fullName}
                  onChange={(e) => setNewPatientData({ ...newPatientData, fullName: e.target.value })}
                  placeholder="Ej. JUAN PÉREZ GÓMEZ"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-hidden font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Cédula / Identificación</label>
                <input
                  type="text"
                  value={newPatientData.idDocument}
                  onChange={(e) => setNewPatientData({ ...newPatientData, idDocument: e.target.value })}
                  placeholder="001-0000000-0"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Récord Médico</label>
                <input
                  type="text"
                  value={newPatientData.medicalRecordNumber}
                  onChange={(e) => setNewPatientData({ ...newPatientData, medicalRecordNumber: e.target.value })}
                  placeholder="REC-XXXXX"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Edad</label>
                <input
                  type="number"
                  value={newPatientData.age}
                  onChange={(e) => setNewPatientData({ ...newPatientData, age: e.target.value })}
                  placeholder="Años"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Sexo</label>
                <select
                  value={newPatientData.sex}
                  onChange={(e) => setNewPatientData({ ...newPatientData, sex: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
                >
                  <option value="M">Masculino (M)</option>
                  <option value="F">Femenino (F)</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Motivo de Consulta / Ingreso</label>
                <input
                  type="text"
                  value={newPatientData.chiefComplaint}
                  onChange={(e) => setNewPatientData({ ...newPatientData, chiefComplaint: e.target.value })}
                  placeholder="Ej. Disnea progresiva y fiebre de 4 días de evolución"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Diagnóstico Inicial de Guardia</label>
                <input
                  type="text"
                  value={newPatientData.initialDiagnosis}
                  onChange={(e) => setNewPatientData({ ...newPatientData, initialDiagnosis: e.target.value })}
                  placeholder="Ej. Neumonía Adquirida en la Comunidad (NAC)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-hidden font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Procedencia</label>
                <select
                  value={newPatientData.provenance}
                  onChange={(e) => setNewPatientData({ ...newPatientData, provenance: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
                >
                  <option value="Emergencias">Emergencias</option>
                  <option value="Domicilio">Domicilio</option>
                  <option value="Traslado de otro Centro">Traslado de otro Centro</option>
                  <option value="Consulta Externa">Consulta Externa</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nivel de Triage</label>
                <select
                  value={newPatientData.triageLevel}
                  onChange={(e) => setNewPatientData({ ...newPatientData, triageLevel: parseInt(e.target.value, 10) as TriageLevel })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
                >
                  <option value={1}>1 - Reanimación (Rojo)</option>
                  <option value={2}>2 - Emergencia (Naranja)</option>
                  <option value={3}>3 - Urgencia (Amarillo)</option>
                  <option value={4}>4 - Menor (Verde)</option>
                  <option value={5}>5 - No urgente (Azul)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer con Acciones */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancelar
          </button>

          {activeTab === 'TRANSFER' ? (
            <button
              onClick={handleAssignExistingPatient}
              disabled={isSubmitting || !selectedPatientId}
              className="px-5 py-2 bg-[#0F4C5C] hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>{isSubmitting ? 'Asignando...' : `Asignar a Cama ${selectedBedCode}`}</span>
            </button>
          ) : (
            <button
              onClick={handleCreateNewPatient}
              disabled={isSubmitting || !newPatientData.fullName.trim()}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isSubmitting ? 'Guardando...' : `Registrar e Ingresar a Cama ${selectedBedCode}`}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
