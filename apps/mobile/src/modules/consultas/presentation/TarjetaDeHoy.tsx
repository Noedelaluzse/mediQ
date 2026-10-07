import { useState } from 'react';
import { LayoutAnimation, Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useTema } from '@/shared/theme';

/** Una toma del día tal como la muestra la tarjeta «Hoy». */
export interface TomaDeHoy {
  id: string;
  /** «Losartán · 1 tableta». */
  titulo: string;
  /** «8:00». */
  hora: string;
  estado: 'tomada' | 'atrasada' | 'pendiente';
  /** «8:02»: solo si está tomada. */
  tomadaA?: string;
}

function Icono({ estado }: { estado: TomaDeHoy['estado'] }) {
  const { color } = useTema();
  return (
    <Svg width={28} height={28} viewBox="0 0 28 28">
      {estado === 'tomada' ? (
        <>
          <Circle cx={14} cy={14} r={14} fill={color.primario} />
          <Path d="M8 14.5l4 4 8-9" stroke={color.sobrePrimario} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
      ) : estado === 'atrasada' ? (
        <>
          <Circle cx={14} cy={14} r={14} fill={color.acentoRecetaSuave} />
          <Path d="M14 8v6.5l4 2.5" stroke={color.acentoReceta} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
      ) : (
        <>
          <Circle cx={14} cy={14} r={12.5} stroke={color.bordeCampo} strokeWidth={1.8} fill="none" />
          <Path d="M14 8.5v5.5l3.5 2" stroke={color.textoSecundario} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
      )}
    </Svg>
  );
}

function Fila({ toma: t, primera, alMarcar, alDeshacer }: { toma: TomaDeHoy; primera: boolean; alMarcar: (id: string) => void; alDeshacer: (id: string) => void }) {
  const { color, fuente, radio } = useTema();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderTopWidth: primera ? 0 : 1, borderTopColor: color.borde }}>
      <Pressable accessibilityRole="button" accessibilityLabel={t.estado === 'tomada' ? `Deshacer: ${t.titulo}` : undefined} disabled={t.estado !== 'tomada'} onPress={() => alDeshacer(t.id)} hitSlop={8}>
        <Icono estado={t.estado} />
      </Pressable>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: color.texto, fontFamily: fuente.cuerpoSemi, fontSize: 14 }}>{t.titulo}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 13 }}>
            {t.hora}
            {t.estado === 'tomada' && t.tomadaA ? ` · la tomaste a las ${t.tomadaA}` : ''}
          </Text>
          {t.estado === 'atrasada' ? (
            <View style={{ backgroundColor: color.acentoRecetaSuave, borderRadius: radio.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ color: color.acentoReceta, fontFamily: fuente.cuerpoSemi, fontSize: 11 }}>Atrasada</Text>
            </View>
          ) : null}
        </View>
      </View>
      {t.estado === 'tomada' ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ya la tomé: ${t.titulo}`}
          onPress={() => alMarcar(t.id)}
          style={{ minHeight: 36, paddingHorizontal: 14, borderRadius: radio.pill, justifyContent: 'center', backgroundColor: t.estado === 'atrasada' ? color.primario : color.superficie, borderWidth: t.estado === 'atrasada' ? 0 : 1, borderColor: color.bordeCampo }}>
          <Text style={{ color: t.estado === 'atrasada' ? color.sobrePrimario : color.texto, fontFamily: fuente.cuerpoBold, fontSize: 13 }}>Ya la tomé</Text>
        </Pressable>
      )}
    </View>
  );
}

/**
 * Tarjeta «Hoy» del Diario. Compacta por defecto (resumen, barra y la toma que sigue: la atrasada primero) para no empujar las
 * consultas hacia abajo; un toque la despliega con todas las tomas del día.
 */
export function TarjetaDeHoy({ tomas, alMarcar, alDeshacer }: { tomas: TomaDeHoy[]; alMarcar: (id: string) => void; alDeshacer: (id: string) => void }) {
  const { color, fuente, radio, espacio } = useTema();
  const [expandida, setExpandida] = useState(false);
  if (tomas.length === 0) return null;
  const tomadas = tomas.filter((t) => t.estado === 'tomada').length;
  const siguiente = tomas.find((t) => t.estado === 'atrasada') ?? tomas.find((t) => t.estado === 'pendiente');
  const visibles = expandida ? tomas : siguiente ? [siguiente] : [];

  function alternar() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandida((e) => !e);
  }

  return (
    <View style={{ backgroundColor: color.superficie, borderColor: color.borde, borderWidth: 1, borderRadius: radio.lg, paddingHorizontal: espacio.lg, paddingTop: espacio.md, paddingBottom: 4 }}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: expandida }} accessibilityLabel={`Hoy, ${tomadas} de ${tomas.length} tomas. ${expandida ? 'Ocultar' : 'Ver todas'}`} onPress={alternar}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text accessibilityRole="header" style={{ color: color.texto, fontFamily: fuente.titulo, fontSize: 18 }}>
            Hoy
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpoMedio, fontSize: 13 }}>
              {tomadas} de {tomas.length} {tomas.length === 1 ? 'toma' : 'tomas'}
            </Text>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color.textoSecundario} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
              <Path d={expandida ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} />
            </Svg>
          </View>
        </View>
        <View style={{ height: 5, borderRadius: 3, backgroundColor: color.borde, marginTop: 8, marginBottom: 4, overflow: 'hidden' }}>
          <View style={{ width: `${Math.round((tomadas / tomas.length) * 100)}%`, height: 5, backgroundColor: color.primario }} />
        </View>
      </Pressable>

      {siguiente === undefined && !expandida ? (
        <Text style={{ color: color.primario, fontFamily: fuente.cuerpoSemi, fontSize: 14, paddingVertical: 12 }}>Ya tomaste todo por hoy.</Text>
      ) : null}
      {visibles.map((t, i) => (
        <Fila key={t.id} toma={t} primera={i === 0} alMarcar={alMarcar} alDeshacer={alDeshacer} />
      ))}
      {!expandida && tomas.length > 1 ? (
        <Pressable accessibilityRole="button" onPress={alternar} style={{ minHeight: 40, borderTopWidth: 1, borderTopColor: color.borde, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: color.primario, fontFamily: fuente.cuerpoBold, fontSize: 13 }}>Ver todas ({tomas.length})</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
