const MIN_DIGITOS = 3;

/** `tel:` con solo los dígitos (y el + inicial de los números internacionales); null si no hay a quién llamar. */
export function enlaceDeLlamada(telefono: string): string | null {
  const digitos = telefono.replace(/\D/g, '');
  if (digitos.length < MIN_DIGITOS) return null;
  return `tel:${telefono.trim().startsWith('+') ? '+' : ''}${digitos}`;
}
