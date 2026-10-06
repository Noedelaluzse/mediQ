import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { useCasoDeUso } from '@/app/ContainerContext';
import { useTema } from '@/shared/theme';
import { estaCargando } from '@/shared/ui/esqueleto';
import { EsqueletoDeTarjetasConAvatar } from '@/shared/ui/Esqueletos';
import { iniciales } from '@/shared/ui/iniciales';
import { TextField } from '@/shared/ui/TextField';

import type { MedicoParaElegir } from '../application/BuscarMedicosParaElegir';
import { coincideConBusqueda } from '../domain/busqueda';
import { nombreDeEspecialidad } from '../domain/Medico';
import { seleccionDeMedico } from './seleccionDeMedico';

/** "Elegir médico" (HU-08): se abre desde la consulta nueva; al elegir, devuelve los datos a rellenar. */
export function MedicosElegirScreen() {
  const { color, fuente, radio } = useTema();
  const buscar = useCasoDeUso('buscarMedicosParaElegir');
  const elegirGuardado = useCasoDeUso('elegirMedicoGuardado');
  const [todos, setTodos] = useState<MedicoParaElegir[] | null>(null);
  const [fallo, setFallo] = useState(false);
  const [texto, setTexto] = useState('');

  const cargar = useCallback(() => {
    buscar.ejecutar('').then(
      (m) => {
        setTodos(m);
        setFallo(false);
      },
      () => setFallo(true),
    );
  }, [buscar]);

  useFocusEffect(cargar);

  // Se carga una sola vez y se filtra en el teléfono: escribir no vuelve a leer la nube.
  const visibles = useMemo(() => todos?.filter((m) => coincideConBusqueda(m.medico, texto)) ?? [], [todos, texto]);

  async function elegir(id: string) {
    try {
      const datos = await elegirGuardado.ejecutar(id);
      if (!datos) return cargar();
      seleccionDeMedico.elegir(datos);
      if (router.canGoBack()) router.back();
    } catch {
      Alert.alert('No pudimos elegir al médico', 'Revisa tu conexión e inténtalo de nuevo.');
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.fondo }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28, gap: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Volver a la consulta"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: color.borde, backgroundColor: color.superficie, alignItems: 'center', justifyContent: 'center' }}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color.texto} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M15 5l-7 7 7 7" />
              </Svg>
            </Pressable>
            <Text accessibilityRole="header" style={{ color: color.texto, fontFamily: fuente.titulo, fontSize: 26, lineHeight: 30, letterSpacing: -0.4 }}>
              Elegir médico
            </Text>
          </View>

          <TextField
            label="Buscar por nombre o especialidad"
            placeholder="Ej. Solís, cardiología"
            value={texto}
            onChangeText={setTexto}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
          />

          {estaCargando(todos, fallo) ? <EsqueletoDeTarjetasConAvatar cantidad={3} etiqueta="Cargando tus médicos" /> : null}

          {fallo ? (
            <View accessibilityRole="alert" style={{ gap: 10, alignItems: 'center', marginTop: 30 }}>
              <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 15, textAlign: 'center' }}>
                No pudimos cargar tus médicos. Revisa tu conexión.
              </Text>
              <Pressable accessibilityRole="button" onPress={cargar} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ color: color.primario, fontFamily: fuente.cuerpoBold, fontSize: 15 }}>Reintentar</Text>
              </Pressable>
            </View>
          ) : null}

          {todos && visibles.length === 0 ? (
            <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 20 }}>
              {todos.length === 0 ? 'Aún no tienes médicos guardados.' : 'No encontramos médicos con esa búsqueda.'}
            </Text>
          ) : null}

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12 }} style={{ flex: 1 }}>
            {visibles.map(({ medico: m, lugares }) => (
              <Pressable
                key={m.id}
                accessibilityRole="button"
                accessibilityLabel={`Elegir a ${m.nombreCompleto}`}
                onPress={() => elegir(m.id)}
                style={{
                  backgroundColor: color.superficie,
                  borderColor: color.borde,
                  borderWidth: 1,
                  borderRadius: radio.lg,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: color.primarioSuave, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: color.primario, fontFamily: fuente.titulo, fontSize: 18 }}>{iniciales(m.nombreCompleto)}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: color.texto, fontFamily: fuente.cuerpoSemi, fontSize: 16 }}>{m.nombreCompleto}</Text>
                  <Text style={{ color: color.primario, fontFamily: fuente.cuerpoSemi, fontSize: 13 }}>{nombreDeEspecialidad(m.especialidad)}</Text>
                  {lugares.length > 0 ? (
                    <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 13 }}>{lugares.join(' · ')}</Text>
                  ) : null}
                </View>
                <Text style={{ color: color.primario, fontFamily: fuente.cuerpoBold, fontSize: 14 }}>Elegir</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/medico')}
            style={{ height: 54, borderRadius: 27, borderWidth: 1, borderStyle: 'dashed', borderColor: color.bordeVacio, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color.texto} strokeWidth={2.4} strokeLinecap="round">
              <Path d="M12 5v14M5 12h14" />
            </Svg>
            <Text style={{ color: color.texto, fontFamily: fuente.cuerpoSemi, fontSize: 15 }}>No está en la lista: agregar médico</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
