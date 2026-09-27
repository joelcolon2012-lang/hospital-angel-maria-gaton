import React, { Suspense } from 'react';

/**
 * Carga diferida de pantallas y modales.
 * - `lazyView`: pantallas/pestañas. Muestra un indicador mientras llega el código.
 * - `lazyModal`: modales con `isOpen`. No descarga nada hasta la primera apertura
 *   y se mantiene montado después (para conservar su estado y animaciones).
 * Todos los bloques se precargan en segundo plano cuando el dispositivo está
 * desocupado, así que abrir un modal se siente instantáneo.
 */

type Loader<M> = () => Promise<M>;
const preloaders: Array<() => Promise<unknown>> = [];

export function ViewFallback() {
  return (
    <div className="flex items-center justify-center py-16 animate-fade-in" role="status" aria-live="polite">
      <div className="flex items-center gap-3 text-slate-500 text-sm font-medium">
        <span className="h-5 w-5 rounded-full border-2 border-teal-600/30 border-t-teal-600 animate-spin" />
        Cargando…
      </div>
    </div>
  );
}

export function lazyView<M, K extends keyof M>(loader: Loader<M>, key: K): M[K] {
  const Lazy = React.lazy(() => loader().then((m) => ({ default: m[key] as any })));
  preloaders.push(loader);
  const Wrapped = (props: any) => (
    <Suspense fallback={<ViewFallback />}>
      <Lazy {...props} />
    </Suspense>
  );
  (Wrapped as any).displayName = `LazyView(${String(key)})`;
  return Wrapped as unknown as M[K];
}

export function lazyModal<M, K extends keyof M>(loader: Loader<M>, key: K): M[K] {
  const Lazy = React.lazy(() => loader().then((m) => ({ default: m[key] as any })));
  preloaders.push(loader);
  const Wrapped = (props: any) => {
    const [everOpened, setEverOpened] = React.useState<boolean>(props.isOpen !== false);
    React.useEffect(() => {
      if (props.isOpen && !everOpened) setEverOpened(true);
    }, [props.isOpen, everOpened]);
    if (!everOpened && !props.isOpen) return null;
    return (
      <Suspense fallback={null}>
        <Lazy {...props} />
      </Suspense>
    );
  };
  (Wrapped as any).displayName = `LazyModal(${String(key)})`;
  return Wrapped as unknown as M[K];
}

/** Precarga todos los bloques cuando el navegador está desocupado. */
export function preloadLazyChunks() {
  const run = () => {
    let i = 0;
    const next = () => {
      if (i >= preloaders.length) return;
      preloaders[i++]()
        .catch(() => {})
        .finally(() => setTimeout(next, 60));
    };
    next();
  };
  const ric = (window as any).requestIdleCallback as undefined | ((cb: () => void, o?: any) => void);
  if (ric) ric(run, { timeout: 4000 });
  else setTimeout(run, 2500);
}
