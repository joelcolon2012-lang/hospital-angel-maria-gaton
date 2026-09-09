import React, { useState } from 'react';
import { Pill, Copy, Download, Check, X, Building2, FileText, Printer } from 'lucide-react';
import { Patient, MedicalOrder } from '../../types';
import { generateIndividualMedicalOrder, downloadFileToPC } from '../../services/hospitalNoteGenerator';
import { exportOfficialMedicalOrderPdf } from '../../services/pdfHospitalDocumentService';
import { exportMedicalOrderToWord } from '../../services/wordExportService';

interface Props {
  patient: Patient;
  orders: MedicalOrder[];
  isOpen: boolean;
  onClose: () => void;
}

export const MedicalOrderPrintModal: React.FC<Props> = ({
  patient,
  orders,
  isOpen,
  onClose,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'sheet' | 'raw'>('sheet');

  if (!isOpen) return null;

  const orderContent = generateIndividualMedicalOrder(patient, orders);

  const handleCopy = () => {
    navigator.clipboard.writeText(orderContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    const filename = `Orden_Medica_${patient.fullName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.txt`;
    downloadFileToPC(filename, orderContent);
  };

  const handleDownloadPdf = () => {
    exportOfficialMedicalOrderPdf(patient, orders);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#0F4C5C] text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-teal-300" />
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">
                Hoja de Órdenes Médicas Oficial
              </h3>
              <p className="text-xs text-teal-100/80">Hospital Regional Ángel María Gatón</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-teal-100 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('sheet')}
              className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${
                viewMode === 'sheet'
                  ? 'bg-white text-teal-900 border-slate-300 shadow-xs'
                  : 'bg-transparent text-slate-500 border-transparent hover:text-slate-800'
              }`}
            >
              📄 Vista Impresa Oficial
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${
                viewMode === 'raw'
                  ? 'bg-white text-teal-900 border-slate-300 shadow-xs'
                  : 'bg-transparent text-slate-500 border-transparent hover:text-slate-800'
              }`}
            >
              📝 Texto Plano
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition-colors active:scale-95 shadow-sm"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {isCopied ? '¡Copiado!' : 'Copiar'}
            </button>
            <button
              onClick={handleDownloadTxt}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100 transition-colors active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar TXT
            </button>
            <button
              onClick={() => exportMedicalOrderToWord(patient, orders)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border border-blue-300 bg-blue-50 text-blue-900 hover:bg-blue-100 transition-colors shadow-xs active:scale-95"
              title="Descargar en formato editable de Microsoft Word (.DOC)"
            >
              <FileText className="w-3.5 h-3.5 text-blue-700" />
              <span>Descargar Word (.DOC)</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-teal-700 text-white hover:bg-teal-800 transition-colors shadow-sm active:scale-95"
              title="Descargar en PDF oficial idéntico al formato del hospital"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Descargar PDF Oficial</span>
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70">
          {viewMode === 'sheet' ? (
            <div className="bg-white max-w-2xl mx-auto p-6 sm:p-8 rounded-xl shadow-md border border-slate-200 text-slate-900 text-xs sm:text-sm font-sans space-y-4">
              {/* Hospital Official Logo */}
              <div className="flex items-center justify-center gap-3 pb-2 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-[#0284C7] flex items-center justify-center text-white font-black text-lg shadow-sm">
                  H
                </div>
                <div>
                  <div className="text-[10px] tracking-widest text-[#0e7490] font-bold uppercase">:HOSPITAL</div>
                  <div className="text-sm sm:text-base font-black text-[#0284C7] tracking-wider uppercase">
                    DR. ÁNGEL MARÍA GATÓN
                  </div>
                </div>
              </div>

              <h4 className="text-center font-black text-sm uppercase tracking-wider text-slate-800">
                ORDEN MEDICA
              </h4>

              <div className="font-bold text-[11px] sm:text-xs text-slate-800 border-b border-slate-100 pb-2">
                NOMBRE: {patient.fullName.toUpperCase()} &nbsp;&nbsp; EDAD: {patient.age || '--'} AÑOS, &nbsp;&nbsp; EMERGENCIA: CUB {patient.cubicle} &nbsp;&nbsp; FECHA: {new Date().toLocaleDateString('es-ES')} &nbsp;&nbsp; HORA: {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
              </div>

              <div className="whitespace-pre-wrap leading-relaxed text-slate-800 text-xs font-medium space-y-2">
                <pre className="font-sans whitespace-pre-wrap leading-relaxed">{orderContent.replace(/^[\s\S]*?(?=MEDIDAS GENERALES:)/, '')}</pre>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 text-slate-100 font-mono text-xs p-4 rounded-xl leading-relaxed">
              <pre className="whitespace-pre-wrap select-all">{orderContent}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
