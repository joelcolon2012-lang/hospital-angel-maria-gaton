import React, { useState } from 'react';
import { Patient, StructuredDiagnosis, ClinicalHistory, User } from '../../types';
import { db } from '../../db/dexieDb';
import { centralSyncService } from '../../services/centralSyncService';
import { X, Activity, Plus, CheckCircle2, Stethoscope } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  currentUser?: User;
  onDiagnosisSaved?: () => Promise<void>;
}

const COMMON_DIAGNOSES = [
  'Neumonía Adquirida en la Comunidad (NAC)',
  'Insuficiencia Cardíaca Congestiva descompensada',
  'Enfermedad Renal Aguda (AKI) / Azotemia',
  'Cetoacidosis Diabética (CAD)',
  'Estado Hiperosmolar Hiperglucémico',
  'Evento Cerebrovascular (EVC) Isquémico',
  'Infección de Vías Urinarias (ITU) Complicada',
  'Sepsis de foco pulmonar/urinario',
  'Cirrosis Hepática con Ascitis / Encefalopatía',
  'EPOC Exacerbado',
  'Hemorragia Digestiva Alta (HDA)',
  'Hipertensión Arterial Grado 2 / Crisis'
];

export const QuickDiagnosisModal: React.FC<Props> = ({
  isOpen,
  onClose,
  patient,
  currentUser,
  onDiagnosisSaved
}) => {
  const [diagName, setDiagName] = useState('');
  const [diagType, setDiagType] = useState<'Primario' | 'Secundario'>('Secundario');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !patient) return null;

  const handleSave = async () => {
    if (!diagName.trim()) {
      alert('El nombre del diagnóstico es obligatorio.');
      return;
    }

    setIsSubmitting(true);
    try {
      const existingList = patient.diagnosesList || patient.clinicalHistory?.diagnosesList || [];
      const newDiag: StructuredDiagnosis = {
        id: `diag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: diagName.trim(),
        status: 'Confirmado',
        type: diagType,
        notes: notes.trim() || 'Agregado desde Guardia de Medicina Interna',
        orderIndex: existingList.length + 1
      };

      const updatedHistory: ClinicalHistory = patient.clinicalHistory
        ? {
            ...patient.clinicalHistory,
            diagnosesList: [...existingList, newDiag],
            clinicalImpression: patient.clinicalHistory.clinicalImpression
              ? `${patient.clinicalHistory.clinicalImpression} | ${diagName.trim()}`
              : diagName.trim()
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
            physicalExam: { general: '', abdominal: '', skin: '', neurological: '' },
            clinicalImpression: diagName.trim(),
            diagnosticAndTherapeuticPlan: '',
            diagnosesList: [newDiag]
          };

      const updatedPatient: Patient = {
        ...patient,
        clinicalHistory: updatedHistory,
        diagnosesList: [...existingList, newDiag],
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.name || 'Dr. Joel Colón'
      };

      await db.patients.put(updatedPatient);
      await centralSyncService.updatePatient(updatedPatient, currentUser?.name || 'Dr. Joel Colón');
      if (onDiagnosisSaved) await onDiagnosisSaved();
      onClose();
    } catch (err: any) {
      alert('Error al guardar diagnóstico: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in select-none">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#0F4C5C] px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-800/80 flex items-center justify-center border border-teal-500/40">
              <Stethoscope className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-tight">Agregar Diagnóstico Clínico</h3>
              <p className="text-[11px] text-teal-200">
                Paciente: <strong className="text-white">{patient.fullName}</strong> • Cama: {patient.cubicle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-teal-200 hover:text-white hover:bg-teal-800/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Diagnósticos Frecuentes */}
        <div className="bg-slate-50 p-3 border-b border-slate-200">
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1.5">
            Diagnósticos Frecuentes en Medicina Interna:
          </span>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {COMMON_DIAGNOSES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDiagName(d)}
                className={`text-[10px] px-2 py-0.5 rounded-lg border font-bold text-left transition-all ${
                  diagName === d
                    ? 'bg-[#0F4C5C] text-white border-[#0F4C5C]'
                    : 'bg-white text-slate-700 border-slate-300 hover:border-teal-500 hover:bg-teal-50'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Formulario */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Diagnóstico Nosológico *</label>
            <input
              type="text"
              value={diagName}
              onChange={(e) => setDiagName(e.target.value)}
              placeholder="Ej. Síndrome Coronario Agudo sin elevación del ST"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-hidden font-bold text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tipo de Diagnóstico</label>
              <select
                value={diagType}
                onChange={(e) => setDiagType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-hidden font-semibold"
              >
                <option value="Secundario">Secundario / Comorbilidad</option>
                <option value="Primario">Primario / Principal de Ingreso</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Estado</label>
              <div className="px-3 py-2 bg-slate-100 rounded-xl font-bold text-emerald-800 flex items-center gap-1.5 border border-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Confirmado</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Notas / Criterios Clínicos</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Evidenciado por biomarcadores y ECG"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSubmitting || !diagName.trim()}
            className="px-5 py-2 bg-[#0F4C5C] hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>{isSubmitting ? 'Guardando...' : 'Agregar Diagnóstico'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
