import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTema } from '@/shared/theme';
import { Button } from '@/shared/ui';

import { destinoPostLogin } from './destinoPostLogin';
import { useSesion } from './SesionProvider';

export function LoginScreen() {
  const { color, radio, espacio } = useTema();
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.fondo }}>
      <View style={{ flex: 1, padding: espacio.xl, justifyContent: 'space-between' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: espacio.lg }}>
          <View
            accessibilityRole="image"
            accessibilityLabel="Logotipo de MediQ"
            style={{
              width: 88,
              height: 88,
              borderRadius: radio.lg + 8,
              backgroundColor: color.primario,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={{ color: color.sobrePrimario, fontSize: 44, fontWeight: '700' }}>Q</Text>
          </View>
          <Text style={{ color: color.texto, fontSize: 34, fontWeight: '700' }}>MediQ</Text>
          <Text style={{ color: color.textoSecundario, fontSize: 17, textAlign: 'center', maxWidth: 300 }}>
            Tu diario de consultas médicas: lo que te dijo el médico, tus recetas y tu próxima cita en un solo lugar.
          </Text>
        </View>

        <View style={{ gap: espacio.md }}>
          {error ? (
            <Text accessibilityRole="alert" style={{ color: color.acentoReceta, textAlign: 'center' }}>
              {error}
            </Text>
          ) : null}
          <Button
            label={cargando ? 'Conectando…' : 'Continuar con Google'}
            onPress={cargando ? undefined : continuarConGoogle}
          />
          <Text style={{ color: color.textoSecundario, fontSize: 13, textAlign: 'center' }}>
            Al continuar aceptas el aviso de privacidad y los términos de uso.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
