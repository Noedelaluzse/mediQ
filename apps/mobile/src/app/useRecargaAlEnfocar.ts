import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

import { diagnostico } from '@/shared/kernel/diagnostico';
import { necesitaRecargar, type UltimaCarga } from '@/shared/kernel/frescura';
import { versionDeDatos } from '@/shared/kernel/versionDeDatos';

import { useHayInternet } from './useHayInternet';

/**
 * Carga los datos de una pantalla al abrirla y, al volver a ella, solo si hace falta (P-06): algo cambió en la app, cambió la
 * conexión o pasó el minuto de vigencia. Si no, se conserva lo cargado (y, en las listas, el lugar donde ibas).
 *
 * `nombre` solo sirve para el registro de desarrollo (`diagnostico`). `cargar` puede devolver una promesa; si termina en `false` o falla, la próxima vez que se vuelva a la pantalla se intenta de nuevo.
 */
export function useRecargaAlEnfocar(cargar: () => void | Promise<boolean | void>, nombre = 'pantalla'): void {
  const hayInternet = useHayInternet();
  const ultima = useRef<UltimaCarga | null>(null);

  useFocusEffect(
    useCallback(() => {
      const actual = { version: versionDeDatos(), hayInternet, ahora: Date.now() };
      if (!necesitaRecargar(ultima.current, actual)) {
        diagnostico.informar(`recarga al enfocar: ${nombre} → se conserva lo cargado`);
        return;
      }
      diagnostico.informar(`recarga al enfocar: ${nombre} → se vuelve a leer`);
      // La versión se anota ANTES de leer: si algo cambia mientras se lee, la siguiente vez se vuelve a cargar.
      const marca = { cuando: actual.ahora, version: actual.version, hayInternet };
      ultima.current = marca;
      const olvidar = () => {
        if (ultima.current === marca) ultima.current = null;
      };
      const resultado = cargar();
      if (resultado && typeof resultado.then === 'function') resultado.then((ok) => ok === false && olvidar(), olvidar);
    }, [cargar, hayInternet, nombre]),
  );
}
