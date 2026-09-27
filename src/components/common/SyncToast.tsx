import React from 'react';
import { CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { syncEngine, type EngineStatus } from '../../services/syncEngine';

/**
 * Avisos discretos de sincronización:
 *  - "Actualizado desde otro dispositivo" cuando llegan cambios remotos.
 *  - Barra "Sin conexión" que confirma que los cambios quedan guardados en el equipo.
 */
export function SyncToast() {
  const [status, setStatus] = React.useState<EngineStatus>(() => syncEngine.getStatus());
  const [remoteMsg, setRemoteMsg] = React.useState<string | null>(null);
  const [showOffline, setShowOffline] = React.useState(false);
  const [justReconnected, setJustReconnected] = React.useState(false);
  const wasOffline = React.useRef(false);

  React.useEffect(() => syncEngine.subscribe(setStatus), []);

  // Mostrar la barra de "sin conexión" sólo si dura más de 4 s (evita parpadeos)
  React.useEffect(() => {
    const offline = status.state === 'offline' || status.state === 'error';
    let t: any;
    if (offline) {
      t = setTimeout(() => {
        setShowOffline(true);
        wasOffline.current = true;
      }, 4000);
    } else {
      setShowOffline(false);
      if (status.state === 'connected' && wasOffline.current && status.pendingChanges === 0) {
        wasOffline.current = false;
        setJustReconnected(true);
        t = setTimeout(() => setJustReconnected(false), 3000);
      }
    }
    return () => clearTimeout(t);
  }, [status.state, status.pendingChanges]);

  React.useEffect(() => {
    let t: any;
    const onChange = (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      if (d.type !== 'remote_sync' && d.type !== 'cloud_sync') return;
      const n = Number(d.changed) || 0;
      setRemoteMsg(n === 1 ? 'Actualizado desde otro dispositivo' : `${n} cambios recibidos de otros dispositivos`);
      clearTimeout(t);
      t = setTimeout(() => setRemoteMsg(null), 2600);
    };
    window.addEventListener('hospital_central_data_changed', onChange);
    return () => {
      window.removeEventListener('hospital_central_data_changed', onChange);
      clearTimeout(t);
    };
  }, []);

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] sm:bottom-5 z-[90] flex flex-col items-center gap-2 pointer-events-none w-[min(92vw,420px)]"
      aria-live="polite"
    >
      {showOffline && (
        <div className="pointer-events-auto w-full flex items-start gap-2.5 rounded-2xl bg-slate-900/95 text-white px-3.5 py-2.5 shadow-lg animate-slide-up">
          <CloudOff className="w-4 h-4 mt-0.5 text-amber-300 shrink-0" />
          <div className="text-[12px] leading-snug">
            <div className="font-semibold">Sin conexión con el servidor</div>
            <div className="text-slate-300">
              {status.pendingChanges > 0
                ? `${status.pendingChanges} cambio${status.pendingChanges === 1 ? '' : 's'} guardado${status.pendingChanges === 1 ? '' : 's'} en este dispositivo. Se enviará${status.pendingChanges === 1 ? '' : 'n'} solo${status.pendingChanges === 1 ? '' : 's'} al volver la señal.`
                : 'Puedes seguir trabajando: todo se guarda en este dispositivo.'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => syncEngine.syncNow()}
            className="ml-auto shrink-0 rounded-lg bg-white/10 hover:bg-white/20 px-2 py-1 text-[11px] font-semibold flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Reintentar
          </button>
        </div>
      )}
      {justReconnected && !showOffline && (
        <div className="flex items-center gap-2 rounded-full bg-emerald-600 text-white px-3.5 py-1.5 text-[12px] font-semibold shadow-lg animate-slide-up">
          <CheckCircle2 className="w-4 h-4" /> Conexión restablecida · todo sincronizado
        </div>
      )}
      {remoteMsg && !showOffline && !justReconnected && (
        <div className="flex items-center gap-2 rounded-full bg-[#0F4C5C] text-white px-3.5 py-1.5 text-[12px] font-semibold shadow-lg animate-slide-up">
          <RefreshCw className="w-3.5 h-3.5 text-teal-200" /> {remoteMsg}
        </div>
      )}
    </div>
  );
}
