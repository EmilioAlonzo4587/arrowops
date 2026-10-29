// Build de ArrowOps: verifica la sintaxis de todo el JavaScript que va al artefacto.
// El proyecto no transpila, asi que "compilar" equivale a validar que cada archivo parsea.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');
const sourceDirs = ['backend/src', 'frontend/src'];

function listJsFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listJsFiles(full);
    return entry.name.endsWith('.js') ? [full] : [];
  });
}

const files = sourceDirs.flatMap((dir) => listJsFiles(path.join(root, dir)));
let failed = 0;

for (const file of files) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (err) {
    failed += 1;
    console.error(`ERROR de sintaxis en ${path.relative(root, file)}\n${err.stderr}`);
  }
}

if (failed > 0) {
  console.error(`Build fallido: ${failed} de ${files.length} archivos con errores.`);
  process.exit(1);
}
console.log(`Build OK: ${files.length} archivos JavaScript verificados.`);
