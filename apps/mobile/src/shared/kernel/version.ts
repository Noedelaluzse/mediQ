/** Texto de la versión para Perfil: "versión 1.10.14 (a1b2c3d)". */
export const textoDeVersion = (version?: string, commit?: string): string =>
  `versión ${version ?? '1.0.0'}${commit ? ` (${commit})` : ''}`;
