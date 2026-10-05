export type Perfil = { id: string; nombreCompleto: string; esPropio: boolean };

/** Identidad verificada del usuario (viene del proveedor, hoy Google vía Firebase). */
export type IdentidadDeUsuario = { usuarioId: string; googleSub: string; email: string; nombre: string };

/** La cuenta de un usuario y su perfil propio (RF-02). Los perfiles familiares llegan en la fase 3. */
export type Cuenta = IdentidadDeUsuario & { perfilPropio: Perfil };

export const ID_PERFIL_PROPIO = 'self';
