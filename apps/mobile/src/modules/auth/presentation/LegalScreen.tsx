import { router, useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { useTema } from '@/shared/theme';

import { DOCUMENTOS, type Documento } from '../domain/Consentimiento';
import { DOCUMENTOS_LEGALES, etiquetaDeVersion, RESPONSABLE } from '../domain/DocumentosLegales';

/** Lee el aviso de privacidad o los términos completos (`/legal?documento=aviso_privacidad|terminos`). Se abre desde el login, desde la aceptación y desde el Perfil. */
export function LegalScreen() {
  const { color, fuente, radio } = useTema();
  const { documento } = useLocalSearchParams<{ documento?: string }>();
  const clave: Documento = DOCUMENTOS.find((d) => d === documento) ?? 'aviso_privacidad';
  const d = DOCUMENTOS_LEGALES[clave];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.fondo }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 36, gap: 18 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => router.back()}
          style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: color.borde, backgroundColor: color.superficie, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color.texto} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M15 5l-7 7 7 7" />
          </Svg>
        </Pressable>

        <View style={{ gap: 6 }}>
          <Text accessibilityRole="header" style={{ color: color.texto, fontFamily: fuente.titulo, fontSize: 30, lineHeight: 34, letterSpacing: -0.5 }}>
            {d.titulo}
          </Text>
          <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpoMedio, fontSize: 13 }}>Versión del {etiquetaDeVersion(d.version)}</Text>
        </View>

        <Text style={{ color: color.texto, fontFamily: fuente.cuerpo, fontSize: 15, lineHeight: 23 }}>{d.introduccion}</Text>

        {d.secciones.map((s, n) => (
          <View key={s.titulo} style={{ gap: 8 }}>
            <Text accessibilityRole="header" style={{ color: color.texto, fontFamily: fuente.cuerpoBold, fontSize: 16 }}>
              {n + 1}. {s.titulo}
            </Text>
            {s.parrafos.map((p) => (
              <Text key={p} style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 15, lineHeight: 23 }}>
                {p}
              </Text>
            ))}
          </View>
        ))}

        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Escribir a ${RESPONSABLE.correo}`}
          onPress={() => void Linking.openURL(`mailto:${RESPONSABLE.correo}`)}
          style={{ minHeight: 48, borderRadius: radio.md, backgroundColor: color.primarioSuave, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
          <Text style={{ color: color.primario, fontFamily: fuente.cuerpoBold, fontSize: 15 }}>Escribir a {RESPONSABLE.correo}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
