import { deleteField, serverTimestamp } from 'firebase/firestore';

import { SEXOS, SIN_DATOS, TIPOS_DE_SANGRE, type Alergias, type DatosDeSalud, type Sexo, type TipoDeSangre } from '../domain/DatosDeSalud';

const SEXO_A_DOCUMENTO: Record<Sexo, string> = { mujer: 'female', hombre: 'male', otro: 'other', 'prefiero-no-decir': 'undisclosed' };
const SEXO_DE_DOCUMENTO = Object.fromEntries(SEXOS.map((s) => [SEXO_A_DOCUMENTO[s], s])) as Record<string, Sexo>;

const SANGRE_A_DOCUMENTO = (t: TipoDeSangre): string => (t === 'desconocido' ? 'unknown' : t);
const SANGRE_DE_DOCUMENTO = (v: string): TipoDeSangre | undefined => (v === 'unknown' ? 'desconocido' : (TIPOS_DE_SANGRE as readonly string[]).includes(v) && v !== 'desconocido' ? (v as TipoDeSangre) : undefined);

/** Campos de salud de `patients/self`; los demás (nombre, isSelf, fechas) no se tocan. */
export type DocumentoDeSalud = {
  birthDate?: unknown;
  sex?: unknown;
  bloodType?: unknown;
  allergies?: unknown;
  noKnownAllergies?: unknown;
  drugAllergies?: unknown;
  noKnownDrugAllergies?: unknown;
};

/**
 * Los cambios para `updateDoc`: lo que no se llenó se manda como `deleteField()` (quitar un dato lo quita de verdad) y las listas
 * y sus marcas siempre se escriben. `updatedAt` lo pone el servidor.
 */
export const aCambiosDeSalud = (d: DatosDeSalud) => ({
  birthDate: d.nacimiento ?? deleteField(),
  sex: d.sexo ? SEXO_A_DOCUMENTO[d.sexo] : deleteField(),
  bloodType: d.tipoDeSangre ? SANGRE_A_DOCUMENTO(d.tipoDeSangre) : deleteField(),
  allergies: d.alergias.items,
  noKnownAllergies: d.alergias.sinConocidas,
  drugAllergies: d.alergiasAMedicamentos.items,
  noKnownDrugAllergies: d.alergiasAMedicamentos.sinConocidas,
  updatedAt: serverTimestamp(),
});

const alergias = (items: unknown, sin: unknown): Alergias => ({
  sinConocidas: sin === true,
  items: Array.isArray(items) ? items.filter((i): i is string => typeof i === 'string') : [],
});

/** Lo guardado se lee con cuidado: un valor dañado se ignora en vez de romper la pantalla. */
export function deDocumentoDeSalud(doc: DocumentoDeSalud): DatosDeSalud {
  return {
    ...SIN_DATOS,
    ...(typeof doc.birthDate === 'string' ? { nacimiento: doc.birthDate } : {}),
    ...(typeof doc.sex === 'string' && SEXO_DE_DOCUMENTO[doc.sex] ? { sexo: SEXO_DE_DOCUMENTO[doc.sex] } : {}),
    ...(typeof doc.bloodType === 'string' && SANGRE_DE_DOCUMENTO(doc.bloodType) ? { tipoDeSangre: SANGRE_DE_DOCUMENTO(doc.bloodType) } : {}),
    alergias: alergias(doc.allergies, doc.noKnownAllergies),
    alergiasAMedicamentos: alergias(doc.drugAllergies, doc.noKnownDrugAllergies),
  };
}
