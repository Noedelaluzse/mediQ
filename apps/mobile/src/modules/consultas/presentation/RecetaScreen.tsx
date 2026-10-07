import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { diagnostico } from '@/shared/kernel/diagnostico';
import { useCasoDeUso } from '@/app/ContainerContext';
import { useTema } from '@/shared/theme';

import { EsqueletoDeLaReceta } from './esqueletos';
import { MedicamentoFormulario } from './MedicamentoFormulario';
import { mensajeDeErrorDeConsulta } from './mensajes';
import { agregarFila, aEntradas, cambiarCampo, enFila, estadoDesdeReceta, filaNueva, quitarFila, type CampoDeTexto, type FilaDeMedicamento } from './receta';

/** Captura los medicamentos de la receta de una consulta (RF-31, CU-04). Con `consultaId` en la ruta. */
export function RecetaScreen() {
  const { color, fuente, radio } = useTema();
  const { consultaId } = useLocalSearchParams<{ consultaId: string }>();
  const obtenerReceta = useCasoDeUso('obtenerReceta');
  const guardarReceta = useCasoDeUso('guardarReceta');
  const solicitarPermisoDeAvisos = useCasoDeUso('solicitarPermisoDeAvisos');
  const sincronizarAvisosDeTomas = useCasoDeUso('sincronizarAvisosDeTomas');

  const [filas, setFilas] = useState<FilaDeMedicamento[]>([filaNueva()]);
  const [cargada, setCargada] = useState(false);
  const [falloAlCargar, setFalloAlCargar] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(() => {
    obtenerReceta.ejecutar(consultaId).then(
      (m) => {
        setFilas(estadoDesdeReceta(m));
        setCargada(true);
      },
      () => setFalloAlCargar(true),
    );
  }, [consultaId, obtenerReceta]);

  useEffect(cargar, [cargar]);

  const cambiar = (n: number, campo: CampoDeTexto, valor: string) => {
    setFilas((f) => cambiarCampo(f, n, campo, valor));
    setError(undefined);
  };

  /** Al activar el aviso de un medicamento se pide el permiso de notificaciones (si falta). Devuelve si se puede activar. */
  async function pedirPermisoDeAvisos(): Promise<boolean> {
    try {
      const permiso = await solicitarPermisoDeAvisos.ejecutar();
      if (permiso === 'concedido') return true;
      if (permiso === 'bloqueado') {
        Alert.alert('Avisos desactivados', 'Para que MediQ te avise a la hora de cada toma, activa las notificaciones en Ajustes.', [
          { text: 'Ahora no', style: 'cancel' },
          { text: 'Abrir Ajustes', onPress: () => void Linking.openSettings() },
        ]);
      } else {
        Alert.alert('Sin permiso para avisarte', 'Sin el permiso de notificaciones no podemos recordarte tus tomas.');
      }
    } catch (error) {
      diagnostico.advertir('no se pudo pedir el permiso de avisos', error);
    }
    return false;
  }

  async function guardar() {
    setOcupado(true);
    try {
      const r = await guardarReceta.ejecutar(consultaId, aEntradas(filas));
      if (r.ok) {
        // Los avisos de toma se ponen al día con la receta recién guardada; un fallo aquí nunca impide guardar.
        await sincronizarAvisosDeTomas.ejecutar().catch((error) => diagnostico.advertir('no se pudieron sincronizar los avisos de toma', error));
        return router.back();
      }
      setError(mensajeDeErrorDeConsulta(r.error));
    } catch {
      Alert.alert('No pudimos guardar la receta', 'Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.fondo }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28, gap: 20 }}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
            <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpoSemi, fontSize: 15 }}>Cancelar</Text>
          </Pressable>

          <Text accessibilityRole="header" style={{ color: color.texto, fontFamily: fuente.titulo, fontSize: 30, lineHeight: 34, letterSpacing: -0.5 }}>
            Receta
          </Text>
          <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 14, lineHeight: 20 }}>
            Anota el nombre y elige el resto de las listas. Para borrar la receta, quita todos los medicamentos y guarda.
          </Text>

          {!cargada && !falloAlCargar ? <EsqueletoDeLaReceta /> : null}

          {falloAlCargar ? (
            <View accessibilityRole="alert" style={{ gap: 10, alignItems: 'center', marginTop: 20 }}>
              <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 15, textAlign: 'center' }}>No pudimos cargar la receta. Revisa tu conexión.</Text>
              <Pressable accessibilityRole="button" onPress={() => {
                  setFalloAlCargar(false);
                  cargar();
                }} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ color: color.primario, fontFamily: fuente.cuerpoBold, fontSize: 15 }}>Reintentar</Text>
              </Pressable>
            </View>
          ) : null}

          {cargada ? filas.map((fila, n) => (
            <MedicamentoFormulario
              key={n}
              fila={fila}
              numero={n + 1}
              alCambiarTexto={(campo, valor) => cambiar(n, campo, valor)}
              alCambiarFila={(cambio) => {
                setFilas((f) => enFila(f, n, cambio));
                setError(undefined);
              }}
              alQuitar={() => setFilas((f) => quitarFila(f, n))}
              alActivarRecordatorio={pedirPermisoDeAvisos}
            />
          )) : null}

          {cargada ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setFilas(agregarFila)}
              style={{ height: 48, borderRadius: radio.md, borderWidth: 1, borderColor: color.bordeCampo, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: color.texto, fontFamily: fuente.cuerpoSemi, fontSize: 15 }}>+ Agregar otro medicamento</Text>
            </Pressable>
          ) : null}

          {error ? (
            <Text accessibilityRole="alert" style={{ color: color.peligro, fontFamily: fuente.cuerpoSemi, fontSize: 13 }}>
              {error}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: ocupado, disabled: ocupado || !cargada }}
            disabled={ocupado || !cargada}
            onPress={guardar}
            style={{ height: 54, borderRadius: 27, backgroundColor: color.primario, alignItems: 'center', justifyContent: 'center', opacity: ocupado || !cargada ? 0.6 : 1 }}>
            <Text style={{ color: color.sobrePrimario, fontFamily: fuente.cuerpoBold, fontSize: 16 }}>{ocupado ? 'Guardando…' : 'Guardar receta'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
