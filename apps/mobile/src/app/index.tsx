import { ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Chip, TextField } from '@/shared/ui';
import { useTema } from '@/shared/theme';

// Vista previa de los componentes base del prototipo (Fase 0).
export default function HomeScreen() {
  const { color, espacio } = useTema();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.fondo }}>
      <ScrollView contentContainerStyle={{ padding: espacio.xl, gap: espacio.lg }}>
        <Text style={{ color: color.texto, fontSize: 32, fontWeight: '700' }}>MediQ</Text>
        <Text style={{ color: color.textoSecundario, fontSize: 16 }}>Tu diario de consultas médicas</Text>
        <Card>
          <Chip label="Cardiología" />
          <Text style={{ color: color.texto, fontSize: 18, fontWeight: '600' }}>Consulta de control</Text>
          <Text style={{ color: color.textoSecundario }}>12 de septiembre · Dr. Ramírez</Text>
          <Chip label="Receta adjunta" receta />
        </Card>
        <TextField label="Motivo de la consulta" placeholder="Ej. dolor de cabeza" />
        <Button label="Registrar consulta" />
        <Button label="Ver diario" variante="secundario" />
      </ScrollView>
    </SafeAreaView>
  );
}
