import React, { useState, useRef } from 'react';
import { 
  Patient, 
  ClinicalHistory 
} from '../../types';
import { 
  extractTextFromFile, 
  parseClinicalText, 
  applyParsedHistoryToPatient, 
  ParsedHistoryData 
} from '../../services/historyImportService';
import { 
  X, 
  Upload, 
  FileText, 
  CheckSquare, 
  Square, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  FileCheck,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Info
} from 'lucide-react';

interface PreviousHistoryImportModalProps {
  patient: Patient;
  isOpen: boolean;
  onClose: () => void;
  onApplyHistory: (updatedPatient: Patient) => void;
}

export const PreviousHistoryImportModal: React.FC<PreviousHistoryImportModalProps> = ({
  patient,
  isOpen,
  onClose,
  onApplyHistory
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedHistoryData | null>(null);
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({});
  const [editableData, setEditableData] = useState<ParsedHistoryData | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    patientInfo: true,
    hda: true,
    antecedents: true,
    vitals: true,
    physicalExam: true,
    diagnoses: true,
    plan: true,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const toggleSection = (sec: string) => {
    setExpandedSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    processFile(uploadedFile);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const processFile = async (selectedFile: File) => {
    setLoading(true);
    setFile(selectedFile);
    try {
      const rawText = await extractTextFromFile(selectedFile);
      const parsed = parseClinicalText(rawText, selectedFile.name);
      setParsedData(parsed);
      setEditableData(JSON.parse(JSON.stringify(parsed)));

      // Initialize selected fields with truthy values for whatever was found
      const defaults: Record<string, boolean> = {};
      if (parsed.patientInfo?.fullName) defaults['patientInfo.fullName'] = true;
      if (parsed.patientInfo?.age) defaults['patientInfo.age'] = true;
      if (parsed.patientInfo?.sex) defaults['patientInfo.sex'] = true;
      if (parsed.patientInfo?.idDocument) defaults['patientInfo.idDocument'] = true;
      if (parsed.patientInfo?.medicalRecordNumber) defaults['patientInfo.medicalRecordNumber'] = true;

      if (parsed.reasonForConsultation) defaults['reasonForConsultation'] = true;
      if (parsed.currentIllnessHistory) defaults['currentIllnessHistory'] = true;
      if (parsed.pathologicalHistory) defaults['pathologicalHistory'] = true;
      if (parsed.surgicalHistory) defaults['surgicalHistory'] = true;
      if (parsed.allergicHistory) defaults['allergicHistory'] = true;
      if (parsed.habitualMedications) defaults['habitualMedications'] = true;
      if (parsed.toxicHabits) defaults['toxicHabits'] = true;
      if (parsed.familyHistory) defaults['familyHistory'] = true;
      if (parsed.obGynHistory) defaults['obGynHistory'] = true;

      if (parsed.vitals?.systolicBP) defaults['vitals.systolicBP'] = true;
      if (parsed.vitals?.diastolicBP) defaults['vitals.diastolicBP'] = true;
      if (parsed.vitals?.heartRate) defaults['vitals.heartRate'] = true;
      if (parsed.vitals?.respiratoryRate) defaults['vitals.respiratoryRate'] = true;
      if (parsed.vitals?.temperature) defaults['vitals.temperature'] = true;
      if (parsed.vitals?.oxygenSaturation) defaults['vitals.oxygenSaturation'] = true;
      if (parsed.vitals?.bloodGlucose) defaults['vitals.bloodGlucose'] = true;
      if (parsed.vitals?.glasgowTotal) defaults['vitals.glasgowTotal'] = true;

      if (parsed.physicalExam) {
        Object.entries(parsed.physicalExam).forEach(([k, v]) => {
          if (v) defaults[`physicalExam.${k}`] = true;
        });
      }

      if (parsed.diagnosesList && parsed.diagnosesList.length > 0) defaults['diagnosesList'] = true;
      if (parsed.diagnosticAndTherapeuticPlan) defaults['diagnosticAndTherapeuticPlan'] = true;

      setSelectedFields(defaults);
    } catch (err: any) {
      alert('Error procesando el documento: ' + (err?.message || 'Formato no soportado'));
    } finally {
      setLoading(false);
    }
  };

  const toggleField = (key: string) => {
    setSelectedFields(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAll = () => {
    if (!editableData) return;
    const all: Record<string, boolean> = {};
    if (editableData.patientInfo?.fullName) all['patientInfo.fullName'] = true;
    if (editableData.patientInfo?.age) all['patientInfo.age'] = true;
    if (editableData.patientInfo?.sex) all['patientInfo.sex'] = true;
    if (editableData.patientInfo?.idDocument) all['patientInfo.idDocument'] = true;
    if (editableData.patientInfo?.medicalRecordNumber) all['patientInfo.medicalRecordNumber'] = true;

    if (editableData.reasonForConsultation) all['reasonForConsultation'] = true;
    if (editableData.currentIllnessHistory) all['currentIllnessHistory'] = true;
    if (editableData.pathologicalHistory) all['pathologicalHistory'] = true;
    if (editableData.surgicalHistory) all['surgicalHistory'] = true;
    if (editableData.allergicHistory) all['allergicHistory'] = true;
    if (editableData.habitualMedications) all['habitualMedications'] = true;
    if (editableData.toxicHabits) all['toxicHabits'] = true;
    if (editableData.familyHistory) all['familyHistory'] = true;
    if (editableData.obGynHistory) all['obGynHistory'] = true;

    if (editableData.vitals?.systolicBP) all['vitals.systolicBP'] = true;
    if (editableData.vitals?.diastolicBP) all['vitals.diastolicBP'] = true;
    if (editableData.vitals?.heartRate) all['vitals.heartRate'] = true;
    if (editableData.vitals?.respiratoryRate) all['vitals.respiratoryRate'] = true;
    if (editableData.vitals?.temperature) all['vitals.temperature'] = true;
    if (editableData.vitals?.oxygenSaturation) all['vitals.oxygenSaturation'] = true;
    if (editableData.vitals?.bloodGlucose) all['vitals.bloodGlucose'] = true;
    if (editableData.vitals?.glasgowTotal) all['vitals.glasgowTotal'] = true;

    if (editableData.physicalExam) {
      Object.keys(editableData.physicalExam).forEach(k => {
        all[`physicalExam.${k}`] = true;
      });
    }

    if (editableData.diagnosesList) all['diagnosesList'] = true;
    if (editableData.diagnosticAndTherapeuticPlan) all['diagnosticAndTherapeuticPlan'] = true;

    setSelectedFields(all);
  };

  const deselectAll = () => {
    setSelectedFields({});
  };

  const handleApply = () => {
    if (!editableData) return;
    const updated = applyParsedHistoryToPatient(patient, editableData, selectedFields);
    onApplyHistory(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-fade-in">
        {/* Modal Header */}
        <div className="bg-[#0F4C5C] text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-teal-300">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">
                Cargar Historia Clínica Previa
              </h2>
              <p className="text-xs text-teal-100">
                Hospital Regional Dr. Ángel María Gatón • Paciente: <span className="font-semibold text-white">{patient.fullName}</span> ({patient.internalCode})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-teal-100 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* File Upload Area */}
          {!editableData && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-teal-300 hover:border-teal-500 rounded-2xl p-8 text-center cursor-pointer bg-teal-50/50 hover:bg-teal-50 transition-all flex flex-col items-center justify-center space-y-3"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".docx,.pdf,.txt"
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center">
                <Upload className="w-7 h-7" />
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-800 text-sm sm:text-base">
                  Arrastra y suelta tu archivo Word (.docx), PDF (.pdf) o Texto (.txt)
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  O haz clic aquí para explorar en tu computadora
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-teal-700 bg-white px-3 py-1.5 rounded-full border border-teal-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Extracción inteligente • NUNCA inventa datos clínicos</span>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-semibold text-slate-700">Analizando documento clínico...</p>
              <p className="text-xs text-slate-500">Extrayendo filiación, HDA, antecedentes, vitales, examen físico y diagnósticos</p>
            </div>
          )}

          {/* Parsed Preview and Selection */}
          {editableData && (
            <div className="space-y-5">
              {/* Document Banner & Actions */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs uppercase">
                    {editableData.sourceFileType}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-teal-600" />
                      {editableData.sourceFileName}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Selecciona y edita los campos que deseas incorporar al expediente actual
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={selectAll}
                    className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-medium"
                  >
                    Seleccionar Todos
                  </button>
                  <button
                    onClick={deselectAll}
                    className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-medium"
                  >
                    Deseleccionar
                  </button>
                  <button
                    onClick={() => {
                      setEditableData(null);
                      setParsedData(null);
                      setFile(null);
                    }}
                    className="text-xs px-2.5 py-1.5 bg-red-50 border border-red-200 rounded-lg text-red-600 hover:bg-red-100 font-medium"
                  >
                    Cambiar archivo
                  </button>
                </div>
              </div>

              {/* Notice */}
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                <Info className="w-4 h-4 flex-shrink-0 text-amber-600" />
                <span>
                  <strong>Regla de oro:</strong> Puedes modificar cualquier texto directamente en las cajas antes de aplicar. Solo los campos con casilla marcada se guardarán en el expediente.
                </span>
              </div>

              {/* SECTION: Identificación */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => toggleSection('patientInfo')}
                  className="w-full bg-slate-50 hover:bg-slate-100 px-4 py-2.5 text-left flex items-center justify-between font-bold text-xs text-slate-700 border-b border-slate-200"
                >
                  <span className="flex items-center gap-2">
                    {expandedSections.patientInfo ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    1. DATOS DE FILIACIÓN E IDENTIFICACIÓN
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">Nombre, Cédula, Expediente</span>
                </button>

                {expandedSections.patientInfo && (
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Nombre */}
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        id="check-fn"
                        checked={!!selectedFields['patientInfo.fullName']}
                        onChange={() => toggleField('patientInfo.fullName')}
                        className="mt-1.5 rounded text-teal-600 focus:ring-teal-500"
                      />
                      <div className="flex-1">
                        <label htmlFor="check-fn" className="block text-[11px] font-bold text-slate-700">Nombre Completo</label>
                        <input
                          type="text"
                          value={editableData.patientInfo?.fullName || ''}
                          onChange={(e) => setEditableData(prev => ({
                            ...prev!,
                            patientInfo: { ...prev!.patientInfo, fullName: e.target.value }
                          }))}
                          placeholder="No especificado"
                          className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:border-teal-500"
                        />
                      </div>
                    </div>

                    {/* Edad y Sexo */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          id="check-age"
                          checked={!!selectedFields['patientInfo.age']}
                          onChange={() => toggleField('patientInfo.age')}
                          className="mt-1.5 rounded text-teal-600"
                        />
                        <div className="flex-1">
                          <label htmlFor="check-age" className="block text-[11px] font-bold text-slate-700">Edad</label>
                          <input
                            type="number"
                            value={editableData.patientInfo?.age ?? ''}
                            onChange={(e) => setEditableData(prev => ({
                              ...prev!,
                              patientInfo: { ...prev!.patientInfo, age: parseInt(e.target.value, 10) || undefined }
                            }))}
                            className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:border-teal-500"
                          />
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          id="check-sex"
                          checked={!!selectedFields['patientInfo.sex']}
                          onChange={() => toggleField('patientInfo.sex')}
                          className="mt-1.5 rounded text-teal-600"
                        />
                        <div className="flex-1">
                          <label htmlFor="check-sex" className="block text-[11px] font-bold text-slate-700">Sexo</label>
                          <select
                            value={editableData.patientInfo?.sex || 'M'}
                            onChange={(e) => setEditableData(prev => ({
                              ...prev!,
                              patientInfo: { ...prev!.patientInfo, sex: e.target.value as any }
                            }))}
                            className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:border-teal-500"
                          >
                            <option value="M">Masculino</option>
                            <option value="F">Femenino</option>
                            <option value="Otro">Otro</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Cédula */}
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        id="check-doc"
                        checked={!!selectedFields['patientInfo.idDocument']}
                        onChange={() => toggleField('patientInfo.idDocument')}
                        className="mt-1.5 rounded text-teal-600"
                      />
                      <div className="flex-1">
                        <label htmlFor="check-doc" className="block text-[11px] font-bold text-slate-700">Cédula / Documento</label>
                        <input
                          type="text"
                          value={editableData.patientInfo?.idDocument || ''}
                          onChange={(e) => setEditableData(prev => ({
                            ...prev!,
                            patientInfo: { ...prev!.patientInfo, idDocument: e.target.value }
                          }))}
                          className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:border-teal-500"
                        />
                      </div>
                    </div>

                    {/* Expediente */}
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        id="check-rec"
                        checked={!!selectedFields['patientInfo.medicalRecordNumber']}
                        onChange={() => toggleField('patientInfo.medicalRecordNumber')}
                        className="mt-1.5 rounded text-teal-600"
                      />
                      <div className="flex-1">
                        <label htmlFor="check-rec" className="block text-[11px] font-bold text-slate-700">No. Expediente</label>
                        <input
                          type="text"
                          value={editableData.patientInfo?.medicalRecordNumber || ''}
                          onChange={(e) => setEditableData(prev => ({
                            ...prev!,
                            patientInfo: { ...prev!.patientInfo, medicalRecordNumber: e.target.value }
                          }))}
                          className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:border-teal-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION: Motivo e Historia de la Enfermedad Actual */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => toggleSection('hda')}
                  className="w-full bg-slate-50 hover:bg-slate-100 px-4 py-2.5 text-left flex items-center justify-between font-bold text-xs text-slate-700 border-b border-slate-200"
                >
                  <span className="flex items-center gap-2">
                    {expandedSections.hda ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    2. MOTIVO DE CONSULTA E HISTORIA DE LA ENFERMEDAD ACTUAL (HDA)
                  </span>
                </button>

                {expandedSections.hda && (
                  <div className="p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        id="check-mc"
                        checked={!!selectedFields['reasonForConsultation']}
                        onChange={() => toggleField('reasonForConsultation')}
                        className="mt-1.5 rounded text-teal-600"
                      />
                      <div className="flex-1">
                        <label htmlFor="check-mc" className="block text-[11px] font-bold text-slate-700">Motivo de Consulta / Ingreso</label>
                        <input
                          type="text"
                          value={editableData.reasonForConsultation || ''}
                          onChange={(e) => setEditableData(prev => ({ ...prev!, reasonForConsultation: e.target.value }))}
                          placeholder="No detectado"
                          className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:border-teal-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        id="check-hda"
                        checked={!!selectedFields['currentIllnessHistory']}
                        onChange={() => toggleField('currentIllnessHistory')}
                        className="mt-1.5 rounded text-teal-600"
                      />
                      <div className="flex-1">
                        <label htmlFor="check-hda" className="block text-[11px] font-bold text-slate-700">Historia de la Enfermedad Actual (HDA)</label>
                        <textarea
                          rows={3}
                          value={editableData.currentIllnessHistory || ''}
                          onChange={(e) => setEditableData(prev => ({ ...prev!, currentIllnessHistory: e.target.value }))}
                          placeholder="No detectado"
                          className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:border-teal-500 font-sans leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION: Antecedentes */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => toggleSection('antecedents')}
                  className="w-full bg-slate-50 hover:bg-slate-100 px-4 py-2.5 text-left flex items-center justify-between font-bold text-xs text-slate-700 border-b border-slate-200"
                >
                  <span className="flex items-center gap-2">
                    {expandedSections.antecedents ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    3. ANTECEDENTES PERSONALES Y FAMILIARES
                  </span>
                </button>

                {expandedSections.antecedents && (
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Patológicos */}
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        id="check-pat"
                        checked={!!selectedFields['pathologicalHistory']}
                        onChange={() => toggleField('pathologicalHistory')}
                        className="mt-1.5 rounded text-teal-600"
                      />
                      <div className="flex-1">
                        <label htmlFor="check-pat" className="block text-[11px] font-bold text-slate-700">Patológicos Mórbidos</label>
                        <textarea
                          rows={2}
                          value={editableData.pathologicalHistory || ''}
                          onChange={(e) => setEditableData(prev => ({ ...prev!, pathologicalHistory: e.target.value }))}
                          className="w-full text-xs p-2 rounded-lg border border-slate-200"
                        />
                      </div>
                    </div>

                    {/* Quirúrgicos */}
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        id="check-surg"
                        checked={!!selectedFields['surgicalHistory']}
                        onChange={() => toggleField('surgicalHistory')}
                        className="mt-1.5 rounded text-teal-600"
                      />
                      <div className="flex-1">
                        <label htmlFor="check-surg" className="block text-[11px] font-bold text-slate-700">Quirúrgicos</label>
                        <textarea
                          rows={2}
                          value={editableData.surgicalHistory || ''}
                          onChange={(e) => setEditableData(prev => ({ ...prev!, surgicalHistory: e.target.value }))}
                          className="w-full text-xs p-2 rounded-lg border border-slate-200"
                        />
                      </div>
                    </div>

                    {/* Alérgicos (En Rojo) */}
                    <div className="flex items-start gap-2 bg-red-50/70 p-2.5 rounded-xl border border-red-200 sm:col-span-2">
                      <input
                        type="checkbox"
                        id="check-all"
                        checked={!!selectedFields['allergicHistory']}
                        onChange={() => toggleField('allergicHistory')}
                        className="mt-1.5 rounded text-red-600"
                      />
                      <div className="flex-1">
                        <label htmlFor="check-all" className="block text-[11px] font-bold text-red-700 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Antecedentes Alérgicos (¡Alerta de Seguridad!)
                        </label>
                        <input
                          type="text"
                          value={editableData.allergicHistory || ''}
                          onChange={(e) => setEditableData(prev => ({ ...prev!, allergicHistory: e.target.value }))}
                          placeholder="Ej: Penicilina, AINEs, Niega"
                          className="w-full text-xs p-2 rounded-lg border border-red-300 font-bold text-red-900 bg-white"
                        />
                      </div>
                    </div>

                    {/* Medicamentos Habituales */}
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        id="check-meds"
                        checked={!!selectedFields['habitualMedications']}
                        onChange={() => toggleField('habitualMedications')}
                        className="mt-1.5 rounded text-teal-600"
                      />
                      <div className="flex-1">
                        <label htmlFor="check-meds" className="block text-[11px] font-bold text-slate-700">Medicamentos Habituales</label>
                        <textarea
                          rows={2}
                          value={editableData.habitualMedications || ''}
                          onChange={(e) => setEditableData(prev => ({ ...prev!, habitualMedications: e.target.value }))}
                          className="w-full text-xs p-2 rounded-lg border border-slate-200"
                        />
                      </div>
                    </div>

                    {/* Tóxicos */}
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        id="check-tox"
                        checked={!!selectedFields['toxicHabits']}
                        onChange={() => toggleField('toxicHabits')}
                        className="mt-1.5 rounded text-teal-600"
                      />
                      <div className="flex-1">
                        <label htmlFor="check-tox" className="block text-[11px] font-bold text-slate-700">Hábitos Tóxicos</label>
                        <input
                          type="text"
                          value={editableData.toxicHabits || ''}
                          onChange={(e) => setEditableData(prev => ({ ...prev!, toxicHabits: e.target.value }))}
                          className="w-full text-xs p-2 rounded-lg border border-slate-200"
                        />
                      </div>
                    </div>

                    {/* Familiares */}
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        id="check-fam"
                        checked={!!selectedFields['familyHistory']}
                        onChange={() => toggleField('familyHistory')}
                        className="mt-1.5 rounded text-teal-600"
                      />
                      <div className="flex-1">
                        <label htmlFor="check-fam" className="block text-[11px] font-bold text-slate-700">Familiares</label>
                        <input
                          type="text"
                          value={editableData.familyHistory || ''}
                          onChange={(e) => setEditableData(prev => ({ ...prev!, familyHistory: e.target.value }))}
                          className="w-full text-xs p-2 rounded-lg border border-slate-200"
                        />
                      </div>
                    </div>

                    {/* Gineco-Obstétricos */}
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        id="check-gyn"
                        checked={!!selectedFields['obGynHistory']}
                        onChange={() => toggleField('obGynHistory')}
                        className="mt-1.5 rounded text-teal-600"
                      />
                      <div className="flex-1">
                        <label htmlFor="check-gyn" className="block text-[11px] font-bold text-slate-700">Gineco-Obstétricos</label>
                        <input
                          type="text"
                          value={editableData.obGynHistory || ''}
                          onChange={(e) => setEditableData(prev => ({ ...prev!, obGynHistory: e.target.value }))}
                          className="w-full text-xs p-2 rounded-lg border border-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION: Signos Vitales */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => toggleSection('vitals')}
                  className="w-full bg-slate-50 hover:bg-slate-100 px-4 py-2.5 text-left flex items-center justify-between font-bold text-xs text-slate-700 border-b border-slate-200"
                >
                  <span className="flex items-center gap-2">
                    {expandedSections.vitals ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    4. CONSTANTES VITALES AL INGRESO
                  </span>
                </button>

                {expandedSections.vitals && (
                  <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* TA */}
                    <div className="border border-slate-200 p-2 rounded-lg">
                      <div className="flex items-center gap-1.5 mb-1">
                        <input
                          type="checkbox"
                          checked={!!selectedFields['vitals.systolicBP']}
                          onChange={() => toggleField('vitals.systolicBP')}
                          className="rounded text-teal-600"
                        />
                        <span className="text-[11px] font-bold text-slate-700">T/A (mmHg)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={editableData.vitals?.systolicBP ?? ''}
                          onChange={(e) => setEditableData(prev => ({
                            ...prev!,
                            vitals: { ...prev!.vitals, systolicBP: parseInt(e.target.value, 10) || undefined }
                          }))}
                          placeholder="TAS"
                          className="w-14 text-xs p-1 rounded border border-slate-200 text-center font-bold"
                        />
                        <span>/</span>
                        <input
                          type="number"
                          value={editableData.vitals?.diastolicBP ?? ''}
                          onChange={(e) => setEditableData(prev => ({
                            ...prev!,
                            vitals: { ...prev!.vitals, diastolicBP: parseInt(e.target.value, 10) || undefined }
                          }))}
                          placeholder="TAD"
                          className="w-14 text-xs p-1 rounded border border-slate-200 text-center font-bold"
                        />
                      </div>
                    </div>

                    {/* FC */}
                    <div className="border border-slate-200 p-2 rounded-lg">
                      <div className="flex items-center gap-1.5 mb-1">
                        <input
                          type="checkbox"
                          checked={!!selectedFields['vitals.heartRate']}
                          onChange={() => toggleField('vitals.heartRate')}
                          className="rounded text-teal-600"
                        />
                        <span className="text-[11px] font-bold text-slate-700">FC (lpm)</span>
                      </div>
                      <input
                        type="number"
                        value={editableData.vitals?.heartRate ?? ''}
                        onChange={(e) => setEditableData(prev => ({
                          ...prev!,
                          vitals: { ...prev!.vitals, heartRate: parseInt(e.target.value, 10) || undefined }
                        }))}
                        placeholder="lpm"
                        className="w-full text-xs p-1 rounded border border-slate-200 text-center font-bold"
                      />
                    </div>

                    {/* FR */}
                    <div className="border border-slate-200 p-2 rounded-lg">
                      <div className="flex items-center gap-1.5 mb-1">
                        <input
                          type="checkbox"
                          checked={!!selectedFields['vitals.respiratoryRate']}
                          onChange={() => toggleField('vitals.respiratoryRate')}
                          className="rounded text-teal-600"
                        />
                        <span className="text-[11px] font-bold text-slate-700">FR (rpm)</span>
                      </div>
                      <input
                        type="number"
                        value={editableData.vitals?.respiratoryRate ?? ''}
                        onChange={(e) => setEditableData(prev => ({
                          ...prev!,
                          vitals: { ...prev!.vitals, respiratoryRate: parseInt(e.target.value, 10) || undefined }
                        }))}
                        placeholder="rpm"
                        className="w-full text-xs p-1 rounded border border-slate-200 text-center font-bold"
                      />
                    </div>

                    {/* Temp */}
                    <div className="border border-slate-200 p-2 rounded-lg">
                      <div className="flex items-center gap-1.5 mb-1">
                        <input
                          type="checkbox"
                          checked={!!selectedFields['vitals.temperature']}
                          onChange={() => toggleField('vitals.temperature')}
                          className="rounded text-teal-600"
                        />
                        <span className="text-[11px] font-bold text-slate-700">Temp (°C)</span>
                      </div>
                      <input
                        type="number"
                        step="0.1"
                        value={editableData.vitals?.temperature ?? ''}
                        onChange={(e) => setEditableData(prev => ({
                          ...prev!,
                          vitals: { ...prev!.vitals, temperature: parseFloat(e.target.value) || undefined }
                        }))}
                        placeholder="°C"
                        className="w-full text-xs p-1 rounded border border-slate-200 text-center font-bold"
                      />
                    </div>

                    {/* SatO2 */}
                    <div className="border border-slate-200 p-2 rounded-lg">
                      <div className="flex items-center gap-1.5 mb-1">
                        <input
                          type="checkbox"
                          checked={!!selectedFields['vitals.oxygenSaturation']}
                          onChange={() => toggleField('vitals.oxygenSaturation')}
                          className="rounded text-teal-600"
                        />
                        <span className="text-[11px] font-bold text-slate-700">SatO2 (%)</span>
                      </div>
                      <input
                        type="number"
                        value={editableData.vitals?.oxygenSaturation ?? ''}
                        onChange={(e) => setEditableData(prev => ({
                          ...prev!,
                          vitals: { ...prev!.vitals, oxygenSaturation: parseInt(e.target.value, 10) || undefined }
                        }))}
                        placeholder="%"
                        className="w-full text-xs p-1 rounded border border-slate-200 text-center font-bold"
                      />
                    </div>

                    {/* Glucemia */}
                    <div className="border border-slate-200 p-2 rounded-lg">
                      <div className="flex items-center gap-1.5 mb-1">
                        <input
                          type="checkbox"
                          checked={!!selectedFields['vitals.bloodGlucose']}
                          onChange={() => toggleField('vitals.bloodGlucose')}
                          className="rounded text-teal-600"
                        />
                        <span className="text-[11px] font-bold text-slate-700">Glucemia</span>
                      </div>
                      <input
                        type="number"
                        value={editableData.vitals?.bloodGlucose ?? ''}
                        onChange={(e) => setEditableData(prev => ({
                          ...prev!,
                          vitals: { ...prev!.vitals, bloodGlucose: parseInt(e.target.value, 10) || undefined }
                        }))}
                        placeholder="mg/dL"
                        className="w-full text-xs p-1 rounded border border-slate-200 text-center font-bold"
                      />
                    </div>

                    {/* Glasgow */}
                    <div className="border border-slate-200 p-2 rounded-lg col-span-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <input
                          type="checkbox"
                          checked={!!selectedFields['vitals.glasgowTotal']}
                          onChange={() => toggleField('vitals.glasgowTotal')}
                          className="rounded text-teal-600"
                        />
                        <span className="text-[11px] font-bold text-slate-700">Escala de Glasgow (/15)</span>
                      </div>
                      <input
                        type="number"
                        min="3"
                        max="15"
                        value={editableData.vitals?.glasgowTotal ?? ''}
                        onChange={(e) => setEditableData(prev => ({
                          ...prev!,
                          vitals: { ...prev!.vitals, glasgowTotal: parseInt(e.target.value, 10) || undefined }
                        }))}
                        placeholder="3-15"
                        className="w-full text-xs p-1 rounded border border-slate-200 text-center font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION: Examen Físico */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => toggleSection('physicalExam')}
                  className="w-full bg-slate-50 hover:bg-slate-100 px-4 py-2.5 text-left flex items-center justify-between font-bold text-xs text-slate-700 border-b border-slate-200"
                >
                  <span className="flex items-center gap-2">
                    {expandedSections.physicalExam ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    5. EXAMEN FÍSICO POR SISTEMAS
                  </span>
                </button>

                {expandedSections.physicalExam && (
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { key: 'general', label: 'Aspecto General' },
                      { key: 'cardiovascular', label: 'Cardiovascular' },
                      { key: 'respiratory', label: 'Respiratorio / Tórax' },
                      { key: 'abdominal', label: 'Abdomen' },
                      { key: 'neurological', label: 'Neurológico' },
                      { key: 'extremities', label: 'Extremidades' },
                      { key: 'skin', label: 'Piel y Faneras' },
                      { key: 'head', label: 'Cabeza y Cuello' }
                    ].map(sys => (
                      <div key={sys.key} className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          id={`check-pe-${sys.key}`}
                          checked={!!selectedFields[`physicalExam.${sys.key}`]}
                          onChange={() => toggleField(`physicalExam.${sys.key}`)}
                          className="mt-1.5 rounded text-teal-600"
                        />
                        <div className="flex-1">
                          <label htmlFor={`check-pe-${sys.key}`} className="block text-[11px] font-bold text-slate-700">{sys.label}</label>
                          <textarea
                            rows={2}
                            value={(editableData.physicalExam as any)?.[sys.key] || ''}
                            onChange={(e) => setEditableData(prev => ({
                              ...prev!,
                              physicalExam: { ...prev!.physicalExam, [sys.key]: e.target.value }
                            }))}
                            className="w-full text-xs p-2 rounded-lg border border-slate-200"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION: Diagnósticos y Plan */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => toggleSection('diagnoses')}
                  className="w-full bg-slate-50 hover:bg-slate-100 px-4 py-2.5 text-left flex items-center justify-between font-bold text-xs text-slate-700 border-b border-slate-200"
                >
                  <span className="flex items-center gap-2">
                    {expandedSections.diagnoses ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    6. DIAGNÓSTICOS Y CONDUCTA TERAPÉUTICA
                  </span>
                </button>

                {expandedSections.diagnoses && (
                  <div className="p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        id="check-diag"
                        checked={!!selectedFields['diagnosesList']}
                        onChange={() => toggleField('diagnosesList')}
                        className="mt-1.5 rounded text-teal-600"
                      />
                      <div className="flex-1">
                        <label htmlFor="check-diag" className="block text-[11px] font-bold text-slate-700">Diagnósticos / Impresión Clínica</label>
                        <textarea
                          rows={2}
                          value={editableData.clinicalImpression || ''}
                          onChange={(e) => setEditableData(prev => ({ ...prev!, clinicalImpression: e.target.value }))}
                          placeholder="Diagnósticos extraídos..."
                          className="w-full text-xs p-2 rounded-lg border border-slate-200"
                        />
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        id="check-plan"
                        checked={!!selectedFields['diagnosticAndTherapeuticPlan']}
                        onChange={() => toggleField('diagnosticAndTherapeuticPlan')}
                        className="mt-1.5 rounded text-teal-600"
                      />
                      <div className="flex-1">
                        <label htmlFor="check-plan" className="block text-[11px] font-bold text-slate-700">Plan Diagnóstico y Terapéutico</label>
                        <textarea
                          rows={3}
                          value={editableData.diagnosticAndTherapeuticPlan || ''}
                          onChange={(e) => setEditableData(prev => ({ ...prev!, diagnosticAndTherapeuticPlan: e.target.value }))}
                          placeholder="Medidas, soluciones, fármacos..."
                          className="w-full text-xs p-2 rounded-lg border border-slate-200 font-sans"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </button>

          {editableData && (
            <button
              onClick={handleApply}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>APLICAR A LA HISTORIA CLÍNICA</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
