import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

// Keep any legacy clinical export privately before removing it from the site.
export function protectPages(siteDir, backupDir) {
  const snapshot = path.join(siteDir, 'hospital_master_db.json');
  if (!fs.existsSync(snapshot)) return;
  const data = fs.readFileSync(snapshot);
  const hash = createHash('sha256').update(data).digest('hex');
  fs.mkdirSync(backupDir, { recursive: true });
  const backup = path.join(backupDir, `pages-snapshot-${hash}.json`);
  if (!fs.existsSync(backup)) fs.writeFileSync(backup, data, { flag: 'wx', mode: 0o600 });
  const savedHash = createHash('sha256').update(fs.readFileSync(backup)).digest('hex');
  if (savedHash !== hash) throw new Error('Respaldo privado no verificado; publicación cancelada.');
  fs.unlinkSync(snapshot);
  console.log('Copia clínica antigua preservada en privado y retirada del sitio.');
}
