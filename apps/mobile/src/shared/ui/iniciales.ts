const TITULO = /^(dra?|lic|ing|mtro|mtra)\.?$/i;

/** Iniciales para el avatar: primera letra del primer nombre y del último apellido, sin títulos (Dr., Dra.). */
export function iniciales(nombre: string): string {
  const todas = nombre.trim().split(/\s+/).filter(Boolean);
  const sinTitulo = todas.filter((p, i) => !(i === 0 && TITULO.test(p) && todas.length > 1));
  if (sinTitulo.length === 0) return '?';
  const primera = sinTitulo[0][0];
  const ultima = sinTitulo.length > 1 ? sinTitulo[sinTitulo.length - 1][0] : '';
  return (primera + ultima).toUpperCase();
}
