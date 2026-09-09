import React, { useState } from 'react';
import { Patient, MedicalOrder, LabResult, PatientEvolution } from '../../types';
import { generatePatientPDF, DocumentSectionSelection } from '../../services/pdfGenerator';
import { googleDriveService } from '../../services/googleDriveService';
import { X, FileDown, Copy, Cloud, Check, Loader2, FileText, CheckCircle2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  labs: LabResult[];
  orders: MedicalOrder[];
  evolutions: PatientEvolution[];
}

export const DocumentExporterModal: React.FC<Props> = ({
  isOpen,
  onClose,
  patient,
  labs,
  orders,
  evolutions,
}) => {
  const [docType, setDocType] = useState('HISTORIA CLÍNICA DE EMERGENCIA');
  const [sections, setSections] = useState<DocumentSectionSelection>({
    includeVitals: true,
    includeHistory: true,
    includePhysicalExam: true,
    includeLabs: true,
    includeOrders: true,
    includeEvolutions: true,
    includeDisposition: true,
  });

  const [copied, setCopied] = useState(false);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [driveResult, setDriveResult] = useState<{ success: boolean; message: string; drivePath?: string } | null>(null);

  if (!isOpen) return null;

  const toggleSection = (k: keyof DocumentSectionSelection) => {
    setSections((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  // Compile formatted plain text for clipboard
  const getCompiledText = () => {
    let out = `=====================================================\n`;
    out += `HOSPITAL REGIONAL ÁNGEL MARÍA GATÓN\n`;
    out += `DEPARTAMENTO DE MEDICINA DE EMERGENCIAS\n`;
    out += `${docType.toUpperCase()}\n`;
    out += `Fecha: ${new Date().toLocaleString('es-ES')}\n`;
    out += `=====================================================\n`;
    out += `PACIENTE: ${patient.fullName} | CÓDIGO: ${patient.internalCode}\n`;
    out += `EDAD/SEXO: ${patient.age || 'N/A'} años / ${patient.sex} | TRIAJE: NIVEL ${patient.triageLevel}\n`;
    out += `CUBÍCULO: ${patient.cubicle} | LLEGADA: ${patient.arrivalDateTime}\n`;
    out += `MÉDICO TRATANTE: ${patient.attendingDoctor || 'Dr. Colón'}\n\n`;

    out += `--- 1. MOTIVO DE CONSULTA ---\n${patient.chiefComplaint || 'Dato no registrado'}\n\n`;

    if (sections.includeVitals && patient.vitals) {
      const v = patient.vitals;
      out += `--- 2. CONSTANTES VITALES ---\n`;
      out += `PA: ${v.systolicBP || '--'}/${v.diastolicBP || '--'} mmHg (PAM: ${v.map || '--'}) | FC: ${v.heartRate || '--'} lpm | FR: ${v.respiratoryRate || '--'} rpm | SpO2: ${v.oxygenSaturation || '--'}% | Temp: ${v.temperature || '--'}°C | Glucemia: ${v.bloodGlucose || '--'} mg/dL | GCS: ${v.glasgowTotal || '--'}/15 | Dolor EVA: ${v.painScale ?? '--'}/10\n`;
      if (v.allergies && v.allergies.length > 0) out += `ALERGIAS: ${v.allergies.join(', ')}\n`;
      out += `\n`;
    }

    if (sections.includeHistory && patient.clinicalHistory) {
      const ch = patient.clinicalHistory;
      out += `--- 3. ENFERMEDAD ACTUAL Y ANTECEDENTES ---\n`;
      out += `HDA: ${ch.currentIllnessHistory || 'Dato no registrado'}\n`;
      out += `Patológicos: ${ch.pathologicalHistory || 'Negados'}\n`;
      out += `Quirúrgicos: ${ch.surgicalHistory || 'Negados'}\n`;
      out += `Medicamentos habituales: ${ch.habitualMedications || 'Ninguno'}\n\n`;
    }

    if (sections.includePhysicalExam && patient.clinicalHistory?.physicalExam) {
      const pe = patient.clinicalHistory.physicalExam;
      out += `--- 4. EXAMEN FÍSICO ---\n`;
      out += `General: ${pe.general || 'Normal'}\n`;
      out += `Cardiovascular: ${pe.cardiovascular || 'Ruidos rítmicos'}\n`;
      out += `Respiratorio: ${pe.respiratory || 'Murmullo vesicular conservado'}\n`;
      out += `Abdomen: ${pe.abdominal || 'Blando, no doloroso'}\n`;
      out += `Neurológico: ${pe.neurological || 'Lúcido, sin focalidad'}\n\n`;
    }

    if (sections.includeLabs && labs.length > 0) {
      out += `--- 5. PARACLÍNICOS Y LABORATORIOS ---\n`;
      labs.forEach((l) => {
        out += `• ${l.parameter}: ${l.value} ${l.unit} (Ref: ${l.referenceRange}) [${l.flag.toUpperCase()}]\n`;
      });
      out += `\n`;
    }

    if (patient.clinicalHistory?.clinicalImpression) {
      out += `--- 6. IMPRESIÓN CLÍNICA Y PLAN ---\n`;
      out += `Diagnósticos: ${patient.clinicalHistory.clinicalImpression}\n`;
      out += `Plan: ${patient.clinicalHistory.diagnosticAndTherapeuticPlan || 'Observación'}\n\n`;
    }

    if (sections.includeOrders && orders.length > 0) {
      out += `--- 7. TRATAMIENTO PRESCRITO ---\n`;
      orders.forEach((o) => {
        out += `• ${o.name} - ${o.dose} (${o.route}, ${o.frequency})\n`;
      });
      out += `\n`;
    }

    if (sections.includeDisposition && patient.disposition) {
      const d = patient.disposition;
      out += `--- 8. DISPOSICIÓN FINAL ---\n`;
      out += `Destino: ${d.outcome} (${d.timestamp})\n`;
      out += `Diagnósticos finales: ${d.finalDiagnoses}\n`;
      out += `Tratamiento al egreso: ${d.dischargeTreatment}\n`;
      out += `Signos de alarma: ${d.redFlags}\n\n`;
    }

    out += `Nota: Documento de apoyo clínico y registro oficial de urgencias.\n`;
    return out;
  };

  const handleCopyText = () => {
    const text = getCompiledText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = () => {
    const doc = generatePatientPDF(patient, docType, sections, labs, orders, evolutions);
    const fileName = `${patient.internalCode}_${patient.fullName.replace(/\s+/g, '_')}_Historia.pdf`;
    doc.save(fileName);
  };

  const handleSaveToGoogleDrive = async () => {
    setIsUploadingToDrive(true);
    setDriveResult(null);

    try {
      const doc = generatePatientPDF(patient, docType, sections, labs, orders, evolutions);
      const pdfBlob = doc.output('blob');
      const fileName = `${patient.internalCode}_${patient.fullName.replace(/\s+/g, '_')}_Historia.pdf`;

      const res = await googleDriveService.uploadMedicalFile(
        patient.internalCode,
        patient.fullName,
        fileName,
        pdfBlob,
        'application/pdf'
      );

      setDriveResult(res);
    } catch (err: any) {
      setDriveResult({ success: false, message: err.message || 'Error al conectar con Google Drive.' });
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-3xl rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="bg-[#0F4C5C] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-300" />
            <h3 className="font-bold text-base">Generador de Documentos Médicos & Exportación</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Document Type Selector */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Tipo de Documento Clínico</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-sm text-slate-800"
            >
              <option value="HISTORIA CLÍNICA DE EMERGENCIA">Historia Clínica Completa de Emergencia</option>
              <option value="NOTA DE INGRESO Y TRIAJE">Nota de Ingreso y Triaje</option>
              <option value="NOTA DE REEVALUACIÓN MÉDICA">Nota de Reevaluación Médica</option>
              <option value="RESUMEN DE REFERIMIENTO Y TRASLADO">Resumen de Referimiento y Traslado</option>
              <option value="EPICRISIS Y NOTA DE ALTA MÉDICA">Epicrisis y Nota de Alta Médica</option>
            </select>
          </div>

          {/* Section Selection Checkboxes */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Secciones a Incluir en el Documento:</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sections.includeVitals}
                  onChange={() => toggleSection('includeVitals')}
                  className="rounded text-petrol-800"
                />
                <span className="font-medium">Signos Vitales</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sections.includeHistory}
                  onChange={() => toggleSection('includeHistory')}
                  className="rounded text-petrol-800"
                />
                <span className="font-medium">Historia & Antecedentes</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sections.includePhysicalExam}
                  onChange={() => toggleSection('includePhysicalExam')}
                  className="rounded text-petrol-800"
                />
                <span className="font-medium">Examen Físico</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sections.includeLabs}
                  onChange={() => toggleSection('includeLabs')}
                  className="rounded text-petrol-800"
                />
                <span className="font-medium">Paraclínicos</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sections.includeOrders}
                  onChange={() => toggleSection('includeOrders')}
                  className="rounded text-petrol-800"
                />
                <span className="font-medium">Órdenes Médicas</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sections.includeEvolutions}
                  onChange={() => toggleSection('includeEvolutions')}
                  className="rounded text-petrol-800"
                />
                <span className="font-medium">Evoluciones</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sections.includeDisposition}
                  onChange={() => toggleSection('includeDisposition')}
                  className="rounded text-petrol-800"
                />
                <span className="font-medium">Disposición Final</span>
              </label>
            </div>
          </div>

          {/* Drive Upload Notification */}
          {driveResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                driveResult.success
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-red-50 border-red-300 text-red-900'
              }`}
            >
              {driveResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <X className="w-5 h-5 text-red-600 shrink-0" />
              )}
              <div>
                <p className="font-bold">{driveResult.message}</p>
                {driveResult.drivePath && (
                  <p className="text-[11px] mt-0.5 text-emerald-800">
                    Ruta: <strong>{driveResult.drivePath}</strong>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Formatted Text Preview Container */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700">Previsualización del Texto Clínico:</label>
              <span className="text-[11px] text-slate-500">Formato listo para copiar a expediente electrónico</span>
            </div>
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-2xl text-[11px] font-mono whitespace-pre-wrap max-h-56 overflow-y-auto border border-slate-800">
              {getCompiledText()}
            </pre>
          </div>
        </div>

        {/* Bottom Actions Toolbar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Copy Text */}
          <button
            type="button"
            onClick={handleCopyText}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
              copied
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? '¡Texto Copiado!' : 'Copiar Texto al Portapapeles'}</span>
          </button>

          {/* Cloud & PDF Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Google Drive Upload Button */}
            <button
              type="button"
              disabled={isUploadingToDrive}
              onClick={handleSaveToGoogleDrive}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm active:scale-95"
            >
              {isUploadingToDrive ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Cloud className="w-4 h-4" />
              )}
              <span>{isUploadingToDrive ? 'Guardando en Drive...' : 'Guardar en Google Drive'}</span>
            </button>

            {/* Download PDF */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-[#0F4C5C] hover:bg-petrol-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md active:scale-95"
            >
              <FileDown className="w-4 h-4 text-emerald-300" />
              <span>Descargar PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
