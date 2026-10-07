import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { useCasoDeUso } from '@/app/ContainerContext';
import { useEdicion } from '@/app/useEdicion';
import { useTema } from '@/shared/theme';
import { AvisoSinConexion } from '@/shared/ui/AvisoSinConexion';
import { llamar } from '@/shared/ui/llamar';
import { estaCargando } from '@/shared/ui/esqueleto';
import { iniciales } from '@/shared/ui/iniciales';

import type { DetalleDeMedico } from '../application/ObtenerDetalleDeMedico';
import { nombreDeEspecialidad } from '../domain/Medico';
import { EsqueletoDelDetalleDelMedico } from './esqueletos';
import { fechaConAnio, fechaCorta } from './fechas';
import { detalleDeConsultas } from './mensajes';

/** Detalle del médico (RF-21): contadores, dónde lo atendió, datos de contacto y consultas recientes. */
export function MedicoDetalleScreen() {
  const { color, fuente, radio } = useTema();
  const { id } = useLocalSearchParams<{ id: string }>();
  const obtenerDetalle = useCasoDeUso('obtenerDetalleDeMedico');
  const { puedeEditar, motivo: motivoSinInternet } = useEdicion();
  const [detalle, setDetalle] = useState<DetalleDeMedico | null>(null);
  const [fallo, setFallo] = useState(false);

  const cargar = useCallback(() => {
    obtenerDetalle.ejecutar(id).then(
      (d) => {
        // Si el médico ya no existe (p. ej. se eliminó desde Editar) se vuelve a la lista.
        if (!d) return router.back();
        setDetalle(d);
        setFallo(false);
      },
      () => setFallo(true),
    );
  }, [id, obtenerDetalle]);

  useFocusEffect(cargar);

  const tarjeta = { backgroundColor: color.superficie, borderColor: color.borde, borderWidth: 1 } as const;
  const etiqueta = { color: color.textoSecundario, fontFamily: fuente.cuerpoSemi, fontSize: 12 } as const;
  const divisor = { borderBottomWidth: 1, borderBottomColor: color.borde } as const;
  const m = detalle?.medico;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.fondo }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28, gap: 20 }}>
        <AvisoSinConexion motivo={motivoSinInternet} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver a mis médicos"
            onPress={() => router.back()}
            style={{ ...tarjeta, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color.texto} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M15 5l-7 7 7 7" />
            </Svg>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !puedeEditar }}
            disabled={!puedeEditar}
            onPress={() => router.push({ pathname: '/medico', params: { id } })}
            style={{ ...tarjeta, height: 44, paddingHorizontal: 16, borderRadius: 22, justifyContent: 'center', opacity: puedeEditar ? 1 : 0.45 }}>
            <Text style={{ color: color.texto, fontFamily: fuente.cuerpoSemi, fontSize: 14 }}>Editar</Text>
          </Pressable>
        </View>

        {estaCargando(detalle, fallo) ? <EsqueletoDelDetalleDelMedico /> : null}
        {fallo ? (
          <View accessibilityRole="alert" style={{ gap: 10, alignItems: 'center', marginTop: 40 }}>
            <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 15, textAlign: 'center' }}>
              No pudimos cargar al médico. Revisa tu conexión.
            </Text>
            <Pressable accessibilityRole="button" onPress={cargar} style={{ minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ color: color.primario, fontFamily: fuente.cuerpoBold, fontSize: 15 }}>Reintentar</Text>
            </Pressable>
          </View>
        ) : null}

        {detalle && m ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: color.primarioSuave, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: color.primario, fontFamily: fuente.titulo, fontSize: 24 }}>{iniciales(m.nombreCompleto)}</Text>
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text accessibilityRole="header" style={{ color: color.texto, fontFamily: fuente.titulo, fontSize: 26, lineHeight: 30, letterSpacing: -0.4 }}>
                  {m.nombreCompleto}
                </Text>
                <View style={{ alignSelf: 'flex-start', backgroundColor: color.primarioSuave, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ color: color.primario, fontFamily: fuente.cuerpoBold, fontSize: 12 }}>{nombreDeEspecialidad(m.especialidad)}</Text>
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ ...tarjeta, flex: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, gap: 2 }}>
                <Text style={{ color: color.texto, fontFamily: fuente.titulo, fontSize: 22 }}>{detalle.consultas}</Text>
                <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 12 }}>Consultas</Text>
              </View>
              <View style={{ ...tarjeta, flex: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, gap: 2 }}>
                <Text style={{ color: color.texto, fontFamily: fuente.titulo, fontSize: 22 }}>
                  {detalle.ultimaVisita ? fechaCorta(detalle.ultimaVisita) : '—'}
                </Text>
                <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 12 }}>Última visita</Text>
              </View>
            </View>

            <View style={{ ...tarjeta, borderRadius: radio.lg, paddingHorizontal: 16, paddingVertical: 4 }}>
              {detalle.lugares.length > 0 ? (
                <View style={{ ...divisor, minHeight: 56, justifyContent: 'center', gap: 2, paddingVertical: 8 }}>
                  <Text style={etiqueta}>Te ha atendido en</Text>
                  {detalle.lugares.map((l) => (
                    <View key={l.nombre} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                      <Text style={{ color: color.texto, fontFamily: fuente.cuerpo, fontSize: 15, flexShrink: 1 }}>{l.nombre}</Text>
                      <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 15 }}>{detalleDeConsultas(l.consultas)}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={{ ...divisor, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={etiqueta}>Teléfono</Text>
                  <Text style={{ color: m.telefono ? color.texto : color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 15 }}>
                    {m.telefono ?? 'Sin registrar'}
                  </Text>
                </View>
                {m.telefono ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Llamar a ${m.nombreCompleto}`}
                    onPress={() => void llamar(m.telefono ?? '')}
                    style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color.primario, alignItems: 'center', justifyContent: 'center' }}>
                    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color.sobrePrimario} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z" />
                    </Svg>
                  </Pressable>
                ) : null}
              </View>

              <View style={{ ...divisor, minHeight: 56, justifyContent: 'center', gap: 2, paddingVertical: 8 }}>
                <Text style={etiqueta}>Cédula profesional</Text>
                <Text style={{ color: m.cedula ? color.texto : color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 15 }}>
                  {m.cedula ?? 'Sin registrar'}
                </Text>
              </View>

              <View style={{ minHeight: 56, justifyContent: 'center', gap: 2, paddingVertical: 8 }}>
                <Text style={etiqueta}>Notas</Text>
                <Text style={{ color: m.notas ? color.texto : color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 15, lineHeight: 21 }}>
                  {m.notas ?? 'Sin notas'}
                </Text>
              </View>
            </View>

            {detalle.recientes.length > 0 ? (
              <>
                <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpoBold, fontSize: 13, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                  Consultas con este médico
                </Text>
                {/* El detalle de cada consulta llega con F015. */}
                <View style={{ gap: 10 }}>
                  {detalle.recientes.map((c) => (
                    <View key={c.id} style={{ ...tarjeta, borderRadius: radio.lg, paddingVertical: 14, paddingHorizontal: 16, gap: 2 }}>
                      <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpoSemi, fontSize: 13 }}>
                        {c.lugar ? `${fechaConAnio(c.fecha)} · ${c.lugar}` : fechaConAnio(c.fecha)}
                      </Text>
                      <Text style={{ color: color.texto, fontFamily: fuente.cuerpoSemi, fontSize: 15 }}>{c.motivo ?? 'Consulta'}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/consulta-nueva', params: { medicoId: id } })}
              style={{ height: 54, borderRadius: 27, backgroundColor: color.primario, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color.sobrePrimario} strokeWidth={2.4} strokeLinecap="round">
                <Path d="M12 5v14M5 12h14" />
              </Svg>
              <Text style={{ color: color.sobrePrimario, fontFamily: fuente.cuerpoBold, fontSize: 16 }}>Nueva consulta con este médico</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
