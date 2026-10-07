import { useEffect } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import { publicarBloqueo } from '@/shared/kernel/bloqueoDeApp';
import { limpiarColaDeEnvio } from '@/modules/consultas/presentation/colaDeEnvio';
import { useTema } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';

import { useCandado } from './CandadoProvider';
import { mensajeDeDesbloqueo } from './candadoPresentacion';
import { limpiarSaludPendiente } from './saludPendiente';
import { useSesion } from './SesionProvider';

/**
 * Pantalla de bloqueo (F036): una capa opaca sobre toda la app (no un `Modal`: presentarlo en el arranque, antes de que la app esté en
 * pantalla, falla y deja la app sin responder). Los `Modal` de la app (visor de foto) se esconden con `bloqueoDeApp`.
 * Mientras se lee si hay candado (`estado` null) solo tapa el contenido, sin mostrar nada.
 */
export function PantallaDeBloqueo() {
  const { color, fuente, espacio } = useTema();
  const { estado: estadoDeSesion, cerrarSesion } = useSesion();
  const { estado, bloqueada, ultimoResultado, desbloquear } = useCandado();
  const visible = estadoDeSesion === 'activa' && bloqueada;
  const mensaje = mensajeDeDesbloqueo(ultimoResultado);

  useEffect(() => {
    publicarBloqueo(visible);
    return () => publicarBloqueo(false);
  }, [visible]);

  function confirmarCierre() {
    Alert.alert('¿Cerrar sesión?', 'Tendrás que volver a entrar con Google. Lo que capturaste sin internet y no se envió se perderá.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          limpiarSaludPendiente();
          limpiarColaDeEnvio();
          await cerrarSesion();
        },
      },
    ]);
  }

  if (!visible) return null;

  return (
    <View accessibilityViewIsModal style={[StyleSheet.absoluteFill, { backgroundColor: color.fondo, zIndex: 1000, elevation: 1000 }]}>
      <SafeAreaView style={{ flex: 1, backgroundColor: color.fondo }}>
        {estado?.activado ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: espacio.xl, gap: 14 }}>
            <Svg width={56} height={56} viewBox="0 0 24 24" fill="none" stroke={color.primario} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <Rect x={4} y={10.5} width={16} height={10} rx={3} />
              <Path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
            </Svg>
            <Text accessibilityRole="header" style={{ color: color.texto, fontFamily: fuente.titulo, fontSize: 26, textAlign: 'center' }}>
              MediQ está bloqueada
            </Text>
            <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 15, textAlign: 'center' }}>
              Usa Face ID o tu huella para ver tus datos de salud.
            </Text>
            {mensaje ? (
              <Text accessibilityRole="alert" style={{ color: color.peligro, fontFamily: fuente.cuerpoSemi, fontSize: 14, textAlign: 'center' }}>
                {mensaje}
              </Text>
            ) : null}
            <View style={{ alignSelf: 'stretch', marginTop: 8 }}>
              <Button label="Desbloquear" onPress={() => void desbloquear()} />
            </View>
            <Pressable accessibilityRole="button" onPress={confirmarCierre} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 }}>
              <Text style={{ color: color.peligro, fontFamily: fuente.cuerpoSemi, fontSize: 14 }}>Cerrar sesión</Text>
            </Pressable>
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}
