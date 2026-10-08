import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { useRecargaAlEnfocar } from '@/app/useRecargaAlEnfocar';
import { useCasoDeUso } from '@/app/ContainerContext';
import { useEdicion } from '@/app/useEdicion';
import { useTema } from '@/shared/theme';
import { AvisoSinConexion } from '@/shared/ui/AvisoSinConexion';
import { estaCargando } from '@/shared/ui/esqueleto';
import { EsqueletoDeFilas } from '@/shared/ui/Esqueletos';
import { TextField } from '@/shared/ui/TextField';

import type { LugarConConsultas } from '../application/ListarLugares';
import { detalleDeConsultas, mensajeDeError } from './mensajes';

/** "Mis lugares" (desde Perfil): corregir el nombre, agregar o quitar hospitales y consultorios. */
export function LugaresScreen() {
  const { color, fuente, radio } = useTema();
  const listarLugares = useCasoDeUso('listarLugares');
  const agregarLugar = useCasoDeUso('agregarLugar');
  const renombrarLugar = useCasoDeUso('renombrarLugar');
  const eliminarLugar = useCasoDeUso('eliminarLugar');
  const { puedeEditar, motivo: motivoSinInternet } = useEdicion();

  const [lugares, setLugares] = useState<LugarConConsultas[] | null>(null);
  const [fallo, setFallo] = useState(false);
  const [agregando, setAgregando] = useState(false);
  const [nuevo, setNuevo] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [borrador, setBorrador] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(() => {
    return listarLugares.ejecutar().then(
      (l) => {
        setLugares(l);
        setFallo(false);
        return true;
      },
      () => {
        setFallo(true);
        return false;
      },
    );
  }, [listarLugares]);

  useRecargaAlEnfocar(cargar, 'Lugares');

  /** Ejecuta una acción; si el dominio la rechaza muestra el motivo, si sale bien recarga la lista. */
  async function ejecutar(accion: () => Promise<{ ok: true } | { ok: false; error: Error }>, alTerminar: () => void) {
    setOcupado(true);
    try {
      const r = await accion();
      if (!r.ok) return setError(mensajeDeError(r.error));
      setError(undefined);
      alTerminar();
      cargar();
    } catch {
      Alert.alert('No pudimos completar la acción', mensajeDeError(new Error()));
    } finally {
      setOcupado(false);
    }
  }

  const abrirAlta = () => {
    setAgregando(true);
    setEditandoId(null);
    setError(undefined);
  };
  const cerrarAlta = () => {
    setAgregando(false);
    setNuevo('');
    setError(undefined);
  };
  const abrirEdicion = (l: LugarConConsultas) => {
    setEditandoId(l.lugar.id);
    setBorrador(l.lugar.nombre);
    setAgregando(false);
    setError(undefined);
  };
  const cerrarEdicion = () => {
    setEditandoId(null);
    setError(undefined);
  };

  const guardarNuevo = () =>
    ejecutar(async () => {
      const r = await agregarLugar.ejecutar(nuevo);
      return r.ok ? { ok: true } : r;
    }, cerrarAlta);

  const guardarEdicion = (id: string) => ejecutar(() => renombrarLugar.ejecutar(id, borrador), cerrarEdicion);

  function confirmarEliminar(l: LugarConConsultas) {
    Alert.alert(
      `¿Eliminar "${l.lugar.nombre}"?`,
      l.consultas === 0 ? 'Este lugar no tiene consultas.' : 'Tus consultas se conservan, pero quedan sin lugar.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => ejecutar(() => eliminarLugar.ejecutar(l.lugar.id), cerrarEdicion) },
      ],
    );
  }

  const tarjeta = { backgroundColor: color.superficie, borderRadius: radio.lg } as const;
  const botonSecundario = {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: color.bordeCampo,
    backgroundColor: color.superficie,
    alignItems: 'center',
    justifyContent: 'center',
  } as const;
  const botonPrimario = { ...botonSecundario, paddingHorizontal: 18, borderWidth: 0, backgroundColor: color.primario, opacity: ocupado ? 0.6 : 1 } as const;
  const textoSecundario = { color: color.texto, fontFamily: fuente.cuerpoSemi, fontSize: 14 } as const;
  const textoPrimario = { color: color.sobrePrimario, fontFamily: fuente.cuerpoBold, fontSize: 14 } as const;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.fondo }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28, gap: 18 }}>
          <AvisoSinConexion motivo={motivoSinInternet} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Volver al perfil"
              onPress={() => router.back()}
              style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: color.borde, backgroundColor: color.superficie, alignItems: 'center', justifyContent: 'center' }}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color.texto} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M15 5l-7 7 7 7" />
              </Svg>
            </Pressable>
            <Text accessibilityRole="header" style={{ flex: 1, color: color.texto, fontFamily: fuente.titulo, fontSize: 26, lineHeight: 30, letterSpacing: -0.4 }}>
              Mis lugares
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Agregar lugar"
              accessibilityState={{ disabled: !puedeEditar }}
              disabled={!puedeEditar}
              onPress={abrirAlta}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color.texto, alignItems: 'center', justifyContent: 'center', opacity: puedeEditar ? 1 : 0.45 }}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color.sobrePrimario} strokeWidth={2.4} strokeLinecap="round">
                <Path d="M12 5v14M5 12h14" />
              </Svg>
            </Pressable>
          </View>

          <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 14, lineHeight: 20 }}>
            Hospitales, clínicas y consultorios donde te han atendido. Se guardan solos al registrar una consulta; aquí puedes corregir el nombre o quitarlos.
          </Text>

          {agregando ? (
            <View style={{ ...tarjeta, borderWidth: 1, borderColor: color.primario, padding: 16, gap: 10 }}>
              <TextField
                label="Nombre del lugar"
                placeholder="Ej. Hospital Morelos, Consultorio Similares"
                value={nuevo}
                onChangeText={(t) => {
                  setNuevo(t);
                  setError(undefined);
                }}
                error={error}
                autoFocus
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable accessibilityRole="button" disabled={ocupado || !puedeEditar} onPress={guardarNuevo} style={{ ...botonPrimario, opacity: puedeEditar ? 1 : 0.45 }}>
                  <Text style={textoPrimario}>Agregar</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={cerrarAlta} style={botonSecundario}>
                  <Text style={textoSecundario}>Cancelar</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {estaCargando(lugares, fallo) ? <EsqueletoDeFilas cantidad={4} etiqueta="Cargando tus lugares" /> : null}

          {fallo ? (
            <View accessibilityRole="alert" style={{ gap: 10, alignItems: 'center', marginTop: 30 }}>
              <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 15, textAlign: 'center' }}>
                No pudimos cargar tus lugares. Revisa tu conexión.
              </Text>
              <Pressable accessibilityRole="button" onPress={cargar} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ color: color.primario, fontFamily: fuente.cuerpoBold, fontSize: 15 }}>Reintentar</Text>
              </Pressable>
            </View>
          ) : null}

          {lugares && lugares.length === 0 && !agregando ? (
            <View style={{ ...tarjeta, borderWidth: 1, borderStyle: 'dashed', borderColor: color.bordeVacio, paddingVertical: 24, paddingHorizontal: 16, alignItems: 'center', gap: 6 }}>
              <Text style={{ color: color.texto, fontFamily: fuente.cuerpoSemi, fontSize: 16 }}>Aún no tienes lugares</Text>
              <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 14, lineHeight: 20, textAlign: 'center' }}>
                Aparecerán aquí cuando registres tu primera consulta.
              </Text>
            </View>
          ) : null}

          <View style={{ gap: 10 }}>
            {lugares?.map((l) => (
              <View key={l.lugar.id} style={{ ...tarjeta, borderWidth: 1, borderColor: color.borde, paddingVertical: 12, paddingHorizontal: 16, gap: 10 }}>
                {editandoId === l.lugar.id ? (
                  <View style={{ gap: 10 }}>
                    <TextField
                      label="Nombre del lugar"
                      value={borrador}
                      onChangeText={(t) => {
                        setBorrador(t);
                        setError(undefined);
                      }}
                      error={error}
                      autoFocus
                    />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Pressable accessibilityRole="button" disabled={ocupado || !puedeEditar} onPress={() => guardarEdicion(l.lugar.id)} style={{ ...botonPrimario, opacity: puedeEditar ? 1 : 0.45 }}>
                        <Text style={textoPrimario}>Guardar</Text>
                      </Pressable>
                      <Pressable accessibilityRole="button" onPress={cerrarEdicion} style={botonSecundario}>
                        <Text style={textoSecundario}>Cancelar</Text>
                      </Pressable>
                      <Pressable accessibilityRole="button" disabled={ocupado || !puedeEditar} onPress={() => confirmarEliminar(l)} style={{ marginLeft: 'auto', minHeight: 44, paddingHorizontal: 8, justifyContent: 'center', opacity: puedeEditar ? 1 : 0.45 }}>
                        <Text style={{ color: color.peligro, fontFamily: fuente.cuerpoSemi, fontSize: 14 }}>Eliminar</Text>
                      </Pressable>
                    </View>
                    <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 13, lineHeight: 19 }}>
                      {l.consultas === 0 ? 'Este lugar no tiene consultas.' : 'Si lo eliminas, tus consultas se conservan pero quedan sin lugar.'}
                    </Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: color.primarioSuave, alignItems: 'center', justifyContent: 'center' }}>
                      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color.primario} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <Path d="M4 21V7l8-4 8 4v14" />
                        <Path d="M12 10v5M9.5 12.5h5M9 21v-3h6v3" />
                      </Svg>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ color: color.texto, fontFamily: fuente.cuerpoSemi, fontSize: 16 }}>{l.lugar.nombre}</Text>
                      <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 13 }}>{detalleDeConsultas(l.consultas)}</Text>
                    </View>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${l.lugar.nombre}`} accessibilityState={{ disabled: !puedeEditar }} disabled={!puedeEditar} onPress={() => abrirEdicion(l)} style={{ ...botonSecundario, opacity: puedeEditar ? 1 : 0.45 }}>
                      <Text style={textoSecundario}>Editar</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
