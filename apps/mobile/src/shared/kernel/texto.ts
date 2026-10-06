/** Minúsculas, sin acentos y con los espacios recortados y juntos: para comparar y buscar texto escrito por personas. */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
