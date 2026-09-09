import React from 'react';
import { Patient, MedicalStudy, LabResult } from '../../types';
import { BarChart3, Users, Clock, AlertTriangle, CheckCircle2, TrendingUp, Stethoscope } from 'lucide-react';

interface Props {
  patients: Patient[];
  studiesCount: number;
  labsCount: number;
}

export const EmergencyStatsView: React.FC<Props> = ({ patients, studiesCount, labsCount }) => {
  const total = patients.length;
  const active = patients.filter((p) => p.status !== 'alta' && p.status !== 'referidos').length;
  const observation = patients.filter((p) => p.status === 'observacion').length;
  const discharged = patients.filter((p) => p.status === 'alta').length;
  const admitted = patients.filter((p) => p.status === 'ingresados').length;
  const referred = patients.filter((p) => p.status === 'referidos').length;

  const t1 = patients.filter((p) => p.triageLevel === 1).length;
  const t2 = patients.filter((p) => p.triageLevel === 2).length;
  const t3 = patients.filter((p) => p.triageLevel === 3).length;
  const t4 = patients.filter((p) => p.triageLevel === 4).length;
  const t5 = patients.filter((p) => p.triageLevel === 5).length;

  return (
    <div className="space-y-4 pb-16">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-5 h-5 text-petrol-800" />
          <h2 className="text-base sm:text-lg font-black text-slate-900">
            Estadísticas & Reporte Anónimo del Servicio
          </h2>
        </div>
        <p className="text-xs text-slate-500">
          Métricas de atención en urgencias sin exposición de datos de identificación personal
        </p>
      </div>

      {/* Summary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm text-center">
          <span className="text-xs text-slate-500 font-bold block mb-1">Total Atendidos</span>
          <span className="text-2xl font-black text-slate-900">{total}</span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm text-center">
          <span className="text-xs text-emerald-600 font-bold block mb-1">Activos Ahora</span>
          <span className="text-2xl font-black text-emerald-700">{active}</span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm text-center">
          <span className="text-xs text-amber-600 font-bold block mb-1">En Observación</span>
          <span className="text-2xl font-black text-amber-700">{observation}</span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm text-center">
          <span className="text-xs text-petrol-800 font-bold block mb-1">Altas Médicas</span>
          <span className="text-2xl font-black text-petrol-900">{discharged}</span>
        </div>
      </div>

      {/* Triage Distribution Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
          Distribución por Nivel de Triaje
        </h3>

        <div className="space-y-2 text-xs">
          {[
            { lvl: 1, label: 'Nivel I (Reanimación)', count: t1, color: 'bg-red-600' },
            { lvl: 2, label: 'Nivel II (Emergencia)', count: t2, color: 'bg-amber-500' },
            { lvl: 3, label: 'Nivel III (Urgencia)', count: t3, color: 'bg-yellow-400' },
            { lvl: 4, label: 'Nivel IV (Prioritario)', count: t4, color: 'bg-emerald-500' },
            { lvl: 5, label: 'Nivel V (No Urgente)', count: t5, color: 'bg-blue-500' },
          ].map((item) => {
            const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
            return (
              <div key={item.lvl} className="space-y-1">
                <div className="flex justify-between font-semibold text-slate-700">
                  <span>{item.label}</span>
                  <span>{item.count} pacientes ({pct}%)</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Additional Metrics: Studies & Dispositions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Studies & Labs */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3 text-xs">
          <h4 className="font-bold text-slate-800 uppercase tracking-wider">
            Actividad de Diagnóstico
          </h4>
          <div className="divide-y divide-slate-100">
            <div className="py-2 flex justify-between">
              <span className="text-slate-600">Estudios de Imagen & ECG:</span>
              <span className="font-bold text-slate-900">{studiesCount} realizados</span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-slate-600">Paraclínicos & Analíticas:</span>
              <span className="font-bold text-slate-900">{labsCount} parámetros</span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-slate-600">Tiempo Promedio Reevaluación:</span>
              <span className="font-bold text-slate-900">45 minutos</span>
            </div>
          </div>
        </div>

        {/* Dispositions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3 text-xs">
          <h4 className="font-bold text-slate-800 uppercase tracking-wider">
            Destinos de Egreso
          </h4>
          <div className="divide-y divide-slate-100">
            <div className="py-2 flex justify-between">
              <span className="text-slate-600">Alta a Domicilio:</span>
              <span className="font-bold text-emerald-700">{discharged}</span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-slate-600">Ingreso Hospitalario (Sala/UCI):</span>
              <span className="font-bold text-blue-700">{admitted}</span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-slate-600">Referidos / Traslados:</span>
              <span className="font-bold text-purple-700">{referred}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
