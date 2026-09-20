import React, { useState } from 'react';
import { Patient, User, ClinicalHistory } from '../../types';
import { db } from '../../db/dexieDb';
import { centralSyncService } from '../../services/centralSyncService';
import { X, Edit3, CheckCircle2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  currentUser?: User;
  onSaved?: () => Promise<void>;
}

export const QuickEditChiefComplaintModal: React.FC<Props> = ({
  isOpen,
  onClose,
  patient,
  currentUser,
  onSaved
}) => {
  const [complaint, setComplaint] = useState(patient?.chiefComplaint || patient?.clinicalHistory?.reasonForConsultation || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (patient) {
      setComplaint(patient.chiefComplaint || patient.clinicalHistory?.reasonForConsultation || '');
    }
  }, [patient]);

  if (!isOpen || !patient) return null;

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const updatedHistory: ClinicalHistory = patient.clinicalHistory
        ? { ...patient.clinicalHistory, reasonForConsultation: complaint.trim() }
        : {
            reasonForConsultation: complaint.trim(),
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
            clinicalImpression: '',
            diagnosticAndTherapeuticPlan: ''
          };

      const updatedPatient: Patient = {
        ...patient,
        chiefComplaint: complaint.trim(),
        clinicalHistory: updatedHistory,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.name || 'Dr. Joel Colón'
      };

      await db.patients.put(updatedPatient);
      await centralSyncService.updatePatient(updatedPatient, currentUser?.name || 'Dr. Joel Colón');
      if (onSaved) await onSaved();
      onClose();
    } catch (err: any) {
      alert('Error al actualizar motivo de consulta: ' + (err.message || 'Error desconocido'));
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
              <Edit3 className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-tight">Editar Motivo de Consulta / Cuadro Clínico</h3>
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

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3 text-xs">
          <label className="block font-bold text-slate-700 mb-1">
            Motivo de Consulta / Historia de la Enfermedad Actual Resumida
          </label>
          <textarea
            rows={4}
            value={complaint}
            onChange={(e) => setComplaint(e.target.value)}
            placeholder="Describa el motivo de consulta o cuadro de ingreso..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-hidden leading-relaxed text-slate-900 font-medium"
          />
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
            disabled={isSubmitting}
            className="px-5 py-2 bg-[#0F4C5C] hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>{isSubmitting ? 'Guardando...' : 'Actualizar Motivo'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
