import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { useTema } from '@/shared/theme';

import { useCandado } from './CandadoProvider';
import { filaDelCandado, mensajeDeActivacion } from './candadoPresentacion';

/** Fila del Perfil para activar o desactivar el candado con Face ID / huella (F036). */
export function TarjetaDelCandado() {
  const { color, fuente, radio, espacio } = useTema();
  const { estado, activar, desactivar } = useCandado();
  const [ocupado, setOcupado] = useState(false);
  if (estado === null) return null;
  const fila = filaDelCandado(estado);

  async function pulsar() {
    setOcupado(true);
    try {
      if (fila.boton === 'Desactivar') {
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
    <View style={{ backgroundColor: color.superficie, borderColor: color.borde, borderWidth: 1, borderRadius: radio.lg, padding: espacio.lg, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: color.texto, fontFamily: fuente.cuerpoMedio, fontSize: 15 }}>Candado con Face ID o huella</Text>
          <Text style={{ color: fila.boton === null ? color.textoSecundario : estado.activado ? color.primario : color.textoSecundario, fontFamily: fuente.cuerpoSemi, fontSize: 13 }}>{fila.estado}</Text>
        </View>
        {fila.boton ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${fila.boton} el candado con Face ID o huella`}
            disabled={ocupado}
            onPress={() => void pulsar()}
            style={({ pressed }) => ({
              minHeight: 44,
              paddingHorizontal: 18,
              borderRadius: radio.pill,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: fila.boton === 'Activar' ? color.primario : color.superficie,
              borderWidth: fila.boton === 'Activar' ? 0 : 1,
              borderColor: color.texto,
              opacity: pressed || ocupado ? 0.7 : 1,
            })}>
            <Text style={{ color: fila.boton === 'Activar' ? color.sobrePrimario : color.texto, fontFamily: fuente.cuerpoBold, fontSize: 14 }}>{fila.boton}</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 13 }}>
        {fila.nota ?? 'Al abrir MediQ te pedimos Face ID o tu huella; al volver de otra app, solo si pasó más de un minuto.'}
      </Text>
    </View>
  );
}
