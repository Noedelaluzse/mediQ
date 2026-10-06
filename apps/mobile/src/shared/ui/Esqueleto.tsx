import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';

import { useTema } from '../theme';
import { PULSO } from './esqueleto';

/** El parpadeo es uno solo por grupo: así todos los bloques de una pantalla laten a la vez. */
const OpacidadDelGrupo = createContext<Animated.Value | number>(1);

/**
 * Agrupa los esqueletos de una pantalla: un solo parpadeo compartido y un solo anuncio para lectores de pantalla
 * («Cargando…») en vez de uno por bloque. Con «reducir movimiento» activado en el teléfono no hay animación.
 */
export function GrupoDeEsqueletos({ etiqueta = 'Cargando', children, style }: { etiqueta?: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const [opacidad] = useState(() => new Animated.Value(PULSO.hasta));
  const [sinMovimiento, setSinMovimiento] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setSinMovimiento, () => setSinMovimiento(false));
    const suscripcion = AccessibilityInfo.addEventListener('reduceMotionChanged', setSinMovimiento);
    return () => suscripcion.remove();
  }, []);

  useEffect(() => {
    if (sinMovimiento) {
      opacidad.setValue(0.75);
      return;
    }
    const tiempo = { duration: PULSO.duracionMs, easing: Easing.inOut(Easing.ease), useNativeDriver: true } as const;
    const animacion = Animated.loop(Animated.sequence([Animated.timing(opacidad, { toValue: PULSO.desde, ...tiempo }), Animated.timing(opacidad, { toValue: PULSO.hasta, ...tiempo })]));
    animacion.start();
    return () => animacion.stop();
  }, [opacidad, sinMovimiento]);

  return (
    <OpacidadDelGrupo.Provider value={opacidad}>
      <View accessible accessibilityRole="progressbar" accessibilityLabel={etiqueta} accessibilityLiveRegion="polite" importantForAccessibility="yes" style={style}>
        {children}
      </View>
    </OpacidadDelGrupo.Provider>
  );
}

/** Un bloque gris con la forma de lo que va a aparecer. Se usa dentro de un `GrupoDeEsqueletos`. */
export function Esqueleto({ ancho = '100%', alto = 14, radio = 8, estilo }: { ancho?: DimensionValue; alto?: number; radio?: number; estilo?: StyleProp<ViewStyle> }) {
  const { color } = useTema();
  const opacidad = useContext(OpacidadDelGrupo);
  return <Animated.View style={[{ width: ancho, height: alto, borderRadius: radio, backgroundColor: color.esqueleto, opacity: opacidad }, estilo]} />;
}
