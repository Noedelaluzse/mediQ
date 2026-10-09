/**
 * Texto de «¿Cerrar sesión?» (F065, AUD-07). Al cerrar sesión se borra lo que vive solo en este teléfono, y antes se avisa de lo que se
 * va a perder: las consultas capturadas sin internet que aún no se enviaron y el borrador de «Nueva consulta».
 */
export function textoDeCierreDeSesion({ sinEnviar, hayBorrador }: { sinEnviar: number; hayBorrador: boolean }): string {
  const consultas = sinEnviar > 0 ? `${sinEnviar === 1 ? '1 consulta' : `${sinEnviar} consultas`} sin enviar (se capturaron sin internet)` : null;
  const borrador = hayBorrador ? 'un borrador de «Nueva consulta» sin terminar' : null;
  if (!consultas && !borrador) return 'Tendrás que volver a entrar con Google.';
  if (consultas && !borrador) return `Tienes ${consultas}. Si cierras sesión ahora, se perderán.`;
  if (!consultas && borrador) return `Tienes ${borrador}. Si cierras sesión ahora, se borrará.`;
  return `Tienes ${consultas} y ${borrador}. Si cierras sesión ahora, se perderán.`;
}
