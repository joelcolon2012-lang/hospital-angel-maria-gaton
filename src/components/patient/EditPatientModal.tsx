import React, { useState } from 'react';
import { Patient, TriageLevel } from '../../types';
import { X, Save, UserCheck, AlertCircle, Edit3 } from 'lucide-react';
import { checkPatientDuplicates } from '../../services/patientDuplicateDetector';
import { DuplicateWarningModal } from './DuplicateWarningModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  existingPatients: Patient[];
  onSave: (updatedData: Partial<Patient>, changes: { field: string; oldVal: any; newVal: any }[]) => void;
  onOpenExistingPatient?: (patient: Patient) => void;
}

export const EditPatientModal: React.FC<Props> = ({
  isOpen,
  onClose,
  patient,
  existingPatients,
  onSave,
  onOpenExistingPatient,
}) => {
  // Descomponer nombre y apellidos si es posible
  const nameParts = (patient.fullName || '').split(' ');
  const initialFirstName = nameParts.slice(0, Math.max(1, nameParts.length - 1)).join(' ');
  const initialLastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

  // Extraer fecha y hora de llegada
  const arrivalParts = (patient.arrivalDateTime || '').split(' ');
  const initialDate = arrivalParts[0] || new Date().toISOString().slice(0, 10);
  const initialTime = arrivalParts[1] || '08:00';

  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [age, setAge] = useState(patient.age ? String(patient.age) : '');
  const [birthDate, setBirthDate] = useState(patient.birthDate || '');
  const [sex, setSex] = useState<'M' | 'F' | 'Otro'>(patient.sex || 'M');
  const [idDocument, setIdDocument] = useState(patient.idDocument || '');
  const [medicalRecordNumber, setMedicalRecordNumber] = useState(patient.medicalRecordNumber || '');
  const [phone, setPhone] = useState(patient.phone || '');
  const [address, setAddress] = useState(patient.address || '');
  const [emergencyContact, setEmergencyContact] = useState(patient.emergencyContact || '');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(patient.emergencyContactPhone || '');
  const [service, setService] = useState(patient.service || 'Emergencia Adultos');
  const [cubicle, setCubicle] = useState(patient.cubicle || '');
  const [arrivalDate, setArrivalDate] = useState(initialDate);
  const [arrivalTime, setArrivalTime] = useState(initialTime);
  const [provenance, setProvenance] = useState(patient.provenance || 'Domicilio');
  const [attendingDoctor, setAttendingDoctor] = useState(patient.attendingDoctor || 'Dr. Joel Colón');
  const [residentDoctor, setResidentDoctor] = useState(patient.residentDoctor || '');
  const [triageLevel, setTriageLevel] = useState<TriageLevel>(patient.triageLevel || 3);
  const [chiefComplaint, setChiefComplaint] = useState(patient.chiefComplaint || '');

  // Estado para modal de duplicados
  const [duplicateWarning, setDuplicateWarning] = useState<{
    show: boolean;
    patient: Patient | null;
    reasons: string[];
  }>({ show: false, patient: null, reasons: [] });

  if (!isOpen) return null;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const fullNewName = `${firstName.trim()} ${lastName.trim()}`.trim() || patient.fullName;

    // Verificar duplicados (excluyendo este paciente)
    const dupResult = checkPatientDuplicates(
      {
        id: patient.id,
        fullName: fullNewName,
        birthDate,
        idDocument,
        medicalRecordNumber,
        phone,
      },
      existingPatients
    );

    if (dupResult.isDuplicate && dupResult.matchedPatient) {
      setDuplicateWarning({
        show: true,
        patient: dupResult.matchedPatient,
        reasons: dupResult.matchReasons,
      });
      return;
    }

    executeSave();
  };

  const executeSave = () => {
    const fullNewName = `${firstName.trim()} ${lastName.trim()}`.trim() || patient.fullName;
    const newArrivalDateTime = `${arrivalDate} ${arrivalTime}`.trim();

    // Rastrear cambios para auditoría
    const changes: { field: string; oldVal: any; newVal: any }[] = [];
    const checkChange = (field: string, oldV: any, newV: any) => {
      if (String(oldV ?? '').trim() !== String(newV ?? '').trim()) {
        changes.push({ field, oldVal: oldV, newVal: newV });
      }
    };

    checkChange('fullName', patient.fullName, fullNewName);
    checkChange('age', patient.age, age ? parseInt(age, 10) : undefined);
    checkChange('birthDate', patient.birthDate, birthDate);
    checkChange('sex', patient.sex, sex);
    checkChange('idDocument', patient.idDocument, idDocument);
    checkChange('medicalRecordNumber', patient.medicalRecordNumber, medicalRecordNumber);
    checkChange('phone', patient.phone, phone);
    checkChange('address', patient.address, address);
    checkChange('emergencyContact', patient.emergencyContact, emergencyContact);
    checkChange('emergencyContactPhone', patient.emergencyContactPhone, emergencyContactPhone);
    checkChange('service', patient.service, service);
    checkChange('cubicle', patient.cubicle, cubicle);
    checkChange('arrivalDateTime', patient.arrivalDateTime, newArrivalDateTime);
    checkChange('provenance', patient.provenance, provenance);
    checkChange('attendingDoctor', patient.attendingDoctor, attendingDoctor);
    checkChange('residentDoctor', patient.residentDoctor, residentDoctor);
    checkChange('triageLevel', patient.triageLevel, triageLevel);
    checkChange('chiefComplaint', patient.chiefComplaint, chiefComplaint);

    const updatedData: Partial<Patient> = {
      fullName: fullNewName,
      age: age ? parseInt(age, 10) : undefined,
      birthDate: birthDate || undefined,
      sex,
      idDocument: idDocument.trim() || undefined,
      medicalRecordNumber: medicalRecordNumber.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      emergencyContact: emergencyContact.trim() || undefined,
      emergencyContactPhone: emergencyContactPhone.trim() || undefined,
      service: service.trim() || undefined,
      cubicle: cubicle.trim() || 'Cubículo',
      arrivalDateTime: newArrivalDateTime,
      provenance: provenance.trim() || 'Domicilio',
      attendingDoctor: attendingDoctor.trim() || 'Dr. Joel Colón',
      residentDoctor: residentDoctor.trim() || undefined,
      triageLevel,
      chiefComplaint: chiefComplaint.trim(),
    };

    onSave(updatedData, changes);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
          {/* Header */}
          <div className="bg-[#0F4C5C] px-6 py-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl">
                <Edit3 className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight">
                  EDITAR DATOS DEL PACIENTE
                </h3>
                <p className="text-xs text-teal-100 font-medium">
                  ID: <span className="font-mono font-bold text-white">{patient.internalCode}</span> • Modificación de datos demográficos y de ingreso
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleFormSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {/* Sección: Identificación y Datos Personales */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F4C5C] mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <UserCheck className="w-4 h-4" />
                <span>Identificación y Datos Personales</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Nombres *
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:border-[#0F4C5C] focus:ring-1 focus:ring-[#0F4C5C] outline-none transition-all"
                    placeholder="Primer y segundo nombre"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Apellidos *
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:border-[#0F4C5C] focus:ring-1 focus:ring-[#0F4C5C] outline-none transition-all"
                    placeholder="Apellidos del paciente"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Sexo
                  </label>
                  <select
                    value={sex}
                    onChange={(e) => setSex(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:border-[#0F4C5C] focus:ring-1 focus:ring-[#0F4C5C] outline-none transition-all"
                  >
                    <option value="M">Masculino (M)</option>
                    <option value="F">Femenino (F)</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Edad (Años)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="125"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:border-[#0F4C5C] focus:ring-1 focus:ring-[#0F4C5C] outline-none transition-all"
                    placeholder="Ej. 62"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Fecha de Nacimiento
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:border-[#0F4C5C] focus:ring-1 focus:ring-[#0F4C5C] outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Cédula / DNI
                  </label>
                  <input
                    type="text"
                    value={idDocument}
                    onChange={(e) => setIdDocument(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:border-[#0F4C5C] focus:ring-1 focus:ring-[#0F4C5C] outline-none transition-all font-mono"
                    placeholder="000-0000000-0"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    No. Expediente
                  </label>
                  <input
                    type="text"
                    value={medicalRecordNumber}
                    onChange={(e) => setMedicalRecordNumber(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:border-[#0F4C5C] focus:ring-1 focus:ring-[#0F4C5C] outline-none transition-all font-mono"
                    placeholder="Ej. EXP-4492"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:border-[#0F4C5C] focus:ring-1 focus:ring-[#0F4C5C] outline-none transition-all"
                    placeholder="Ej. 809-555-0199"
                  />
                </div>
                <div className="sm:col-span-2 md:col-span-1">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Dirección
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:border-[#0F4C5C] focus:ring-1 focus:ring-[#0F4C5C] outline-none transition-all"
                    placeholder="Calle, sector, municipio"
                  />
                </div>
              </div>
            </div>

            {/* Sección: Contacto Familiar */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F4C5C] mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <span>Contacto Familiar / Acompañante</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Familiar o Contacto de Emergencia
                  </label>
                  <input
                    type="text"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:border-[#0F4C5C] focus:ring-1 focus:ring-[#0F4C5C] outline-none transition-all"
                    placeholder="Nombre y parentesco (ej. Carmen Colón - Esposa)"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Teléfono del Contacto
                  </label>
                  <input
                    type="tel"
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:border-[#0F4C5C] focus:ring-1 focus:ring-[#0F4C5C] outline-none transition-all"
                    placeholder="Ej. 829-555-0123"
                  />
                </div>
              </div>
            </div>

            {/* Sección: Ubicación y Datos de Ingreso Hospitalario */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F4C5C] mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <span>Ubicación y Datos de Ingreso Hospitalario</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Servicio
                  </label>
                  <input
                    type="text"
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:border-[#0F4C5C] focus:ring-1 focus:ring-[#0F4C5C] outline-none transition-all"
                    placeholder="Ej. Emergencia Adultos, Medicina Interna..."
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Sala / Cubículo / Cama *
                  </label>
                  <input
                    type="text"
                    required
                    value={cubicle}
                    onChange={(e) => setCubicle(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:border-[#0F4C5C] focus:ring-1 focus:ring-[#0F4C5C] outline-none transition-all font-semibold"
                    placeholder="Ej. Cubículo 3, Cama 12, Reanimación"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Procedencia
                  </label>
                  <input
                    type="text"
                    value={provenance}
                    onChange={(e) => setProvenance(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:border-[#0F4C5C] focus:ring-1 focus:ring-[#0F4C5C] outline-none transition-all"
                    placeholder="Domicilio, 911, Referido de..."
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Fecha de Ingreso
                  </label>
                  <input
                    type="date"
                    value={arrivalDate}
                    onChange={(e) => setArrivalDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:border-[#0F4C5C] focus:ring-1 focus:ring-[#0F4C5C] outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Hora de Ingreso
                  </label>
                  <input
                    type="time"
                    value={arrivalTime}
                    onChange={(e) => setArrivalTime(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:border-[#0F4C5C] focus:ring-1 focus:ring-[#0F4C5C] outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Nivel de Triaje (1-5)
                  </label>
                  <select
                    value={triageLevel}
                    onChange={(e) => setTriageLevel(Number(e.target.value) as TriageLevel)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:border-[#0F4C5C] focus:ring-1 focus:ring-[#0F4C5C] outline-none transition-all font-semibold"
                  >
                    <option value={1}>1 - Reanimación (Rojo)</option>
                    <option value={2}>2 - Emergencia (Naranja)</option>
                    <option value={3}>3 - Urgencia (Amarillo)</option>
                    <option value={4}>4 - Menor / Prioritario (Verde)</option>
                    <option value={5}>5 - No urgente (Azul)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Médico a Cargo *
                  </label>
                  <input
                    type="text"
                    required
                    value={attendingDoctor}
                    onChange={(e) => setAttendingDoctor(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:border-[#0F4C5C] focus:ring-1 focus:ring-[#0F4C5C] outline-none transition-all font-semibold"
                    placeholder="Dr. Joel Colón"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Médico Residente
                  </label>
                  <input
                    type="text"
                    value={residentDoctor}
                    onChange={(e) => setResidentDoctor(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:border-[#0F4C5C] focus:ring-1 focus:ring-[#0F4C5C] outline-none transition-all"
                    placeholder="Nombre del residente"
                  />
                </div>
                <div className="sm:col-span-2 md:col-span-3">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Motivo de Consulta / Queja Principal *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:border-[#0F4C5C] focus:ring-1 focus:ring-[#0F4C5C] outline-none transition-all resize-none"
                    placeholder="Describa el motivo de consulta..."
                  />
                </div>
              </div>
            </div>

            {/* Alerta de Auditoría */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-2 text-xs text-slate-500">
              <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                Al guardar, se mantendrá el mismo expediente (<strong className="text-slate-700">{patient.internalCode}</strong>) y se registrará la traza de auditoría con fecha, hora y valores modificados.
              </span>
            </div>

            {/* Botones de Acción */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F4C5C] hover:bg-[#134E5E] text-white text-xs font-black shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4 text-emerald-300" />
                <span>GUARDAR CAMBIOS</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal de Advertencia de Duplicados */}
      {duplicateWarning.show && duplicateWarning.patient && (
        <DuplicateWarningModal
          isOpen={duplicateWarning.show}
          onClose={() => setDuplicateWarning({ show: false, patient: null, reasons: [] })}
          matchedPatient={duplicateWarning.patient}
          reasons={duplicateWarning.reasons}
          onOpenExisting={(existingP) => {
            setDuplicateWarning({ show: false, patient: null, reasons: [] });
            onClose();
            if (onOpenExistingPatient) {
              onOpenExistingPatient(existingP);
            }
          }}
          onProceedAnyway={() => {
            setDuplicateWarning({ show: false, patient: null, reasons: [] });
            executeSave();
          }}
        />
      )}
    </>
  );
};
