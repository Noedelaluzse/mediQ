import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, LayoutAnimation, Pressable, SectionList, Text, TextInput, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { diagnostico } from '@/shared/kernel/diagnostico';
import { useCasoDeUso } from '@/app/ContainerContext';
import { fechaDeHoy } from '@/shared/kernel/fechas';
import { estaCargando } from '@/shared/ui/esqueleto';
import { useTema } from '@/shared/theme';

import type { DiarioCargado } from '../application/ListarDiario';
import { buscarConsultas } from '../domain/BusquedaDeConsultas';
import { agruparPorMes, type ConsultaDelDiario } from '../domain/Diario';
import type { ProximaCita } from '../domain/ProximaCita';
import { visibilidadDeLaBarra } from './barraDeBusqueda';
import { ConsultasPendientes, FranjaDeConexion } from './ConsultasPendientes';
import { publicarCola, useColaDeEnvio, useEnviosCompletados } from './colaDeEnvio';
import { TarjetaDeHoy } from './TarjetaDeHoy';
import { useHayInternet } from './useConexion';
import { useTomasDeHoy } from './useTomasDeHoy';
import { EsqueletoDelDiario } from './esqueletos';
import { mensajeSinResultados, textoDeResultados } from './resultadosDeBusqueda';
import { datosDeProximaCita } from './tarjetaDeProximaCita';
import { datosDeTarjeta, textoDeTotal } from './tarjetaDelDiario';

/** Tarjeta verde con la cita futura más cercana (RF-16): al tocarla abre la consulta que la programó. */
function TarjetaDeProximaCita({ cita }: { cita: ProximaCita }) {
  const { color, fuente } = useTema();
  const t = datosDeProximaCita(cita);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Próxima cita: ${t.titulo}, ${t.mes} ${t.dia}, ${t.detalle}`}
      onPress={() => router.push({ pathname: '/consulta-detalle', params: { id: cita.consultaId } })}
      style={{ marginTop: 14, backgroundColor: color.primario, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: color.superficie, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: color.primario, fontFamily: fuente.cuerpoBold, fontSize: 10, letterSpacing: 0.6, lineHeight: 12 }}>{t.mes}</Text>
        <Text style={{ color: color.primario, fontFamily: fuente.titulo, fontSize: 18, lineHeight: 20 }}>{t.dia}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: color.sobrePrimario, opacity: 0.8, fontFamily: fuente.cuerpoSemi, fontSize: 12, letterSpacing: 0.4, textTransform: 'uppercase' }}>Próxima cita</Text>
        <Text style={{ color: color.sobrePrimario, fontFamily: fuente.cuerpoSemi, fontSize: 16 }}>{t.titulo}</Text>
        <Text style={{ color: color.sobrePrimario, opacity: 0.9, fontFamily: fuente.cuerpo, fontSize: 13 }}>{t.detalle}</Text>
      </View>
    </Pressable>
  );
}

/** "Mi diario médico" (RF-12, HU-07): las consultas de la más reciente a la más antigua, agrupadas por mes. */
export function DiarioScreen() {
  const { color, fuente, radio } = useTema();
  const listarDiario = useCasoDeUso('listarDiario');
  const cargarTodoElDiario = useCasoDeUso('cargarTodoElDiario');
  const sincronizarAvisos = useCasoDeUso('sincronizarAvisosDeCitas');
  const sincronizarTomas = useCasoDeUso('sincronizarAvisosDeTomas');
  const obtenerProximaCita = useCasoDeUso('obtenerProximaCita');
  const [proximaCita, setProximaCita] = useState<ProximaCita | null>(null);
  const [diario, setDiario] = useState<DiarioCargado | null>(null);
  const hoy = useTomasDeHoy();
  // Sin internet (RNF-11): franja de aviso y las consultas capturadas sin internet que aún no se envían.
  const hayInternet = useHayInternet();
  const pendientes = useColaDeEnvio();
  const envios = useEnviosCompletados();
  const listarPendientes = useCasoDeUso('listarConsultasPendientes');
  const descartarPendiente = useCasoDeUso('descartarConsultaPendiente');
  const [fallo, setFallo] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const enCurso = useRef(false);

  // Búsqueda (RF-17): se lee todo el diario una vez y se filtra en el dispositivo mientras se escribe.
  const [busqueda, setBusqueda] = useState('');
  const [todas, setTodas] = useState<ConsultaDelDiario[] | null>(null);
  const [truncado, setTruncado] = useState(false);
  const [cargandoTodas, setCargandoTodas] = useState(false);
  const [falloTodas, setFalloTodas] = useState(false);
  const buscandoRef = useRef(false);
  const cargandoTodasRef = useRef(false);
  const buscando = busqueda.trim().length > 0;
  useEffect(() => {
    buscandoRef.current = buscando;
  }, [buscando]);

  // La barra está oculta y aparece al arrastrar la lista hacia abajo (rebote); se oculta al bajar (como la búsqueda de iOS).
  const [barraVisible, setBarraVisible] = useState(false);
  const [campoEnUso, setCampoEnUso] = useState(false);
  const mantenerBarra = buscando || campoEnUso;
  const mostrarBarra = barraVisible || mantenerBarra;
  const cambiarVisibilidad = useCallback((visible: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setBarraVisible(visible);
  }, []);

  const cargarTodas = useCallback(() => {
    if (cargandoTodasRef.current) return;
    cargandoTodasRef.current = true;
    setCargandoTodas(true);
    setFalloTodas(false);
    cargarTodoElDiario
      .ejecutar()
      .then(
        (r) => {
          setTodas(r.consultas);
          setTruncado(r.truncado);
        },
        () => setFalloTodas(true),
      )
      .finally(() => {
        cargandoTodasRef.current = false;
        setCargandoTodas(false);
      });
  }, [cargarTodoElDiario]);

  /** Decide si mostrar u ocultar la barra según cómo se desplazó la lista. */
  const revisarBarra = (e: NativeSyntheticEvent<NativeScrollEvent>, alSoltar: boolean) => {
    const cambio = visibilidadDeLaBarra({ y: e.nativeEvent.contentOffset.y, visible: mostrarBarra, mantener: mantenerBarra, alSoltar });
    if (cambio !== null && cambio !== barraVisible) cambiarVisibilidad(cambio);
  };

  const cambiarBusqueda = (texto: string) => {
    setBusqueda(texto);
    if (texto.trim() && todas === null && !falloTodas) cargarTodas();
  };

  /** Recarga desde la primera página (al abrir y al volver a la pestaña, p. ej. tras guardar una consulta). */
  const recargar = useCallback(() => {
    if (enCurso.current) return;
    enCurso.current = true;
    // Lo cargado para buscar queda viejo (p. ej. tras guardar una consulta): se vuelve a leer si se está buscando.
    setTodas(null);
    if (buscandoRef.current) cargarTodas();
    // Los avisos de citas se ponen al día en silencio (RF-40): una fecha cambiada o una consulta eliminada actualiza o cancela los suyos.
    sincronizarAvisos.ejecutar().catch((error) => diagnostico.advertir('no se pudieron sincronizar los avisos de citas', error));
    sincronizarTomas.ejecutar().catch((error) => diagnostico.advertir('no se pudieron sincronizar los avisos de toma', error));
    // La próxima cita es un adorno: si falla, simplemente no se muestra.
    obtenerProximaCita.ejecutar().then(setProximaCita, () => setProximaCita(null));
    listarDiario
      .ejecutar([])
      .then(
        (d) => {
          setDiario(d);
          setFallo(false);
        },
        () => setFallo(true),
      )
      .finally(() => {
        enCurso.current = false;
      });
  }, [listarDiario, obtenerProximaCita, cargarTodas, sincronizarAvisos, sincronizarTomas]);

  useFocusEffect(recargar);

  // Cuando se envía una consulta capturada sin internet, el diario se vuelve a leer para que aparezca de verdad.
  const enviosVistos = useRef(envios);
  useEffect(() => {
    if (envios === enviosVistos.current) return;
    enviosVistos.current = envios;
    recargar();
  }, [envios, recargar]);

  const descartar = (id: string) => {
    descartarPendiente
      .ejecutar(id)
      .then(() => listarPendientes.ejecutar())
      .then((lista) => publicarCola(lista))
      .catch(() => Alert.alert('No pudimos descartarla', 'Inténtalo de nuevo.'));
  };

  const cargarMas = () => {
    if (buscando || !diario?.hayMas || enCurso.current) return;
    enCurso.current = true;
    setCargandoMas(true);
    listarDiario
      .ejecutar(diario.consultas, diario.siguiente)
      .then(setDiario, () => setFallo(true))
      .finally(() => {
        enCurso.current = false;
        setCargandoMas(false);
      });
  };

  const resultados = useMemo(() => buscarConsultas(todas ?? [], busqueda), [todas, busqueda]);
  const grupos = buscando ? agruparPorMes(resultados) : (diario?.grupos ?? []);
  const secciones = grupos.map((g) => ({ clave: g.clave, titulo: g.titulo, total: g.total, data: g.consultas }));
  const vacio = diario !== null && diario.consultas.length === 0;

  const barraDeBusqueda = (
    <View style={{ marginTop: 14 }}>
      <View
        style={{ height: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: radio.md, borderWidth: 1, borderColor: color.bordeCampo, backgroundColor: color.superficie }}>
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color.textoSecundario} strokeWidth={2.2} strokeLinecap="round">
          <Circle cx={11} cy={11} r={7} />
          <Path d="M20 20l-3.5-3.5" />
        </Svg>
        <TextInput
          accessibilityLabel="Buscar consultas"
          placeholder="Buscar por médico, especialidad o lugar"
          placeholderTextColor={color.textoSecundario}
          value={busqueda}
          onChangeText={cambiarBusqueda}
          onFocus={() => setCampoEnUso(true)}
          onBlur={() => {
            setCampoEnUso(false);
            // Sin texto, la barra vuelve a esconderse al terminar de usarla.
            if (!busqueda.trim()) cambiarVisibilidad(false);
          }}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          style={{ flex: 1, minWidth: 0, height: 48, color: color.texto, fontFamily: fuente.cuerpo, fontSize: 15 }}
        />
        {busqueda ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Borrar búsqueda" hitSlop={10} onPress={() => setBusqueda('')}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color.textoSecundario} strokeWidth={2.4} strokeLinecap="round">
              <Path d="M6 6l12 12M18 6L6 18" />
            </Svg>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  const cabecera = (
    <View style={{ gap: 4, paddingBottom: 14 }}>
      <Text style={{ color: color.primario, fontFamily: fuente.titulo, fontSize: 18, letterSpacing: -0.2 }}>MediQ</Text>
      <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpoMedio, fontSize: 14 }}>{fechaDeHoy(new Date())}</Text>
      <Text accessibilityRole="header" style={{ color: color.texto, fontFamily: fuente.titulo, fontSize: 32, lineHeight: 36, letterSpacing: -0.5 }}>
        Mi diario médico
      </Text>
      {!buscando ? <FranjaDeConexion conectado={hayInternet} porEnviar={pendientes.filter((p) => !p.error).length} /> : null}
      {proximaCita && !buscando ? <TarjetaDeProximaCita cita={proximaCita} /> : null}
      {!buscando && hoy.tomas.length > 0 ? (
        <View style={{ marginTop: 14 }}>
          <TarjetaDeHoy tomas={hoy.tomas} alMarcar={hoy.marcar} alDeshacer={hoy.deshacer} />
        </View>
      ) : null}
      {!buscando ? <ConsultasPendientes pendientes={pendientes} alDescartar={descartar} /> : null}
      {mostrarBarra ? barraDeBusqueda : null}
      {buscando && todas ? (
        <Text accessibilityLiveRegion="polite" style={{ marginTop: 14, color: color.textoSecundario, fontFamily: fuente.cuerpoSemi, fontSize: 13 }}>
          {textoDeResultados(resultados.length)}
          {truncado ? ' · se revisaron las 2 000 consultas más recientes' : ''}
        </Text>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.fondo }}>
      <SectionList
        scrollEventThrottle={32}
        onScroll={(e) => revisarBarra(e, false)}
        onScrollEndDrag={(e) => revisarBarra(e, true)}
        sections={secciones}
        keyExtractor={(c) => c.id}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onEndReached={cargarMas}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={cabecera}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 180 }}
        renderSectionHeader={({ section }) => (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, paddingBottom: 12 }}>
            <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpoBold, fontSize: 13, letterSpacing: 0.8, textTransform: 'uppercase' }}>
              {section.titulo}
            </Text>
            <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 13 }}>{textoDeTotal(section.total)}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const t = datosDeTarjeta(item);
          return (
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              <View style={{ width: 44, alignItems: 'center', paddingTop: 12 }}>
                <Text style={{ color: color.texto, fontFamily: fuente.titulo, fontSize: 24, lineHeight: 26 }}>{t.dia}</Text>
                <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpoSemi, fontSize: 12 }}>{t.diaDeLaSemana}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Abrir consulta: ${t.titulo}`}
                onPress={() => router.push({ pathname: '/consulta-detalle', params: { id: item.id } })}
                style={{ flex: 1, backgroundColor: color.superficie, borderColor: color.borde, borderWidth: 1, borderRadius: radio.lg, paddingVertical: 14, paddingHorizontal: 16, gap: 8 }}>
                <View style={{ alignSelf: 'flex-start', backgroundColor: color.primarioSuave, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ color: color.primario, fontFamily: fuente.cuerpoBold, fontSize: 12 }}>{t.especialidad}</Text>
                </View>
                <Text style={{ color: color.texto, fontFamily: fuente.cuerpoSemi, fontSize: 16 }}>{t.titulo}</Text>
                {t.resumen ? (
                  <Text numberOfLines={2} style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 14, lineHeight: 20 }}>
                    {t.resumen}
                  </Text>
                ) : null}
              </Pressable>
            </View>
          );
        }}
        ListEmptyComponent={
          buscando ? (
            falloTodas ? (
              <View accessibilityRole="alert" style={{ gap: 10, alignItems: 'center', marginTop: 40 }}>
                <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 15, textAlign: 'center' }}>
                  No pudimos buscar. Revisa tu conexión.
                </Text>
                <Pressable accessibilityRole="button" onPress={cargarTodas} style={{ minHeight: 44, justifyContent: 'center' }}>
                  <Text style={{ color: color.primario, fontFamily: fuente.cuerpoBold, fontSize: 15 }}>Reintentar</Text>
                </Pressable>
              </View>
            ) : todas === null || cargandoTodas ? (
              <EsqueletoDelDiario />
            ) : (
              <Text style={{ marginTop: 30, color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 15, lineHeight: 22, textAlign: 'center' }}>
                {mensajeSinResultados(busqueda, true)}
              </Text>
            )
          ) : estaCargando(diario, fallo) ? (
            <EsqueletoDelDiario />
          ) : fallo ? (
            <View accessibilityRole="alert" style={{ gap: 10, alignItems: 'center', marginTop: 40 }}>
              <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 15, textAlign: 'center' }}>
                No pudimos cargar tu diario. Revisa tu conexión.
              </Text>
              <Pressable accessibilityRole="button" onPress={recargar} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ color: color.primario, fontFamily: fuente.cuerpoBold, fontSize: 15 }}>Reintentar</Text>
              </Pressable>
            </View>
          ) : vacio ? (
            <View style={{ backgroundColor: color.superficie, borderWidth: 1, borderStyle: 'dashed', borderColor: color.bordeVacio, borderRadius: radio.lg, paddingVertical: 24, paddingHorizontal: 16, alignItems: 'center', gap: 6 }}>
              <Text style={{ color: color.texto, fontFamily: fuente.cuerpoSemi, fontSize: 16 }}>Aún no tienes consultas</Text>
              <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 14, lineHeight: 20, textAlign: 'center' }}>
                Toca «Nueva consulta» para registrar la primera.
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={cargandoMas ? <ActivityIndicator color={color.primario} style={{ marginVertical: 16 }} /> : null}
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/consulta-nueva')}
        style={{ position: 'absolute', right: 20, bottom: 110, height: 52, paddingLeft: 16, paddingRight: 20, borderRadius: 26, backgroundColor: color.texto, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color.sobrePrimario} strokeWidth={2.4} strokeLinecap="round">
          <Path d="M12 5v14M5 12h14" />
        </Svg>
        <Text style={{ color: color.sobrePrimario, fontFamily: fuente.cuerpoSemi, fontSize: 15 }}>Nueva consulta</Text>
      </Pressable>
    </SafeAreaView>
  );
}
