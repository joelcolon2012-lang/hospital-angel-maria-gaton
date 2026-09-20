import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function run(cmd, options = {}) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', ...options });
}

try {
  console.log('\n📦 [1/5] Compilando aplicación web (TypeScript + Vite)...');
  run('npm run build');

  const tempDir = path.resolve('..', 'gh-pages-deploy-temp');
  console.log(`\n🌿 [2/5] Preparando rama gh-pages en worktree temporal: ${tempDir}`);
  if (fs.existsSync(tempDir)) {
    try {
      run(`git worktree remove --force "${tempDir}"`);
    } catch {}
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  run(`git worktree add "${tempDir}" gh-pages`);

  console.log('\n📂 [3/5] Copiando distribución optimizada (dist/) a gh-pages...');
  fs.cpSync('dist', tempDir, { recursive: true, force: true });

  console.log('\n🚀 [4/5] Confirmando y enviando actualización a GitHub Pages...');
  run('git add -A', { cwd: tempDir });
  try {
    run('git commit -m "Despliegue de actualización a GitHub Pages"', { cwd: tempDir });
  } catch {
    console.log('ℹ️  No hay cambios nuevos respecto a la versión anterior de gh-pages.');
  }

  run('git push origin gh-pages', { cwd: tempDir });

  console.log('\n🧹 [5/5] Limpiando espacio temporal...');
  run(`git worktree remove "${tempDir}"`);

  console.log('\n=============================================================');
  console.log('✅ ¡DESPLIEGUE EN VIVO COMPLETADO CON ÉXITO!');
  console.log('Tu aplicación está disponible en cualquier dispositivo:');
  console.log('👉 https://joelcolon2012-lang.github.io/hospital-angel-maria-gaton/');
  console.log('=============================================================\n');
} catch (err) {
  console.error('\n❌ Error durante el despliegue:', err.message);
  process.exit(1);
}
