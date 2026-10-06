import { useEffect } from 'react';

import { useCasoDeUso } from '@/app/ContainerContext';

import { publicarSalud } from './saludPendiente';

/** Al entrar a la app lee los datos de salud una vez, para que el puntito de la pestaña Perfil esté bien aunque no se abra el Perfil. Los fallos no se muestran. */
export function useSaludAlEntrar(): void {
  const obtener = useCasoDeUso('obtenerDatosDeSalud');
  useEffect(() => {
    obtener.ejecutar().then(publicarSalud, () => undefined);
  }, [obtener]);
}
