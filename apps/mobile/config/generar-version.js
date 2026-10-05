// Escribe config/version.generated.json con la versión actual. Ejecutar en el repo real (con .git) ANTES de copiar
// el proyecto para compilar: `pnpm --filter mobile version:generate`.
const fs = require('node:fs');

const { ARCHIVO_GENERADO, calcularVersion, desdeGit } = require('./version');

const { asuntos, commit } = desdeGit();
const { version, compilacion } = calcularVersion(asuntos);
fs.writeFileSync(ARCHIVO_GENERADO, JSON.stringify({ version, commit, compilacion }, null, 2) + '\n');
console.log(`versión ${version} (${commit}), compilación ${compilacion}`);
