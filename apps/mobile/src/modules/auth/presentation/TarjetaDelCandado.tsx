import { useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTema } from '@/shared/theme';

import { useCandado } from './CandadoProvider';
import { filaDelCandado, mensajeDeActivacion } from './candadoPresentacion';

/** Fila del Perfil para activar o apagar el candado con Face ID / huella (F036): ícono, explicación de una línea e interruptor. */
export function TarjetaDelCandado() {
  const { color, fuente, radio, espacio } = useTema();
  const { estado, activar, desactivar } = useCandado();
  const [ocupado, setOcupado] = useState(false);
  if (estado === null) return null;
  const fila = filaDelCandado(estado);

  async function cambiar(encender: boolean) {
    setOcupado(true);
    try {
      if (!encender) {
        await desactivar();
        return;
      }
      const mensaje = mensajeDeActivacion(await activar());
      if (mensaje) Alert.alert('Candado con Face ID', mensaje);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <View
      style={{
        backgroundColor: color.superficie,
        borderColor: color.borde,
        borderWidth: 1,
        borderRadius: radio.lg,
        paddingHorizontal: espacio.lg,
        paddingVertical: espacio.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
      }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color.primarioSuave, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color.primario} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
          <Path d="M9 10v1.5M15 10v1.5M12 10v3.5h-1M9 16.2c1.6 1.2 4.4 1.2 6 0" />
        </Svg>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: color.texto, fontFamily: fuente.cuerpoMedio, fontSize: 15 }}>Face ID o huella</Text>
        <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 13 }}>{fila.subtitulo}</Text>
      </View>
      <Switch
        accessibilityLabel="Candado con Face ID o huella"
        value={fila.encendido}
        disabled={!fila.habilitado || ocupado}
        onValueChange={(valor) => void cambiar(valor)}
        trackColor={{ false: color.borde, true: color.primario }}
        style={{ alignSelf: 'center' }}
      />
    </View>
  );
}
