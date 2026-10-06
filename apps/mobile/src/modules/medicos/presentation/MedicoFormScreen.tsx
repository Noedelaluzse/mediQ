import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCasoDeUso } from '@/app/ContainerContext';
import { useTema } from '@/shared/theme';
import { FormularioCargando } from '@/shared/ui/FormularioCargando';
import { SelectField } from '@/shared/ui/SelectField';
import { TextField } from '@/shared/ui/TextField';

import { ESPECIALIDAD_POR_DEFECTO, ESPECIALIDADES } from '../domain/Medico';
import { mensajeDeError } from './mensajes';

const OPCIONES = ESPECIALIDADES.map((e) => ({ valor: e.slug, etiqueta: e.nombre }));

/** Formulario para agregar o editar un médico (RF-20). Con `id` en la ruta, edita. */
export function MedicoFormScreen() {
  const { color, fuente } = useTema();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const obtenerMedico = useCasoDeUso('obtenerMedico');
  const guardarMedico = useCasoDeUso('guardarMedico');
  const eliminarMedico = useCasoDeUso('eliminarMedico');

  const esEditar = Boolean(id);
  const [nombre, setNombre] = useState('');
  const [especialidad, setEspecialidad] = useState<string>(ESPECIALIDAD_POR_DEFECTO);
  const [telefono, setTelefono] = useState('');
  const [cedula, setCedula] = useState('');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [ocupado, setOcupado] = useState(false);
  const [cargado, setCargado] = useState(!id);

  useEffect(() => {
    if (!id) return;
    obtenerMedico.ejecutar(id).then((m) => {
      if (!m) return router.back();
      setNombre(m.nombreCompleto);
      setEspecialidad(m.especialidad);
      setTelefono(m.telefono ?? '');
      setCedula(m.cedula ?? '');
      setNotas(m.notas ?? '');
      setCargado(true);
    }, () => Alert.alert('No pudimos cargar al médico', 'Revisa tu conexión e inténtalo de nuevo.'));
  }, [id, obtenerMedico]);

  async function guardar() {
    setOcupado(true);
    try {
      const r = await guardarMedico.ejecutar({ id, nombre, especialidad, telefono, cedula, notas });
      if (r.ok) return router.back();
      setError(mensajeDeError(r.error));
    } catch {
      Alert.alert('No pudimos guardar', mensajeDeError(new Error()));
    } finally {
      setOcupado(false);
    }
  }

  function confirmarEliminar() {
    if (!id) return;
    Alert.alert('¿Eliminar este médico?', 'Dejará de aparecer en tu lista.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          setOcupado(true);
          try {
            const r = await eliminarMedico.ejecutar(id);
            if (r.ok) return router.back();
            Alert.alert('No se puede eliminar', mensajeDeError(r.error));
          } catch {
            Alert.alert('No pudimos eliminar', mensajeDeError(new Error()));
          } finally {
            setOcupado(false);
          }
        },
      },
    ]);
  }

  // Editando: mientras llega el médico guardado no se muestra un formulario vacío.
  if (esEditar && !cargado) return <FormularioCargando titulo="Editar médico" campos={5} etiqueta="Cargando al médico" />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.fondo }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28, gap: 20 }}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
            <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpoSemi, fontSize: 15 }}>Cancelar</Text>
          </Pressable>

          <Text accessibilityRole="header" style={{ color: color.texto, fontFamily: fuente.titulo, fontSize: 30, lineHeight: 34, letterSpacing: -0.5 }}>
            {esEditar ? 'Editar médico' : 'Nuevo médico'}
          </Text>

          <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 14, lineHeight: 20 }}>
            El hospital o consultorio se registra en cada consulta, porque un médico puede atender en varios lugares.
          </Text>

          <TextField
            label="Nombre (obligatorio)"
            placeholder="Dra. / Dr."
            value={nombre}
            onChangeText={(t) => {
              setNombre(t);
              setError(undefined);
            }}
            error={error}
            autoCapitalize="words"
          />

          <SelectField label="Especialidad" valor={especialidad} opciones={OPCIONES} onChange={setEspecialidad} />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <TextField label="Teléfono" placeholder="10 dígitos" value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label="Cédula (opcional)" placeholder="Núm. cédula" value={cedula} onChangeText={setCedula} />
            </View>
          </View>

          <TextField
            label="Notas (opcional)"
            placeholder="Horarios, cómo agendar, con quién preguntar…"
            value={notas}
            onChangeText={setNotas}
            multiline
          />

          <View style={{ marginTop: 'auto', alignItems: 'center', gap: 6 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: ocupado, disabled: ocupado }}
              disabled={ocupado}
              onPress={guardar}
              style={{ alignSelf: 'stretch', height: 54, borderRadius: 27, backgroundColor: color.primario, alignItems: 'center', justifyContent: 'center', opacity: ocupado ? 0.6 : 1 }}>
              <Text style={{ color: color.sobrePrimario, fontFamily: fuente.cuerpoBold, fontSize: 16 }}>
                {ocupado ? 'Guardando…' : esEditar ? 'Guardar cambios' : 'Guardar médico'}
              </Text>
            </Pressable>
            {esEditar ? (
              <Pressable accessibilityRole="button" disabled={ocupado} onPress={confirmarEliminar} style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' }}>
                <Text style={{ color: color.peligro, fontFamily: fuente.cuerpoSemi, fontSize: 14 }}>Eliminar médico</Text>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
