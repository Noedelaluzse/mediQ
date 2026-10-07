import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { ContainerProvider } from '@/app/ContainerContext';
import { crearContainer } from '@/app/container';
import { SesionProvider, useSesion } from '@/modules/auth/presentation/SesionProvider';
import { mostrarAvisosConLaAppAbierta, registrarCategoriasDeAvisos } from '@/modules/consultas/infrastructure/ProgramadorDeAvisosExpo';
import { useAvisoTocado } from '@/modules/consultas/presentation/useAvisoTocado';
import { useEnvioDePendientes } from '@/modules/consultas/presentation/useEnvioDePendientes';
import { useSincronizarAvisos } from '@/modules/consultas/presentation/useSincronizarAvisos';
import { ThemeProvider, tema } from '@/shared/theme';
import { fuentesACargar } from '@/shared/theme/fonts.assets';

SplashScreen.preventAutoHideAsync();
mostrarAvisosConLaAppAbierta();
registrarCategoriasDeAvisos();

/** Abre la consulta cuando el usuario toca un aviso (de cita o de toma), pone al día los avisos al volver a la app y envía las consultas capturadas sin internet; solo se monta con la sesión activa. */
function EscuchaDeAvisos() {
  useAvisoTocado();
  useSincronizarAvisos();
  useEnvioDePendientes();
  return null;
}

function Rutas() {
  const { estado } = useSesion();
  const [fuentesListas, errorDeFuentes] = useFonts(fuentesACargar);
  const listo = estado !== 'cargando' && (fuentesListas || errorDeFuentes !== null);

  useEffect(() => {
    if (listo) SplashScreen.hideAsync();
  }, [listo]);

  if (!listo) return null;

  return (
    <>
    {estado === 'activa' ? <EscuchaDeAvisos /> : null}
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
        <Stack.Screen name="receta" />
        <Stack.Screen name="lugares" />
        <Stack.Screen name="salud" />
      </Stack.Protected>
    </Stack>
    </>
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
