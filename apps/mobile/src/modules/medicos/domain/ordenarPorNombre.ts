export const claveDeNombre = (nombre: string): string =>
  nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
