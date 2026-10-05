/** Firebase Auth exige un inicio de sesión reciente para operaciones sensibles, como borrar al usuario. */
export function esReautenticacionRequerida(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'auth/requires-recent-login';
}
