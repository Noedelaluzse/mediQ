// JavaScript plano para que app.config.ts (que Expo evalúa sin transformar imports) pueda usarlo.
// Versión automática: 1.<features>.<resto>, calculada con el historial de git (ver docs/generado/conventions.md).
/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ARCHIVO_GENERADO = path.join(__dirname, 'version.generated.json');
const ES_FEATURE = /^\s*feat(\([^)]*\))?!?:/i; // feat: / feat(x): / feat!:
const ES_FEATURE_ANTIGUO = /^\s*F\d{3}:/; // commits viejos como "F005: ..."
const ID_DE_FEATURE = /\bF\d{3}\b/;

/**
 * Cuenta commits: cada feature (una vez por id Fnnn si lo trae) sube el número del medio;
 * todo lo demás (fix, docs, chore, sin prefijo) sube el último. Los "Merge ..." no cuentan.
 */
function calcularVersion(asuntos) {
  const validos = asuntos.map((a) => a.trim()).filter((a) => a && !/^Merge /.test(a));
  const ids = new Set();
  let sinId = 0;
  let features = 0;
  for (const asunto of validos) {
    if (!ES_FEATURE.test(asunto) && !ES_FEATURE_ANTIGUO.test(asunto)) continue;
    const id = asunto.match(ID_DE_FEATURE)?.[0];
    if (id) ids.add(id);
    else sinId += 1;
  }
  features = ids.size + sinId;
  const otros = validos.length - validos.filter((a) => ES_FEATURE.test(a) || ES_FEATURE_ANTIGUO.test(a)).length;
  return { version: `1.${features}.${otros}`, features, otros, compilacion: validos.length };
}

function desdeGit(cwd = __dirname) {
  const run = (comando) => execSync(comando, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  return { asuntos: run('git log --no-merges --format=%s').split('\n'), commit: run('git rev-parse --short HEAD') };
}

function leerGenerado() {
  try {
    return JSON.parse(fs.readFileSync(ARCHIVO_GENERADO, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Usa git; si no hay (la copia de compilación `~/mediq-build` no trae .git) lee `version.generated.json`
 * (se crea con `pnpm --filter mobile version:generate`); si tampoco, 1.0.0.
 */
function obtenerVersion({ git = desdeGit, leer = leerGenerado } = {}) {
  try {
    const { asuntos, commit } = git();
    const { version, compilacion } = calcularVersion(asuntos);
    return { version, commit, compilacion };
  } catch {
    return leer() ?? { version: '1.0.0', commit: undefined, compilacion: 1 };
  }
}

module.exports = { calcularVersion, obtenerVersion, desdeGit, ARCHIVO_GENERADO };
