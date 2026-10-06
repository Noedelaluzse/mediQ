import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useTema } from '@/shared/theme';

import { destinoPostLogin } from './destinoPostLogin';
import { useSesion } from './SesionProvider';

type Icono = (props: { color: string }) => ReactNode;

const trazo = { fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const IconoCalendario: Icono = ({ color }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24">
    <Rect x={4} y={5} width={16} height={16} rx={2} stroke={color} {...trazo} />
    <Path d="M4 10h16M9 3v4M15 3v4" stroke={color} {...trazo} />
  </Svg>
);

const IconoCamara: Icono = ({ color }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24">
    <Rect x={3} y={6} width={18} height={14} rx={2} stroke={color} {...trazo} />
    <Circle cx={12} cy={13} r={3.5} stroke={color} {...trazo} />
    <Path d="M8 6l1.5-2h5L16 6" stroke={color} {...trazo} />
  </Svg>
);

const IconoCandado: Icono = ({ color }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24">
    <Rect x={5} y={10} width={14} height={10} rx={2} stroke={color} {...trazo} />
    <Path d="M8 10V7a4 4 0 0 1 8 0v3" stroke={color} {...trazo} />
  </Svg>
);

export function LoginScreen() {
  const { color, fuente, radio, espacio } = useTema();
  const { iniciarSesion } = useSesion();
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function continuarConGoogle() {
    setCargando(true);
    setError(null);
    const r = await iniciarSesion();
    setCargando(false);
    if (r.ok) router.replace(destinoPostLogin(r.value));
    else if (r.error.name !== 'LoginCanceladoError') setError('No pudimos iniciar sesión. Intenta de nuevo.');
  }

  const beneficios: { icono: Icono; texto: string; fondo: string; tinta: string }[] = [
    { icono: IconoCalendario, texto: 'Registra cada consulta con fecha, médico y lugar', fondo: color.primarioSuave, tinta: color.primario },
    { icono: IconoCamara, texto: 'Guarda la foto de tu receta y sus medicamentos', fondo: color.acentoRecetaSuave, tinta: color.acentoReceta },
    { icono: IconoCandado, texto: 'Privado: solo tú puedes ver tu información', fondo: color.primarioSuave, tinta: color.primario },
  ];

  const textoPie = { color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 13, lineHeight: 19, textAlign: 'center' } as const;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.fondo }}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, gap: 28 }}>
        <Image
          accessibilityRole="image"
          accessibilityLabel="Logotipo de MediQ"
          source={require('../../../../assets/images/logo-horizontal.png')}
          resizeMode="contain"
          style={{ width: 160, aspectRatio: 2400 / 553, alignSelf: 'flex-start' }}
        />

        <View style={{ gap: 14, marginTop: 28 }}>
          <Text
            accessibilityRole="header"
            style={{ color: color.texto, fontFamily: fuente.titulo, fontSize: 36, lineHeight: 40, letterSpacing: -0.8 }}>
            Lo que te dijo el médico, siempre a la mano.
          </Text>
          <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 16, lineHeight: 24 }}>
            Tu diario de consultas, recetas y medicamentos en un solo lugar.
          </Text>
        </View>

        <View style={{ gap: espacio.md }}>
          {beneficios.map(({ icono: Icono, texto, fondo, tinta }) => (
            <View
              key={texto}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                backgroundColor: color.superficie,
                borderColor: color.borde,
                borderWidth: 1,
                borderRadius: radio.lg,
                paddingVertical: 14,
                paddingHorizontal: espacio.lg,
              }}>
              <View style={{ width: 40, height: 40, borderRadius: radio.md, backgroundColor: fondo, alignItems: 'center', justifyContent: 'center' }}>
                <Icono color={tinta} />
              </View>
              <Text style={{ flex: 1, color: color.texto, fontFamily: fuente.cuerpoMedio, fontSize: 15, lineHeight: 21 }}>{texto}</Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 'auto', gap: 14 }}>
          {error ? (
            <Text accessibilityRole="alert" style={{ color: color.acentoReceta, fontFamily: fuente.cuerpoMedio, textAlign: 'center' }}>
              {error}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={cargando}
            onPress={continuarConGoogle}
            style={({ pressed }) => ({
              height: 56,
              borderRadius: 28,
              backgroundColor: color.texto,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              opacity: pressed || cargando ? 0.85 : 1,
            })}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: color.superficie, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: color.texto, fontFamily: fuente.cuerpoBold, fontSize: 15 }}>G</Text>
            </View>
            <Text style={{ color: color.sobrePrimario, fontFamily: fuente.cuerpoBold, fontSize: 16 }}>
              {cargando ? 'Conectando…' : 'Continuar con Google'}
            </Text>
          </Pressable>

          <Text style={textoPie}>La primera vez creamos tu cuenta automáticamente. No necesitas contraseña.</Text>
          <View style={{ height: 1, backgroundColor: color.borde }} />
          <Text style={textoPie}>
            Al continuar aceptas el <Text style={{ color: color.primario, fontFamily: fuente.cuerpoSemi }}>Aviso de privacidad</Text> y los{' '}
            <Text style={{ color: color.primario, fontFamily: fuente.cuerpoSemi }}>Términos de uso</Text>.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
