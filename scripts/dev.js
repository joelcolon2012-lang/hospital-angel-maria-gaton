/**
 * Desarrollo: arranca el servidor central (API + tiempo real) y Vite a la vez.
 *   npm run dev   ->  app en http://localhost:5173  (API en 3001 vía proxy)
 */
import { spawn } from 'child_process';

const isWin = process.platform === 'win32';
const procs = [];

function run(name, cmd, args, env = {}) {
  const p = spawn(cmd, args, { stdio: 'inherit', shell: isWin, env: { ...process.env, ...env } });
  p.on('exit', (code) => {
    console.log(`[${name}] terminó (código ${code}). Cerrando todo...`);
    procs.forEach((x) => x !== p && x.kill());
    process.exit(code ?? 0);
  });
  procs.push(p);
}

run('servidor', 'node', ['server/index.js'], { PORT: '3001' });
run('vite', isWin ? 'npx.cmd' : 'npx', ['vite']);

process.on('SIGINT', () => {
  procs.forEach((p) => p.kill());
  process.exit(0);
});
