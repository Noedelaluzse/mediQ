import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import type { DatosDeMedicoParaConsulta } from '../application/ElegirMedicoGuardado';
import { seleccionDeMedico } from './seleccionDeMedico';

/** Para el formulario de consulta (F009): al volver a primer plano recibe el médico elegido, si hubo. */
export function useMedicoElegido(alElegir: (datos: DatosDeMedicoParaConsulta) => void) {
  useFocusEffect(
    useCallback(() => {
      const datos = seleccionDeMedico.consumir();
      if (datos) alElegir(datos);
    }, [alElegir]),
  );
}
