import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import https from 'https';

const urlFile = path.resolve('database', 'cloud_url.txt');

function startTunnel() {
  console.log('[Cloud Tunnel] Iniciando conexión segura SSH con Serveo...');
  const ssh = spawn('ssh', [
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'ServerAliveInterval=15',
    '-o', 'ServerAliveCountMax=4',
    '-o', 'ExitOnForwardFailure=yes',
    '-R', '80:localhost:3000',
    'serveo.net'
  ]);

  let currentUrl = '';
  let pingInterval = null;

  const handleData = (data) => {
    const text = data.toString();
    process.stdout.write(text);
    const match = text.match(/https:\/\/[a-z0-9\-]+\.(?:serveousercontent\.com|lhr\.life)/i);
    if (match && match[0] !== currentUrl) {
      currentUrl = match[0];
      console.log('\n=============================================');
      console.log(`[Cloud Tunnel] ENLACE ACTIVO: ${currentUrl}`);
      console.log('=============================================\n');
      try {
        const dir = path.dirname(urlFile);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(urlFile, currentUrl, 'utf8');
      } catch (e) {}

      if (pingInterval) clearInterval(pingInterval);
      pingInterval = setInterval(() => {
        if (!currentUrl) return;
        https.get(currentUrl, () => {}).on('error', () => {});
      }, 25000);
    }
  };

  ssh.stdout.on('data', handleData);
  ssh.stderr.on('data', handleData);

  ssh.on('close', (code) => {
    console.log(`[Cloud Tunnel] Conexión cerrada con código ${code}. Reconectando en 3 segundos...`);
    if (pingInterval) clearInterval(pingInterval);
    setTimeout(startTunnel, 3000);
  });

  ssh.on('error', (err) => {
    console.error('[Cloud Tunnel] Error:', err.message);
    if (pingInterval) clearInterval(pingInterval);
    setTimeout(startTunnel, 5000);
  });
}

startTunnel();
