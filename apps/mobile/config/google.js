// JavaScript plano para que app.config.ts (que Expo evalúa sin transformar imports) pueda usarlo.
const SUFIJO = '.apps.googleusercontent.com';

/** Esquema de URL que iOS necesita para volver a la app tras el login (ID de cliente invertido). */
function urlSchemeDeGoogle(iosClientId) {
  if (!iosClientId.endsWith(SUFIJO) || iosClientId.length === SUFIJO.length) {
    throw new Error('El ID de cliente de iOS de Google no es válido');
  }
  return `com.googleusercontent.apps.${iosClientId.slice(0, -SUFIJO.length)}`;
}

module.exports = { urlSchemeDeGoogle };
