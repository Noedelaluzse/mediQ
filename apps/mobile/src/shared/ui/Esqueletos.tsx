import { View } from 'react-native';

import { useTema } from '../theme';
import { anchosDeTexto } from './esqueleto';
import { Esqueleto, GrupoDeEsqueletos } from './Esqueleto';

/** Varias líneas de texto de distinto largo. */
export function LineasDeEsqueleto({ lineas, alto = 14, separacion = 8 }: { lineas: number; alto?: number; separacion?: number }) {
  return (
    <View style={{ gap: separacion }}>
      {anchosDeTexto(lineas).map((ancho, i) => (
        <Esqueleto key={i} ancho={ancho as `${number}%`} alto={alto} />
      ))}
    </View>
  );
}

/** Tarjeta con círculo y tres líneas: lista de médicos y selector «Elegir médico». */
export function EsqueletoDeTarjetasConAvatar({ cantidad = 4, etiqueta = 'Cargando' }: { cantidad?: number; etiqueta?: string }) {
  const { color, radio } = useTema();
  return (
    <GrupoDeEsqueletos etiqueta={etiqueta} style={{ gap: 12 }}>
      {Array.from({ length: cantidad }, (_, i) => (
        <View key={i} style={{ backgroundColor: color.superficie, borderColor: color.borde, borderWidth: 1, borderRadius: radio.lg, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Esqueleto ancho={48} alto={48} radio={24} />
          <View style={{ flex: 1, gap: 8 }}>
            <Esqueleto ancho="62%" alto={16} />
            <Esqueleto ancho="38%" alto={12} />
            <Esqueleto ancho="52%" alto={12} />
          </View>
        </View>
      ))}
    </GrupoDeEsqueletos>
  );
}

/** Filas con una línea o dos: lugares y listas sencillas. */
export function EsqueletoDeFilas({ cantidad = 4, etiqueta = 'Cargando' }: { cantidad?: number; etiqueta?: string }) {
  const { color, radio } = useTema();
  return (
    <GrupoDeEsqueletos etiqueta={etiqueta} style={{ gap: 10 }}>
      {Array.from({ length: cantidad }, (_, i) => (
        <View key={i} style={{ backgroundColor: color.superficie, borderColor: color.borde, borderWidth: 1, borderRadius: radio.lg, paddingVertical: 14, paddingHorizontal: 16, gap: 8 }}>
          <Esqueleto ancho={i % 2 === 0 ? '55%' : '70%'} alto={16} />
          <Esqueleto ancho="35%" alto={12} />
        </View>
      ))}
    </GrupoDeEsqueletos>
  );
}
