import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Patient, MedicalOrder, LabResult, PatientEvolution, User } from '../../types';
import {
  guardiaAppService,
  GuardiaBed,
  generateDefaultHospitalBeds,
} from '../../services/guardiaAppService';
import {
  X,
  ShieldCheck,
  Building2,
  Bed,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  Clock,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Layers,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  orders?: MedicalOrder[];
  labs?: LabResult[];
  evolutions?: PatientEvolution[];
  currentUser?: User;
  onAdmitSuccess?: (bedCode: string) => void;
}

export const SendToGuardiaModal: React.FC<Props> = ({
  isOpen,
  onClose,
  patient,
  orders = [],
  labs = [],
  evolutions = [],
  currentUser,
  onAdmitSuccess,
}) => {
  const [beds, setBeds] = useState<GuardiaBed[]>(generateDefaultHospitalBeds());
  const [selectedBedCode, setSelectedBedCode] = useState<string>('301-C1');
  const [activeServiceTab, setActiveServiceTab] = useState<'MEDICINA_INTERNA_I' | 'MEDICINA_INTERNA_II'>(
    'MEDICINA_INTERNA_I'
  );
  const [isGuardiaOnline, setIsGuardiaOnline] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Inicializar o refrescar camas y estado de conexión
  const checkConnectionAndBeds = async () => {
    setIsLoading(true);
    const status = await guardiaAppService.checkGuardiaStatus();
    setIsGuardiaOnline(status.online);
    setStatusMessage(status.message || '');

    const bedData = await guardiaAppService.fetchBedMap();
    setBeds(bedData.beds);

    // Preseleccionar cama si el paciente ya tiene una cama en su cubículo
    const cub = (patient.cubicle || '').trim().toUpperCase();
    if (/^(30[1-9]|31[0-6])-C[12]$/.test(cub)) {
      setSelectedBedCode(cub);
      const roomNum = parseInt(cub.split('-')[0], 10);
      if (roomNum >= 309) {
        setActiveServiceTab('MEDICINA_INTERNA_II');
      } else {
        setActiveServiceTab('MEDICINA_INTERNA_I');
      }
    } else {
      // Buscar la primera disponible en el tab activo
      const firstAvail = bedData.beds.find((b) => b.status === 'DISPONIBLE');
      if (firstAvail) {
        setSelectedBedCode(firstAvail.code);
        setActiveServiceTab(firstAvail.service);
      }
    }

    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      checkConnectionAndBeds();
    }
  }, [isOpen, patient.id]);

  if (!isOpen) return null;

  const filteredBeds = beds.filter((b) => b.service === activeServiceTab);

  // Agrupar camas por sala
  const roomsMap = new Map<string, GuardiaBed[]>();
  filteredBeds.forEach((bed) => {
    if (!roomsMap.has(bed.room)) {
      roomsMap.set(bed.room, []);
    }
    roomsMap.get(bed.room)!.push(bed);
  });

  const selectedBedObj = beds.find((b) => b.code === selectedBedCode);

  const handleConfirmAdmission = async () => {
    if (!selectedBedCode) {
      alert('Por favor selecciona una cama para el ingreso.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await guardiaAppService.admitPatientToGuardia(patient, selectedBedCode, {
        orders,
        labs,
        evolutions,
        user: currentUser,
      });

      if (onAdmitSuccess) {
        onAdmitSuccess(selectedBedCode);
      }

      // Redirección inmediata a la aplicación de guardia
      guardiaAppService.redirectToGuardia(result.redirectUrl);
      onClose();
    } catch (err: any) {
      alert('Error al transferir a la Guardia Clínica: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const primaryDiag =
    patient.clinicalHistory?.clinicalImpression ||
    patient.chiefComplaint ||
    'Pendiente de valoración diagnóstica';

  return createPortal(
    <div className="fixed inset-0 z-[99990] flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in select-none">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] z-10 animate-scale-up">
        {/* Header Institucional */}
        <div className="bg-[#0F4C5C] text-white p-4 sm:p-5 flex items-center justify-between border-b border-teal-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-teal-200 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg tracking-tight">
                  Ingreso a Sala & Guardia Clínica
                </h3>
                <span className="text-[10px] bg-teal-400/20 text-teal-200 px-2 py-0.5 rounded-md border border-teal-300/30 uppercase font-black">
                  Medicina Interna
                </span>
              </div>
              <p className="text-xs text-teal-100/90 mt-0.5">
                Hospital Regional Dr. Ángel María Gatón • Vinculación automática con la Guardia App
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-teal-100 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Resumen del Paciente y Estado de Conexión */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-black text-sm">
              {patient.sex === 'F' ? '♀' : '♂'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">{patient.fullName}</span>
                <span className="text-xs font-mono font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {patient.internalCode}
                </span>
              </div>
              <p className="text-xs text-slate-600 line-clamp-1">
                <strong>Dx:</strong> {primaryDiag}
              </p>
            </div>
          </div>

          {/* Badge de Conexión con Guardia Clínica */}
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${
                isGuardiaOnline
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isGuardiaOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span>{isGuardiaOnline ? 'Guardia App Conectada (3100)' : 'Modo Directo'}</span>
            </div>
            <button
              onClick={checkConnectionAndBeds}
              disabled={isLoading}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-all cursor-pointer"
              title="Refrescar estado de camas"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tabs de Servicio: Medicina Interna I vs II */}
        <div className="px-4 sm:px-6 pt-3 pb-1 border-b border-slate-200 bg-white flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveServiceTab('MEDICINA_INTERNA_I')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeServiceTab === 'MEDICINA_INTERNA_I'
                ? 'bg-[#0F4C5C] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Medicina Interna I (Salas 301 - 308)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveServiceTab('MEDICINA_INTERNA_II')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeServiceTab === 'MEDICINA_INTERNA_II'
                ? 'bg-[#0F4C5C] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Medicina Interna II (Salas 309 - 316)</span>
          </button>
        </div>

        {/* Grid de Camas por Sala */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Selecciona la sala y cama de hospitalización para el paciente:</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Disponible
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Ocupada
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0F4C5C]" /> Seleccionada
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from(roomsMap.entries()).map(([roomNumber, roomBeds]) => {
              return (
                <div
                  key={roomNumber}
                  className="bg-slate-50/70 border border-slate-200 rounded-2xl p-2.5 space-y-2 hover:border-slate-300 transition-all"
                >
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
                    <span className="font-bold text-xs text-slate-800 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-[#0F4C5C]" />
                      Sala {roomNumber}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {roomBeds.length} camas
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {roomBeds.map((b) => {
                      const isSelected = selectedBedCode === b.code;
                      const isOccupied = b.status === 'OCUPADA' || b.status === 'CRITICO';

                      return (
                        <button
                          key={b.code}
                          type="button"
                          onClick={() => setSelectedBedCode(b.code)}
                          className={`p-2 rounded-xl text-center flex flex-col items-center justify-center transition-all cursor-pointer relative ${
                            isSelected
                              ? 'bg-[#0F4C5C] text-white shadow-md ring-2 ring-[#0F4C5C] ring-offset-1'
                              : isOccupied
                              ? 'bg-slate-200/70 text-slate-700 hover:bg-slate-300/80 border border-slate-300/80'
                              : 'bg-white text-emerald-900 border border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50/50'
                          }`}
                        >
                          <Bed
                            className={`w-4 h-4 mb-0.5 ${
                              isSelected
                                ? 'text-white'
                                : isOccupied
                                ? 'text-slate-500'
                                : 'text-emerald-600'
                            }`}
                          />
                          <span className="text-[11px] font-black">{b.bedNumber}</span>
                          <span
                            className={`text-[9px] font-bold ${
                              isSelected
                                ? 'text-teal-200'
                                : isOccupied
                                ? 'text-slate-500'
                                : 'text-emerald-700'
                            }`}
                          >
                            {isSelected
                              ? 'ELEGIDA'
                              : isOccupied
                              ? 'OCUPADA'
                              : 'LIBRE'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Caja Informativa de la Cama Seleccionada */}
          {selectedBedObj && (
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0F4C5C] text-white flex items-center justify-center font-black">
                  <Bed className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-sm">
                      Cama {selectedBedObj.code} (Sala {selectedBedObj.room})
                    </span>
                    <span className="bg-teal-200/60 text-teal-900 px-2 py-0.5 rounded font-bold text-[10px]">
                      {selectedBedObj.service === 'MEDICINA_INTERNA_I' ? 'MI I' : 'MI II'}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-0.5">
                    {selectedBedObj.status === 'DISPONIBLE'
                      ? '✓ Cama libre y lista para recepción de ingreso'
                      : `⚠️ Cama actualmente asignada a ${selectedBedObj.currentPatientName || 'otro paciente'} (será reubicado)`}
                  </p>
                </div>
              </div>

              <div className="text-right text-slate-500 hidden sm:block">
                <span className="text-[11px] font-mono block">Destino: http://localhost:3100</span>
                <span className="text-[10px] text-teal-700 font-bold">Apertura automática de ficha</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer con Botones de Acción */}
        <div className="bg-slate-100 border-t border-slate-200 p-4 px-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-200/70 rounded-xl border border-slate-200 transition-all cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirmAdmission}
            className="px-6 py-2.5 text-xs font-black text-white bg-[#0F4C5C] hover:bg-teal-800 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Ingresando a Guardia Clínica...</span>
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 text-emerald-300" />
                <span>Confirmar Ingreso en Cama {selectedBedCode} y Abrir Guardia App</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
