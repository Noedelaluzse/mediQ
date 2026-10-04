import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { ContainerProvider } from '@/app/ContainerContext';
import { crearContainer } from '@/app/container';
import { SesionProvider, useSesion } from '@/modules/auth/presentation/SesionProvider';
import { ThemeProvider, tema } from '@/shared/theme';

SplashScreen.preventAutoHideAsync();

function Rutas() {
  const { estado } = useSesion();

  useEffect(() => {
    if (estado !== 'cargando') SplashScreen.hideAsync();
  }, [estado]);

  if (estado === 'cargando') return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: tema.color.fondo } }}>
      <Stack.Protected guard={estado !== 'activa'}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={estado === 'activa'}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [container] = useState(crearContainer);
  return (
    <ContainerProvider container={container}>
      <ThemeProvider>
        <SesionProvider>
          <Rutas />
        </SesionProvider>
      </ThemeProvider>
    </ContainerProvider>
  );
}
