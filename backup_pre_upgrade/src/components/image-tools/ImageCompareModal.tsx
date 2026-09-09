import React, { useState } from 'react';
import { MedicalStudy } from '../../types';
import { X, RotateCw, ZoomIn, Columns } from 'lucide-react';

interface Props {
  study1: MedicalStudy | null;
  study2: MedicalStudy | null;
  onClose: () => void;
}

export const ImageCompareModal: React.FC<Props> = ({ study1, study2, onClose }) => {
  const [rot1, setRot1] = useState(0);
  const [rot2, setRot2] = useState(0);
  const [zoom, setZoom] = useState(1);

  if (!study1 || !study2) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/20">
        <div className="flex items-center gap-2">
          <Columns className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-base">Comparador de Estudios Clínicos Lado a Lado</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom((z) => (z >= 2 ? 1 : z + 0.5))}
            className="px-3 py-1.5 bg-white/10 rounded-xl text-xs flex items-center gap-1 font-semibold"
          >
            <ZoomIn className="w-4 h-4" />
            <span>Zoom {zoom}x</span>
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Side-by-Side Canvas */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-2 overflow-auto">
        {/* Study 1 */}
        <div className="flex flex-col bg-slate-900/90 rounded-2xl border border-white/10 p-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-xs font-bold text-emerald-400">Estudio 1 (Base): </span>
              <span className="text-xs text-white font-semibold">{study1.title}</span>
              <p className="text-[10px] text-slate-400">{study1.createdAt}</p>
            </div>
            <button
              onClick={() => setRot1((r) => (r + 90) % 360)}
              className="p-1.5 bg-white/10 rounded-lg text-xs hover:bg-white/20"
              title="Rotar 90°"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center overflow-hidden bg-black/40 rounded-xl p-2 min-h-[250px]">
            <img
              src={study1.imageDataUrl}
              alt={study1.title}
              style={{ transform: `rotate(${rot1}deg) scale(${zoom})`, transition: 'transform 0.2s' }}
              className="max-h-[50vh] max-w-full object-contain"
            />
          </div>
          {study1.preliminaryInterpretation && (
            <p className="text-[11px] text-slate-300 mt-2 bg-black/50 p-2 rounded-lg">
              {study1.preliminaryInterpretation}
            </p>
          )}
        </div>

        {/* Study 2 */}
        <div className="flex flex-col bg-slate-900/90 rounded-2xl border border-white/10 p-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-xs font-bold text-teal-300">Estudio 2 (Control): </span>
              <span className="text-xs text-white font-semibold">{study2.title}</span>
              <p className="text-[10px] text-slate-400">{study2.createdAt}</p>
            </div>
            <button
              onClick={() => setRot2((r) => (r + 90) % 360)}
              className="p-1.5 bg-white/10 rounded-lg text-xs hover:bg-white/20"
              title="Rotar 90°"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center overflow-hidden bg-black/40 rounded-xl p-2 min-h-[250px]">
            <img
              src={study2.imageDataUrl}
              alt={study2.title}
              style={{ transform: `rotate(${rot2}deg) scale(${zoom})`, transition: 'transform 0.2s' }}
              className="max-h-[50vh] max-w-full object-contain"
            />
          </div>
          {study2.preliminaryInterpretation && (
            <p className="text-[11px] text-slate-300 mt-2 bg-black/50 p-2 rounded-lg">
              {study2.preliminaryInterpretation}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
