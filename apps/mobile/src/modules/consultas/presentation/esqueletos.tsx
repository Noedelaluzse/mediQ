import { View } from 'react-native';

import { useTema } from '@/shared/theme';
import { Esqueleto, GrupoDeEsqueletos } from '@/shared/ui/Esqueleto';
import { LineasDeEsqueleto } from '@/shared/ui/Esqueletos';

/** El Diario cargando: el nombre de un mes y tarjetas con la forma de una consulta (día a la izquierda). */
export function EsqueletoDelDiario({ tarjetas = 3 }: { tarjetas?: number }) {
  const { color, radio } = useTema();
  return (
    <GrupoDeEsqueletos etiqueta="Cargando tu diario" style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
        <Esqueleto ancho={130} alto={13} />
        <Esqueleto ancho={70} alto={13} />
      </View>
      {Array.from({ length: tarjetas }, (_, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ width: 44, alignItems: 'center', paddingTop: 12, gap: 6 }}>
            <Esqueleto ancho={28} alto={24} />
            <Esqueleto ancho={24} alto={10} />
          </View>
          <View style={{ flex: 1, backgroundColor: color.superficie, borderColor: color.borde, borderWidth: 1, borderRadius: radio.lg, paddingVertical: 14, paddingHorizontal: 16, gap: 10 }}>
            <Esqueleto ancho={96} alto={22} radio={8} />
            <Esqueleto ancho="64%" alto={16} />
            <LineasDeEsqueleto lineas={2} alto={13} />
          </View>
        </View>
      ))}
    </GrupoDeEsqueletos>
  );
}

/** El detalle de una consulta cargando: fecha, título, etiquetas, tarjeta del médico y secciones de texto. */
export function EsqueletoDelDetalleDeConsulta() {
  const { color, radio } = useTema();
  return (
    <GrupoDeEsqueletos etiqueta="Cargando la consulta" style={{ gap: 20 }}>
      <View style={{ gap: 10 }}>
        <Esqueleto ancho="48%" alto={14} />
        <Esqueleto ancho="82%" alto={32} radio={10} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Esqueleto ancho={92} alto={24} />
          <Esqueleto ancho={84} alto={24} />
        </View>
      </View>
      <View style={{ backgroundColor: color.superficie, borderColor: color.borde, borderWidth: 1, borderRadius: radio.lg, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Esqueleto ancho={48} alto={48} radio={24} />
        <View style={{ flex: 1, gap: 8 }}>
          <Esqueleto ancho="60%" alto={16} />
          <Esqueleto ancho="75%" alto={12} />
        </View>
        <Esqueleto ancho={44} alto={44} radio={22} />
      </View>
      {[0, 1].map((i) => (
        <View key={i} style={{ gap: 10 }}>
          <Esqueleto ancho={90} alto={12} />
          <LineasDeEsqueleto lineas={i === 0 ? 2 : 3} alto={15} />
        </View>
      ))}
    </GrupoDeEsqueletos>
  );
}

/** La sección de receta del detalle mientras llegan los medicamentos y la foto. */
export function EsqueletoDeLaSeccionDeReceta() {
  const { color, radio } = useTema();
  return (
    <GrupoDeEsqueletos etiqueta="Cargando la receta" style={{ gap: 8 }}>
      <View style={{ backgroundColor: color.superficie, borderColor: color.borde, borderWidth: 1, borderRadius: radio.lg, padding: 14, gap: 8 }}>
        <Esqueleto ancho="50%" alto={16} />
        <Esqueleto ancho="70%" alto={13} />
      </View>
    </GrupoDeEsqueletos>
  );
}

/** El formulario de la receta mientras se carga lo guardado (así no se escribe encima de datos que todavía no llegan). */
export function EsqueletoDeLaReceta() {
  const { color, radio } = useTema();
  const campo = (etiqueta: number) => (
    <View style={{ gap: 6 }}>
      <Esqueleto ancho={etiqueta} alto={12} />
      <Esqueleto alto={48} radio={radio.md} />
    </View>
  );
  return (
    <GrupoDeEsqueletos etiqueta="Cargando la receta" style={{ backgroundColor: color.superficie, borderColor: color.borde, borderWidth: 1, borderRadius: radio.lg, padding: 16, gap: 18 }}>
      <Esqueleto ancho={120} alto={13} />
      {campo(140)}
      <View style={{ gap: 8 }}>
        <Esqueleto ancho={170} alto={12} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[0, 1, 2, 3].map((i) => (
            <Esqueleto key={i} ancho={44} alto={40} radio={20} />
          ))}
        </View>
      </View>
      {campo(60)}
      {campo(90)}
      {campo(80)}
    </GrupoDeEsqueletos>
  );
}

/** La foto de la receta mientras se descarga (suele tardar más que el resto): un rectángulo del tamaño de la foto. */
export function EsqueletoDeLaFoto() {
  const { radio } = useTema();
  return (
    <GrupoDeEsqueletos etiqueta="Cargando la foto de la receta">
      <Esqueleto alto={120} radio={radio.lg} />
    </GrupoDeEsqueletos>
  );
}
