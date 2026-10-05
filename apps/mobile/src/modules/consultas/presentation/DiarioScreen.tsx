import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, SectionList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { useCasoDeUso } from '@/app/ContainerContext';
import { fechaDeHoy } from '@/shared/kernel/fechas';
import { useTema } from '@/shared/theme';

import type { DiarioCargado } from '../application/ListarDiario';
import { datosDeTarjeta, textoDeTotal } from './tarjetaDelDiario';

/** "Mi diario médico" (RF-12, HU-07): las consultas de la más reciente a la más antigua, agrupadas por mes. */
export function DiarioScreen() {
  const { color, fuente, radio } = useTema();
  const listarDiario = useCasoDeUso('listarDiario');
  const [diario, setDiario] = useState<DiarioCargado | null>(null);
  const [fallo, setFallo] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const enCurso = useRef(false);

  /** Recarga desde la primera página (al abrir y al volver a la pestaña, p. ej. tras guardar una consulta). */
  const recargar = useCallback(() => {
    if (enCurso.current) return;
    enCurso.current = true;
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
  }, [listarDiario]);

  useFocusEffect(recargar);

  const cargarMas = () => {
    if (!diario?.hayMas || enCurso.current) return;
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

  const secciones = (diario?.grupos ?? []).map((g) => ({ clave: g.clave, titulo: g.titulo, total: g.total, data: g.consultas }));
  const vacio = diario !== null && diario.consultas.length === 0;

  const cabecera = (
    <View style={{ gap: 4, paddingBottom: 14 }}>
      <Text style={{ color: color.primario, fontFamily: fuente.titulo, fontSize: 18, letterSpacing: -0.2 }}>MediQ</Text>
      <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpoMedio, fontSize: 14 }}>{fechaDeHoy(new Date())}</Text>
      <Text accessibilityRole="header" style={{ color: color.texto, fontFamily: fuente.titulo, fontSize: 32, lineHeight: 36, letterSpacing: -0.5 }}>
        Mi diario médico
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.fondo }}>
      <SectionList
        sections={secciones}
        keyExtractor={(c) => c.id}
        stickySectionHeadersEnabled={false}
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
              {/* Abrir el detalle de la consulta llega con F015. */}
              <View style={{ flex: 1, backgroundColor: color.superficie, borderColor: color.borde, borderWidth: 1, borderRadius: radio.lg, paddingVertical: 14, paddingHorizontal: 16, gap: 8 }}>
                <View style={{ alignSelf: 'flex-start', backgroundColor: color.primarioSuave, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ color: color.primario, fontFamily: fuente.cuerpoBold, fontSize: 12 }}>{t.especialidad}</Text>
                </View>
                <Text style={{ color: color.texto, fontFamily: fuente.cuerpoSemi, fontSize: 16 }}>{t.titulo}</Text>
                {t.resumen ? (
                  <Text numberOfLines={2} style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 14, lineHeight: 20 }}>
                    {t.resumen}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          diario === null && !fallo ? (
            <ActivityIndicator color={color.primario} style={{ marginTop: 40 }} />
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
