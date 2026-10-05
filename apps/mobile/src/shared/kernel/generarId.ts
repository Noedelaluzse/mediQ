const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** Id de 20 caracteres como los automáticos de Firestore. No es secreto: solo identifica el documento. */
export const generarId = (): string =>
  Array.from({ length: 20 }, () => ALFABETO[Math.floor(Math.random() * ALFABETO.length)]).join('');
