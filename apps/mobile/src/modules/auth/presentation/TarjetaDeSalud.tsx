import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTema } from '@/shared/theme';
import { Esqueleto, GrupoDeEsqueletos } from '@/shared/ui/Esqueleto';

import type { DatosDeSalud } from '../domain/DatosDeSalud';
import { avisoDeSalud, botonDeSalud, filasDeSalud } from './tarjetaDeSalud';

/**
 * Lo de salud en el Perfil: el aviso de datos pendientes (con su avance) y la tarjeta «Mi salud». La nota verde de «completa» es un
 * aviso temporal (`completadoAhora`: solo unos segundos tras completar los datos), no un elemento fijo. `datos` en null = cargando.
 */
export function AvisoYTarjetaDeSalud({ datos, alEditar, completadoAhora = false }: { datos: DatosDeSalud | null; alEditar: () => void; completadoAhora?: boolean }) {
  const { color, fuente, radio, espacio } = useTema();
  const tarjeta = { backgroundColor: color.superficie, borderColor: color.borde, borderWidth: 1, borderRadius: radio.lg } as const;

  if (datos === null) {
    return (
      <GrupoDeEsqueletos etiqueta="Cargando tus datos de salud" style={{ ...tarjeta, padding: espacio.lg, gap: 14 }}>
        <Esqueleto ancho={110} alto={18} />
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Esqueleto ancho={90} alto={14} />
            <Esqueleto ancho={70} alto={14} />
          </View>
        ))}
      </GrupoDeEsqueletos>
    );
  }

  const aviso = avisoDeSalud(datos);
  const filas = filasDeSalud(datos, new Date());

  return (
    <View style={{ gap: 12 }}>
      {aviso ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${aviso.titulo}. ${aviso.texto}`}
          onPress={alEditar}
          style={{ backgroundColor: color.acentoRecetaSuave, borderRadius: radio.md, padding: espacio.md, gap: 8 }}>
          <Text style={{ color: color.acentoReceta, fontFamily: fuente.cuerpoBold, fontSize: 14 }}>{aviso.titulo}</Text>
          <Text style={{ color: color.acentoReceta, fontFamily: fuente.cuerpo, fontSize: 13 }}>{aviso.texto} Hazlo cuando puedas.</Text>
          <View style={{ height: 5, borderRadius: 3, backgroundColor: color.borde, overflow: 'hidden' }}>
            <View style={{ width: `${Math.round(aviso.avance * 100)}%`, height: 5, backgroundColor: color.primario }} />
          </View>
        </Pressable>
      ) : null}

      <View style={{ ...tarjeta, paddingHorizontal: espacio.lg, paddingTop: espacio.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 36 }}>
          <Text accessibilityRole="header" style={{ color: color.texto, fontFamily: fuente.titulo, fontSize: 18 }}>
            Mi salud
          </Text>
          <Pressable accessibilityRole="button" onPress={alEditar} style={{ minHeight: 44, minWidth: 56, alignItems: 'flex-end', justifyContent: 'center' }}>
            <Text style={{ color: color.primario, fontFamily: fuente.cuerpoBold, fontSize: 14 }}>{botonDeSalud(datos)}</Text>
          </Pressable>
        </View>
        {filas.map((f, i) => (
          <View
            key={f.etiqueta}
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, paddingVertical: 11, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: color.borde }}>
            <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 14, flexShrink: 1 }}>{f.etiqueta}</Text>
            {f.pendiente ? (
              <View style={{ backgroundColor: color.acentoRecetaSuave, borderRadius: radio.pill, paddingHorizontal: 10, paddingVertical: 3 }}>
                <Text style={{ color: color.acentoReceta, fontFamily: fuente.cuerpoSemi, fontSize: 12 }}>Pendiente</Text>
              </View>
            ) : f.etiquetas ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6, flex: 1 }}>
                {f.etiquetas.map((e) => (
                  <View key={e} style={{ backgroundColor: color.peligroSuave, borderRadius: radio.pill, paddingHorizontal: 10, paddingVertical: 3 }}>
                    <Text style={{ color: color.peligro, fontFamily: fuente.cuerpoSemi, fontSize: 13 }}>{e}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={{ alignItems: 'flex-end', flexShrink: 1 }}>
                <Text style={{ color: color.texto, fontFamily: fuente.cuerpoSemi, fontSize: 14 }}>{f.valor}</Text>
                {f.detalle ? <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 12 }}>{f.detalle}</Text> : null}
              </View>
            )}
          </View>
        ))}
      </View>

      {completadoAhora && aviso === null ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: color.primarioSuave, borderRadius: radio.md, padding: espacio.md }}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color.primario} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M5 12l5 5 9-10" />
          </Svg>
          <Text style={{ color: color.primario, fontFamily: fuente.cuerpoSemi, fontSize: 13, flex: 1 }}>Tu información de salud está completa.</Text>
        </View>
      ) : null}
    </View>
  );
}
