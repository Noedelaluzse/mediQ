import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Linking, Pressable, Text, View } from 'react-native';

import { diagnostico } from '@/shared/kernel/diagnostico';
import { useCasoDeUso } from '@/app/ContainerContext';
import { useTema } from '@/shared/theme';
import { VisorDeImagen } from '@/shared/ui/VisorDeImagen';

import type { FotoDeReceta } from '../domain/FotoDeReceta';
import type { OrigenDeFoto } from '../domain/SelectorDeFoto';
import { EsqueletoDeLaFoto } from './esqueletos';
import { mensajeDeErrorDeConsulta } from './mensajes';

type Cargada = { foto: FotoDeReceta; uri: string };

/**
 * Foto de la receta de una consulta (RF-30, HU-05): cámara o galería, una sola; se ve aquí y se puede reemplazar o quitar. Sin internet
 * (`puedeEditar` falso, F032) no se carga ni se cambia: la foto es un archivo grande y no tiene copia local.
 */
export function FotoDeRecetaSeccion({ consultaId, puedeEditar = true }: { consultaId: string; puedeEditar?: boolean }) {
  const { color, fuente, radio } = useTema();
  const adjuntar = useCasoDeUso('adjuntarFotoDeReceta');
  const obtener = useCasoDeUso('obtenerFotoDeReceta');
  const quitar = useCasoDeUso('quitarFotoDeReceta');

  const [cargada, setCargada] = useState<Cargada | null>(null);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  // La foto abierta a pantalla completa (F035): para leer la receta con calma.
  const [ampliada, setAmpliada] = useState(false);

  const cargar = useCallback(() => {
    obtener.ejecutar(consultaId).then(
      (f) => {
        setCargada(f);
        setCargando(false);
      },
      // La foto es secundaria: si falla la carga, el detalle sigue funcionando sin ella.
      () => setCargando(false),
    );
  }, [consultaId, obtener]);

  useEffect(() => {
    if (puedeEditar) cargar();
  }, [cargar, puedeEditar]);

  async function elegir(origen: OrigenDeFoto) {
    setOcupado(true);
    try {
      const r = await adjuntar.ejecutar(consultaId, origen);
      if (!r.ok) return Alert.alert('No pudimos adjuntar la foto', mensajeDeErrorDeConsulta(r.error));
      if (r.value.estado === 'adjuntada') return cargar();
      if (r.value.estado === 'permiso-denegado') {
        Alert.alert(
          'Sin permiso para la cámara',
          r.value.puedePreguntar ? 'Sin ese permiso no podemos abrir la cámara. Puedes elegir una foto de tu galería.' : 'Actívalo en Ajustes para usar la cámara, o elige una foto de tu galería.',
          [
            { text: 'Elegir de galería', onPress: () => elegir('galeria') },
            ...(r.value.puedePreguntar ? [] : [{ text: 'Abrir Ajustes', onPress: () => void Linking.openSettings() }]),
            { text: 'Cancelar', style: 'cancel' as const },
          ],
        );
      }
    } catch (e) {
      diagnostico.advertir('foto de la receta: no se pudo guardar', e);
      Alert.alert('No pudimos guardar la foto', 'Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setOcupado(false);
    }
  }

  function preguntarOrigen() {
    Alert.alert('Foto de la receta', undefined, [
      { text: 'Tomar foto', onPress: () => elegir('camara') },
      { text: 'Elegir de galería', onPress: () => elegir('galeria') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  function confirmarQuitar() {
    Alert.alert('¿Quitar la foto?', 'Se borrará de tu cuenta.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: async () => {
          setOcupado(true);
          try {
            await quitar.ejecutar(consultaId);
            setCargada(null);
          } catch {
            Alert.alert('No pudimos quitar la foto', 'Revisa tu conexión e inténtalo de nuevo.');
          } finally {
            setOcupado(false);
          }
        },
      },
    ]);
  }

  const boton = { minHeight: 48, borderRadius: radio.md, borderWidth: 1, borderColor: color.bordeCampo, backgroundColor: color.superficie, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, flex: 1 } as const;
  const textoBoton = { color: color.texto, fontFamily: fuente.cuerpoSemi, fontSize: 14 } as const;

  if (!puedeEditar && !cargada) {
    return <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 14, lineHeight: 20 }}>La foto de la receta no está disponible sin internet.</Text>;
  }
  if (cargando && puedeEditar) return <EsqueletoDeLaFoto />;

  return (
    <View style={{ gap: 10 }}>
      {cargada ? (
        <>
          <Pressable
            accessibilityRole="imagebutton"
            accessibilityLabel="Foto de la receta"
            accessibilityHint="Toca para verla en pantalla completa"
            onPress={() => setAmpliada(true)}>
            <Image
              source={{ uri: cargada.uri }}
              resizeMode="contain"
              style={{ width: '100%', aspectRatio: cargada.foto.ancho && cargada.foto.alto ? cargada.foto.ancho / cargada.foto.alto : 3 / 4, maxHeight: 420, borderRadius: radio.lg, backgroundColor: color.superficie, borderWidth: 1, borderColor: color.borde }}
            />
          </Pressable>
          <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 12 }}>Toca la foto para verla en grande.</Text>
          <VisorDeImagen visible={ampliada} uri={cargada.uri} ancho={cargada.foto.ancho} alto={cargada.foto.alto} etiqueta="Foto de la receta" alCerrar={() => setAmpliada(false)} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable accessibilityRole="button" disabled={ocupado || !puedeEditar} accessibilityState={{ disabled: ocupado || !puedeEditar }} onPress={preguntarOrigen} style={{ ...boton, opacity: ocupado || !puedeEditar ? 0.5 : 1 }}>
              <Text style={textoBoton}>{ocupado ? 'Guardando…' : 'Reemplazar foto'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={ocupado || !puedeEditar} accessibilityState={{ disabled: ocupado || !puedeEditar }} onPress={confirmarQuitar} style={{ ...boton, opacity: ocupado || !puedeEditar ? 0.5 : 1 }}>
              <Text style={{ ...textoBoton, color: color.peligro }}>Quitar</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable accessibilityRole="button" disabled={ocupado || !puedeEditar} accessibilityState={{ disabled: ocupado || !puedeEditar }} onPress={() => elegir('camara')} style={{ ...boton, opacity: ocupado || !puedeEditar ? 0.5 : 1 }}>
            <Text style={textoBoton}>{ocupado ? 'Guardando…' : 'Tomar foto'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={ocupado || !puedeEditar} accessibilityState={{ disabled: ocupado || !puedeEditar }} onPress={() => elegir('galeria')} style={{ ...boton, opacity: ocupado || !puedeEditar ? 0.5 : 1 }}>
            <Text style={textoBoton}>Elegir de galería</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
