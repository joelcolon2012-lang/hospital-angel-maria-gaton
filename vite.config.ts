import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

const BUILD_TIME = Date.now();
const PKG = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));

/** Genera dist/version.json en cada compilación: los dispositivos detectan solos la versión nueva. */
function versionFilePlugin() {
  return {
    name: 'hospital-version-file',
    apply: 'build' as const,
    // Se escribe al final (después de copiar public/) para reemplazar cualquier version.json antiguo
    buildStart() {
      if (fs.existsSync(path.resolve(__dirname, 'public/hospital_master_db.json'))) {
        throw new Error('No publicar expedientes clínicos en public/. Conserve el respaldo fuera del sitio.');
      }
    },
    closeBundle() {
      const outDir = path.resolve(__dirname, 'dist');
      if (!fs.existsSync(outDir)) return;
      fs.writeFileSync(
        path.join(outDir, 'version.json'),
        JSON.stringify(
          {
            version: PKG.version,
            buildTime: BUILD_TIME,
            buildDate: new Date(BUILD_TIME).toISOString(),
            features: [
              'Orden médica: diagnósticos numerados por prioridad, uno debajo del otro y sin abreviaturas; botón Descargar PDF; impresión sin la dirección de la app ni la hora',
              'Diagnósticos con lista desplegable CIE-10 (búsqueda por código, abreviatura o palabras) en historia, guardia, egreso, evoluciones y planta',
              'Detector de errores lógico-clínicos: alerta si el examen físico, los signos vitales, los paraclínicos o el sexo/edad no concuerdan con el diagnóstico',
              'El administrador puede eliminar cuentas de usuario (se cierran sus sesiones)',
              'Lectura de electrocardiogramas desde foto o PDF: doble análisis, alertas críticas e informe que confirma el médico',
              'Notas de ingreso y de sala con paraclínicos e imágenes; firma con el nombre del médico (sin exequátur)',
              'Discusión terapéutica escrita aparte (cuadro de diálogo) después de los diagnósticos',
              'Paraclínicos desde foto o PDF sin inventar valores: doble lectura y confirmación del médico',
              'Tomar fotos con la cámara del celular (varias páginas por reporte)',
              'Subir nota o historia clínica (Word, PDF, foto o texto) y distribuirla por acápites',
              'Una sola base de datos central para todos los dispositivos',
              'Los datos de pacientes sólo se entregan con sesión iniciada (PIN)',
              'Sincronización registro por registro entre PC, iPhone y Android',
              'Cambios sin señal se envían solos al reconectar',
              'Dos médicos pueden editar el mismo paciente sin perder datos',
              'Carga más rápida (la app se descarga por partes)'
            ]
          },
          null,
          2
        )
      );
    }
  };
}

/**
 * Toda la API (/api/*) la atiende el servidor central Express (server/index.js).
 * - Producción / INICIAR.bat: Express sirve la app y la API en el mismo puerto (3000),
 *   así PC, iPhone y Android usan la misma dirección y la misma base de datos.
 * - Desarrollo (npm run dev:full): Vite en 5173 reenvía /api al servidor en 3001.
 *
 * Antes existía aquí un segundo "mini servidor" que guardaba otra copia de la base
 * de datos; se eliminó porque competía con el servidor central y causaba datos
 * distintos según el puerto que se abriera.
 */
const API_TARGET = process.env.API_TARGET || 'http://localhost:3001';

const apiProxy = {
  '/api': {
    target: API_TARGET,
    changeOrigin: true,
    // Necesario para el canal en tiempo real (SSE)
    configure: (proxy: any) => {
      proxy.on('proxyRes', (proxyRes: any) => {
        if (String(proxyRes.headers['content-type'] || '').includes('text/event-stream')) {
          proxyRes.headers['cache-control'] = 'no-cache, no-transform';
        }
      });
    }
  }
};

export default defineConfig({
  base: './',
  plugins: [react(), versionFilePlugin()],
  define: {
    __APP_BUILD_TIME__: JSON.stringify(BUILD_TIME),
    __APP_VERSION__: JSON.stringify(PKG.version)
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: true,
    proxy: apiProxy
  },
  preview: {
    port: 4173,
    host: true,
    proxy: apiProxy
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Librerías grandes en archivos separados: se descargan una vez y quedan en caché
        manualChunks(id) {
          // Ayudantes internos de Vite/Rollup: siempre con el núcleo (si no, arrastran otros bloques al inicio)
          if (id.includes('vite/preload-helper') || id.includes('commonjsHelpers')) return 'vendor-react';
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'vendor-react';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('dexie')) return 'vendor-db';
          // El resto (PDF, Word, IA…) lo divide Rollup automáticamente y sólo se descarga al usarse
          return undefined;
        }
      }
    }
  }
});
