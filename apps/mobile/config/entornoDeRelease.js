// JavaScript plano (como version.js) para poder usarlo desde un script de shell sin transformar.
// F019: verifica las variables EXPO_PUBLIC_* antes de compilar una versión Release. Esas variables se INCRUSTAN al empaquetar: si falta una,
// `firebase.ts` no crea el cliente y la app trabaja en memoria sin avisar (nada llega a la nube).
// Uso: `node config/entornoDeRelease.js [ruta/del/.env.local]` -> imprime las que faltan y sale con código 1.
/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');

// El ID de cliente web de Google es opcional (el inicio de sesión funciona sin él): no se exige.
const VARIABLES_DE_RELEASE = [
  'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
];

/** Las variables de Release que no tienen valor (ausentes, vacías o solo espacios). */
function variablesFaltantes(env) {
  return VARIABLES_DE_RELEASE.filter((nombre) => !(typeof env[nombre] === 'string' && env[nombre].trim() !== ''));
}

/** Lee el texto de un `.env`: `CLAVE=valor`, sin comentarios (#) ni líneas vacías, con o sin comillas. El valor puede llevar «=». */
function analizarEnv(texto) {
  const env = {};
  for (const linea of texto.split(/\r?\n/)) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith('#')) continue;
    const igual = limpia.indexOf('=');
    if (igual < 1) continue;
    const clave = limpia.slice(0, igual).trim();
    let valor = limpia.slice(igual + 1).trim();
    if (/^(".*"|'.*')$/.test(valor)) valor = valor.slice(1, -1);
    env[clave] = valor;
  }
  return env;
}

module.exports = { VARIABLES_DE_RELEASE, variablesFaltantes, analizarEnv };

if (require.main === module) {
  const archivo = process.argv[2] ?? path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(archivo)) {
    console.error(`No existe ${archivo}: copia .env.example a .env.local y complétalo.`);
    process.exit(1);
  }
  const faltan = variablesFaltantes(analizarEnv(fs.readFileSync(archivo, 'utf8')));
  if (faltan.length > 0) {
    console.error(`Faltan variables en ${archivo}:\n  ${faltan.join('\n  ')}`);
    process.exit(1);
  }
  console.log(`Variables de Release completas (${VARIABLES_DE_RELEASE.length}).`);
}
