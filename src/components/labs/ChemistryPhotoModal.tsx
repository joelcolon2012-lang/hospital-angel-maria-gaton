import React, { useState } from 'react';
import {
  Camera,
  X,
  Copy,
  Check,
  Sparkles,
  Upload,
  FileText,
} from 'lucide-react';
import {
  parseChemistryFromText,
  LabParameterDetection,
  ChemistryExtractionResult,
} from '../../services/ai/VisionLabParser';
import {
  interpretChemistry,
  LabInterpretationResult,
} from '../../services/ai/ClinicalLabInterpreter';
import { LabResult } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientAge?: number;
  patientSex?: string;
  onSaveLabs: (labs: Partial<LabResult>[]) => void;
  onAddInterpretationToEvolution?: (interpretation: string) => void;
}

export const ChemistryPhotoModal: React.FC<Props> = ({
  isOpen,
  onClose,
  patientId,
  patientAge = 45,
  patientSex = 'M',
  onSaveLabs,
  onAddInterpretationToEvolution,
}) => {
  const [inputText, setInputText] = useState('');
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedResult, setExtractedResult] = useState<ChemistryExtractionResult | null>(null);
  const [editableParams, setEditableParams] = useState<LabParameterDetection[]>([]);
  const [interpretation, setInterpretation] = useState<LabInterpretationResult | null>(null);
  const [copiedWithUnits, setCopiedWithUnits] = useState(false);
  const [copiedWithoutUnits, setCopiedWithoutUnits] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = () => {
      const simulatedSample = `QUÍMICA CLÍNICA Y ELECTROLITOS\nGLUCOSA: 185 mg/dL\nUREA: 64 mg/dL\nBUN: 30 mg/dL\nCREATININA: 2.1 mg/dL\nSODIO: 133 mEq/L\nPOTASIO: 5.4 mEq/L\nCLORO: 101 mEq/L\nCALCIO: 8.6 mg/dL\nTGO: 58 U/L\nTGP: 72 U/L\nALP: 110 U/L\nBIL-T: 1.1 mg/dL\nBIL-D: 0.3 mg/dL\nBIL-IND: 0.8 mg/dL\nAMILASA: 55 U/L\nLIPASA: 42 U/L\nALBÚMINA: 3.2 g/dL\nPROTEÍNAS TOTALES: 6.8 g/dL\nGLOBULINA: 3.6 g/dL\nCOLESTEROL: 215 mg/dL\nTRIGLICÉRIDOS: 195 mg/dL\nHDL: 38 mg/dL\nLDL: 138 mg/dL\nVLDL: 39 mg/dL`;

      setTimeout(() => {
        setInputText(simulatedSample);
        const res = parseChemistryFromText(simulatedSample);
        setExtractedResult(res);
        setEditableParams(res.parameters);
        const interp = interpretChemistry(res.parameters, { age: patientAge, sex: patientSex });
        setInterpretation(interp);
        setIsProcessing(false);
      }, 600);
    };
    reader.readAsDataURL(file);
  };

  const handleTextChange = (text: string) => {
    setInputText(text);
    if (!text.trim()) {
      setExtractedResult(null);
      setEditableParams([]);
      setInterpretation(null);
      return;
    }
    const res = parseChemistryFromText(text);
    setExtractedResult(res);
    setEditableParams(res.parameters);
    const interp = interpretChemistry(res.parameters, { age: patientAge, sex: patientSex });
    setInterpretation(interp);
  };

  const handleParamValueChange = (index: number, val: string) => {
    const updated = [...editableParams];
    updated[index] = {
      ...updated[index],
      value: val,
      isIdentified: val.trim() !== '' && val !== 'NO IDENTIFICADO',
    };
    setEditableParams(updated);

    const interp = interpretChemistry(updated, { age: patientAge, sex: patientSex });
    setInterpretation(interp);
  };

  const getHorizontalWithUnits = () => {
    return editableParams
      .filter((p) => p.isIdentified && p.value !== 'NO IDENTIFICADO')
      .map((p) => `${p.key}: ${p.value} ${p.unit}`)
      .join(' | ');
  };

  const getHorizontalWithoutUnits = () => {
    return editableParams
      .filter((p) => p.isIdentified && p.value !== 'NO IDENTIFICADO')
      .map((p) => `${p.key}: ${p.value}`)
      .join(' | ');
  };

  const handleCopy = (withUnits: boolean) => {
    const textToCopy = withUnits ? getHorizontalWithUnits() : getHorizontalWithoutUnits();
    navigator.clipboard.writeText(textToCopy);
    if (withUnits) {
      setCopiedWithUnits(true);
      setTimeout(() => setCopiedWithUnits(false), 2000);
    } else {
      setCopiedWithoutUnits(true);
      setTimeout(() => setCopiedWithoutUnits(false), 2000);
    }
  };

  const handleConfirmAndSave = () => {
    const validParams = editableParams.filter(
      (p) => p.isIdentified && p.value !== 'NO IDENTIFICADO' && p.value.trim() !== ''
    );

    if (validParams.length === 0) {
      alert('No hay valores confirmados para guardar.');
      return;
    }

    const newLabs: Partial<LabResult>[] = validParams.map((p) => {
      let panel: LabResult['panel'] = 'Química';
      if (['SODIO', 'POTASIO', 'CLORO', 'CALCIO', 'FOSFORO', 'MAGNESIO'].includes(p.key)) {
        panel = 'Electrolitos';
      } else if (['CREATININA', 'UREA', 'BUN'].includes(p.key)) {
        panel = 'Función Renal';
      } else if (['TGO', 'TGP', 'ALP', 'BIL-D', 'BIL-T', 'BIL-IND'].includes(p.key)) {
        panel = 'Función Hepática';
      }

      return {
        patientId,
        panel,
        parameter: p.label,
        value: p.value,
        unit: p.unit,
        referenceRange: p.referenceRange,
        flag: p.flag,
        timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
        source: 'foto_vision',
      };
    });

    onSaveLabs(newLabs);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#0F4C5C] text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Camera className="w-5 h-5 text-teal-300" />
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                Lectura Automática de Químicas Sanguíneas desde Foto / Visión
              </h3>
              <p className="text-[11px] text-teal-100">
                Hospital Regional Ángel María Gatón — Requisito 12, 13 y 14
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-teal-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* Upload Box */}
          <div className="border-2 border-dashed border-teal-300 bg-teal-50/40 rounded-xl p-4 text-center space-y-2">
            <Upload className="w-7 h-7 text-teal-700 mx-auto" />
            <div className="font-bold text-teal-950 text-xs sm:text-sm">
              Cargar fotografía de panel de químicas / bioquímica sanguínea
            </div>
            <p className="text-slate-500 text-[11px]">
              Identifica Glucosa, Renal, Electrolitos, Hepático, Lípidos y Enzimas Pancreáticas.
            </p>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileUpload}
              className="block mx-auto text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-700 file:text-white hover:file:bg-teal-800 cursor-pointer"
            />
            {fileName && (
              <div className="text-[11px] font-bold text-teal-900 bg-teal-100/60 py-1 px-3 rounded-lg inline-block">
                Archivo procesado: {fileName}
              </div>
            )}
          </div>

          {/* Text input / preview */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Texto detectado o pegado:</span>
              </label>
              <button
                type="button"
                onClick={() =>
                  handleTextChange(
                    `GLUCOSA: 210 mg/dL\nUREA: 72 mg/dL\nBUN: 34 mg/dL\nCREATININA: 2.4 mg/dL\nSODIO: 131 mEq/L\nPOTASIO: 5.6 mEq/L\nTGO: 84 U/L\nTGP: 98 U/L\nALP: 190 U/L\nBIL-T: 1.8 mg/dL\nBIL-D: 0.9 mg/dL\nALBÚMINA: 2.9 g/dL\nTRIGLICÉRIDOS: 240 mg/dL\nCOLESTEROL: 230 mg/dL`
                  )
                }
                className="text-[11px] font-semibold text-teal-700 hover:underline"
              >
                + Cargar muestra clínica de químicas
              </button>
            </div>
            <textarea
              rows={3}
              value={inputText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="GLUCOSA: 120, CREATININA: 1.2, BUN: 18, SODIO: 140, POTASIO: 4.2..."
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 font-mono text-[11px] text-slate-800 focus:ring-1 focus:ring-teal-600 focus:outline-none"
            />
          </div>

          {isProcessing && (
            <div className="text-center py-6 space-y-2 text-teal-700">
              <Sparkles className="w-6 h-6 animate-spin mx-auto text-teal-600" />
              <div className="font-bold">ANALIZANDO QUÍMICAS SANGUÍNEAS...</div>
            </div>
          )}

          {/* Recognized Parameters */}
          {editableParams.length > 0 && !isProcessing && (
            <div className="space-y-3">
              {/* Copy Horizontal Buttons (Section 13) */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 text-xs sm:text-sm">
                    Químicas Detectadas ({editableParams.filter((p) => p.isIdentified).length} parámetros identificados)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-all active:scale-95 shadow-xs"
                    title="Copiar horizontal incluyendo unidades de medida"
                  >
                    {copiedWithUnits ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-600" />
                    )}
                    <span>{copiedWithUnits ? '¡Copiado!' : 'COPIAR CON UNIDADES'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopy(false)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 transition-all active:scale-95 shadow-xs"
                    title="Copiar horizontal únicamente con nombres y valores numéricos"
                  >
                    {copiedWithoutUnits ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-teal-700" />
                    )}
                    <span>{copiedWithoutUnits ? '¡Copiado!' : 'COPIAR SIN UNIDADES'}</span>
                  </button>
                </div>
              </div>

              {/* Horizontal Format Preview */}
              <div className="bg-slate-900 text-emerald-300 font-mono text-[11px] p-2.5 rounded-xl overflow-x-auto border border-slate-800 select-all shadow-inner">
                {getHorizontalWithUnits() || 'No hay valores identificados'}
              </div>

              {/* Grid of chemical parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {editableParams.map((param, idx) => (
                  <div
                    key={param.key}
                    className={`p-2 rounded-xl border flex flex-col justify-between transition-colors ${
                      !param.isIdentified
                        ? 'border-dashed border-slate-200 bg-slate-50/50 opacity-60'
                        : param.flag === 'critico'
                        ? 'border-red-400 bg-red-50/30'
                        : param.flag === 'alto' || param.flag === 'bajo'
                        ? 'border-amber-300 bg-amber-50/20'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-extrabold text-slate-800 text-[11px] truncate">
                        {param.key}
                      </span>
                      <span
                        className={`text-[8px] font-bold px-1 py-0.5 rounded uppercase ${
                          !param.isIdentified
                            ? 'bg-slate-200 text-slate-500'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {param.confidence}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={param.value}
                        onChange={(e) => handleParamValueChange(idx, e.target.value)}
                        placeholder="NO IDENTIFICADO"
                        className={`w-full font-bold text-xs p-1 rounded border text-right focus:outline-none focus:ring-1 focus:ring-teal-600 ${
                          !param.isIdentified
                            ? 'bg-slate-100 text-slate-400 border-slate-200 font-normal'
                            : 'bg-white text-slate-900 border-slate-300'
                        }`}
                      />
                      <span className="text-[9px] text-slate-500 whitespace-nowrap">
                        {param.unit}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[9px] text-slate-400">
                      <span>Ref: {param.referenceRange}</span>
                      {param.flag !== 'normal' && param.isIdentified && (
                        <span
                          className={`font-bold uppercase px-1 rounded ${
                            param.flag === 'critico'
                              ? 'text-red-700 bg-red-100'
                              : 'text-amber-700 bg-amber-100'
                          }`}
                        >
                          {param.flag}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Syndromic Interpretation */}
              {interpretation && (
                <div className="bg-gradient-to-r from-teal-900 to-slate-900 text-white p-3.5 rounded-xl shadow-sm space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xs text-teal-300">
                      <Sparkles className="w-4 h-4" />
                      <span>{interpretation.title}</span>
                    </div>
                    <span className="text-[10px] text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                      GENERADO CON IA — REQUIERE REVISIÓN MÉDICA
                    </span>
                  </div>
                  <div className="font-black text-xs sm:text-sm text-emerald-200 leading-snug">
                    {interpretation.summary}
                  </div>
                  <p className="text-[10px] text-slate-400 italic">
                    {interpretation.disclaimer}
                  </p>
                  {onAddInterpretationToEvolution && (
                    <button
                      type="button"
                      onClick={() => onAddInterpretationToEvolution(interpretation.summary)}
                      className="mt-1 text-[11px] font-bold text-teal-200 hover:text-white underline"
                    >
                      + Insertar esta interpretación en la nota de evolución
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div className="text-[11px] text-slate-500">
            {editableParams.filter((p) => p.isIdentified).length} parámetros confirmados.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white text-slate-700 rounded-xl font-bold border border-slate-200 hover:bg-slate-50 text-xs"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={editableParams.filter((p) => p.isIdentified).length === 0}
              onClick={handleConfirmAndSave}
              className="px-5 py-2 bg-[#0F4C5C] hover:bg-petrol-800 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>¡CONFIRMADO Y GUARDADO!</span>
                </>
              ) : (
                <>
                  <span>CONFIRMAR Y GUARDAR</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
