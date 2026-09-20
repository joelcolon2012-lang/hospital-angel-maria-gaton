import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { PatientEvolution, Patient } from '../../types';
import { 
  Plus, Clock, FileText, Save, Download, Check, Trash2, Copy, Sparkles, 
  Stethoscope, AlertCircle, Eye, Printer, ClipboardCheck, ArrowDownToLine 
} from 'lucide-react';
import { VoiceDictationButton } from '../common/VoiceDictationButton';
import { downloadFileToPC, generateOfficialSoapEvolutionNote } from '../../services/hospitalNoteGenerator';
import { MandatoryNotePreviewModal } from '../documents/MandatoryNotePreviewModal';
import { authService } from '../../services/authService';

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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedEvoForView, setSelectedEvoForView] = useState<PatientEvolution | null>(null);
  const [isPreviewWordOpen, setIsPreviewWordOpen] = useState(false);
  const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');

  const activeDocName = authService.getCurrentUser()?.name || patient.attendingDoctor || 'Dr. Joel Colón';

  const v = patient.vitals;
  const currentVitalsSummary = v
    ? `PA: ${v.systolicBP || '--'}/${v.diastolicBP || '--'} mmHg | FC: ${v.heartRate || '--'} lpm | FR: ${v.respiratoryRate || '--'} rpm | SpO2: ${v.oxygenSaturation || '--'}% | Temp: ${v.temperature || '--'}°C | Glicemia: ${v.bloodGlucose || '--'} mg/dL | EVA: ${v.painScale ?? '--'}/10`
    : 'Signos vitales estables en rango normal';

  const [formData, setFormData] = useState({
    timestamp: nowStr,
    doctorName: activeDocName,
    vitalSignsSummary: currentVitalsSummary,
    subjective: '',
    objective: '',
    physicalExamPreloaded: '',
    newResults: '',
    analysis: '',
    updatedDiagnoses: patient.clinicalHistory?.clinicalImpression || patient.chiefComplaint || '',
    plan: '',
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
      doctorName: activeDocName,
      vitalSignsSummary: currentVitalsSummary,
      subjective: `[Día ${dayNumber} de Hospitalización]: ${lastEvo.clinicalChanges || ''}`,
      objective: '',
      physicalExamPreloaded: (lastEvo as any).physicalExamPreloaded || '',
      newResults: lastEvo.newResults || '',
      analysis: lastEvo.problemReevaluation || '',
      updatedDiagnoses: lastEvo.updatedDiagnoses || patient.clinicalHistory?.clinicalImpression || '',
      plan: lastEvo.conduct || '',
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
    if (pe.general) parts.push(`Estado General: ${pe.general}`);
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
    if (pe.neurological) parts.push(`Neurológico: ${pe.neurological}`);
    if (pe.skin) parts.push(`Piel: ${pe.skin}`);

    const examSummary = parts.length > 0 ? parts.join('. ') + '.' : (pe.general || 'Examen físico dentro de límites normales.');

    setFormData((prev) => ({
      ...prev,
      physicalExamPreloaded: examSummary,
      objective: prev.objective 
        ? `${prev.objective}\n\nExamen Físico Reevaluado: ${examSummary}`
        : `Examen Físico Reevaluado: ${examSummary}`
    }));
  };

  const handleImportAdmissionDiagnoses = () => {
    const diag = patient.clinicalHistory?.clinicalImpression || patient.chiefComplaint || '';
    if (!diag) {
      alert('No hay diagnósticos registrados en la historia clínica inicial.');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      updatedDiagnoses: diag
    }));
  };

  const handleCopyFormattedNote = (evo: PatientEvolution) => {
    const note = generateOfficialSoapEvolutionNote(patient, {
      timestamp: evo.timestamp,
      doctorName: evo.doctorName,
      vitalSignsSummary: evo.vitalSignsSummary,
      subjective: evo.clinicalChanges,
      newResults: evo.newResults,
      analysis: evo.problemReevaluation,
      updatedDiagnoses: evo.updatedDiagnoses,
      plan: evo.conduct,
      physicalExamPreloaded: (evo as any).physicalExamPreloaded
    });

    navigator.clipboard.writeText(note);
    setCopiedId(evo.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSaveAndDownload = () => {
    let content = `REGISTRO OFICIAL DE EVOLUCIONES MÉDICAS (SISTEMA S.O.A.P.)\n`;
    content += `Hospital Regional Dr. Ángel María Gatón — Servicio de Medicina Interna & Emergencias\n`;
    content += `Paciente: ${patient.fullName.toUpperCase()} | Exp/Cédula: ${patient.medicalRecordNumber || patient.idDocument || 'S/N'}\n`;
    content += `Fecha de exportación: ${new Date().toLocaleString('es-DO')}\n`;
    content += `================================================================================\n\n`;

    if (evolutions.length === 0) {
      content += `No hay evoluciones registradas para este paciente.\n`;
    } else {
      evolutions.forEach((evo, idx) => {
        content += `[EVOLUCIÓN #${idx + 1}] — FECHA: ${evo.timestamp} (MÉDICO: ${evo.doctorName})\n`;
        content += generateOfficialSoapEvolutionNote(patient, {
          timestamp: evo.timestamp,
          doctorName: evo.doctorName,
          vitalSignsSummary: evo.vitalSignsSummary,
          subjective: evo.clinicalChanges,
          newResults: evo.newResults,
          analysis: evo.problemReevaluation,
          updatedDiagnoses: evo.updatedDiagnoses,
          plan: evo.conduct,
          physicalExamPreloaded: (evo as any).physicalExamPreloaded
        });
        content += `\n\n================================================================================\n\n`;
      });
    }

    const filename = `Evoluciones_SOAP_${patient.fullName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.txt`;
    downloadFileToPC(filename, content);

    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subjective.trim() && !formData.plan.trim() && !formData.analysis.trim()) {
      alert('Por favor complete al menos la sección Subjetiva, Análisis o Plan de la evolución.');
      return;
    }

    // Combinar en el modelo de datos de evolución asegurando que SOAP esté implícito
    onAddEvolution({
      patientId: patient.id,
      timestamp: formData.timestamp,
      doctorName: formData.doctorName,
      vitalSignsSummary: formData.vitalSignsSummary,
      clinicalChanges: formData.subjective.trim() || 'Paciente clínicamente estable',
      newResults: formData.newResults.trim(),
      problemReevaluation: formData.analysis.trim(),
      updatedDiagnoses: formData.updatedDiagnoses.trim(),
      conduct: formData.plan.trim(),
      nextReevaluationTime: formData.nextReevaluationTime.trim(),
      physicalExamPreloaded: formData.physicalExamPreloaded.trim()
    } as any);

    setIsModalOpen(false);
    setFormData({
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      doctorName: activeDocName,
      vitalSignsSummary: currentVitalsSummary,
      subjective: '',
      objective: '',
      physicalExamPreloaded: '',
      newResults: '',
      analysis: '',
      updatedDiagnoses: patient.clinicalHistory?.clinicalImpression || patient.chiefComplaint || '',
      plan: '',
      nextReevaluationTime: '',
    });
  };

  return (
    <div className="space-y-4">
      {/* Header y Botones de Acción */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">Evoluciones Clínicas (Método S.O.A.P.)</h3>
            <span className="text-[10px] font-black uppercase tracking-wider bg-teal-100 text-teal-800 border border-teal-300 px-2 py-0.5 rounded-full">
              Formato Oficial
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro secuencial estructurado: Subjetivo, Objetivo, Análisis y Plan Terapéutico
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Word (.DOCX) */}
          <button
            type="button"
            onClick={() => setIsPreviewWordOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-blue-700 hover:bg-blue-800 text-white transition-all active:scale-95 shadow-2xs cursor-pointer"
            title="Previsualizar y exportar a Word (.DOCX) con membrete institucional"
          >
            <FileText className="w-3.5 h-3.5" />
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
            className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
            title="Genera un borrador editable con fecha actual y estructura del día previo"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Duplicar Anterior</span>
          </button>

          {/* NUEVA EVOLUCIÓN */}
          <button
            type="button"
            onClick={() => {
              setIsDraftFromPrevious(false);
              setFormData({
                timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
                doctorName: activeDocName,
                vitalSignsSummary: currentVitalsSummary,
                subjective: '',
                objective: '',
                physicalExamPreloaded: '',
                newResults: '',
                analysis: '',
                updatedDiagnoses: patient.clinicalHistory?.clinicalImpression || patient.chiefComplaint || '',
                plan: '',
                nextReevaluationTime: '',
              });
              setIsModalOpen(true);
            }}
            className="px-3.5 py-1.5 bg-[#0F4C5C] hover:bg-[#134E5E] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Evolución SOAP</span>
          </button>
        </div>
      </div>

      {/* Lista de Evoluciones Registradas */}
      {evolutions.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500 text-xs shadow-2xs">
          <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-700 text-sm">Sin notas de evolución registradas</p>
          <p className="mt-1">Haga clic en <strong>Nueva Evolución SOAP</strong> para registrar el pase de visita o reevaluación médica del paciente.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {evolutions.map((evo, index) => {
            const isLatest = index === 0;
            return (
              <div 
                key={evo.id} 
                className={`bg-white rounded-2xl border p-4.5 space-y-3 transition-all shadow-2xs ${
                  isLatest ? 'border-teal-300 ring-1 ring-teal-100 bg-teal-50/10' : 'border-slate-200'
                }`}
              >
                {/* Encabezado de la Tarjeta */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0F4C5C]" />
                    <span className="text-xs font-black text-slate-900">{evo.timestamp}</span>
                    <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/60">
                      {evo.doctorName}
                    </span>
                    {isLatest && (
                      <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        Más Reciente
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Botón Ver Nota SOAP Completa */}
                    <button
                      type="button"
                      onClick={() => setSelectedEvoForView(evo)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1 rounded-lg transition-all active:scale-95 cursor-pointer"
                      title="Ver nota de evolución en formato institucional completo"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Ver Nota SOAP</span>
                    </button>

                    {/* Botón Copiar Texto */}
                    <button
                      type="button"
                      onClick={() => handleCopyFormattedNote(evo)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-all active:scale-95 cursor-pointer"
                      title="Copiar texto formal de la evolución al portapapeles"
                    >
                      {copiedId === evo.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>

                    {/* Botón Eliminar */}
                    {onDeleteEvolution && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('¿Desea eliminar permanentemente esta nota de evolución?')) {
                            onDeleteEvolution(evo.id);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar evolución"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Desglose SOAP Estructurado */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* [S] SUBJETIVO */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-teal-900">
                      <span className="w-5 h-5 rounded-md bg-teal-100 text-teal-800 text-[10px] font-black flex items-center justify-center">S</span>
                      <span>Subjetivo (Síntomas y Estado):</span>
                    </div>
                    <p className="text-slate-700 text-[11px] leading-relaxed pl-6">
                      {evo.clinicalChanges || 'Paciente sin quejas sintomáticas agudas.'}
                    </p>
                  </div>

                  {/* [O] OBJETIVO */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-blue-900">
                      <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-black flex items-center justify-center">O</span>
                      <span>Objetivo (Vitales & Paraclínicos):</span>
                    </div>
                    <div className="text-slate-700 text-[11px] leading-relaxed pl-6 space-y-0.5">
                      <p><strong>Vitales:</strong> {evo.vitalSignsSummary}</p>
                      {evo.newResults && <p><strong>Paraclínicos:</strong> {evo.newResults}</p>}
                      {(evo as any).physicalExamPreloaded && <p><strong>Examen Físico:</strong> {(evo as any).physicalExamPreloaded}</p>}
                    </div>
                  </div>

                  {/* [A] ANÁLISIS */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900">
                      <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black flex items-center justify-center">A</span>
                      <span>Análisis & Reevaluación:</span>
                    </div>
                    <div className="text-slate-700 text-[11px] leading-relaxed pl-6 space-y-0.5">
                      <p>{evo.problemReevaluation || 'Evolución clínica favorable.'}</p>
                      {evo.updatedDiagnoses && <p><strong>Diagnósticos:</strong> {evo.updatedDiagnoses}</p>}
                    </div>
                  </div>

                  {/* [P] PLAN */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                      <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center justify-center">P</span>
                      <span>Plan Terapéutico & Conducta:</span>
                    </div>
                    <p className="text-slate-700 text-[11px] leading-relaxed pl-6">
                      {evo.conduct || 'Continuar manejo médico instaurado.'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Botón Guardar / Descargar Texto */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSaveAndDownload}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-[#0F4C5C] hover:bg-[#134E5E] text-white transition-all active:scale-95 shadow-xs cursor-pointer"
        >
          {savedFeedback ? <Check className="w-4 h-4 text-emerald-300" /> : <Download className="w-4 h-4" />}
          <span>{savedFeedback ? '¡Evoluciones Descargadas!' : 'Descargar Historial de Evoluciones (.TXT)'}</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* MODAL NUEVA EVOLUCIÓN SOAP                                                */}
      {/* ========================================================================= */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[99990] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isDraftFromPrevious ? 'Borrador de Evolución Médica' : 'Registrar Evolución Clínica SOAP'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {patient.fullName} • Cama/Cubículo: {patient.cubicle}
                </p>
              </div>

              {/* Botones de Pre-Carga Rápida */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleImportBaselinePhysicalExam}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg transition-all active:scale-95 cursor-pointer shadow-2xs"
                  title="Importar examen físico inicial de la historia clínica para reevaluación rápida"
                >
                  <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
                  <span>🩺 Pre-cargar Examen Físico</span>
                </button>

                <button
                  type="button"
                  onClick={handleImportAdmissionDiagnoses}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg transition-all active:scale-95 cursor-pointer shadow-2xs"
                  title="Importar diagnósticos iniciales de ingreso de la historia clínica"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-600" />
                  <span>📋 Diagnósticos de Ingreso</span>
                </button>
              </div>
            </div>

            {/* Banner de Borrador basado en Evolución Anterior */}
            {isDraftFromPrevious && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-950">BORRADOR BASADO EN EVOLUCIÓN ANTERIOR</p>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-snug">
                    Se copiaron la estructura y los hallazgos previos. Revise y confirme los datos del día antes de finalizar.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Metadatos: Fecha/Hora y Médico */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha y Hora de Reevaluación:</label>
                  <input
                    type="text"
                    value={formData.timestamp}
                    onChange={(e) => setFormData((prev) => ({ ...prev, timestamp: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-[#0F4C5C] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Médico Tratante en Turno:</label>
                  <input
                    type="text"
                    value={formData.doctorName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, doctorName: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-[#0F4C5C] outline-none"
                  />
                </div>
              </div>

              {/* [S] SUBJETIVO */}
              <div className="bg-teal-50/40 p-3.5 rounded-2xl border border-teal-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-teal-950 flex items-center gap-1.5 text-xs">
                    <span className="w-5 h-5 rounded-md bg-teal-600 text-white font-black text-[10px] flex items-center justify-center">S</span>
                    <span>[S] Subjetivo (Síntomas, Tolerancia, Dolor, Sueño):</span>
                  </label>
                  <VoiceDictationButton
                    onTranscript={(text) =>
                      setFormData((prev) => ({
                        ...prev,
                        subjective: prev.subjective ? `${prev.subjective} ${text}` : text,
                      }))
                    }
                  />
                </div>
                <textarea
                  rows={2}
                  value={formData.subjective}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subjective: e.target.value }))}
                  placeholder="Ej: Paciente refiere sentirse en mejoría clínica, adecuada tolerancia a la vía oral, sin náuseas ni dolor precordial, descansó adecuadamente durante la noche..."
                  className="w-full bg-white border border-teal-300/80 rounded-xl p-2.5 text-slate-800 text-xs focus:ring-2 focus:ring-teal-700 outline-none"
                />
              </div>

              {/* [O] OBJETIVO */}
              <div className="bg-blue-50/40 p-3.5 rounded-2xl border border-blue-200/80 space-y-2.5">
                <label className="font-bold text-blue-950 flex items-center gap-1.5 text-xs">
                  <span className="w-5 h-5 rounded-md bg-blue-600 text-white font-black text-[10px] flex items-center justify-center">O</span>
                  <span>[O] Objetivo (Vitales, Examen Físico & Paraclínicos):</span>
                </label>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Signos Vitales Actuales:</label>
                  <input
                    type="text"
                    value={formData.vitalSignsSummary}
                    onChange={(e) => setFormData((prev) => ({ ...prev, vitalSignsSummary: e.target.value }))}
                    className="w-full bg-white border border-blue-300/80 rounded-xl p-2 text-slate-800 text-xs font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-600">Reevaluación del Examen Físico:</label>
                    <button
                      type="button"
                      onClick={handleImportBaselinePhysicalExam}
                      className="text-[10px] font-bold text-indigo-700 hover:underline cursor-pointer"
                    >
                      Cargar de Historia
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={formData.physicalExamPreloaded}
                    onChange={(e) => setFormData((prev) => ({ ...prev, physicalExamPreloaded: e.target.value }))}
                    placeholder="Ej: Consciente, orientado. Tórax simétrico, murmullo vesicular presente sin ruidos agregados. Abdomen blando, depresible, no doloroso..."
                    className="w-full bg-white border border-blue-300/80 rounded-xl p-2 text-slate-800 text-xs focus:ring-2 focus:ring-blue-700 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Nuevos Paraclínicos / Laboratorios / Imágenes:</label>
                  <input
                    type="text"
                    value={formData.newResults}
                    onChange={(e) => setFormData((prev) => ({ ...prev, newResults: e.target.value }))}
                    placeholder="Ej: Hemograma: Hb 13.2, Leucos 7,400. Control de creatinina 0.9 mg/dL. ECG en ritmo sinusal..."
                    className="w-full bg-white border border-blue-300/80 rounded-xl p-2 text-slate-800 text-xs focus:ring-2 focus:ring-blue-700 outline-none"
                  />
                </div>
              </div>

              {/* [A] ANÁLISIS */}
              <div className="bg-amber-50/40 p-3.5 rounded-2xl border border-amber-200/80 space-y-2">
                <label className="font-bold text-amber-950 flex items-center gap-1.5 text-xs">
                  <span className="w-5 h-5 rounded-md bg-amber-600 text-white font-black text-[10px] flex items-center justify-center">A</span>
                  <span>[A] Análisis (Reevaluación Clínica de Problemas & Diagnósticos):</span>
                </label>

                <textarea
                  rows={2}
                  value={formData.analysis}
                  onChange={(e) => setFormData((prev) => ({ ...prev, analysis: e.target.value }))}
                  placeholder="Ej: Paciente con adecuada evolución clínica, compensación hemodinámica y metabólica. Tolerando esquema..."
                  className="w-full bg-white border border-amber-300/80 rounded-xl p-2 text-slate-800 text-xs focus:ring-2 focus:ring-amber-700 outline-none"
                />

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-600">Diagnósticos Activos / Reevaluados:</label>
                    <button
                      type="button"
                      onClick={handleImportAdmissionDiagnoses}
                      className="text-[10px] font-bold text-amber-700 hover:underline cursor-pointer"
                    >
                      Cargar de Ingreso
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formData.updatedDiagnoses}
                    onChange={(e) => setFormData((prev) => ({ ...prev, updatedDiagnoses: e.target.value }))}
                    placeholder="Ej: 1. Neumonía Adquirida en la Comunidad (NAC) 2. Hipertensión Arterial Grado 2"
                    className="w-full bg-white border border-amber-300/80 rounded-xl p-2 text-slate-800 text-xs focus:ring-2 focus:ring-amber-700 outline-none"
                  />
                </div>
              </div>

              {/* [P] PLAN */}
              <div className="bg-emerald-50/40 p-3.5 rounded-2xl border border-emerald-200/80 space-y-1.5">
                <label className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                  <span className="w-5 h-5 rounded-md bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center">P</span>
                  <span>[P] Plan Terapéutico & Conducta Médica:</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.plan}
                  onChange={(e) => setFormData((prev) => ({ ...prev, plan: e.target.value }))}
                  placeholder="Ej: Continuar antibioticoterapia pautada, control de diuresis horaria, destete gradual de oxígeno suplementario, pendientes controles matutinos..."
                  className="w-full bg-white border border-emerald-300/80 rounded-xl p-2.5 text-slate-800 text-xs focus:ring-2 focus:ring-emerald-700 outline-none"
                />
              </div>

              {/* Botones de Envío */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0F4C5C] hover:bg-[#134E5E] text-white rounded-xl font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  Guardar Evolución SOAP
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* MODAL VER NOTA DE EVOLUCIÓN SOAP FORMAL                                   */}
      {/* ========================================================================= */}
      {selectedEvoForView && createPortal(
        <div className="fixed inset-0 z-[99995] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#0F4C5C]" />
                <h3 className="text-sm font-bold text-slate-900">
                  Nota Oficial de Evolución Clínica (Método S.O.A.P.)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvoForView(null)}
                className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed bg-slate-50/50 selection:bg-teal-100">
              {generateOfficialSoapEvolutionNote(patient, {
                timestamp: selectedEvoForView.timestamp,
                doctorName: selectedEvoForView.doctorName,
                vitalSignsSummary: selectedEvoForView.vitalSignsSummary,
                subjective: selectedEvoForView.clinicalChanges,
                newResults: selectedEvoForView.newResults,
                analysis: selectedEvoForView.problemReevaluation,
                updatedDiagnoses: selectedEvoForView.updatedDiagnoses,
                plan: selectedEvoForView.conduct,
                physicalExamPreloaded: (selectedEvoForView as any).physicalExamPreloaded
              })}
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Hospital Regional Dr. Ángel María Gatón • Validez Médica Oficial
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleCopyFormattedNote(selectedEvoForView);
                  }}
                  className="px-4 py-2 bg-[#0F4C5C] hover:bg-[#134E5E] text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Nota</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEvoForView(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Previsualización Obligatoria de Evolución (Word .DOCX) */}
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
