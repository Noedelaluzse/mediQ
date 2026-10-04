import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTema } from '@/shared/theme';
import { Button } from '@/shared/ui';

import { useSesion } from './SesionProvider';

export function PrivacidadScreen() {
  const { color, espacio } = useTema();
  const { aceptarAviso } = useSesion();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.fondo }}>
      <ScrollView contentContainerStyle={{ padding: espacio.xl, gap: espacio.lg }}>
        <Text accessibilityRole="header" style={{ color: color.texto, fontSize: 28, fontWeight: '700' }}>
          Aviso de privacidad
        </Text>
        <Text style={{ color: color.textoSecundario, fontSize: 16, lineHeight: 24 }}>
          MediQ guarda información de salud: tus consultas, lo que te indicó el médico y tus recetas. Son datos
          personales sensibles, por eso solo tú puedes verlos.
        </Text>
        <Text style={{ color: color.textoSecundario, fontSize: 16, lineHeight: 24 }}>
          MediQ no da diagnósticos ni sustituye a tu médico. Puedes eliminar tu cuenta y todos tus datos cuando
          quieras.
        </Text>
      </ScrollView>
      <View style={{ padding: espacio.xl }}>
        <Button label="Entiendo, continuar" onPress={aceptarAviso} />
      </View>
    </SafeAreaView>
  );
}
