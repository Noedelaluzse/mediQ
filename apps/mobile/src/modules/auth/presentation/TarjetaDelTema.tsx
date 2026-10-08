import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useEleccionDeTema, useTema, type PreferenciaDeTema } from '@/shared/theme';

const OPCIONES: { valor: PreferenciaDeTema; texto: string }[] = [
  { valor: 'automatico', texto: 'Automático' },
  { valor: 'claro', texto: 'Claro' },
  { valor: 'oscuro', texto: 'Oscuro' },
];

const EXPLICACION: Record<PreferenciaDeTema, string> = {
  automatico: 'Sigue el modo de tu teléfono',
  claro: 'Siempre con fondo claro',
  oscuro: 'Siempre con fondo oscuro',
};

/** Fila del Perfil para elegir el aspecto de la app: Automático (como el teléfono), Claro u Oscuro. Se guarda en el teléfono. */
export function TarjetaDelTema() {
  const { color, fuente, radio, espacio } = useTema();
  const { preferencia, cambiar } = useEleccionDeTema();

  return (
    <View
      style={{
        backgroundColor: color.superficie,
        borderColor: color.borde,
        borderWidth: 1,
        borderRadius: radio.lg,
        paddingHorizontal: espacio.lg,
        paddingVertical: espacio.md,
        gap: espacio.md,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color.primarioSuave, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color.primario} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />
          </Svg>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: color.texto, fontFamily: fuente.cuerpoMedio, fontSize: 15 }}>Aspecto</Text>
          <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 13 }}>{EXPLICACION[preferencia]}</Text>
        </View>
      </View>
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: espacio.sm }}>
        {OPCIONES.map((o) => {
          const activa = o.valor === preferencia;
          return (
            <Pressable
              key={o.valor}
              accessibilityRole="radio"
              accessibilityState={{ selected: activa }}
              onPress={() => cambiar(o.valor)}
              style={{
                flex: 1,
                minHeight: 44,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radio.pill,
                borderWidth: 1,
                borderColor: activa ? color.primario : color.bordeCampo,
                backgroundColor: activa ? color.primario : color.superficie,
              }}>
              <Text style={{ color: activa ? color.sobrePrimario : color.texto, fontFamily: fuente.cuerpoSemi, fontSize: 14 }}>{o.texto}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
