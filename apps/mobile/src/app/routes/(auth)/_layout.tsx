import { Stack } from 'expo-router';

import { rutaInicialDeAcceso } from '@/modules/auth/presentation/destinoPostLogin';
import { useSesion } from '@/modules/auth/presentation/SesionProvider';

export default function AuthLayout() {
  const { estado } = useSesion();
  return <Stack initialRouteName={rutaInicialDeAcceso(estado)} screenOptions={{ headerShown: false }} />;
}
