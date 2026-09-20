import React from 'react';
import { LabResult } from '../../types';
import { X, TrendingUp, TrendingDown, Activity, AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
  parameterName: string;
  labs: LabResult[];
}

export const TrendChartModal: React.FC<Props> = ({
  isOpen,
  onClose,
  patientName,
  parameterName,
  labs
}) => {
  if (!isOpen) return null;

  // Filtrar paraclínicos que coincidan con el parámetro
  const filtered = labs
    .filter(l => l.parameter.toLowerCase().includes(parameterName.toLowerCase()) || parameterName.toLowerCase().includes(l.parameter.toLowerCase()))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const values = filtered.map(l => {
    const num = typeof l.numericValue === 'number' ? l.numericValue : parseFloat(String(l.value || '').replace(',', '.'));
    return {
      date: (l.timestamp || '').slice(0, 10),
      time: (l.timestamp || '').length > 10 ? l.timestamp.slice(11, 16) : '',
      num: !isNaN(num) ? num : 0,
      rawValue: l.value,
      unit: l.unit,
      flag: l.flag,
      ref: l.referenceRange
    };
  });

  const hasData = values.length > 0;
  const minVal = hasData ? Math.min(...values.map(v => v.num)) : 0;
  const maxVal = hasData ? Math.max(...values.map(v => v.num)) : 10;
  const range = maxVal - minVal || 1;

  const isUp = values.length >= 2 && values[values.length - 1].num > values[values.length - 2].num;
  const isDown = values.length >= 2 && values[values.length - 1].num < values[values.length - 2].num;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0F4C5C] text-white px-5 py-3.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-teal-800/80 rounded-lg">
              <Activity className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-none uppercase tracking-wide">
                CURVA EVOLUTIVA & TENDENCIA: {parameterName.toUpperCase()}
              </h3>
              <p className="text-[11px] text-teal-100/80 mt-0.5">
                Paciente: <strong>{patientName}</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Alerta de Dirección */}
          {values.length >= 2 && (
            <div className={`p-3 rounded-xl border flex items-center gap-2.5 font-bold ${
              isUp ? 'bg-amber-50 border-amber-300 text-amber-900' :
              isDown ? 'bg-blue-50 border-blue-300 text-blue-900' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              {isUp ? <TrendingUp className="w-5 h-5 text-amber-600 shrink-0" /> : <TrendingDown className="w-5 h-5 text-blue-600 shrink-0" />}
              <div>
                <div className="text-xs">
                  {isUp ? '↑ TENDENCIA ASCENDENTE DETECTADA' : isDown ? '↓ TENDENCIA DESCENDENTE DETECTADA' : 'TENDENCIA ESTABLE'}
                </div>
                <div className="text-[11px] font-normal text-slate-600 mt-0.5">
                  Comparación cronológica: {values[0].num} {values[0].unit} ({values[0].date}) ➔ {values[values.length - 1].num} {values[values.length - 1].unit} ({values[values.length - 1].date})
                </div>
              </div>
            </div>
          )}

          {/* Gráfico SVG de Puntos y Línea */}
          {values.length >= 2 ? (
            <div className="bg-slate-900 p-4 rounded-xl text-white shadow-inner">
              <div className="text-[10px] text-teal-400 font-mono mb-2 flex justify-between">
                <span>Evolución Temporal ({values[0].unit})</span>
                <span>Rango: {values[0].ref || 'N/A'}</span>
              </div>
              <div className="h-36 relative flex items-end justify-between px-4 pb-4 pt-2 border-b border-l border-slate-700">
                {values.map((v, i) => {
                  const percentHeight = Math.max(15, Math.min(90, ((v.num - minVal) / range) * 100));
                  return (
                    <div key={i} className="flex flex-col items-center gap-1 z-10">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                        v.flag === 'critico' ? 'bg-red-500 text-white' :
                        v.flag === 'alto' || v.flag === 'bajo' ? 'bg-amber-400 text-slate-900' : 'bg-teal-700 text-white'
                      }`}>
                        {v.rawValue}
                      </span>
                      <div
                        style={{ height: `${percentHeight}px` }}
                        className={`w-3.5 rounded-t-md transition-all ${
                          v.flag === 'critico' ? 'bg-red-500 shadow-md shadow-red-500/50' :
                          v.flag === 'alto' || v.flag === 'bajo' ? 'bg-amber-400' : 'bg-teal-500'
                        }`}
                      />
                      <span className="text-[9px] text-slate-400 mt-1 font-mono">{v.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 p-6 rounded-xl text-center text-slate-500 border border-slate-200">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="font-bold">Se requiere al menos 2 registros cronológicos para trazar la curva de tendencia.</p>
              <p className="text-[11px] text-slate-400 mt-1">Registros actuales para este paciente: {values.length}</p>
            </div>
          )}

          {/* Tabla de Historial Detallado */}
          <div>
            <h4 className="font-bold text-slate-700 mb-1.5">Historial Cronológico de Mediciones:</h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-[11px] text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2">Fecha y Hora</th>
                    <th className="p-2">Resultado</th>
                    <th className="p-2">Rango Ref.</th>
                    <th className="p-2">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs font-mono">
                  {values.map((v, i) => (
                    <tr key={i} className={v.flag === 'critico' ? 'bg-red-50/60' : ''}>
                      <td className="p-2">{v.date} {v.time}</td>
                      <td className="p-2 font-bold text-slate-900">{v.rawValue} {v.unit}</td>
                      <td className="p-2 text-slate-500">{v.ref || '--'}</td>
                      <td className="p-2 font-sans font-bold">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          v.flag === 'critico' ? 'bg-red-100 text-red-800' :
                          v.flag === 'alto' || v.flag === 'bajo' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {v.flag.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
