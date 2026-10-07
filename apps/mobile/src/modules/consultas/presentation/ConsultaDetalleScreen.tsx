import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import { useCasoDeUso } from '@/app/ContainerContext';
import { useEdicion } from '@/app/useEdicion';
import { fechaDeHoy, horaCorta } from '@/shared/kernel/fechas';
import { useTema } from '@/shared/theme';
import { AvisoSinConexion } from '@/shared/ui/AvisoSinConexion';
import { estaCargando } from '@/shared/ui/esqueleto';
import { iniciales } from '@/shared/ui/iniciales';

import type { Medicamento } from '../domain/Receta';
import type { DetalleDeConsulta } from '../application/ObtenerDetalleDeConsulta';
import { resumenDeIndicaciones } from '../domain/Indicacion';
import { confirmacionDeEliminar, conIndicacionAlternada, conIndicacionQuitada, datosDelEncabezado, lineaDelLugar, textoDelModoDeIndicaciones } from './detalleDeConsulta';
import { FotoDeRecetaSeccion } from './FotoDeRecetaSeccion';
import { mensajeDeErrorDeConsulta } from './mensajes';
import { EsqueletoDelDetalleDeConsulta, EsqueletoDeLaSeccionDeReceta } from './esqueletos';
import { resumenDelMedicamento } from './receta';

/** Detalle de la consulta (RF-13, CU-05) con la lista de indicaciones marcable (RF-15). */
export function ConsultaDetalleScreen() {
  const { color, fuente, radio } = useTema();
  const { id } = useLocalSearchParams<{ id: string }>();
  const obtenerDetalle = useCasoDeUso('obtenerDetalleDeConsulta');
  const alternarIndicacion = useCasoDeUso('alternarIndicacion');
  const agregarIndicacion = useCasoDeUso('agregarIndicacion');
  const quitarIndicacion = useCasoDeUso('quitarIndicacion');
  const eliminarConsulta = useCasoDeUso('eliminarConsulta');
  const obtenerReceta = useCasoDeUso('obtenerReceta');
  // Sin internet no se edita (F032): las opciones de editar se desactivan y la franja de arriba explica por qué.
  const { puedeEditar, motivo: motivoSinInternet } = useEdicion();

  const [detalle, setDetalle] = useState<DetalleDeConsulta | null>(null);
  // null = todavía cargando (se muestra un esqueleto en vez de «Agregar receta», que luego cambiaría a «Editar receta»).
  const [receta, setReceta] = useState<Medicamento[] | null>(null);
  const [fallo, setFallo] = useState(false);
  const [nueva, setNueva] = useState('');
  // Modo «Editar» de las indicaciones: en él se quitan (las casillas se apagan para no marcar sin querer).
  const [editandoIndicaciones, setEditandoIndicaciones] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [errorDeIndicacion, setErrorDeIndicacion] = useState<string | undefined>();

  const cargar = useCallback(() => {
    obtenerDetalle.ejecutar(id).then(
      (d) => {
        // Si la consulta ya no existe se vuelve al diario.
        if (!d) return router.back();
        setDetalle(d);
        setFallo(false);
        // La receta es secundaria: si falla, el detalle se muestra igual sin ella.
        obtenerReceta.ejecutar(id).then(setReceta, () => setReceta([]));
      },
      () => setFallo(true),
    );
  }, [id, obtenerDetalle, obtenerReceta]);

  useFocusEffect(cargar);

  /** Marca o desmarca al instante y lo guarda; si falla, se vuelve a cargar lo real. */
  async function alternar(indicacionId: string) {
    setDetalle((d) => (d ? { ...d, indicaciones: conIndicacionAlternada(d.indicaciones, indicacionId, new Date()) } : d));
    try {
      const r = await alternarIndicacion.ejecutar(id, indicacionId);
      if (!r.ok) cargar();
    } catch {
      cargar();
      Alert.alert('No pudimos guardar el cambio', 'Revisa tu conexión e inténtalo de nuevo.');
    }
  }

  /** Quita la indicación al instante y lo guarda; si falla, se vuelve a cargar lo real. */
  async function quitar(indicacionId: string) {
    setDetalle((d) => (d ? { ...d, indicaciones: conIndicacionQuitada(d.indicaciones, indicacionId) } : d));
    try {
      await quitarIndicacion.ejecutar(id, indicacionId);
    } catch {
      cargar();
      Alert.alert('No pudimos quitar la indicación', 'Revisa tu conexión e inténtalo de nuevo.');
    }
  }

  /** El botón del final del detalle: confirma y elimina la consulta (con sus recordatorios) y vuelve al diario. */
  function confirmarEliminar() {
    const t = confirmacionDeEliminar();
    Alert.alert(t.titulo, t.mensaje, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: t.boton,
        style: 'destructive',
        onPress: async () => {
          setEliminando(true);
          try {
            const r = await eliminarConsulta.ejecutar(id);
            if (r.ok) return router.back();
            Alert.alert('No pudimos eliminar la consulta', 'Ya no existe o no es tuya.');
          } catch {
            Alert.alert('No pudimos eliminar la consulta', mensajeDeErrorDeConsulta(new Error()));
          } finally {
            setEliminando(false);
          }
        },
      },
    ]);
  }

  async function agregar() {
    const texto = nueva.trim();
    if (!texto) return;
    try {
      const r = await agregarIndicacion.ejecutar(id, texto);
      if (!r.ok) return setErrorDeIndicacion(mensajeDeErrorDeConsulta(r.error));
      setErrorDeIndicacion(undefined);
      setNueva('');
      setDetalle((d) => (d ? { ...d, indicaciones: [...d.indicaciones, r.value] } : d));
    } catch {
      Alert.alert('No pudimos agregar la indicación', 'Revisa tu conexión e inténtalo de nuevo.');
    }
  }

  const modoQuitar = editandoIndicaciones && (detalle?.indicaciones.length ?? 0) > 0;
  const c = detalle?.consulta;
  const encabezado = c ? datosDelEncabezado(c) : null;
  const tarjeta = { backgroundColor: color.superficie, borderColor: color.borde, borderWidth: 1 } as const;
  const titulo = { color: color.textoSecundario, fontFamily: fuente.cuerpoBold, fontSize: 13, letterSpacing: 0.8, textTransform: 'uppercase' } as const;
  const linea = c ? lineaDelLugar(c) : undefined;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.fondo }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28, gap: 20 }}>
          <AvisoSinConexion motivo={motivoSinInternet} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Volver al diario"
              onPress={() => router.back()}
              style={{ ...tarjeta, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color.texto} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M15 5l-7 7 7 7" />
              </Svg>
            </Pressable>
            {detalle ? (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !puedeEditar }}
                disabled={!puedeEditar}
                onPress={() => router.push({ pathname: '/consulta-nueva', params: { editar: id } })}
                style={{ ...tarjeta, height: 44, paddingHorizontal: 16, borderRadius: 22, justifyContent: 'center', opacity: puedeEditar ? 1 : 0.45 }}>
                <Text style={{ color: color.texto, fontFamily: fuente.cuerpoSemi, fontSize: 14 }}>Editar</Text>
              </Pressable>
            ) : null}
          </View>

          {estaCargando(detalle, fallo) ? <EsqueletoDelDetalleDeConsulta /> : null}
          {fallo ? (
            <View accessibilityRole="alert" style={{ gap: 10, alignItems: 'center', marginTop: 40 }}>
              <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 15, textAlign: 'center' }}>
                No pudimos cargar la consulta. Revisa tu conexión.
              </Text>
              <Pressable accessibilityRole="button" onPress={cargar} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ color: color.primario, fontFamily: fuente.cuerpoBold, fontSize: 15 }}>Reintentar</Text>
              </Pressable>
            </View>
          ) : null}

          {detalle && c && encabezado ? (
            <>
              <View style={{ gap: 8 }}>
                <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpoSemi, fontSize: 14 }}>{encabezado.fecha}</Text>
                <Text accessibilityRole="header" style={{ color: color.texto, fontFamily: fuente.titulo, fontSize: 30, lineHeight: 34, letterSpacing: -0.5 }}>
                  {encabezado.titulo}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {encabezado.chips.map((chip, n) => (
                    <View
                      key={chip}
                      style={n === 0 ? { backgroundColor: color.primarioSuave, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 } : { ...tarjeta, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ color: n === 0 ? color.primario : color.texto, fontFamily: n === 0 ? fuente.cuerpoBold : fuente.cuerpoSemi, fontSize: 12 }}>{chip}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {c.medico ? (
                <View style={{ ...tarjeta, borderRadius: radio.lg, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: color.primarioSuave, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: color.primario, fontFamily: fuente.titulo, fontSize: 18 }}>{iniciales(c.medico.nombre)}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ color: color.texto, fontFamily: fuente.cuerpoSemi, fontSize: 16 }}>{c.medico.nombre}</Text>
                    {linea ? <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 13 }}>{linea}</Text> : null}
                    {detalle.telefonoDelMedico ? <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 13 }}>{detalle.telefonoDelMedico}</Text> : null}
                  </View>
                  {detalle.telefonoDelMedico ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Llamar a ${c.medico.nombre}`}
                      onPress={() => Linking.openURL(`tel:${detalle.telefonoDelMedico?.replace(/[^\d+]/g, '')}`)}
                      style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color.primario, alignItems: 'center', justifyContent: 'center' }}>
                      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color.sobrePrimario} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <Path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z" />
                      </Svg>
                    </Pressable>
                  ) : null}
                </View>
              ) : linea ? (
                <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 14 }}>{linea}</Text>
              ) : null}

              {c.motivo ? (
                <View style={{ gap: 8 }}>
                  <Text style={titulo}>Motivo</Text>
                  <Text style={{ color: color.texto, fontFamily: fuente.cuerpo, fontSize: 15, lineHeight: 22 }}>{c.motivo}</Text>
                </View>
              ) : null}

              {c.notasDelMedico ? (
                <View style={{ gap: 8 }}>
                  <Text style={titulo}>Lo que me dijo</Text>
                  <View style={{ ...tarjeta, borderRadius: radio.lg, padding: 16 }}>
                    <Text style={{ color: color.texto, fontFamily: fuente.cuerpo, fontSize: 15, lineHeight: 23 }}>{c.notasDelMedico}</Text>
                  </View>
                </View>
              ) : null}

              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={titulo}>Indicaciones</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 13 }}>{resumenDeIndicaciones(detalle.indicaciones)}</Text>
                    {detalle.indicaciones.length > 0 ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ disabled: !puedeEditar }}
                        disabled={!puedeEditar}
                        onPress={() => setEditandoIndicaciones((e) => !e)}
                        style={{ minHeight: 44, justifyContent: 'center', opacity: puedeEditar ? 1 : 0.4 }}>
                        <Text style={{ color: color.primario, fontFamily: fuente.cuerpoBold, fontSize: 14 }}>{textoDelModoDeIndicaciones(modoQuitar)}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
                {detalle.indicaciones.map((i) => {
                  const hecha = i.hechaEn !== undefined;
                  return (
                    <Pressable
                      key={i.id}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: hecha, disabled: !puedeEditar || modoQuitar }}
                      accessibilityLabel={i.texto}
                      disabled={!puedeEditar || modoQuitar}
                      onPress={() => alternar(i.id)}
                      style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, opacity: puedeEditar ? 1 : 0.55 }}>
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 7,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: hecha ? color.primario : undefined,
                          borderWidth: hecha ? 0 : 2,
                          borderColor: color.bordeVacio,
                        }}>
                        {hecha ? (
                          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color.sobrePrimario} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                            <Path d="M5 12l5 5 9-10" />
                          </Svg>
                        ) : null}
                      </View>
                      <Text style={{ flex: 1, fontFamily: fuente.cuerpo, fontSize: 15, color: hecha ? color.textoSecundario : color.texto, textDecorationLine: hecha ? 'line-through' : 'none' }}>
                        {i.texto}
                      </Text>
                      {modoQuitar ? (
                        <Pressable accessibilityRole="button" accessibilityLabel={`Quitar: ${i.texto}`} onPress={() => quitar(i.id)} hitSlop={6} style={{ minHeight: 44, minWidth: 56, alignItems: 'flex-end', justifyContent: 'center' }}>
                          <Text style={{ color: color.peligro, fontFamily: fuente.cuerpoBold, fontSize: 14 }}>Quitar</Text>
                        </Pressable>
                      ) : null}
                    </Pressable>
                  );
                })}
                <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpoSemi, fontSize: 13 }}>Agregar indicación</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    editable={puedeEditar}
                    accessibilityLabel="Agregar indicación"
                    placeholder="Ej. Volver si sube la presión"
                    placeholderTextColor={color.textoSecundario}
                    value={nueva}
                    onChangeText={(t) => {
                      setNueva(t);
                      setErrorDeIndicacion(undefined);
                    }}
                    onSubmitEditing={agregar}
                    returnKeyType="done"
                    style={{ flex: 1, minWidth: 0, height: 48, borderRadius: radio.md, borderWidth: errorDeIndicacion ? 2 : 1, borderColor: errorDeIndicacion ? color.peligro : color.bordeCampo, backgroundColor: color.superficie, paddingHorizontal: 12, color: color.texto, fontFamily: fuente.cuerpo, fontSize: 15 }}
                  />
                  <Pressable accessibilityRole="button" accessibilityState={{ disabled: !puedeEditar }} disabled={!puedeEditar} onPress={agregar} style={{ height: 48, paddingHorizontal: 16, borderRadius: radio.md, backgroundColor: color.texto, alignItems: 'center', justifyContent: 'center', opacity: puedeEditar ? 1 : 0.45 }}>
                    <Text style={{ color: color.sobrePrimario, fontFamily: fuente.cuerpoBold, fontSize: 14 }}>Agregar</Text>
                  </Pressable>
                </View>
                {errorDeIndicacion ? (
                  <Text accessibilityRole="alert" style={{ color: color.peligro, fontFamily: fuente.cuerpoSemi, fontSize: 13 }}>
                    {errorDeIndicacion}
                  </Text>
                ) : null}
              </View>

              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={titulo}>Receta</Text>
                  <Pressable accessibilityRole="button" accessibilityState={{ disabled: !puedeEditar }} disabled={receta === null || !puedeEditar} onPress={() => router.push({ pathname: '/receta', params: { consultaId: id } })} style={{ minHeight: 44, justifyContent: 'center' }}>
                    <Text style={{ color: color.primario, fontFamily: fuente.cuerpoBold, fontSize: 14, opacity: receta === null ? 0 : puedeEditar ? 1 : 0.4 }}>{receta && receta.length > 0 ? 'Editar receta' : 'Agregar receta'}</Text>
                  </Pressable>
                </View>
                {receta === null ? <EsqueletoDeLaSeccionDeReceta /> : null}
                {(receta ?? []).map((m, n) => {
                  const resumen = resumenDelMedicamento(m);
                  return (
                    <View key={`${m.nombre}-${n}`} style={{ ...tarjeta, borderRadius: radio.lg, padding: 14, gap: 4 }}>
                      <Text style={{ color: color.texto, fontFamily: fuente.cuerpoSemi, fontSize: 16 }}>{m.nombre}</Text>
                      {resumen ? <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 14 }}>{resumen}</Text> : null}
                      {m.indicaciones ? <Text style={{ color: color.texto, fontFamily: fuente.cuerpo, fontSize: 14, lineHeight: 20 }}>{m.indicaciones}</Text> : null}
                    </View>
                  );
                })}
                <FotoDeRecetaSeccion consultaId={id} puedeEditar={puedeEditar} />
              </View>

              {c.proximaCita ? (
                <View style={{ backgroundColor: color.texto, borderRadius: radio.lg, paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ gap: 2 }}>
                    <Text style={{ color: color.sobrePrimario, opacity: 0.75, fontFamily: fuente.cuerpoSemi, fontSize: 12, letterSpacing: 0.4, textTransform: 'uppercase' }}>Próxima cita</Text>
                    <Text style={{ color: color.sobrePrimario, fontFamily: fuente.cuerpoSemi, fontSize: 16 }}>
                      {fechaDeHoy(c.proximaCita)} · {horaCorta(c.proximaCita)}
                    </Text>
                  </View>
                  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color.sobrePrimario} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <Rect x={4} y={5} width={16} height={16} rx={2} />
                    <Path d="M4 10h16M9 3v4M15 3v4" />
                  </Svg>
                </View>
              ) : null}

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !puedeEditar || eliminando }}
                disabled={!puedeEditar || eliminando}
                onPress={confirmarEliminar}
                style={{ marginTop: 12, minHeight: 52, borderRadius: radio.md, borderWidth: 1, borderColor: color.peligro, backgroundColor: color.superficie, alignItems: 'center', justifyContent: 'center', opacity: !puedeEditar || eliminando ? 0.45 : 1 }}>
                <Text style={{ color: color.peligro, fontFamily: fuente.cuerpoBold, fontSize: 15 }}>{eliminando ? 'Eliminando…' : 'Eliminar consulta'}</Text>
              </Pressable>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
