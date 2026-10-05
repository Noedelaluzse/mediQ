import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { ContainerProvider } from '@/app/ContainerContext';
import { crearContainer } from '@/app/container';
import { SesionProvider, useSesion } from '@/modules/auth/presentation/SesionProvider';
import { ThemeProvider, tema } from '@/shared/theme';
import { fuentesACargar } from '@/shared/theme/fonts.assets';

SplashScreen.preventAutoHideAsync();

function Rutas() {
  const { estado } = useSesion();
  const [fuentesListas, errorDeFuentes] = useFonts(fuentesACargar);
  const listo = estado !== 'cargando' && (fuentesListas || errorDeFuentes !== null);

  useEffect(() => {
    if (listo) SplashScreen.hideAsync();
  }, [listo]);

  if (!listo) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: tema.color.fondo } }}>
      <Stack.Protected guard={estado !== 'activa'}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={estado === 'activa'}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="medico" options={{ presentation: 'card' }} />
        <Stack.Screen name="medico-detalle" />
        <Stack.Screen name="medicos-elegir" />
        <Stack.Screen name="consulta-nueva" />
        <Stack.Screen name="consulta-detalle" />
        <Stack.Screen name="lugares" />
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
