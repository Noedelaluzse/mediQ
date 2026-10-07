import { useEffect } from 'react';
import { AppState } from 'react-native';

import { diagnostico } from '@/shared/kernel/diagnostico';
import { useCasoDeUso } from '@/app/ContainerContext';

/**
 * Pone al día los avisos (citas y tomas) al volver a la app. Los de toma se programan por tandas (iOS admite 64 avisos), así que se
 * rellenan cada vez que se abre; un tratamiento terminado o una consulta eliminada dejan de avisar. Los fallos no se muestran.
 */
export function useSincronizarAvisos(): void {
  const citas = useCasoDeUso('sincronizarAvisosDeCitas');
  const tomas = useCasoDeUso('sincronizarAvisosDeTomas');

  useEffect(() => {
    const sincronizar = () => {
      citas.ejecutar().catch((error) => diagnostico.advertir('no se pudieron sincronizar los avisos de citas', error));
      tomas.ejecutar().catch((error) => diagnostico.advertir('no se pudieron sincronizar los avisos de toma', error));
    };
    const suscripcion = AppState.addEventListener('change', (estado) => estado === 'active' && sincronizar());
    return () => suscripcion.remove();
  }, [citas, tomas]);
}
