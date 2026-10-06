import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { useCasoDeUso } from '@/app/ContainerContext';
import { useTema } from '@/shared/theme';
import { estaCargando } from '@/shared/ui/esqueleto';
import { EsqueletoDeTarjetasConAvatar } from '@/shared/ui/Esqueletos';
import { iniciales } from '@/shared/ui/iniciales';

import type { MedicoEnDirectorio } from '../application/ListarDirectorio';
import { nombreDeEspecialidad } from '../domain/Medico';
import { resumenDeConsultas } from './fechas';

/** Pestaña "Mis médicos" (RF-20): lista de médicos guardados, o estado vacío. El botón para agregar va abajo, como el del Diario. */
export function MedicosScreen() {
  const { color, fuente, radio } = useTema();
  const listarDirectorio = useCasoDeUso('listarDirectorio');
  const [medicos, setMedicos] = useState<MedicoEnDirectorio[] | null>(null);
  const [fallo, setFallo] = useState(false);

  const cargar = useCallback(() => {
    listarDirectorio.ejecutar().then(
      (m) => {
        setMedicos(m);
        setFallo(false);
      },
      () => setFallo(true),
    );
  }, [listarDirectorio]);

  useFocusEffect(cargar);

  const nuevo = () => router.push('/medico');
  const vacio = medicos !== null && medicos.length === 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.fondo }}>
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 12, gap: 18 }}>
        <Text accessibilityRole="header" style={{ color: color.texto, fontFamily: fuente.titulo, fontSize: 32, lineHeight: 36, letterSpacing: -0.5 }}>
          Mis médicos
        </Text>

        {estaCargando(medicos, fallo) ? <EsqueletoDeTarjetasConAvatar cantidad={4} etiqueta="Cargando tus médicos" /> : null}

        {fallo ? (
          <View accessibilityRole="alert" style={{ gap: 10, alignItems: 'center', marginTop: 40 }}>
            <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 15, textAlign: 'center' }}>
              No pudimos cargar tus médicos. Revisa tu conexión.
            </Text>
            <Pressable accessibilityRole="button" onPress={cargar} style={{ minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ color: color.primario, fontFamily: fuente.cuerpoBold, fontSize: 15 }}>Reintentar</Text>
            </Pressable>
          </View>
        ) : null}

        {vacio ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 12, paddingBottom: 40 }}>
            <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: color.primarioSuave, alignItems: 'center', justifyContent: 'center' }}>
              <Svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke={color.primario} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <Circle cx={10} cy={8} r={4} />
                <Path d="M2.5 21c0-4 3.3-7 7.5-7 1.3 0 2.5.3 3.6.8" />
                <Path d="M18 14v6M15 17h6" />
              </Svg>
            </View>
            <Text style={{ color: color.texto, fontFamily: fuente.titulo, fontSize: 22, lineHeight: 28, textAlign: 'center' }}>
              Aún no tienes médicos
            </Text>
            <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 15, lineHeight: 22, textAlign: 'center' }}>
              Se guardan solos cuando registras una consulta. También puedes agregarlos con el botón de abajo.
            </Text>
          </View>
        ) : null}

        {medicos && medicos.length > 0 ? (
          <>
            <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 14, lineHeight: 20 }}>
              Se guardan solos cuando registras una consulta. Elige uno para no volver a escribir sus datos.
            </Text>
            <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 180 }}>
              {medicos.map(({ medico: m, consultas, ultimaVisita }) => (
                <Pressable
                  key={m.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${m.nombreCompleto}, ${nombreDeEspecialidad(m.especialidad)}`}
                  onPress={() => router.push({ pathname: '/medico-detalle', params: { id: m.id } })}
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
                    <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 13 }}>
                      {resumenDeConsultas(consultas, ultimaVisita)}
                    </Text>
                  </View>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color.textoSecundario} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M9 5l7 7-7 7" />
                  </Svg>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Agregar médico"
        onPress={nuevo}
        style={{ position: 'absolute', right: 20, bottom: 110, height: 52, paddingLeft: 16, paddingRight: 20, borderRadius: 26, backgroundColor: color.texto, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color.sobrePrimario} strokeWidth={2.4} strokeLinecap="round">
          <Path d="M12 5v14M5 12h14" />
        </Svg>
        <Text style={{ color: color.sobrePrimario, fontFamily: fuente.cuerpoSemi, fontSize: 15 }}>Agregar médico</Text>
      </Pressable>
    </SafeAreaView>
  );
}
