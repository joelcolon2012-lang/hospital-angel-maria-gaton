// Sale con código 1 si hay que recompilar (no existe dist o hay archivos más nuevos que la última compilación)
import fs from 'fs';
import path from 'path';

const distIndex = path.resolve('dist', 'index.html');
if (!fs.existsSync(distIndex)) process.exit(1);
const builtAt = fs.statSync(distIndex).mtimeMs;

function newer(dir) {
  if (!fs.existsSync(dir)) return false;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (newer(full)) return true;
    } else if (fs.statSync(full).mtimeMs > builtAt) {
      return true;
    }
  }
  return false;
}

const roots = ['src', 'public', 'index.html', 'vite.config.ts', 'tailwind.config.js', 'package.json'];
for (const r of roots) {
  const p = path.resolve(r);
  if (!fs.existsSync(p)) continue;
  if (fs.statSync(p).isDirectory() ? newer(p) : fs.statSync(p).mtimeMs > builtAt) process.exit(1);
}
process.exit(0);
