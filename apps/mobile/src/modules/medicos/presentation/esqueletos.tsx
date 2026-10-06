import { View } from 'react-native';

import { useTema } from '@/shared/theme';
import { Esqueleto, GrupoDeEsqueletos } from '@/shared/ui/Esqueleto';
import { LineasDeEsqueleto } from '@/shared/ui/Esqueletos';

/** El detalle de un médico cargando: círculo con nombre y especialidad, dos contadores y datos de contacto. */
export function EsqueletoDelDetalleDelMedico() {
  const { color, radio } = useTema();
  const tarjeta = { backgroundColor: color.superficie, borderColor: color.borde, borderWidth: 1 } as const;
  return (
    <GrupoDeEsqueletos etiqueta="Cargando al médico" style={{ gap: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Esqueleto ancho={64} alto={64} radio={32} />
        <View style={{ flex: 1, gap: 10 }}>
          <Esqueleto ancho="75%" alto={26} radio={8} />
          <Esqueleto ancho={96} alto={22} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[0, 1].map((i) => (
          <View key={i} style={{ ...tarjeta, flex: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, gap: 8 }}>
            <Esqueleto ancho={50} alto={22} />
            <Esqueleto ancho={70} alto={12} />
          </View>
        ))}
      </View>
      <View style={{ ...tarjeta, borderRadius: radio.lg, padding: 16 }}>
        <LineasDeEsqueleto lineas={3} alto={15} separacion={12} />
      </View>
    </GrupoDeEsqueletos>
  );
}
