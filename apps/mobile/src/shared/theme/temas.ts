import { verde } from './palettes/verde';
import { verdeOscuro } from './palettes/verdeOscuro';
import { crearTema } from './tokens';

// Sin dependencias de React Native: se puede usar (y probar) fuera de la app.
/** Paleta clara: la que se usa mientras no se sepa otra cosa. */
export const tema = crearTema(verde);
export const temaOscuro = crearTema(verdeOscuro);
