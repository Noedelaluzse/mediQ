import { Stack } from 'expo-router';
import { View } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { ContainerProvider } from '@/app/ContainerContext';
import { crearContainer } from '@/app/container';
import { CandadoProvider } from '@/modules/auth/presentation/CandadoProvider';
import { OfertaDelCandado } from '@/modules/auth/presentation/OfertaDelCandado';
import { PantallaDeBloqueo } from '@/modules/auth/presentation/PantallaDeBloqueo';
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
    <View style={{ flex: 1 }}>
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
      {/* Los textos legales se leen con o sin sesión (login, aceptación y Perfil). Va AL FINAL: la primera pantalla del Stack es la inicial. */}
      <Stack.Screen name="legal" />
    </Stack>
    {/* Candado con Face ID (F036): la pantalla de bloqueo va por encima de todo; la oferta sale una sola vez tras iniciar sesión. */}
    <PantallaDeBloqueo />
    <OfertaDelCandado />
    </View>
  );
}

export default function RootLayout() {
  const [container] = useState(crearContainer);
  return (
    <ContainerProvider container={container}>
      <ThemeProvider>
        <SesionProvider>
          <CandadoProvider>
            <Rutas />
          </CandadoProvider>
        </SesionProvider>
      </ThemeProvider>
    </ContainerProvider>
  );
}
