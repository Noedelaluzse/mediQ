export const textoDeResultados = (n: number): string => (n === 1 ? '1 resultado' : `${n} resultados`);

/** `explicar` agrega dónde se busca, para que se entienda por qué no aparece algo (p. ej. el motivo). */
export const mensajeSinResultados = (texto: string, explicar = false): string => {
  const base = `Sin resultados para «${texto.trim()}»`;
  return explicar ? `${base}. Se busca por médico, especialidad o lugar.` : base;
};
