import React from 'react';
import {
  Users,
  Bed,
  CheckCircle2,
  ArrowRightLeft,
  UserPlus,
  LogOut,
  Maximize2,
  Minimize2,
  Table as TableIcon,
  LayoutGrid,
  FileDown,
  Search,
  Clock,
  UserCheck,
  Building2,
  Plus,
  TestTube2,
  ListPlus,
  RefreshCw,
  Printer
} from 'lucide-react';

interface Props {
  service: 'MEDICINA_INTERNA_I' | 'MEDICINA_INTERNA_II' | 'TODAS';
  onChangeService: (service: 'MEDICINA_INTERNA_I' | 'MEDICINA_INTERNA_II' | 'TODAS') => void;
  guardDate: string;
  shift: string;
  attendingDoctor: string;
  totalPatients: number;
  totalBeds: number;
  availableBeds: number;
  newAdmissions: number;
  transfers: number;
  discharges: number;
  deaths: number;
  viewMode: 'TABLA' | 'CAMAS';
  onChangeViewMode: (mode: 'TABLA' | 'CAMAS') => void;
  isGuardMode: boolean;
  onToggleGuardMode: () => void;
  selectedWard: string;
  onChangeWard: (ward: string) => void;
  availableWards: string[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenAddPending: () => void;
  onOpenAddLab: () => void;
  onExportWord: () => void;
  onPrintPdf: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const GuardiaHeader: React.FC<Props> = ({
  service,
  onChangeService,
  guardDate,
  shift,
  attendingDoctor,
  totalPatients,
  totalBeds,
  availableBeds,
  newAdmissions,
  transfers,
  discharges,
  deaths,
  viewMode,
  onChangeViewMode,
  isGuardMode,
  onToggleGuardMode,
  selectedWard,
  onChangeWard,
  availableWards,
  searchQuery,
  onSearchChange,
  onOpenAddPending,
  onOpenAddLab,
  onExportWord,
  onPrintPdf,
  onRefresh,
  isRefreshing = false
}) => {
  const serviceLabel =
    service === 'MEDICINA_INTERNA_I'
      ? 'Medicina Interna I (Salas 301–308)'
      : service === 'MEDICINA_INTERNA_II'
      ? 'Medicina Interna II (Salas 309–317)'
      : 'Medicina Interna I & II (Todas las Salas)';

  return (
    <div className={`transition-all ${isGuardMode ? 'bg-slate-900 text-white pb-2' : 'bg-white rounded-2xl border border-slate-200 shadow-sm'} p-4 space-y-3.5`}>
      {/* Top row: Title, Shift, Responsible & Mode */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 bg-[#0F4C5C] text-teal-200 text-xs font-black uppercase rounded-md tracking-wider">
              {service === 'TODAS' ? 'PISO COMPLETO' : service.replace(/_/g, ' ')}
            </span>
            <h1 className={`text-base sm:text-lg font-black tracking-tight ${isGuardMode ? 'text-white' : 'text-slate-900'}`}>
              GUARDIA CLÍNICA — {serviceLabel.toUpperCase()}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1 font-mono">
              <Clock className="w-3.5 h-3.5 text-teal-600" />
              Guardia: <strong>{guardDate}</strong> ({shift})
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-teal-600" />
              Responsable: <strong>{attendingDoctor}</strong>
            </span>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Refresh */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Sincronizar datos centrales"
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-teal-700' : ''}`} />
          </button>

          {/* Service Switcher */}
          <div className="bg-slate-100 p-0.5 rounded-xl flex items-center border border-slate-200 text-xs font-bold text-slate-600">
            <button
              onClick={() => onChangeService('MEDICINA_INTERNA_I')}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                service === 'MEDICINA_INTERNA_I' ? 'bg-[#0F4C5C] text-white shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              MI-I
            </button>
            <button
              onClick={() => onChangeService('MEDICINA_INTERNA_II')}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                service === 'MEDICINA_INTERNA_II' ? 'bg-[#0F4C5C] text-white shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              MI-II
            </button>
            <button
              onClick={() => onChangeService('TODAS')}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                service === 'TODAS' ? 'bg-[#0F4C5C] text-white shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              TODAS
            </button>
          </div>

          {/* View Toggle (Section 42): TABLA | CAMAS */}
          <div className="bg-slate-100 p-0.5 rounded-xl flex items-center border border-slate-200 text-xs font-bold text-slate-600">
            <button
              onClick={() => onChangeViewMode('TABLA')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all ${
                viewMode === 'TABLA' ? 'bg-teal-700 text-white shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              TABLA
            </button>
            <button
              onClick={() => onChangeViewMode('CAMAS')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all ${
                viewMode === 'CAMAS' ? 'bg-teal-700 text-white shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              CAMAS
            </button>
          </div>

          {/* MODO GUARDIA (Section 35) */}
          <button
            onClick={onToggleGuardMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm ${
              isGuardMode
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 ring-2 ring-amber-300'
                : 'bg-slate-800 hover:bg-slate-700 text-white'
            }`}
          >
            {isGuardMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            {isGuardMode ? 'SALIR DE MODO GUARDIA' : 'MODO GUARDIA'}
          </button>
        </div>
      </div>

      {/* Row 2: 11 Live Census Indicators (Section 2) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center">
        <div className="bg-blue-50/80 border border-blue-200/80 p-2.5 rounded-xl">
          <div className="text-[10px] font-bold text-blue-700 uppercase">En Planta</div>
          <div className="text-lg font-black text-blue-900 font-mono leading-tight">{totalPatients}</div>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
          <div className="text-[10px] font-bold text-slate-600 uppercase">Total Camas</div>
          <div className="text-lg font-black text-slate-800 font-mono leading-tight">{totalBeds}</div>
        </div>

        <div className="bg-emerald-50/80 border border-emerald-200 p-2.5 rounded-xl">
          <div className="text-[10px] font-bold text-emerald-700 uppercase">Disponibles</div>
          <div className="text-lg font-black text-emerald-700 font-mono leading-tight">{availableBeds}</div>
        </div>

        <div className="bg-teal-50 border border-teal-200 p-2.5 rounded-xl">
          <div className="text-[10px] font-bold text-teal-700 uppercase">Ingresos</div>
          <div className="text-lg font-black text-teal-900 font-mono leading-tight">+{newAdmissions}</div>
        </div>

        <div className="bg-purple-50 border border-purple-200 p-2.5 rounded-xl">
          <div className="text-[10px] font-bold text-purple-700 uppercase">Traslados</div>
          <div className="text-lg font-black text-purple-900 font-mono leading-tight">{transfers}</div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
          <div className="text-[10px] font-bold text-emerald-700 uppercase">Altas</div>
          <div className="text-lg font-black text-emerald-900 font-mono leading-tight">{discharges}</div>
        </div>

        <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
          <div className="text-[10px] font-bold text-rose-700 uppercase">Defunciones</div>
          <div className="text-lg font-black text-rose-900 font-mono leading-tight">{deaths}</div>
        </div>
      </div>

      {/* Row 3: Ward Filter Chips, Search, and Action Buttons */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 pt-1">
        {/* Ward Chips (Section 4): [ TODOS ] [ 307 ] [ 308 ] ... */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <span className="text-[11px] font-bold text-slate-500 uppercase shrink-0 mr-1 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" /> Pabellón:
          </span>
          <button
            onClick={() => onChangeWard('TODOS')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
              selectedWard === 'TODOS'
                ? 'bg-[#0F4C5C] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            TODOS
          </button>
          {availableWards.map(w => (
            <button
              key={w}
              onClick={() => onChangeWard(w)}
              className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all shrink-0 ${
                selectedWard === w
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {w}
            </button>
          ))}
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative flex-1 md:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar cama, paciente, dx..."
              className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
            />
          </div>

          <button
            onClick={onOpenAddLab}
            className="flex items-center gap-1 px-3 py-1.5 bg-teal-800 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition-all"
          >
            <TestTube2 className="w-3.5 h-3.5" />
            + Analíticas
          </button>

          <button
            onClick={onOpenAddPending}
            className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition-all"
          >
            <ListPlus className="w-3.5 h-3.5" />
            + Pendiente
          </button>

          {/* Export Dropdown / Buttons */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={onExportWord}
              title="Descargar entrega de guardia en Word (.doc)"
              className="px-2 py-1 text-slate-700 hover:text-teal-900 text-xs font-bold rounded-lg flex items-center gap-1 hover:bg-white"
            >
              <FileDown className="w-3.5 h-3.5 text-blue-600" />
              Word
            </button>
            <button
              onClick={onPrintPdf}
              title="Imprimir o guardar en PDF oficial"
              className="px-2 py-1 text-slate-700 hover:text-teal-900 text-xs font-bold rounded-lg flex items-center gap-1 hover:bg-white"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-600" />
              PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
