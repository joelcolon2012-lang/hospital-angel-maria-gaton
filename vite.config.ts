import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function hospitalDatabasePlugin(): Plugin {
  const dbDir = path.resolve(__dirname, 'database');
  const dbFile = path.join(dbDir, 'hospital_master_db.json');

  // Asegurar que exista el directorio de base de datos
  if (!fs.existsSync(dbDir)) {
    try {
      fs.mkdirSync(dbDir, { recursive: true });
    } catch (e) {
      console.error('Error creando directorio database:', e);
    }
  }

  return {
    name: 'hospital-database-sync-middleware',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';

        // API Health
        if (url === '/api/health') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({ 
            status: 'ok', 
            serverTime: Date.now(), 
            fileExists: fs.existsSync(dbFile) 
          }));
          return;
        }

        // API Sync (GET / POST)
        if (url === '/api/sync' || url.startsWith('/api/sync?')) {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }

          if (req.method === 'GET') {
            res.setHeader('Content-Type', 'application/json');
            if (fs.existsSync(dbFile)) {
              try {
                const content = fs.readFileSync(dbFile, 'utf-8');
                res.end(content);
              } catch (err) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'Error leyendo base de datos en el servidor' }));
              }
            } else {
              res.end(JSON.stringify({ version: 1, lastUpdated: 0, data: null }));
            }
            return;
          }

          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body);
                const toSave = {
                  version: parsed.version || 1,
                  lastUpdated: parsed.lastUpdated || Date.now(),
                  savedAtIso: new Date().toISOString(),
                  data: parsed.data || parsed
                };
                fs.writeFileSync(dbFile, JSON.stringify(toSave, null, 2), 'utf-8');
                console.log(`[Hospital Master DB] Sincronización persistida en disco (${new Date().toLocaleTimeString('es-ES')})`);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, lastUpdated: toSave.lastUpdated }));
              } catch (err: any) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: err?.message || 'JSON inválido' }));
              }
            });
            return;
          }
        }

        // API Backup Download
        if (url === '/api/backup') {
          if (fs.existsSync(dbFile)) {
            const filename = `Respaldo_Emergencia_Dr_Colon_${new Date().toISOString().slice(0, 10)}.json`;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            const content = fs.readFileSync(dbFile, 'utf-8');
            res.end(content);
            return;
          } else {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'No hay respaldo guardado aún en disco' }));
            return;
          }
        }

        next();
      });
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), hospitalDatabasePlugin()],
  server: {
    port: 3000,
    host: true,
    allowedHosts: true
  }
});
