import { useEffect, useState } from 'react';

import { useCasoDeUso } from './ContainerContext';

/** ¿Hay internet ahora? Se actualiza solo cuando cambia. Mientras se averigua se asume que sí (no se asusta con una franja de más). */
export function useHayInternet(): boolean {
  const red = useCasoDeUso('conectividad');
  const [hay, setHay] = useState(true);
  useEffect(() => {
    let vigente = true;
    red.estaConectado().then((c) => vigente && setHay(c), () => undefined);
    const baja = red.suscribir((c) => vigente && setHay(c));
    return () => {
      vigente = false;
      baja();
    };
  }, [red]);
  return hay;
}
