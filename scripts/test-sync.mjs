/**
 * Prueba automática de sincronización multidispositivo (servidor central).
 *   npm run test:sync
 * Arranca un servidor temporal (base de datos aislada), simula varios
 * dispositivos y comprueba que no se pierden ni se resucitan datos.
 */
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const PORT = 3900 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PORT}`;
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hospital-sync-test-'));

let passed = 0;
let failed = 0;
function check(name, cond, extra = '') {
  if (cond) {
    passed++;
    console.log(`  ✔ ${name}`);
  } else {
    failed++;
    console.log(`  ✘ ${name} ${extra}`);
  }
}

async function sync(deviceId, since, tables = {}, tombstones = []) {
  const res = await fetch(`${BASE}/api/sync/v2`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-device-id': deviceId },
    body: JSON.stringify({ deviceId, since, tables, tombstones })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function getAll() {
  const res = await fetch(`${BASE}/api/sync/v2?since=0`);
  return res.json();
}

function find(snapshot, table, id) {
  return (snapshot.tables[table] || []).find((r) => r.id === id);
}

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('El servidor no arrancó');
}

const server = spawn(process.execPath, ['server/index.js'], {
  env: { ...process.env, PORT: String(PORT), HOSPITAL_DB_DIR: tmpDir },
  stdio: ['ignore', 'ignore', 'inherit']
});

try {
  await waitForServer();
  const t0 = Date.now();

  console.log('\n1) Dos dispositivos agregan pacientes distintos');
  await sync('PC', 0, { patients: [{ id: 'p-pc', fullName: 'Paciente PC', _mtime: t0 + 1 }] });
  await sync('CEL', 0, { patients: [{ id: 'p-cel', fullName: 'Paciente Celular', _mtime: t0 + 2 }] });
  let all = await getAll();
  check('ambos pacientes existen', find(all, 'patients', 'p-pc') && find(all, 'patients', 'p-cel'));

  console.log('\n2) Un envío con la base INCOMPLETA no borra nada (antes sí ocurría)');
  await fetch(`${BASE}/api/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { patients: [{ id: 'p-pc', fullName: 'Paciente PC', _mtime: t0 + 1 }] } })
  });
  all = await getAll();
  check('el paciente del celular sigue existiendo', !!find(all, 'patients', 'p-cel'));

  console.log('\n3) Una versión vieja (dispositivo sin señal) no pisa una más nueva');
  await sync('PC', 0, { patients: [{ id: 'p-pc', fullName: 'Nombre NUEVO', _mtime: t0 + 100 }] });
  await sync('CEL', 0, { patients: [{ id: 'p-pc', fullName: 'Nombre VIEJO', _mtime: t0 + 50 }] });
  all = await getAll();
  check('se conserva la edición más reciente', find(all, 'patients', 'p-pc')?.fullName === 'Nombre NUEVO');

  console.log('\n4) Dos médicos editan CAMPOS DISTINTOS del mismo paciente sin señal');
  const base = { id: 'p-x', fullName: 'Paciente X', vitals: { hr: 80 }, clinicalHistory: { hda: '' } };
  await sync('PC', 0, { patients: [{ ...base, _mtime: t0 + 200 }] });
  await sync('PC', 0, {
    patients: [{ ...base, vitals: { hr: 120 }, _mtime: t0 + 300, _fclk: { vitals: t0 + 300 } }]
  });
  await sync('CEL', 0, {
    patients: [{ ...base, clinicalHistory: { hda: 'Dolor torácico' }, _mtime: t0 + 250, _fclk: { clinicalHistory: t0 + 250 } }]
  });
  all = await getAll();
  const px = find(all, 'patients', 'p-x');
  check('se conservan los signos vitales del PC', px?.vitals?.hr === 120, JSON.stringify(px?.vitals));
  check('se conserva la historia del celular', px?.clinicalHistory?.hda === 'Dolor torácico', JSON.stringify(px?.clinicalHistory));

  console.log('\n5) Borrados: se propagan y no resucitan');
  await sync('PC', 0, { orders: [{ id: 'o-1', patientId: 'p-pc', description: 'Omeprazol', _mtime: t0 + 400 }] });
  const before = await getAll();
  await sync('PC', 0, {}, [{ table: 'orders', id: 'o-1', deletedAt: t0 + 500 }]);
  await sync('CEL', 0, { orders: [{ id: 'o-1', patientId: 'p-pc', description: 'Omeprazol', _mtime: t0 + 400 }] });
  all = await getAll();
  check('la orden borrada no reaparece', !find(all, 'orders', 'o-1'));
  const delta = await sync('CEL', before.seq, {});
  check('el celular recibe la lápida del borrado', (delta.tombstones || []).some((t) => t.id === 'o-1'));

  console.log('\n6) Descarga delta: sólo llega lo nuevo');
  const s1 = (await getAll()).seq;
  await sync('PC', s1, { labs: [{ id: 'l-1', patientId: 'p-pc', title: 'Hemograma', _mtime: t0 + 600 }] });
  const d2 = await sync('CEL', s1, {});
  const tablesInDelta = Object.keys(d2.tables);
  check('el delta contiene sólo el laboratorio nuevo', tablesInDelta.length === 1 && d2.tables.labs?.length === 1, JSON.stringify(tablesInDelta));

  console.log('\n7) Usuarios: el PIN nunca se expone y no se pierde');
  all = await getAll();
  check('ningún usuario incluye pinHash', !(all.tables.users || []).some((u) => 'pinHash' in u));
  await sync('CEL', 0, { users: [{ id: 'usr-admin-colon', name: 'Dr. Joel Colón', specialty: 'Medicina Interna', _mtime: t0 + 700 }] });
  const login = await fetch(`${BASE}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'usr-admin-colon', pin: '2026', userId: 'usr-admin-colon', password: '2026' })
  });
  check('el PIN del administrador sigue funcionando tras sincronizar', login.ok, `HTTP ${login.status}`);

  console.log('\n8) Persistencia: al reiniciar el servidor no se pierde nada');
  server.kill();
  await new Promise((r) => setTimeout(r, 400));
  const server2 = spawn(process.execPath, ['server/index.js'], {
    env: { ...process.env, PORT: String(PORT), HOSPITAL_DB_DIR: tmpDir },
    stdio: ['ignore', 'ignore', 'inherit']
  });
  try {
    await waitForServer();
    all = await getAll();
    check('pacientes, laboratorios y lápidas persisten', !!find(all, 'patients', 'p-x') && !!find(all, 'labs', 'l-1') && !find(all, 'orders', 'o-1'));
  } finally {
    server2.kill();
  }
} catch (err) {
  failed++;
  console.error('Error en la prueba:', err);
} finally {
  server.kill();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log(`\nResultado: ${passed} correctas, ${failed} fallidas\n`);
  process.exit(failed ? 1 : 0);
}
