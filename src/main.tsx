import React from 'react';
import ReactDOM from 'react-dom/client';
// El motor de sincronización se carga primero para que registre TODAS las escrituras locales
import { syncEngine } from './services/syncEngine';
import { db } from './db/dexieDb';
import App from './App';
import './index.css';

// Acceso de diagnóstico (sólo si se activa manualmente: localStorage.hr_debug_sync = '1')
try {
  if (localStorage.getItem('hr_debug_sync') === '1') {
    (window as any).__hrSync = { syncEngine, db };
  }
} catch {}

// Service worker: permite abrir la app sin señal (sólo HTTPS o localhost)
declare const __APP_BUILD_TIME__: number;
if ('serviceWorker' in navigator && (import.meta as any).env?.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`./sw.js?v=${__APP_BUILD_TIME__}`).catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
