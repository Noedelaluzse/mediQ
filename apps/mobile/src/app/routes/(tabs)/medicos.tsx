import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTema } from '@/shared/theme';

// Marcador de posición: el directorio real llega con F007 (RF-21).
export default function MedicosScreen() {
  const { color, espacio } = useTema();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.fondo }}>
      <View style={{ padding: espacio.xl }}>
        <Text style={{ color: color.texto, fontSize: 32, fontWeight: '700' }}>Médicos</Text>
      </View>
    </SafeAreaView>
  );
}
