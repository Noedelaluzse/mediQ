export const DOCUMENTOS = ['aviso_privacidad', 'terminos'] as const;
export type Documento = (typeof DOCUMENTOS)[number];

/** Versión vigente de cada documento. Al cambiar una, la app vuelve a pedir su aceptación. */
export const VERSIONES_VIGENTES: Record<Documento, string> = {
  aviso_privacidad: '2026-10-05',
  terminos: '2026-10-05',
};

export type Consentimiento = { documento: Documento; version: string; aceptadoEn: Date };

/** Id determinista: impide registrar dos veces la misma versión del mismo documento. */
export const idDeConsentimiento = (documento: Documento, version: string): string => `${documento}_${version}`;

/** Documentos cuya versión vigente el usuario todavía no aceptó. */
export function documentosPendientes(aceptados: Consentimiento[]): Documento[] {
  return DOCUMENTOS.filter(
    (documento) => !aceptados.some((c) => c.documento === documento && c.version === VERSIONES_VIGENTES[documento]),
  );
}
