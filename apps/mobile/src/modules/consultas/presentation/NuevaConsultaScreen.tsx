import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { useCasoDeUso } from '@/app/ContainerContext';
import { useMedicoElegido } from '@/modules/medicos/presentation/useMedicoElegido';
import { ESPECIALIDADES } from '@/shared/kernel/especialidades';
import { useTema } from '@/shared/theme';
import { DateTimeField } from '@/shared/ui/DateTimeField';
import { SelectField } from '@/shared/ui/SelectField';
import { TextField } from '@/shared/ui/TextField';

import { DatosDeMedicoIncompletosError, FechaFuturaError, LugarInvalidoError, ProximaCitaInvalidaError } from '../domain/errors';
import { TIPOS_DE_MEDICO } from '../domain/TipoDeMedico';
import {
  agregarIndicacion,
  aBorrador,
  aEntrada,
  aplicarMedicoElegido,
  cambiarTipo,
  combinarFechaYHora,
  deBorrador,
  editarNombreDelMedico,
  estadoDesdeConsulta,
  estadoInicial,
  quitarIndicacion,
  type EstadoDeConsulta,
} from './formulario';
import { mensajeDeErrorDeConsulta } from './mensajes';

const DIA = 86_400_000;
const PAUSA_DE_GUARDADO_MS = 800;
const OPCIONES = ESPECIALIDADES.map((e) => ({ valor: e.slug, etiqueta: e.nombre }));

type Errores = Partial<Record<'fecha' | 'proxima' | 'medico' | 'lugar', string>>;

/**
 * "Nueva consulta" (RF-10, CU-02). Con `medicoId` en la ruta abre con ese médico ya elegido; con `editar` (id de una
 * consulta) es "Editar consulta" (RF-11, CU-06): sin borrador ni indicaciones (esas se gestionan en el detalle).
 */
export function NuevaConsultaScreen() {
  const { color, fuente, radio } = useTema();
  const { medicoId, editar } = useLocalSearchParams<{ medicoId?: string; editar?: string }>();
  const editando = Boolean(editar);
  const registrarConsulta = useCasoDeUso('registrarConsulta');
  const editarConsulta = useCasoDeUso('editarConsulta');
  const solicitarPermisoDeAvisos = useCasoDeUso('solicitarPermisoDeAvisos');
  const sincronizarAvisos = useCasoDeUso('sincronizarAvisosDeCitas');
  const eliminarConsulta = useCasoDeUso('eliminarConsulta');
  const obtenerDetalle = useCasoDeUso('obtenerDetalleDeConsulta');
  const lugaresUsados = useCasoDeUso('listarLugaresUsadosAntes');
  const elegirGuardado = useCasoDeUso('elegirMedicoGuardado');
  const guardarBorrador = useCasoDeUso('guardarBorrador');
  const recuperarBorrador = useCasoDeUso('recuperarBorrador');
  const descartarBorrador = useCasoDeUso('descartarBorrador');

  const [ahora] = useState(() => new Date());
  const [e, setE] = useState<EstadoDeConsulta>(() => estadoInicial(ahora));
  const [errores, setErrores] = useState<Errores>({});
  const [sugeridos, setSugeridos] = useState<string[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [indicacionNueva, setIndicacionNueva] = useState('');
  const [recuperado, setRecuperado] = useState(false);
  const [borradorGuardado, setBorradorGuardado] = useState(false);
  /** Tras guardar la consulta o descartar, ya no se debe volver a guardar el borrador. */
  const sinBorrador = useRef(false);

  const cambiar = (parcial: Partial<EstadoDeConsulta>, limpiar?: keyof Errores) => {
    setE((actual) => ({ ...actual, ...parcial }));
    if (limpiar) setErrores((x) => ({ ...x, [limpiar]: undefined }));
  };

  useEffect(() => {
    lugaresUsados.ejecutar().then((l) => setSugeridos(l.map((x) => x.nombre)), () => {});
  }, [lugaresUsados]);

  // Al abrir: se recupera el borrador (HU-04) y, si se entró desde el detalle de un médico, se rellena con sus datos.
  useEffect(() => {
    let vigente = true;
    (async () => {
      // Editar: se abre la consulta existente (sin borrador). Si ya no existe, se vuelve atrás.
      if (editar) {
        try {
          const d = await obtenerDetalle.ejecutar(editar);
          if (!d) return router.back();
          if (vigente) setE(estadoDesdeConsulta(d.consulta, d.telefonoDelMedico));
        } catch {
          Alert.alert('No pudimos abrir la consulta', 'Revisa tu conexión e inténtalo de nuevo.');
        }
        if (vigente) setRecuperado(true);
        return;
      }
      try {
        const borrador = await recuperarBorrador.ejecutar();
        if (vigente && borrador) {
          setE(deBorrador(borrador, new Date()));
          setBorradorGuardado(true);
        }
      } catch {
        // Sin borrador legible se empieza en blanco.
      }
      try {
        const datos = medicoId ? await elegirGuardado.ejecutar(medicoId) : null;
        if (vigente && datos) setE((actual) => aplicarMedicoElegido(actual, datos));
      } catch {
        // El médico es opcional.
      }
      if (vigente) setRecuperado(true);
    })();
    return () => {
      vigente = false;
    };
  }, [medicoId, editar, recuperarBorrador, elegirGuardado, obtenerDetalle]);

  // Guardado automático (RF-14): unos instantes después de dejar de escribir, y solo cuando ya se recuperó el
  // borrador anterior (si no, el formulario vacío lo pisaría).
  useEffect(() => {
    if (!recuperado || editando) return;
    const pausa = setTimeout(() => {
      if (sinBorrador.current) return;
      guardarBorrador.ejecutar(aBorrador(e)).then(
        (r) => !sinBorrador.current && setBorradorGuardado(r === 'guardado'),
        () => setBorradorGuardado(false),
      );
    }, PAUSA_DE_GUARDADO_MS);
    return () => clearTimeout(pausa);
  }, [e, recuperado, editando, guardarBorrador]);

  // Entrada desde "Elegir guardado".
  useMedicoElegido(useCallback((d) => setE((actual) => aplicarMedicoElegido(actual, d)), []));

  /** Pide permiso para avisar de la cita y deja programados los avisos; si está bloqueado, explica cómo activarlo. */
  async function prepararAvisos() {
    try {
      const permiso = await solicitarPermisoDeAvisos.ejecutar();
      if (permiso === 'concedido') await sincronizarAvisos.ejecutar();
      else if (permiso === 'bloqueado') {
        Alert.alert('Avisos de tu cita desactivados', 'Para recibir un aviso antes de tu cita, activa las notificaciones de MediQ en Ajustes.', [
          { text: 'Ahora no', style: 'cancel' },
          { text: 'Abrir Ajustes', onPress: () => void Linking.openSettings() },
        ]);
      }
    } catch (error) {
      console.warn('[MediQ] no se pudieron preparar los avisos de la cita', error);
    }
  }

  async function guardar() {
    setOcupado(true);
    try {
      const r = editar ? await editarConsulta.ejecutar(editar, aEntrada(e)) : await registrarConsulta.ejecutar(aEntrada(e));
      if (r.ok) {
        if (!editar) {
          sinBorrador.current = true;
          await descartarBorrador.ejecutar().catch(() => {});
        }
        // RF-40: con próxima cita, se pide el permiso de avisos (si falta) y se programan. Nunca impide guardar.
        if (e.proximaCita) await prepararAvisos();
        return router.back();
      }
      const mensaje = mensajeDeErrorDeConsulta(r.error);
      if (r.error instanceof FechaFuturaError) setErrores({ fecha: mensaje });
      else if (r.error instanceof ProximaCitaInvalidaError) setErrores({ proxima: mensaje });
      else if (r.error instanceof DatosDeMedicoIncompletosError) setErrores({ medico: mensaje });
      else if (r.error instanceof LugarInvalidoError) setErrores({ lugar: mensaje });
      else {
        console.warn('[guardar consulta] el dominio la rechazó:', r.error.name, r.error.message);
        Alert.alert('No pudimos guardar la consulta', mensaje);
      }
    } catch (error) {
      console.warn('[guardar consulta] falló:', error);
      Alert.alert('No pudimos guardar la consulta', mensajeDeErrorDeConsulta(new Error()));
    } finally {
      setOcupado(false);
    }
  }

  function confirmarEliminar() {
    if (!editar) return;
    Alert.alert('¿Eliminar esta consulta?', 'Se quitará de tu diario junto con sus indicaciones. No se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          setOcupado(true);
          try {
            const r = await eliminarConsulta.ejecutar(editar);
            if (r.ok) return router.back();
            Alert.alert('No pudimos eliminar la consulta', 'Ya no existe o no es tuya.');
          } catch {
            Alert.alert('No pudimos eliminar la consulta', mensajeDeErrorDeConsulta(new Error()));
          } finally {
            setOcupado(false);
          }
        },
      },
    ]);
  }

  function confirmarDescarte() {
    Alert.alert('¿Descartar el borrador?', 'Se borra lo que llevas escrito y el formulario queda en blanco.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Descartar',
        style: 'destructive',
        onPress: async () => {
          sinBorrador.current = true;
          await descartarBorrador.ejecutar().catch(() => {});
          setE(estadoInicial(new Date()));
          setErrores({});
          setBorradorGuardado(false);
          sinBorrador.current = false;
        },
      },
    ]);
  }

  const agregarLaIndicacion = () => {
    setE((actual) => agregarIndicacion(actual, indicacionNueva));
    setIndicacionNueva('');
  };

  const activarProximaCita = () => {
    const base = combinarFechaYHora(e.fecha, e.hora).getTime();
    cambiar({ proximaCita: new Date(Math.max(base, Date.now()) + 7 * DIA) }, 'proxima');
  };

  const boton = {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: color.bordeCampo,
    backgroundColor: color.superficie,
    justifyContent: 'center',
  } as const;
  const textoBoton = { color: color.texto, fontFamily: fuente.cuerpoSemi, fontSize: 14 } as const;
  const encabezado = { color: color.textoSecundario, fontFamily: fuente.cuerpoSemi, fontSize: 13 } as const;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.fondo }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28, gap: 22 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Pressable accessibilityRole="button" onPress={() => router.back()} style={{ minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpoSemi, fontSize: 15 }}>Cancelar</Text>
            </Pressable>
            {borradorGuardado && !editando ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Borrador guardado. Descartar borrador" onPress={confirmarDescarte} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpoSemi, fontSize: 13 }}>Borrador guardado · Descartar</Text>
              </Pressable>
            ) : null}
          </View>

          <Text accessibilityRole="header" style={{ color: color.texto, fontFamily: fuente.titulo, fontSize: 30, lineHeight: 34, letterSpacing: -0.5 }}>
            {editando ? 'Editar consulta' : 'Nueva consulta'}
          </Text>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <DateTimeField label="Fecha" mode="date" value={e.fecha} maximumDate={ahora} error={errores.fecha} onChange={(f) => cambiar({ fecha: f }, 'fecha')} />
            </View>
            <View style={{ flex: 1 }}>
              <DateTimeField label="Hora" mode="time" value={e.hora} onChange={(h) => cambiar({ hora: h }, 'fecha')} />
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={encabezado}>Tipo de médico</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {TIPOS_DE_MEDICO.map((t) => {
                const elegido = e.tipo === t.valor;
                return (
                  <Pressable
                    key={t.valor}
                    accessibilityRole="button"
                    accessibilityState={{ selected: elegido }}
                    onPress={() => setE((actual) => cambiarTipo(actual, t.valor))}
                    style={{ ...boton, paddingHorizontal: 16, backgroundColor: elegido ? color.primario : color.superficie, borderColor: elegido ? color.primario : color.bordeCampo }}>
                    <Text style={{ ...textoBoton, color: elegido ? color.sobrePrimario : color.texto }}>{t.etiqueta}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <SelectField label="Especialidad" valor={e.especialidad} opciones={OPCIONES} onChange={(v) => cambiar({ especialidad: v })} />

          <View style={{ gap: 8 }}>
            <TextField
              label="Hospital, clínica o consultorio"
              placeholder="Ej. Hospital Morelos, Consultorio Similares"
              value={e.lugar}
              onChangeText={(t) => cambiar({ lugar: t }, 'lugar')}
              error={errores.lugar}
              autoCapitalize="words"
            />
            {sugeridos.length > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 13 }}>Usados antes:</Text>
                {sugeridos.map((nombre) => (
                  <Pressable key={nombre} accessibilityRole="button" accessibilityLabel={`Usar ${nombre}`} onPress={() => cambiar({ lugar: nombre }, 'lugar')} style={boton}>
                    <Text style={textoBoton}>{nombre}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>

          <TextField label="Número de consultorio o piso (opcional)" placeholder="Ej. 204" value={e.consultorio} onChangeText={(t) => cambiar({ consultorio: t })} />

          <View style={{ backgroundColor: color.superficie, borderColor: color.borde, borderWidth: 1, borderRadius: radio.lg, padding: 16, gap: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <Text style={{ ...encabezado, fontFamily: fuente.cuerpoBold, letterSpacing: 0.8, textTransform: 'uppercase', flexShrink: 1 }}>Datos del médico (opcional)</Text>
              <Pressable accessibilityRole="button" onPress={() => router.push('/medicos-elegir')} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ color: color.primario, fontFamily: fuente.cuerpoSemi, fontSize: 14 }}>Elegir guardado</Text>
              </Pressable>
            </View>
            <TextField label="Nombre" placeholder="Dra. / Dr." value={e.medicoNombre} onChangeText={(t) => { setE((a) => editarNombreDelMedico(a, t)); setErrores((x) => ({ ...x, medico: undefined })); }} error={errores.medico} autoCapitalize="words" />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <TextField label="Teléfono" placeholder="10 dígitos" value={e.medicoTelefono} onChangeText={(t) => cambiar({ medicoTelefono: t }, 'medico')} keyboardType="phone-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <TextField label="Cédula (opcional)" placeholder="Núm. cédula" value={e.medicoCedula} onChangeText={(t) => cambiar({ medicoCedula: t }, 'medico')} />
              </View>
            </View>
          </View>

          <TextField label="Motivo de la consulta" placeholder="¿Por qué fuiste?" value={e.motivo} onChangeText={(t) => cambiar({ motivo: t })} />

          <TextField
            label="¿Qué te dijo el médico?"
            placeholder="Escríbelo con tus palabras: diagnóstico, indicaciones, lo que debes vigilar…"
            value={e.notasDelMedico}
            onChangeText={(t) => cambiar({ notasDelMedico: t })}
            multiline
            style={{ height: 150, lineHeight: 22 }}
          />

          {!editando ? (
          <View style={{ gap: 8 }}>
            <Text style={encabezado}>Indicaciones (opcional)</Text>
            <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 13, lineHeight: 19 }}>
              Lo que te pidieron hacer: estudios, cuidados, cuándo volver. Después podrás marcarlas como hechas.
            </Text>
            {e.indicaciones.map((texto, posicion) => (
              <View
                key={`${posicion}-${texto}`}
                style={{ backgroundColor: color.superficie, borderColor: color.borde, borderWidth: 1, borderRadius: radio.md, paddingLeft: 12, paddingRight: 4, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ flex: 1, color: color.texto, fontFamily: fuente.cuerpo, fontSize: 15, lineHeight: 21, paddingVertical: 8 }}>{texto}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Quitar indicación: ${texto}`}
                  onPress={() => setE((actual) => quitarIndicacion(actual, posicion))}
                  style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color.textoSecundario} strokeWidth={2.2} strokeLinecap="round">
                    <Path d="M6 6l12 12M18 6L6 18" />
                  </Svg>
                </Pressable>
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                accessibilityLabel="Nueva indicación"
                placeholder="Ej. Análisis de sangre en ayunas"
                placeholderTextColor={color.textoSecundario}
                value={indicacionNueva}
                onChangeText={setIndicacionNueva}
                onSubmitEditing={agregarLaIndicacion}
                returnKeyType="done"
                style={{ flex: 1, minWidth: 0, height: 48, borderRadius: radio.md, borderWidth: 1, borderColor: color.bordeCampo, backgroundColor: color.superficie, paddingHorizontal: 12, color: color.texto, fontFamily: fuente.cuerpo, fontSize: 15 }}
              />
              <Pressable
                accessibilityRole="button"
                onPress={agregarLaIndicacion}
                style={{ height: 48, paddingHorizontal: 16, borderRadius: radio.md, backgroundColor: color.texto, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: color.sobrePrimario, fontFamily: fuente.cuerpoBold, fontSize: 14 }}>Agregar</Text>
              </Pressable>
            </View>
          </View>
          ) : null}

          {/* "Agregar receta" (F016/F017) y "Dictar nota" quedan fuera de esta tarea. */}

          <View style={{ gap: 8 }}>
            <Text style={encabezado}>Próxima cita (opcional)</Text>
            {e.proximaCita ? (
              <>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <DateTimeField label="Fecha" mode="date" value={e.proximaCita} error={errores.proxima} onChange={(f) => cambiar({ proximaCita: combinarFechaYHora(f, e.proximaCita ?? f) }, 'proxima')} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <DateTimeField label="Hora" mode="time" value={e.proximaCita} onChange={(h) => cambiar({ proximaCita: combinarFechaYHora(e.proximaCita ?? h, h) }, 'proxima')} />
                  </View>
                </View>
                <Pressable accessibilityRole="button" onPress={() => cambiar({ proximaCita: null }, 'proxima')} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
                  <Text style={{ color: color.peligro, fontFamily: fuente.cuerpoSemi, fontSize: 14 }}>Quitar próxima cita</Text>
                </Pressable>
              </>
            ) : (
              <Pressable accessibilityRole="button" onPress={activarProximaCita} style={{ ...boton, height: 48, borderRadius: radio.md, borderStyle: 'dashed' }}>
                <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 15 }}>Agregar fecha de la próxima cita</Text>
              </Pressable>
            )}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: ocupado, disabled: ocupado }}
            disabled={ocupado}
            onPress={guardar}
            style={{ marginTop: 'auto', height: 54, borderRadius: 27, backgroundColor: color.primario, alignItems: 'center', justifyContent: 'center', opacity: ocupado ? 0.6 : 1 }}>
            <Text style={{ color: color.sobrePrimario, fontFamily: fuente.cuerpoBold, fontSize: 16 }}>{ocupado ? 'Guardando…' : editando ? 'Guardar cambios' : 'Guardar en mi diario'}</Text>
          </Pressable>
          {editando ? (
            <Pressable accessibilityRole="button" disabled={ocupado} onPress={confirmarEliminar} style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', alignSelf: 'center' }}>
              <Text style={{ color: color.peligro, fontFamily: fuente.cuerpoSemi, fontSize: 14 }}>Eliminar consulta</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
