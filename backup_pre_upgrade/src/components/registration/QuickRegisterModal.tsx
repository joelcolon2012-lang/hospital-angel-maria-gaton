import React, { useState } from 'react';
import { Patient, TriageLevel } from '../../types';
import { X, UserPlus, AlertTriangle, Mic } from 'lucide-react';
import { VoiceDictationButton } from '../common/VoiceDictationButton';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSavePatient: (patientData: Partial<Patient>) => void;
  existingPatients: Patient[];
}

export const QuickRegisterModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSavePatient,
  existingPatients,
}) => {
  const defaultCode = `EMG-${new Date().getFullYear()}-${String(existingPatients.length + 1).padStart(3, '0')}`;
  const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');

  const [formData, setFormData] = useState({
    internalCode: defaultCode,
    medicalRecordNumber: '',
    fullName: '',
    idDocument: '',
    age: '',
    sex: 'M' as 'M' | 'F' | 'Otro',
    phone: '',
    emergencyContact: '',
    arrivalDateTime: nowStr,
    provenance: 'Domicilio',
    cubicle: 'Cubículo 1',
    triageLevel: 3 as TriageLevel,
    chiefComplaint: '',
    attendingDoctor: 'Dr. Colón',
  });

  const [duplicateMatch, setDuplicateMatch] = useState<Patient | null>(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  if (!isOpen) return null;

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const checkForDuplicates = (): Patient | null => {
    const trimmedName = formData.fullName.trim().toLowerCase();
    const trimmedDoc = formData.idDocument.trim().toLowerCase();
    const trimmedRec = formData.medicalRecordNumber.trim().toLowerCase();

    if (!trimmedName && !trimmedDoc && !trimmedRec) return null;

    return (
      existingPatients.find((p) => {
        if (trimmedDoc && p.idDocument && p.idDocument.toLowerCase() === trimmedDoc) return true;
        if (trimmedRec && p.medicalRecordNumber && p.medicalRecordNumber.toLowerCase() === trimmedRec) return true;
        if (trimmedName.length > 3 && p.fullName.toLowerCase() === trimmedName) return true;
        return false;
      }) || null
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.chiefComplaint.trim()) {
      alert('Por favor completa al menos el nombre y el motivo de consulta.');
      return;
    }

    // Check for duplicates
    const duplicate = checkForDuplicates();
    if (duplicate && !showDuplicateWarning) {
      setDuplicateMatch(duplicate);
      setShowDuplicateWarning(true);
      return;
    }

    saveAndFinish();
  };

  const saveAndFinish = () => {
    const newPatient: Partial<Patient> = {
      internalCode: formData.internalCode || defaultCode,
      medicalRecordNumber: formData.medicalRecordNumber,
      fullName: formData.fullName.trim(),
      idDocument: formData.idDocument.trim(),
      age: formData.age ? parseInt(formData.age, 10) : undefined,
      sex: formData.sex,
      phone: formData.phone,
      emergencyContact: formData.emergencyContact,
      arrivalDateTime: formData.arrivalDateTime,
      provenance: formData.provenance,
      cubicle: formData.cubicle,
      triageLevel: formData.triageLevel,
      chiefComplaint: formData.chiefComplaint.trim(),
      status: 'activos',
      attendingDoctor: formData.attendingDoctor,
      vitals: {
        hemodynamicStatus: 'Estable',
        allergies: [],
        comorbidities: [],
      },
    };

    onSavePatient(newPatient);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="bg-[#0F4C5C] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base sm:text-lg font-bold">Registro Rápido de Emergencia</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Duplicate Warning Prompt */}
        {showDuplicateWarning && duplicateMatch && (
          <div className="bg-amber-50 border-b border-amber-200 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900">
                <p className="font-bold">¡Posible Registro Duplicado Detectado!</p>
                <p className="mt-0.5">
                  Ya existe un paciente con datos coincidentes: <strong>{duplicateMatch.fullName}</strong> ({duplicateMatch.internalCode}, {duplicateMatch.cubicle}).
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={saveAndFinish}
                    className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-bold"
                  >
                    Confirmar y Registrar como Nuevo Episodio
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDuplicateWarning(false)}
                    className="px-3 py-1.5 bg-white border border-amber-300 text-amber-800 rounded-lg font-semibold"
                  >
                    Volver y Editar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Triage Level Selector - Touch friendly */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nivel de Triaje (Obligatorio)
            </label>
            <div className="grid grid-cols-5 gap-1.5 text-center text-xs font-bold">
              {[
                { lvl: 1, label: 'I - Rean.', color: 'border-red-600 text-red-700 active:bg-red-600', active: 'bg-red-600 text-white' },
                { lvl: 2, label: 'II - Emerg.', color: 'border-amber-500 text-amber-700 active:bg-amber-500', active: 'bg-amber-500 text-white' },
                { lvl: 3, label: 'III - Urg.', color: 'border-yellow-400 text-yellow-800 active:bg-yellow-400', active: 'bg-yellow-400 text-slate-900' },
                { lvl: 4, label: 'IV - Prior.', color: 'border-emerald-600 text-emerald-700 active:bg-emerald-600', active: 'bg-emerald-600 text-white' },
                { lvl: 5, label: 'V - No Urg.', color: 'border-blue-600 text-blue-700 active:bg-blue-600', active: 'bg-blue-600 text-white' },
              ].map((item) => (
                <button
                  key={item.lvl}
                  type="button"
                  onClick={() => handleChange('triageLevel', item.lvl as TriageLevel)}
                  className={`py-2 px-1 rounded-xl border-2 transition-all ${
                    formData.triageLevel === item.lvl
                      ? item.active + ' shadow-md scale-[1.02]'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="block text-sm font-black">{item.lvl}</span>
                  <span className="block text-[10px] leading-tight">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Identification fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre y Apellidos *</label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                placeholder="Ej. Juan Pérez Santana"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-petrol-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Cédula / Documento (Opcional)</label>
              <input
                type="text"
                value={formData.idDocument}
                onChange={(e) => handleChange('idDocument', e.target.value)}
                placeholder="Ej. 001-XXXXXXX-X"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-petrol-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Edad</label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => handleChange('age', e.target.value)}
                placeholder="Años"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-petrol-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sexo</label>
              <select
                value={formData.sex}
                onChange={(e) => handleChange('sex', e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-petrol-800"
              >
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Expediente (Opcional)</label>
              <input
                type="text"
                value={formData.medicalRecordNumber}
                onChange={(e) => handleChange('medicalRecordNumber', e.target.value)}
                placeholder="EXP-XXXX"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-petrol-800"
              />
            </div>
          </div>

          {/* Cubículo y Procedencia */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Cubículo / Cama / Área *</label>
              <input
                type="text"
                required
                value={formData.cubicle}
                onChange={(e) => handleChange('cubicle', e.target.value)}
                placeholder="Ej. Shock 1, Cubículo 4, Observación..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-petrol-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Procedencia</label>
              <select
                value={formData.provenance}
                onChange={(e) => handleChange('provenance', e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-petrol-800"
              >
                <option value="Domicilio">Domicilio</option>
                <option value="Ambulancia 9-1-1">Ambulancia 9-1-1</option>
                <option value="Traslado interhospitalario">Traslado interhospitalario</option>
                <option value="Vía pública">Vía pública</option>
                <option value="Consulta externa">Consulta externa</option>
              </select>
            </div>
          </div>

          {/* Motivo de consulta con dictado */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Motivo de Consulta *
              </label>
              <VoiceDictationButton
                onTranscript={(text) =>
                  setFormData((prev) => ({
                    ...prev,
                    chiefComplaint: prev.chiefComplaint ? `${prev.chiefComplaint} ${text}` : text,
                  }))
                }
              />
            </div>
            <textarea
              required
              rows={2}
              value={formData.chiefComplaint}
              onChange={(e) => handleChange('chiefComplaint', e.target.value)}
              placeholder="Describa el síntoma principal o razón de ingreso a emergencia..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-petrol-800"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold rounded-2xl shadow-md transition-all text-sm flex items-center justify-center gap-2"
            >
              <span>Completar Ingreso a Emergencia</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
