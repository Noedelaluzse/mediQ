import { Alert, Pressable, Text, View } from 'react-native';

import { useTema } from '@/shared/theme';

import type { ConsultaPendiente } from '../domain/ConsultaPendiente';
import { aTarjetaPendiente, avisoDeConexion } from './tarjetaPendiente';

/** Franja de arriba del Diario: sin internet, o enviando lo capturado sin internet (RNF-11). No aparece si no hay nada que decir. */
export function FranjaDeConexion({ conectado, porEnviar }: { conectado: boolean; porEnviar: number }) {
  const { color, fuente, radio, espacio } = useTema();
  const aviso = avisoDeConexion(conectado, porEnviar);
  if (!aviso) return null;
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ marginTop: 14, backgroundColor: color.acentoRecetaSuave, borderRadius: radio.md, padding: espacio.md, gap: 2 }}>
      <Text style={{ color: color.acentoReceta, fontFamily: fuente.cuerpoBold, fontSize: 14 }}>{aviso.titulo}</Text>
      <Text style={{ color: color.acentoReceta, fontFamily: fuente.cuerpo, fontSize: 13, lineHeight: 18 }}>{aviso.texto}</Text>
    </View>
  );
}

/**
 * Las consultas capturadas sin internet que aún no llegaron al servidor, arriba del diario con su etiqueta. Una que el servidor
 * rechazó muestra el motivo y se puede descartar. Estas consultas todavía no tienen detalle: no se abren.
 */
export function ConsultasPendientes({ pendientes, alDescartar }: { pendientes: ConsultaPendiente[]; alDescartar: (id: string) => void }) {
  const { color, fuente, radio } = useTema();
  if (pendientes.length === 0) return null;

  const confirmar = (id: string) =>
    Alert.alert('¿Descartar esta consulta?', 'No se enviará y no se podrá recuperar.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: () => alDescartar(id) },
    ]);

  return (
    <View style={{ marginTop: 14, gap: 12 }}>
      <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpoBold, fontSize: 13, letterSpacing: 0.8, textTransform: 'uppercase' }}>Por enviar</Text>
      {pendientes.map((p) => {
        const t = aTarjetaPendiente(p);
        const rechazada = t.estado === 'rechazada';
        return (
          <View key={t.id} accessible accessibilityLabel={`${t.etiqueta}: ${t.titulo}`} style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ width: 44, alignItems: 'center', paddingTop: 12 }}>
              <Text style={{ color: color.texto, fontFamily: fuente.titulo, fontSize: 24, lineHeight: 26 }}>{t.dia}</Text>
              <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpoSemi, fontSize: 12 }}>{t.diaDeLaSemana}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: color.superficie, borderColor: rechazada ? color.peligro : color.borde, borderWidth: 1, borderStyle: rechazada ? 'solid' : 'dashed', borderRadius: radio.lg, paddingVertical: 14, paddingHorizontal: 16, gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <View style={{ backgroundColor: color.primarioSuave, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ color: color.primario, fontFamily: fuente.cuerpoBold, fontSize: 12 }}>{t.especialidad}</Text>
                </View>
                <View style={{ backgroundColor: rechazada ? color.peligroSuave : color.acentoRecetaSuave, borderRadius: radio.pill, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ color: rechazada ? color.peligro : color.acentoReceta, fontFamily: fuente.cuerpoSemi, fontSize: 11 }}>{t.etiqueta}</Text>
                </View>
              </View>
              <Text style={{ color: color.texto, fontFamily: fuente.cuerpoSemi, fontSize: 16 }}>{t.titulo}</Text>
              {t.resumen ? (
                <Text numberOfLines={2} style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 14, lineHeight: 20 }}>
                  {t.resumen}
                </Text>
              ) : null}
              {rechazada ? (
                <View style={{ gap: 4 }}>
                  <Text style={{ color: color.peligro, fontFamily: fuente.cuerpo, fontSize: 13, lineHeight: 18 }}>{t.motivoDelError}</Text>
                  <Pressable accessibilityRole="button" onPress={() => confirmar(t.id)} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
                    <Text style={{ color: color.peligro, fontFamily: fuente.cuerpoBold, fontSize: 14 }}>Descartar</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
