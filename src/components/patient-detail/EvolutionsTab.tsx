import React, { useState } from 'react';
import { PatientEvolution, Patient } from '../../types';
import { Plus, Clock, FileText, Save, Download, Check, Trash2, Copy, Sparkles, Stethoscope, AlertCircle } from 'lucide-react';
import { VoiceDictationButton } from '../common/VoiceDictationButton';
import { downloadFileToPC } from '../../services/hospitalNoteGenerator';
import { MandatoryNotePreviewModal } from '../documents/MandatoryNotePreviewModal';

interface Props {
  patient: Patient;
  evolutions: PatientEvolution[];
  onAddEvolution: (evo: Partial<PatientEvolution>) => void;
  onDeleteEvolution?: (evoId: string) => void;
}

export const EvolutionsTab: React.FC<Props> = ({ patient, evolutions, onAddEvolution, onDeleteEvolution }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDraftFromPrevious, setIsDraftFromPrevious] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [isPreviewWordOpen, setIsPreviewWordOpen] = useState(false);
  const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');

  const v = patient.vitals;
  const currentVitalsSummary = v
    ? `PA: ${v.systolicBP || '--'}/${v.diastolicBP || '--'} mmHg, FC: ${v.heartRate || '--'} lpm, FR: ${v.respiratoryRate || '--'} rpm, SpO2: ${v.oxygenSaturation || '--'}%, Dolor: ${v.painScale ?? '--'}/10`
    : 'Signos vitales estables';

  const [formData, setFormData] = useState({
    timestamp: nowStr,
    doctorName: patient.attendingDoctor || 'Dr. Colón',
    vitalSignsSummary: currentVitalsSummary,
    clinicalChanges: '',
    newResults: '',
    problemReevaluation: '',
    updatedDiagnoses: '',
    conduct: '',
    nextReevaluationTime: '',
  });

  const handleClonePreviousEvolution = () => {
    if (!evolutions || evolutions.length === 0) {
      alert('No hay evoluciones anteriores registradas para clonar.');
      return;
    }
    const lastEvo = evolutions[0]; // Más reciente
    const dayNumber = evolutions.length + 1;
    setFormData({
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      doctorName: patient.attendingDoctor || 'Dr. Colón',
      vitalSignsSummary: currentVitalsSummary,
      clinicalChanges: `[Día ${dayNumber} de Hospitalización]: ${lastEvo.clinicalChanges}`,
      newResults: lastEvo.newResults || '',
      problemReevaluation: lastEvo.problemReevaluation || '',
      updatedDiagnoses: lastEvo.updatedDiagnoses || '',
      conduct: lastEvo.conduct || '',
      nextReevaluationTime: '',
    });
  };

  const handleImportBaselinePhysicalExam = () => {
    const pe = patient.clinicalHistory?.physicalExam;
    if (!pe) {
      alert('El paciente no tiene examen físico registrado en su historia clínica.');
      return;
    }
    const parts: string[] = [];
    if (pe.head) parts.push(`Cabeza: ${pe.head}`);
    if (pe.eyes) parts.push(`Ojos: ${pe.eyes}`);
    if (pe.ears) parts.push(`Oídos: ${pe.ears}`);
    if (pe.nose) parts.push(`Nariz: ${pe.nose}`);
    if (pe.mouth) parts.push(`Boca: ${pe.mouth}`);
    if (pe.neck) parts.push(`Cuello: ${pe.neck}`);
    if (pe.thorax) parts.push(`Tórax: ${pe.thorax}`);
    if (pe.cardiovascular && !pe.thorax) parts.push(`Cardiovascular: ${pe.cardiovascular}`);
    if (pe.respiratory && !pe.thorax) parts.push(`Respiratorio: ${pe.respiratory}`);
    if (pe.abdominal) parts.push(`Abdomen: ${pe.abdominal}`);
    if (pe.upperExtremities) parts.push(`Ext. Superiores: ${pe.upperExtremities}`);
    if (pe.lowerExtremities) parts.push(`Ext. Inferiores: ${pe.lowerExtremities}`);
    if (pe.extremities && !pe.upperExtremities && !pe.lowerExtremities) parts.push(`Extremidades: ${pe.extremities}`);
    if (pe.genitourinaryRectal) parts.push(`Genitourinario/Rectal: ${pe.genitourinaryRectal}`);
    if (pe.neurological) parts.push(`Neurológico: ${pe.neurological}`);
    if (pe.skin) parts.push(`Piel: ${pe.skin}`);

    const examSummary = parts.length > 0 ? parts.join('. ') : (pe.general || 'Examen físico basal dentro de límites normales.');

    setFormData((prev) => ({
      ...prev,
      clinicalChanges: prev.clinicalChanges
        ? `${prev.clinicalChanges}\n\nExamen Físico Basal: ${examSummary}`
        : `Examen Físico Basal: ${examSummary}`,
    }));
  };

  const handleSaveAndDownload = () => {
    let content = `REGISTRO DE EVOLUCIONES MÉDICAS\n`;
    content += `Hospital Regional Ángel María Gatón — Servicio de Medicina Interna y Emergencias\n`;
    content += `Paciente: ${patient.fullName} | Cédula/Exp: ${patient.medicalRecordNumber || patient.idDocument || 'S/N'}\n`;
    content += `Fecha de exportación: ${new Date().toLocaleString('es-ES')}\n`;
    content += `------------------------------------------------------------\n\n`;

    if (evolutions.length === 0) {
      content += `No hay evoluciones registradas.\n`;
    } else {
      evolutions.forEach((evo, idx) => {
        content += `EVOLUCIÓN #${idx + 1} — Fecha: ${evo.timestamp} (Médico: ${evo.doctorName})\n`;
        content += `• Signos Vitales: ${evo.vitalSignsSummary}\n`;
        content += `• Cambios Clínicos: ${evo.clinicalChanges}\n`;
        if (evo.newResults) content += `• Nuevos Resultados: ${evo.newResults}\n`;
        if (evo.updatedDiagnoses) content += `• Diagnósticos: ${evo.updatedDiagnoses}\n`;
        if (evo.conduct) content += `• Conducta y Plan: ${evo.conduct}\n`;
        content += `------------------------------------------------------------\n\n`;
      });
    }

    const filename = `Evoluciones_${patient.fullName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.txt`;
    downloadFileToPC(filename, content);

    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clinicalChanges.trim()) {
      alert('Por favor describe los cambios clínicos de la evolución.');
      return;
    }

    onAddEvolution({
      patientId: patient.id,
      timestamp: formData.timestamp,
      doctorName: formData.doctorName,
      vitalSignsSummary: formData.vitalSignsSummary,
      clinicalChanges: formData.clinicalChanges,
      newResults: formData.newResults,
      problemReevaluation: formData.problemReevaluation,
      updatedDiagnoses: formData.updatedDiagnoses,
      conduct: formData.conduct,
      nextReevaluationTime: formData.nextReevaluationTime,
    });

    setIsModalOpen(false);
    setFormData({
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      doctorName: patient.attendingDoctor || 'Dr. Colón',
      vitalSignsSummary: currentVitalsSummary,
      clinicalChanges: '',
      newResults: '',
      problemReevaluation: '',
      updatedDiagnoses: '',
      conduct: '',
      nextReevaluationTime: '',
    });
  };

  const handleClearAllEvolutions = () => {
    if (onDeleteEvolution && window.confirm(`¿Estás seguro de que deseas eliminar todas las ${evolutions.length} notas de evolución?`)) {
      evolutions.forEach((e) => onDeleteEvolution(e.id));
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Action Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
          <Clock className="w-4 h-4 text-teal-700" />
          <span>Apartado: <strong>Evoluciones Clínicas Diarias ({evolutions.length} notas)</strong></span>
        </div>

        <div className="flex items-center gap-2">
          {/* Eliminar Todas las Evoluciones */}
          {onDeleteEvolution && evolutions.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllEvolutions}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-all active:scale-95 shadow-sm"
              title="Eliminar todas las notas de evolución"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
              <span>Eliminar Todas</span>
            </button>
          )}

          {/* Quick Save & Auto-Download */}
          <button
            type="button"
            onClick={handleSaveAndDownload}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-[#0F4C5C] hover:bg-petrol-800 text-white transition-all active:scale-95 shadow-sm"
            title="Guarda las evoluciones y genera la descarga inmediata del archivo en tu PC"
          >
            {savedFeedback ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Save className="w-3.5 h-3.5" />}
            {savedFeedback ? '¡Guardado y Descargado!' : 'Guardar y Descargar en PC'}
          </button>

          {/* Previsualizar y Exportar Word (.DOCX) con Plantilla Oficial */}
          <button
            type="button"
            onClick={() => setIsPreviewWordOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-blue-800 hover:bg-blue-900 text-white transition-all active:scale-95 shadow-sm cursor-pointer"
            title="Previsualización obligatoria con plantilla oficial activa y descarga de Word (.DOCX)"
          >
            <FileText className="w-3.5 h-3.5 text-blue-200" />
            <span>Word (.DOCX)</span>
          </button>

          {/* DUPLICAR EVOLUCIÓN ANTERIOR */}
          <button
            type="button"
            onClick={() => {
              if (!evolutions || evolutions.length === 0) {
                alert('No hay evoluciones anteriores registradas para duplicar.');
                return;
              }
              handleClonePreviousEvolution();
              setIsDraftFromPrevious(true);
              setIsModalOpen(true);
            }}
            className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
            title="Genera un nuevo borrador editable basado en la evolución anterior con fecha y hora actuales"
          >
            <Copy className="w-3.5 h-3.5 text-emerald-300" />
            <span>DUPLICAR EVOLUCIÓN ANTERIOR</span>
          </button>

          <button
            onClick={() => {
              setIsDraftFromPrevious(false);
              setFormData({
                timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
                doctorName: patient.attendingDoctor || 'Dr. Colón',
                vitalSignsSummary: currentVitalsSummary,
                clinicalChanges: '',
                newResults: '',
                problemReevaluation: '',
                updatedDiagnoses: '',
                conduct: '',
                nextReevaluationTime: '',
              });
              setIsModalOpen(true);
            }}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Evolución</span>
          </button>
        </div>
      </div>

      {evolutions.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500 text-xs">
          <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-700 text-sm">Sin notas de evolución registradas</p>
          <p className="mt-1">Agrega una nota para documentar la reevaluación médica del paciente.</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-slate-200 ml-4 space-y-6">
          {evolutions.map((evo) => (
            <div key={evo.id} className="relative pl-6">
              <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-[#0F4C5C] border-2 border-white shadow-sm" />
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{evo.timestamp}</span>
                    <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                      {evo.doctorName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {evo.nextReevaluationTime && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Próx: {evo.nextReevaluationTime}
                      </span>
                    )}
                    {onDeleteEvolution && (
                      <button
                        onClick={() => {
                          if (window.confirm('¿Eliminar esta nota de evolución?')) {
                            onDeleteEvolution(evo.id);
                          }
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-white hover:bg-red-600 border border-red-200 hover:border-red-600 px-2 py-0.5 rounded transition-all shadow-xs"
                        title="Eliminar evolución"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Eliminar</span>
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg font-medium">
                  <strong>Signos vitales: </strong>{evo.vitalSignsSummary}
                </p>

                <p className="text-xs text-slate-800">
                  <strong>Cambios Clínicos: </strong>{evo.clinicalChanges}
                </p>

                {evo.newResults && (
                  <p className="text-xs text-slate-700">
                    <strong>Nuevos Paraclínicos: </strong>{evo.newResults}
                  </p>
                )}

                {evo.updatedDiagnoses && (
                  <p className="text-xs text-slate-700 font-medium">
                    <strong>Diagnósticos Actualizados: </strong>{evo.updatedDiagnoses}
                  </p>
                )}

                {evo.conduct && (
                  <p className="text-xs text-emerald-800 font-semibold bg-emerald-50/50 p-2 rounded-lg border border-emerald-200/60">
                    <strong>Conducta / Plan: </strong>{evo.conduct}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Save & Download Button */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSaveAndDownload}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl bg-[#0F4C5C] hover:bg-petrol-800 text-white transition-all active:scale-95 shadow-md"
        >
          {savedFeedback ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
          {savedFeedback ? '¡Evoluciones Guardadas y Descargadas!' : 'Guardar y Descargar Evoluciones en PC'}
        </button>
      </div>

      {/* Modal Nueva Evolución */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-petrol-900">
                {isDraftFromPrevious ? 'Borrador de Evolución Médica' : 'Registrar Nueva Evolución'}
              </h3>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleImportBaselinePhysicalExam}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg transition-all active:scale-95 cursor-pointer"
                  title="Importar examen físico inicial para realizar ajustes sutiles del día"
                >
                  <Stethoscope className="w-3 h-3" />
                  <span>Importar Examen Basal</span>
                </button>
              </div>
            </div>

            {/* Banner de Borrador basado en Evolución Anterior */}
            {isDraftFromPrevious && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-black uppercase tracking-wider text-amber-950">
                    BORRADOR BASADO EN EVOLUCIÓN ANTERIOR
                  </p>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-snug">
                    Se copiaron la estructura y los hallazgos previos. El médico debe revisar y confirmar los datos del día antes de finalizar. La evolución anterior permanecerá intacta en el historial.
                  </p>
                </div>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha y Hora</label>
                  <input
                    type="text"
                    value={formData.timestamp}
                    onChange={(e) => setFormData((prev) => ({ ...prev, timestamp: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Médico que Evoluciona</label>
                  <input
                    type="text"
                    value={formData.doctorName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, doctorName: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Resumen de Signos Vitales</label>
                <input
                  type="text"
                  value={formData.vitalSignsSummary}
                  onChange={(e) => setFormData((prev) => ({ ...prev, vitalSignsSummary: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">Cambios Clínicos del Paciente *</label>
                  <VoiceDictationButton
                    onTranscript={(text) =>
                      setFormData((prev) => ({
                        ...prev,
                        clinicalChanges: prev.clinicalChanges ? `${prev.clinicalChanges} ${text}` : text,
                      }))
                    }
                  />
                </div>
                <textarea
                  rows={3}
                  required
                  value={formData.clinicalChanges}
                  onChange={(e) => setFormData((prev) => ({ ...prev, clinicalChanges: e.target.value }))}
                  placeholder="Evolución clínica en las últimas horas, respuesta al tratamiento, tolerancia oral, diuresis..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nuevos Paraclínicos o Informes</label>
                <input
                  type="text"
                  value={formData.newResults}
                  onChange={(e) => setFormData((prev) => ({ ...prev, newResults: e.target.value }))}
                  placeholder="Gases arteriales, control de hemoglobina, ECG..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Conducta Médica / Ajustes de Plan</label>
                <input
                  type="text"
                  value={formData.conduct}
                  onChange={(e) => setFormData((prev) => ({ ...prev, conduct: e.target.value }))}
                  placeholder="Continuar infusión, destete de oxígeno, egreso a sala..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold"
                >
                  Guardar Evolución
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Previsualización Obligatoria de Evolución (Sección 37) */}
      {isPreviewWordOpen && (
        <MandatoryNotePreviewModal
          isOpen={isPreviewWordOpen}
          onClose={() => setIsPreviewWordOpen(false)}
          patient={patient}
          orders={[]}
          labs={[]}
          studies={[]}
          evolutions={evolutions}
          initialDocType="evolucion"
        />
      )}
    </div>
  );
};
