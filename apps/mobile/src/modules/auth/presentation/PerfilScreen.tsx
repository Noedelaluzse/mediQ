import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { diagnostico } from '@/shared/kernel/diagnostico';
import { useCasoDeUso } from '@/app/ContainerContext';
import { useEdicion } from '@/app/useEdicion';
import { textoDeVersion } from '@/shared/kernel/version';
import { useTema } from '@/shared/theme';
import { AvisoSinConexion } from '@/shared/ui/AvisoSinConexion';
import { Esqueleto, GrupoDeEsqueletos } from '@/shared/ui/Esqueleto';
import { iniciales } from '@/shared/ui/iniciales';

import { textoDelContador } from './contadoresDelPerfil';

import { limpiarColaDeEnvio } from '@/modules/consultas/presentation/colaDeEnvio';

import { useSesion } from './SesionProvider';
import type { DatosDeSalud } from '../domain/DatosDeSalud';
import { publicarSalud, limpiarSaludPendiente, tomarAnuncioDeSaludCompleta } from './saludPendiente';
import { TarjetaDelCandado } from './TarjetaDelCandado';
import { AvisoYTarjetaDeSalud } from './TarjetaDeSalud';

/** Cuánto dura en pantalla el aviso de «información completa». */
const DURACION_DEL_AVISO_MS = 5000;

const FILA_DE_CONTADORES = { flexDirection: 'row', gap: 10 } as const;

/** La fila de contadores: mientras cargan, un esqueleto agrupado (un solo anuncio para lectores de pantalla). */
function Contadores({ cargando, children }: { cargando: boolean; children: ReactNode }) {
  return cargando ? (
    <GrupoDeEsqueletos etiqueta="Cargando tus totales" style={FILA_DE_CONTADORES}>
      {children}
    </GrupoDeEsqueletos>
  ) : (
    <View style={FILA_DE_CONTADORES}>{children}</View>
  );
}

export function PerfilScreen() {
  const { color, fuente, radio, espacio } = useTema();
  // Eliminar la cuenta necesita internet (F032); cerrar sesión no (es local).
  const { puedeEditar, motivo: motivoSinInternet } = useEdicion();
  const { sesion, modo, cerrarSesion, eliminarCuenta } = useSesion();
  const resumenDePerfil = useCasoDeUso('resumenDePerfil');
  const listarPendientes = useCasoDeUso('listarConsultasPendientes');
  // null = cargando: se muestra un esqueleto en vez de ceros que luego cambiarían.
  const [totales, setTotales] = useState<{ consultas: number; medicos: number; recetas: number } | null>(null);
  // Si no se pudieron leer ni hay copia en el teléfono (p. ej. sin internet la primera vez): un guion, no un 0 que parezca un dato (F053).
  const [totalesNoDisponibles, setTotalesNoDisponibles] = useState(false);
  const contadores = [
    { etiqueta: 'Consultas', valor: totales?.consultas },
    { etiqueta: 'Médicos', valor: totales?.medicos },
    { etiqueta: 'Recetas', valor: totales?.recetas },
  ];
  useFocusEffect(
    useCallback(() => {
      // Sin internet salen los últimos totales leídos (copia local, F053). Si tampoco hay copia, un guion: no se queda cargando para siempre.
      resumenDePerfil.ejecutar().then(
        (t) => {
          setTotales(t);
          setTotalesNoDisponibles(false);
        },
        () => setTotalesNoDisponibles(true),
      );
    }, [resumenDePerfil]),
  );
  const obtenerDatosDeSalud = useCasoDeUso('obtenerDatosDeSalud');
  // null = cargando; si no se pueden leer, la sección de salud simplemente no se muestra (no bloquea el resto del perfil).
  const [salud, setSalud] = useState<DatosDeSalud | null>(null);
  const [saludFallo, setSaludFallo] = useState(false);
  // Aviso temporal «información completa»: aparece unos segundos al volver del formulario que completó los datos y se va solo.
  const [completadoAhora, setCompletadoAhora] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (temporizador.current && clearTimeout(temporizador.current)), []);
  useFocusEffect(
    useCallback(() => {
      obtenerDatosDeSalud.ejecutar().then(
        (d) => {
          setSalud(d);
          setSaludFallo(false);
          publicarSalud(d);
          if (tomarAnuncioDeSaludCompleta()) {
            setCompletadoAhora(true);
            if (temporizador.current) clearTimeout(temporizador.current);
            temporizador.current = setTimeout(() => setCompletadoAhora(false), DURACION_DEL_AVISO_MS);
          }
        },
        () => setSaludFallo(true),
      );
    }, [obtenerDatosDeSalud]),
  );
  const [cerrando, setCerrando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  async function confirmarCierre() {
    // Lo capturado sin internet que aún no se envió vive solo en este teléfono y se borra al cerrar sesión: se avisa antes.
    const sinEnviar = (await listarPendientes.ejecutar().catch(() => [])).length;
    const aviso = sinEnviar > 0 ? `Tienes ${sinEnviar === 1 ? '1 consulta' : `${sinEnviar} consultas`} sin enviar (se capturaron sin internet). Si cierras sesión ahora, se perderán.` : 'Tendrás que volver a entrar con Google.';
    Alert.alert('¿Cerrar sesión?', aviso, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          setCerrando(true);
          limpiarSaludPendiente();
          limpiarColaDeEnvio();
          await cerrarSesion();
        },
      },
    ]);
  }

  function confirmarEliminacion() {
    Alert.alert(
      '¿Eliminar tu cuenta?',
      'Se borrarán para siempre tu perfil, tus consentimientos y todos tus datos. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar todo',
          style: 'destructive',
          onPress: async () => {
            setEliminando(true);
            const r = await eliminarCuenta();
            if (r.ok) {
              limpiarSaludPendiente();
              limpiarColaDeEnvio();
              diagnostico.informar('eliminar cuenta: terminó bien');
              Alert.alert('Cuenta eliminada', 'Se borraron tu cuenta y todos tus datos.');
              return;
            }
            diagnostico.advertir('eliminar cuenta: falló:', r.error.name, r.error.cause ?? '');
            setEliminando(false);
            Alert.alert(
              'No pudimos eliminar tu cuenta',
              r.error.name === 'SesionNoRestauradaError'
                ? 'Tu sesión caducó. Cierra sesión, vuelve a entrar e inténtalo de nuevo.'
                : 'Revisa tu conexión e inténtalo de nuevo. Si algo se alcanzó a borrar, no se perdió nada más.',
            );
          },
        },
      ],
    );
  }

  const nombre = sesion?.usuario.nombre ?? '';
  const tarjeta = {
    backgroundColor: color.superficie,
    borderColor: color.borde,
    borderWidth: 1,
  } as const;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.fondo }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: espacio.xl, paddingTop: 12, paddingBottom: espacio.xl, gap: 18 }}>
        <AvisoSinConexion motivo={motivoSinInternet} />
        <Text
          accessibilityRole="header"
          style={{ color: color.texto, fontFamily: fuente.titulo, fontSize: 32, lineHeight: 36, letterSpacing: -0.5 }}>
          Mi perfil
        </Text>

        <View style={{ ...tarjeta, borderRadius: radio.lg, padding: espacio.lg, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View
            style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: color.primario, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: color.sobrePrimario, fontFamily: fuente.titulo, fontSize: 20 }}>{iniciales(nombre)}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: color.texto, fontFamily: fuente.cuerpoSemi, fontSize: 17 }}>{nombre}</Text>
            <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 14 }}>{sesion?.usuario.email}</Text>
            <Text style={{ color: color.primario, fontFamily: fuente.cuerpoSemi, fontSize: 12 }}>Sesión iniciada con Google</Text>
          </View>
        </View>

        <Contadores cargando={totales === null && !totalesNoDisponibles}>
          {contadores.map((c) => (
            <View key={c.etiqueta} style={{ ...tarjeta, flex: 1, borderRadius: 14, padding: espacio.md, gap: 2 }}>
              {textoDelContador(c.valor, totalesNoDisponibles) === null ? <Esqueleto ancho={32} alto={26} radio={6} /> : <Text style={{ color: color.texto, fontFamily: fuente.titulo, fontSize: 22 }}>{textoDelContador(c.valor, totalesNoDisponibles)}</Text>}
              <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 12 }}>{c.etiqueta}</Text>
            </View>
          ))}
        </Contadores>

        {saludFallo ? null : <AvisoYTarjetaDeSalud datos={salud} alEditar={() => router.push('/salud')} completadoAhora={completadoAhora} />}

        <View style={{ ...tarjeta, borderRadius: radio.lg, paddingHorizontal: espacio.lg }}>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push('/lugares')}
            style={{ minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <Text style={{ color: color.texto, fontFamily: fuente.cuerpoMedio, fontSize: 15 }}>Mis lugares</Text>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color.textoSecundario} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M9 5l7 7-7 7" />
            </Svg>
          </Pressable>
        </View>

        <TarjetaDelCandado />

        {/* Los textos legales siempre a la mano (F033): se leen con o sin internet porque van dentro de la app. */}
        <View style={{ ...tarjeta, borderRadius: radio.lg, paddingHorizontal: espacio.lg }}>
          {(['aviso_privacidad', 'terminos'] as const).map((clave, n) => (
            <Pressable
              key={clave}
              accessibilityRole="link"
              onPress={() => router.push({ pathname: '/legal', params: { documento: clave } })}
              style={{ minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTopWidth: n === 0 ? 0 : 1, borderTopColor: color.borde }}>
              <Text style={{ color: color.texto, fontFamily: fuente.cuerpoMedio, fontSize: 15 }}>{clave === 'aviso_privacidad' ? 'Aviso de privacidad' : 'Términos y condiciones'}</Text>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color.textoSecundario} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M9 5l7 7-7 7" />
              </Svg>
            </Pressable>
          ))}
        </View>

        {modo === 'simulado' ? (
          <View accessibilityRole="alert" style={{ ...tarjeta, backgroundColor: color.acentoRecetaSuave, borderColor: color.acentoReceta, borderRadius: radio.md, padding: espacio.md }}>
            <Text style={{ color: color.acentoReceta, fontFamily: fuente.cuerpoSemi, fontSize: 13 }}>
              Modo de pruebas (simulado): aquí no se guarda ni se borra nada en la nube.
            </Text>
          </View>
        ) : null}

        <View style={{ marginTop: 'auto', alignItems: 'center', gap: 6 }}>
          <Pressable
            accessibilityRole="button"
            disabled={cerrando || eliminando}
            onPress={confirmarCierre}
            style={({ pressed }) => ({
              alignSelf: 'stretch',
              height: 54,
              borderRadius: 27,
              borderWidth: 1,
              borderColor: color.texto,
              backgroundColor: color.superficie,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              opacity: pressed || cerrando ? 0.7 : 1,
            })}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color.texto} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
              <Path d="M15 8l4 4-4 4M19 12H9" />
            </Svg>
            <Text style={{ color: color.texto, fontFamily: fuente.cuerpoBold, fontSize: 16 }}>
              {cerrando ? 'Cerrando…' : 'Cerrar sesión'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={cerrando || eliminando || !puedeEditar}
            accessibilityState={{ disabled: cerrando || eliminando || !puedeEditar }}
            onPress={confirmarEliminacion}
            style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', opacity: !puedeEditar ? 0.45 : pressed || eliminando ? 0.6 : 1 })}>
            <Text style={{ color: color.peligro, fontFamily: fuente.cuerpoSemi, fontSize: 14 }}>
              {eliminando ? 'Eliminando tu cuenta…' : 'Eliminar mi cuenta y mis datos'}
            </Text>
          </Pressable>
          <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 12 }}>
            MediQ · {textoDeVersion(process.env.EXPO_PUBLIC_APP_VERSION, process.env.EXPO_PUBLIC_APP_COMMIT || undefined)}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
