import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';

import { esquemaNativo, temaEfectivo, type AlmacenDePreferenciaDeTema, type PreferenciaDeTema } from './preferencia';
import { SecureAlmacenDePreferenciaDeTema } from './SecureAlmacenDePreferenciaDeTema';
import { tema, temaOscuro } from './temas';
import type { Tema } from './tokens';

const TemaContext = createContext<Tema>(tema);

interface EleccionDeTema {
  preferencia: PreferenciaDeTema;
  /** Falso hasta leer lo guardado: la raíz espera para no pintar claro y saltar a oscuro. */
  cargada: boolean;
  cambiar: (preferencia: PreferenciaDeTema) => void;
}

const EleccionContext = createContext<EleccionDeTema>({ preferencia: 'automatico', cargada: true, cambiar: () => undefined });

const almacenPorDefecto = new SecureAlmacenDePreferenciaDeTema();

/** Con `value` se fija un tema (pruebas); sin él, el tema sale de la preferencia guardada y del modo del teléfono. */
export function ThemeProvider({ value, almacen = almacenPorDefecto, children }: { value?: Tema; almacen?: AlmacenDePreferenciaDeTema; children: ReactNode }) {
  const [preferencia, setPreferencia] = useState<PreferenciaDeTema>('automatico');
  const [cargada, setCargada] = useState(false);
  const sistema = useColorScheme();

  useEffect(() => {
    let vigente = true;
    almacen
      .leer()
      .catch((): PreferenciaDeTema => 'automatico')
      .then((guardada) => {
        if (!vigente) return;
        setPreferencia(guardada);
        setCargada(true);
      });
    return () => {
      vigente = false;
    };
  }, [almacen]);

  // Le avisa al sistema para que teclado, alertas, interruptores y barra de estado combinen con el tema elegido.
  useEffect(() => {
    if (cargada) Appearance.setColorScheme(esquemaNativo(preferencia));
  }, [cargada, preferencia]);

  const cambiar = useCallback(
    (nueva: PreferenciaDeTema) => {
      setPreferencia(nueva);
      almacen.guardar(nueva).catch(() => undefined);
    },
    [almacen],
  );

  const eleccion = useMemo(() => ({ preferencia, cargada, cambiar }), [preferencia, cargada, cambiar]);
  const activo = value ?? (temaEfectivo(preferencia, sistema) === 'oscuro' ? temaOscuro : tema);

  return (
    <EleccionContext.Provider value={eleccion}>
      <TemaContext.Provider value={activo}>{children}</TemaContext.Provider>
    </EleccionContext.Provider>
  );
}

export const useTema = (): Tema => useContext(TemaContext);
export const useEleccionDeTema = (): EleccionDeTema => useContext(EleccionContext);
export { tema } from './temas';
export { crearTema } from './tokens';
export type { Tema } from './tokens';
export type { PreferenciaDeTema } from './preferencia';
