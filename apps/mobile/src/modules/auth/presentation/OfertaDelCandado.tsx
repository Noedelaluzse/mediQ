import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { useTema } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';

import { useCandado } from './CandadoProvider';
import { mensajeDeActivacion } from './candadoPresentacion';
import { ofertaDelCandado } from '../domain/Candado';
import { useSesion } from './SesionProvider';

/** Tras iniciar sesión, una sola vez: «¿Quieres usar Face ID?». «Ahora no» no vuelve a preguntar; se cambia cuando se quiera en el Perfil. */
export function OfertaDelCandado() {
  const { color, fuente, radio, espacio } = useTema();
  const { estado: estadoDeSesion } = useSesion();
  const { estado, bloqueada, activar, desactivar } = useCandado();
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const visible = estadoDeSesion === 'activa' && !bloqueada && estado !== null && ofertaDelCandado(estado, estado.disponibilidad);

  async function aceptar() {
    setOcupado(true);
    try {
      setMensaje(mensajeDeActivacion(await activar()));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => void desactivar()}>
      <View style={{ flex: 1, backgroundColor: color.velo, alignItems: 'center', justifyContent: 'center', padding: espacio.xl }}>
        <View style={{ alignSelf: 'stretch', backgroundColor: color.superficie, borderRadius: radio.lg, padding: espacio.xl, gap: 12 }}>
          <Text accessibilityRole="header" style={{ color: color.texto, fontFamily: fuente.titulo, fontSize: 22 }}>
            ¿Quieres usar Face ID?
          </Text>
          <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 15 }}>
            Así tus datos de salud quedan protegidos: al abrir MediQ te pedimos Face ID o tu huella en lugar de que cualquiera con tu teléfono desbloqueado vea tus recetas.
            Puedes activarlo o desactivarlo cuando quieras en tu Perfil.
          </Text>
          {mensaje ? (
            <Text accessibilityRole="alert" style={{ color: color.peligro, fontFamily: fuente.cuerpoSemi, fontSize: 14 }}>
              {mensaje}
            </Text>
          ) : null}
          <Button label={ocupado ? 'Verificando…' : 'Activar Face ID'} onPress={ocupado ? undefined : () => void aceptar()} />
          <Pressable accessibilityRole="button" onPress={() => void desactivar()} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: color.primario, fontFamily: fuente.cuerpoBold, fontSize: 15 }}>Ahora no</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
