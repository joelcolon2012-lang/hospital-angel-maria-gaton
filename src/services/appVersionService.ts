/**
 * Servicio de Control de Versión y Actualización Forzada en iOS / Móviles / Web
 * Hospital Regional Dr. Ángel María Gatón
 */

export interface AppVersionInfo {
  version: string;
  buildTime: number;
  buildDate: string;
  features?: string[];
}

export const CURRENT_APP_BUILD_TIME = 1790131500000;
export const CURRENT_APP_VERSION = '2.5.0';

class AppVersionService {
  private updateAvailable = false;
  private latestVersionInfo: AppVersionInfo | null = null;
  private listeners: Array<(hasUpdate: boolean, info: AppVersionInfo | null) => void> = [];

  constructor() {
    this.initVersionChecker();
  }

  public subscribe(callback: (hasUpdate: boolean, info: AppVersionInfo | null) => void): () => void {
    this.listeners.push(callback);
    callback(this.updateAvailable, this.latestVersionInfo);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notify() {
    for (const cb of this.listeners) {
      try {
        cb(this.updateAvailable, this.latestVersionInfo);
      } catch (err) {
        console.error('Error in version listener', err);
      }
    }
  }

  private initVersionChecker() {
    if (typeof window === 'undefined') return;

    // Verificar al inicio
    setTimeout(() => this.checkForUpdates(), 1500);

    // Verificar cuando el usuario vuelve a abrir o desbloquear la app en iPhone
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkForUpdates();
      }
    });

    window.addEventListener('focus', () => {
      this.checkForUpdates();
    });

    // Revisar periódicamente cada 60 segundos
    setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.checkForUpdates();
      }
    }, 60000);
  }

  public async checkForUpdates(): Promise<boolean> {
    try {
      const res = await fetch(`./version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
      });

      if (res.ok) {
        const info: AppVersionInfo = await res.json();
        if (info && info.buildTime && info.buildTime > CURRENT_APP_BUILD_TIME) {
          this.updateAvailable = true;
          this.latestVersionInfo = info;
          this.notify();
          return true;
        }
      }
    } catch (e) {
      // Offline o error de red
    }
    return false;
  }

  /**
   * Fuerza la actualización completa del navegador o PWA:
   * 1. Elimina todos los Service Workers instalados
   * 2. Limpia todos los Caches almacenados en Safari/Chrome
   * 3. Recarga forzosamente la URL con parámetro de cache-busting
   */
  public async forceUpdateApp(): Promise<void> {
    try {
      // 1. Desregistrar Service Workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }

      // 2. Limpiar Cache Storage
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }

      // 3. Limpiar sessionStorage de versiones previas
      try {
        sessionStorage.clear();
      } catch {}
    } catch (err) {
      console.warn('Error limpiando cachés:', err);
    }

    // 4. Redirigir forzando bypass de caché en iOS y navegadores
    const cleanUrl = window.location.origin + window.location.pathname;
    window.location.href = `${cleanUrl}?refresh=${Date.now()}`;
  }
}

export const appVersionService = new AppVersionService();
