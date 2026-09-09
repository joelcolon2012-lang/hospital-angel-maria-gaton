import React, { useState } from 'react';
import { Patient, FinalDisposition, FinalOutcome, PatientStatus } from '../../types';
import { LogOut, CheckCircle2, Ambulance, Home, AlertCircle, Save, Download, Check } from 'lucide-react';
import { downloadFileToPC } from '../../services/hospitalNoteGenerator';

interface Props {
  patient: Patient;
  onSaveDisposition: (disp: FinalDisposition, newStatus: PatientStatus) => void;
}

export const FinalDispositionTab: React.FC<Props> = ({ patient, onSaveDisposition }) => {
  const existing = patient.disposition;
  const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const [savedFeedback, setSavedFeedback] = useState(false);

  const [formData, setFormData] = useState<FinalDisposition>({
    patientId: patient.id,
    outcome: existing?.outcome || 'Alta',
    timestamp: existing?.timestamp || nowStr,
    dischargeCondition: existing?.dischargeCondition || 'Estable hemodinámicamente, afebril, sin dolor.',
    finalDiagnoses: existing?.finalDiagnoses || patient.clinicalHistory?.clinicalImpression || '',
    dischargeTreatment: existing?.dischargeTreatment || '',
    recommendations: existing?.recommendations || 'Reposo, control de signos vitales, hidratación oral.',
    redFlags: existing?.redFlags || 'Acudir a urgencias de inmediato ante: dolor precordial recurrente, falta de aire, fiebre > 38.5°C o desmayo.',
    destination: existing?.destination || 'Domicilio',
    receivingDoctor: existing?.receivingDoctor || '',
    receivingCenter: existing?.receivingCenter || '',
    referralSummary: existing?.referralSummary || '',
  });

  const handleDownloadFile = () => {
    let content = `DISPOSICIÓN FINAL Y DOCUMENTO DE EGRESO / TRASLADO\n`;
    content += `Hospital Regional Ángel María Gatón — Dr. Colón\n`;
    content += `Paciente: ${patient.fullName} | Cédula/Exp: ${patient.medicalRecordNumber || patient.idDocument || 'S/N'}\n`;
    content += `Fecha y Hora: ${formData.timestamp}\n`;
    content += `Decisión: ${formData.outcome.toUpperCase()} (Destino: ${formData.destination || 'N/A'})\n`;
    content += `------------------------------------------------------------\n\n`;
    content += `1. DIAGNÓSTICO FINAL:\n${formData.finalDiagnoses}\n\n`;
    content += `2. CONDICIÓN AL EGRESO:\n${formData.dischargeCondition}\n\n`;
    content += `3. TRATAMIENTO DE EGRESO:\n${formData.dischargeTreatment || 'Ninguno'}\n\n`;
    content += `4. RECOMENDACIONES GENERALES:\n${formData.recommendations}\n\n`;
    content += `5. SIGNOS DE ALARMA:\n${formData.redFlags}\n\n`;
    if (formData.outcome === 'Referimiento' || formData.outcome === 'Traslado') {
      content += `DATOS DE TRASLADO:\n`;
      content += `Centro Receptor: ${formData.receivingCenter}\n`;
      content += `Médico Receptor: ${formData.receivingDoctor}\n`;
      content += `Resumen de Traslado: ${formData.referralSummary}\n\n`;
    }
    content += `Médico tratante: ${patient.attendingDoctor || 'Dr. Colón'}\n`;

    const filename = `Disposicion_Egreso_${patient.fullName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.txt`;
    downloadFileToPC(filename, content);

    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let newStatus: PatientStatus = 'activos';
    if (formData.outcome === 'Alta') newStatus = 'alta';
    else if (formData.outcome === 'Ingreso') newStatus = 'ingresados';
    else if (formData.outcome === 'Referimiento' || formData.outcome === 'Traslado') newStatus = 'referidos';
    else if (formData.outcome === 'Observación') newStatus = 'observacion';
    else if (formData.outcome === 'Abandono') newStatus = 'alta';

    onSaveDisposition(formData, newStatus);
    handleDownloadFile();
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Action Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
          <LogOut className="w-4 h-4 text-teal-700" />
          <span>Apartado: <strong>Disposición Final y Cierre de Episodio</strong></span>
        </div>

        <button
          type="button"
          onClick={handleDownloadFile}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-[#0F4C5C] hover:bg-petrol-800 text-white transition-all active:scale-95 shadow-sm"
          title="Genera la descarga inmediata del archivo de egreso/traslado en tu PC"
        >
          {savedFeedback ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Save className="w-3.5 h-3.5" />}
          {savedFeedback ? '¡Guardado y Descargado!' : 'Guardar y Descargar en PC'}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-petrol-900 uppercase tracking-wider flex items-center gap-2">
            <LogOut className="w-4 h-4 text-petrol-800" />
            <span>Disposición Final y Cierre de Episodio de Emergencia</span>
          </h3>
          <p className="text-xs text-slate-500">Documentación de egreso, traslado o alta médica</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Outcome Buttons Grid */}
          <div>
            <label className="block font-bold text-slate-700 mb-2">Destino / Decisión Final</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'Alta', label: 'Alta a Domicilio', icon: Home, color: 'text-emerald-700 border-emerald-500' },
                { id: 'Ingreso', label: 'Ingreso Hospitalario', icon: CheckCircle2, color: 'text-blue-700 border-blue-500' },
                { id: 'Observación', label: 'Observación Prolongada', icon: AlertCircle, color: 'text-amber-700 border-amber-500' },
                { id: 'Referimiento', label: 'Traslado / Referimiento', icon: Ambulance, color: 'text-purple-700 border-purple-500' },
              ].map((opt) => {
                const isSelected = formData.outcome === opt.id;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, outcome: opt.id as FinalOutcome }))}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 font-bold transition-all ${
                      isSelected
                        ? `bg-slate-50 border-2 ${opt.color} shadow-sm scale-[1.02]`
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Fecha y Hora de Decisión</label>
              <input
                type="text"
                value={formData.timestamp}
                onChange={(e) => setFormData((prev) => ({ ...prev, timestamp: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-semibold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Diagnóstico Final al Egreso</label>
              <input
                type="text"
                value={formData.finalDiagnoses}
                onChange={(e) => setFormData((prev) => ({ ...prev, finalDiagnoses: e.target.value }))}
                placeholder="Diagnósticos confirmados..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Condición Clínica al Egreso</label>
            <input
              type="text"
              value={formData.dischargeCondition}
              onChange={(e) => setFormData((prev) => ({ ...prev, dischargeCondition: e.target.value }))}
              placeholder="Estado general, signos vitales estables..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Tratamiento Farmacológico para el Hogar</label>
            <textarea
              rows={2}
              value={formData.dischargeTreatment}
              onChange={(e) => setFormData((prev) => ({ ...prev, dischargeTreatment: e.target.value }))}
              placeholder="Medicamentos de alta con dosis, vía y duración (ej. Amoxicilina/Clavulánico 875/125 mg VO c/12h x 7 días)..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Recomendaciones y Medidas Generales</label>
            <textarea
              rows={2}
              value={formData.recommendations}
              onChange={(e) => setFormData((prev) => ({ ...prev, recommendations: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5"
            />
          </div>

          <div>
            <label className="block font-bold text-red-700 mb-1">Signos de Alarma y Advertencias al Paciente</label>
            <textarea
              rows={2}
              value={formData.redFlags}
              onChange={(e) => setFormData((prev) => ({ ...prev, redFlags: e.target.value }))}
              className="w-full bg-red-50/40 border border-red-200 text-red-900 rounded-xl p-2.5 font-medium"
            />
          </div>

          {/* If Referimiento / Traslado */}
          {(formData.outcome === 'Referimiento' || formData.outcome === 'Traslado') && (
            <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-200 space-y-3">
              <h4 className="font-bold text-purple-900 text-xs">Datos del Traslado / Referimiento</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-purple-800 mb-1">Centro Hospitalario Receptor</label>
                  <input
                    type="text"
                    value={formData.receivingCenter || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, receivingCenter: e.target.value }))}
                    placeholder="Ej. Hospital Traumatológico, Hosp. General..."
                    className="w-full bg-white border border-purple-300 rounded-xl p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-purple-800 mb-1">Médico Receptor</label>
                  <input
                    type="text"
                    value={formData.receivingDoctor || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, receivingDoctor: e.target.value }))}
                    placeholder="Dr. Encargado de guardia..."
                    className="w-full bg-white border border-purple-300 rounded-xl p-2 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 bg-[#0F4C5C] hover:bg-petrol-800 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Guardar Disposición y Descargar Informe en PC</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
