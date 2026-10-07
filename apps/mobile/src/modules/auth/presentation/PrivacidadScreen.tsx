import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { useTema } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Casilla } from '@/shared/ui/Casilla';

import type { Documento } from '../domain/Consentimiento';
import { DOCUMENTOS_LEGALES } from '../domain/DocumentosLegales';
import { puedeContinuar, TEXTO_DE_ACEPTACION_DE_TERMINOS, TEXTO_DE_ACEPTACION_DEL_AVISO } from './aceptacionDeConsentimiento';
import { useSesion } from './SesionProvider';

const DESCRIPCION: Record<Documento, string> = {
  aviso_privacidad: 'Qué datos de salud guardamos, para qué, quién los cuida y tus derechos.',
  terminos: 'Cómo usar MediQ y qué esperar de la app.',
};

/**
 * Aceptación del aviso de privacidad y de los términos (RF-03). Cada uno se puede leer completo y se acepta con su propia casilla; la del
 * aviso es el consentimiento EXPRESO para datos personales sensibles de salud que pide la ley. Sin las dos no se continúa.
 */
export function PrivacidadScreen() {
  const { color, fuente, radio, espacio } = useTema();
  const { aceptarAviso } = useSesion();
  const [aviso, setAviso] = useState(false);
  const [terminos, setTerminos] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const listo = puedeContinuar({ aviso, terminos });

  async function continuar() {
    setGuardando(true);
    try {
      await aceptarAviso();
    } finally {
      setGuardando(false);
    }
  }

  const documento = (clave: Documento) => {
    const d = DOCUMENTOS_LEGALES[clave];
    return (
      <Pressable
        key={clave}
        accessibilityRole="link"
        accessibilityLabel={`Leer ${d.titulo}`}
        onPress={() => router.push({ pathname: '/legal', params: { documento: clave } })}
        style={{ minHeight: 64, borderRadius: radio.lg, borderWidth: 1, borderColor: color.borde, backgroundColor: color.superficie, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: color.texto, fontFamily: fuente.cuerpoSemi, fontSize: 16 }}>{d.titulo}</Text>
          <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 13, lineHeight: 18 }}>{DESCRIPCION[clave]}</Text>
        </View>
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color.textoSecundario} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M9 5l7 7-7 7" />
        </Svg>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.fondo }}>
      <ScrollView contentContainerStyle={{ padding: espacio.xl, gap: espacio.lg }}>
        <Text accessibilityRole="header" style={{ color: color.texto, fontFamily: fuente.titulo, fontSize: 30, lineHeight: 34, letterSpacing: -0.5 }}>
          Antes de empezar
        </Text>
        <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 15, lineHeight: 23 }}>
          MediQ guarda información de salud: tus consultas, lo que te indicó el médico y tus recetas. Son datos personales sensibles, por eso solo tú puedes verlos. Lee cómo los cuidamos y, si estás de acuerdo, acepta para continuar.
        </Text>
        <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 15, lineHeight: 23 }}>
          MediQ no da diagnósticos ni sustituye a tu médico. Puedes eliminar tu cuenta y todos tus datos cuando quieras.
        </Text>

        <View style={{ gap: 10 }}>{(['aviso_privacidad', 'terminos'] as const).map(documento)}</View>

        <View style={{ gap: 4 }}>
          <Casilla marcada={aviso} texto={TEXTO_DE_ACEPTACION_DEL_AVISO} alCambiar={setAviso} />
          <Casilla marcada={terminos} texto={TEXTO_DE_ACEPTACION_DE_TERMINOS} alCambiar={setTerminos} />
        </View>
      </ScrollView>
      <View style={{ padding: espacio.xl, gap: 8 }}>
        {listo ? null : <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 13, textAlign: 'center' }}>Marca las dos casillas para continuar.</Text>}
        <View style={{ opacity: listo && !guardando ? 1 : 0.45 }} pointerEvents={listo && !guardando ? 'auto' : 'none'}>
          <Button label={guardando ? 'Guardando…' : 'Aceptar y continuar'} onPress={continuar} />
        </View>
      </View>
    </SafeAreaView>
  );
}
