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

let TOKEN = '';
const auth = () => ({ Authorization: `Bearer ${TOKEN}` });

async function loginAs(identifier, pin) {
  const res = await fetch(`${BASE}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, pin })
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

async function sync(deviceId, since, tables = {}, tombstones = [], token = TOKEN) {
  const res = await fetch(`${BASE}/api/sync/v2`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-device-id': deviceId, Authorization: `Bearer ${token}` },
    body: JSON.stringify({ deviceId, since, tables, tombstones })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function getAll() {
  const res = await fetch(`${BASE}/api/sync/v2?since=0`, { headers: auth() });
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

  console.log('\n0) Seguridad: sin sesión no se entregan datos');
  const noAuth = await fetch(`${BASE}/api/sync/v2?since=0`);
  check('lectura sin sesión rechazada (401)', noAuth.status === 401, `HTTP ${noAuth.status}`);
  const noAuthPost = await fetch(`${BASE}/api/sync/v2`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ since: 0, tables: { patients: [{ id: 'intruso', fullName: 'X' }] } }) });
  check('escritura sin sesión rechazada (401)', noAuthPost.status === 401, `HTTP ${noAuthPost.status}`);
  const bad = await loginAs('usr-admin-colon', '0000');
  check('PIN incorrecto no entrega token', bad.status === 401 && !bad.json.token);
  const good = await loginAs('usr-admin-colon', '2026');
  TOKEN = good.json.token;
  check('PIN correcto entrega token', good.status === 200 && typeof TOKEN === 'string' && TOKEN.startsWith('v1.'));
  const fake = await fetch(`${BASE}/api/sync/v2?since=0`, { headers: { Authorization: 'Bearer v1.abc.def' } });
  check('token falso rechazado', fake.status === 401);
  const pub = await (await fetch(`${BASE}/api/users`)).json();
  check('lista pública de médicos sin correos ni PIN', pub.users.length > 0 && pub.users.every((u) => !('email' in u) && !('pinHash' in u)));

  console.log('\n1) Dos dispositivos agregan pacientes distintos');
  await sync('PC', 0, { patients: [{ id: 'p-pc', fullName: 'Paciente PC', _mtime: t0 + 1 }] });
  await sync('CEL', 0, { patients: [{ id: 'p-cel', fullName: 'Paciente Celular', _mtime: t0 + 2 }] });
  let all = await getAll();
  check('ambos pacientes existen', find(all, 'patients', 'p-pc') && find(all, 'patients', 'p-cel'));

  console.log('\n2) Un envío con la base INCOMPLETA no borra nada (antes sí ocurría)');
  await fetch(`${BASE}/api/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...auth() },
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

  console.log('\n7b) Un médico no puede cambiar PIN ni permisos de otros por sincronización');
  const med = await loginAs('usr-res-martinez', '1234');
  const users0 = (await getAll()).tables.users || [];
  const medId = med.json.user?.id;
  if (med.status === 200 && med.json.token) {
    await sync('CEL-MED', 0, {
      users: [
        { id: 'usr-admin-colon', name: 'Hackeado', pinHash: 'x', _mtime: Date.now() + 9e6 },
        { id: medId, role: 'ADMINISTRADOR', isSuperAdmin: true, pinHash: 'x', specialty: 'Cambio propio', _mtime: Date.now() + 9e6 }
      ]
    }, [], med.json.token);
    const after = (await getAll()).tables.users || [];
    const adm = after.find((u) => u.id === 'usr-admin-colon');
    const self = after.find((u) => u.id === medId);
    check('no modificó la cuenta del administrador', adm && adm.name !== 'Hackeado');
    check('no se dio permisos de administrador', self && self.role !== 'ADMINISTRADOR' && !self.isSuperAdmin);
    check('sí pudo cambiar su propio dato permitido', self && self.specialty === 'Cambio propio');
    const relog = await loginAs('usr-admin-colon', '2026');
    check('el PIN del administrador no cambió', relog.status === 200);

    console.log('\n7c) Perfil: editar datos propios no toca el PIN; cambiar el PIN exige el actual');
    await sync('CEL-MED', 0, { users: [{ id: medId, name: 'Dra. Martínez Editada', phone: '809-555-0000', pin: '0000', _mtime: Date.now() + 9e6 }] }, [], med.json.token);
    const after2 = (await getAll()).tables.users || [];
    const me2 = after2.find((u) => u.id === medId);
    check('el nombre y teléfono se actualizan para todos', me2 && me2.name === 'Dra. Martínez Editada' && me2.phone === '809-555-0000');
    check('un PIN viejo enviado por sincronización se ignora', (await loginAs(medId, '1234')).status === 200 && (await loginAs(medId, '0000')).status === 401);
    const pw = (body) => fetch(`${BASE}/api/users/${medId}/password`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${med.json.token}` }, body: JSON.stringify(body) });
    const bad1 = await pw({ newPassword: '4321', confirmPassword: '4321', currentPassword: '9999' });
    check('cambiar el PIN propio con PIN actual incorrecto se rechaza', bad1.status === 400);
    const ok1 = await pw({ newPassword: '4321', confirmPassword: '4321', currentPassword: '1234' });
    const ok1j = await ok1.json();
    check('cambiar el PIN propio con el PIN actual funciona y da sesión nueva', ok1.status === 200 && typeof ok1j.token === 'string');
    const withNew = await fetch(`${BASE}/api/sync/v2?since=0`, { headers: { Authorization: `Bearer ${ok1j.token}` } });
    const withOld = await fetch(`${BASE}/api/sync/v2?since=0`, { headers: { Authorization: `Bearer ${med.json.token}` } });
    check('la sesión nueva sirve y la anterior se cierra', withNew.status === 200 && withOld.status === 401);
    check('el PIN nuevo funciona', (await loginAs(medId, '4321')).status === 200);
    await fetch(`${BASE}/api/users/${medId}/password`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...auth() }, body: JSON.stringify({ newPassword: '1234', confirmPassword: '1234' }) });
  } else {
    check('usuario médico de prueba disponible', false, JSON.stringify(med.json).slice(0, 120) + ' ' + users0.map((u) => u.id).join(','));
  }

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
    check('la sesión sigue válida tras reiniciar', Array.isArray(all.tables?.patients));

    console.log('\n9) Servidor reiniciado VACÍO (Render gratuito): las sesiones siguen valiendo');
    server2.kill();
    await new Promise((r) => setTimeout(r, 400));
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hospital-sync-empty-'));
    const server3 = spawn(process.execPath, ['server/index.js'], {
      env: { ...process.env, PORT: String(PORT), HOSPITAL_DB_DIR: emptyDir, GEMINI_API_KEY: 'clave-de-prueba' },
      stdio: ['ignore', 'ignore', 'inherit']
    });
    try {
      await waitForServer();
      const medTok = (await loginAs('usr-res-martinez', '1234')).json.token;
      // Reinicio vacío con la misma clave permanente
      server3.kill();
      await new Promise((r) => setTimeout(r, 400));
      fs.rmSync(emptyDir, { recursive: true, force: true });
      fs.mkdirSync(emptyDir);
      const server4 = spawn(process.execPath, ['server/index.js'], {
        env: { ...process.env, PORT: String(PORT), HOSPITAL_DB_DIR: emptyDir, GEMINI_API_KEY: 'clave-de-prueba' },
        stdio: ['ignore', 'ignore', 'inherit']
      });
      try {
        await waitForServer();
        const up = await sync('CEL', 0, { patients: [{ id: 'p-restaurado', fullName: 'Vuelve a subir', _mtime: Date.now() }] }, [], medTok);
        check('el celular puede volver a subir sus datos sin iniciar sesión de nuevo', up.accepted === 1, JSON.stringify(up).slice(0, 120));
        const adm2 = (await loginAs('usr-admin-colon', '2026')).json.token;
        await fetch(`${BASE}/api/users/usr-res-martinez/password`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adm2}` }, body: JSON.stringify({ newPassword: '5555', confirmPassword: '5555' }) });
        const after = await fetch(`${BASE}/api/sync/v2?since=0`, { headers: { Authorization: `Bearer ${medTok}` } });
        check('al cambiar el PIN se cierran las sesiones anteriores', after.status === 401, `HTTP ${after.status}`);
      } finally {
        server4.kill();
      }
    } finally {
      server3.kill();
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
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
