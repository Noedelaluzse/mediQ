import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCasoDeUso } from '@/app/ContainerContext';
import { useTema } from '@/shared/theme';
import { TextField } from '@/shared/ui/TextField';

import { mensajeDeErrorDeConsulta } from './mensajes';
import { agregarFila, aEntradas, cambiarCampo, estadoDesdeReceta, filaVacia, quitarFila, type CampoDeMedicamento, type FilaDeMedicamento } from './receta';

/** Captura los medicamentos de la receta de una consulta (RF-31, CU-04). Con `consultaId` en la ruta. */
export function RecetaScreen() {
  const { color, fuente, radio } = useTema();
  const { consultaId } = useLocalSearchParams<{ consultaId: string }>();
  const obtenerReceta = useCasoDeUso('obtenerReceta');
  const guardarReceta = useCasoDeUso('guardarReceta');

  const [filas, setFilas] = useState<FilaDeMedicamento[]>([filaVacia()]);
  const [cargada, setCargada] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    obtenerReceta.ejecutar(consultaId).then(
      (m) => {
        setFilas(estadoDesdeReceta(m));
        setCargada(true);
      },
      () => Alert.alert('No pudimos cargar la receta', 'Revisa tu conexión e inténtalo de nuevo.'),
    );
  }, [consultaId, obtenerReceta]);

  const cambiar = (n: number, campo: CampoDeMedicamento, valor: string) => {
    setFilas((f) => cambiarCampo(f, n, campo, valor));
    setError(undefined);
  };

  async function guardar() {
    setOcupado(true);
    try {
      const r = await guardarReceta.ejecutar(consultaId, aEntradas(filas));
      if (r.ok) return router.back();
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
            Anota cada medicamento. Solo el nombre es obligatorio. Para borrar la receta, quita todos los medicamentos y guarda.
          </Text>

          {filas.map((fila, n) => (
            <View key={n} style={{ backgroundColor: color.superficie, borderColor: color.borde, borderWidth: 1, borderRadius: radio.lg, padding: 16, gap: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpoBold, fontSize: 13, letterSpacing: 0.8, textTransform: 'uppercase' }}>Medicamento {n + 1}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel={`Quitar medicamento ${n + 1}`} onPress={() => setFilas((f) => quitarFila(f, n))} style={{ minHeight: 44, justifyContent: 'center' }}>
                  <Text style={{ color: color.peligro, fontFamily: fuente.cuerpoSemi, fontSize: 14 }}>Quitar</Text>
                </Pressable>
              </View>
              <TextField label="Nombre (obligatorio)" placeholder="Ej. Losartán" value={fila.nombre} onChangeText={(t) => cambiar(n, 'nombre', t)} autoCapitalize="sentences" />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <TextField label="Dosis" placeholder="50 mg" value={fila.dosis} onChangeText={(t) => cambiar(n, 'dosis', t)} />
                </View>
                <View style={{ flex: 1 }}>
                  <TextField label="Vía" placeholder="Oral" value={fila.via} onChangeText={(t) => cambiar(n, 'via', t)} />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <TextField label="Frecuencia" placeholder="Cada 8 horas" value={fila.frecuencia} onChangeText={(t) => cambiar(n, 'frecuencia', t)} />
                </View>
                <View style={{ flex: 1 }}>
                  <TextField label="Duración" placeholder="7 días" value={fila.duracion} onChangeText={(t) => cambiar(n, 'duracion', t)} />
                </View>
              </View>
              <TextField label="Indicaciones" placeholder="Con alimentos, evitar alcohol…" value={fila.indicaciones} onChangeText={(t) => cambiar(n, 'indicaciones', t)} multiline />
            </View>
          ))}

          <Pressable
            accessibilityRole="button"
            onPress={() => setFilas(agregarFila)}
            style={{ height: 48, borderRadius: radio.md, borderWidth: 1, borderColor: color.bordeCampo, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: color.texto, fontFamily: fuente.cuerpoSemi, fontSize: 15 }}>+ Agregar otro medicamento</Text>
          </Pressable>

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
