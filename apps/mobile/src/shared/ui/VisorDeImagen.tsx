import { Image, Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { useTema } from '../theme';
import { ajustarAPantalla, ZOOM_MAXIMO } from './visorDeImagen';

/**
 * Visor de una imagen a pantalla completa (F035): fondo oscuro, la imagen completa y centrada, zoom con los dedos en iPhone (pellizcar)
 * y una ✕ para cerrar. Sirve para leer con calma algo como la foto de una receta. En Android no hay zoom con los dedos, pero se ve entera.
 */
export function VisorDeImagen({ visible, uri, ancho, alto, etiqueta, alCerrar }: { visible: boolean; uri: string; ancho?: number; alto?: number; etiqueta: string; alCerrar: () => void }) {
  const { color, fuente } = useTema();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const medidas = ajustarAPantalla({ ancho, alto }, { ancho: width, alto: height });

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={alCerrar} supportedOrientations={['portrait', 'landscape']}>
      <View style={{ flex: 1, backgroundColor: color.texto }}>
        <ScrollView
          maximumZoomScale={ZOOM_MAXIMO}
          minimumZoomScale={1}
          centerContent
          bouncesZoom
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
          <Image accessibilityLabel={etiqueta} source={{ uri }} resizeMode="contain" style={{ width: medidas.ancho, height: medidas.alto }} />
        </ScrollView>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar la foto"
          onPress={alCerrar}
          hitSlop={8}
          style={{ position: 'absolute', top: insets.top + 8, right: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: color.texto, borderWidth: 1, borderColor: color.sobrePrimario, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color.sobrePrimario} strokeWidth={2.6} strokeLinecap="round">
            <Path d="M6 6l12 12M18 6L6 18" />
          </Svg>
        </Pressable>

        <Text style={{ position: 'absolute', bottom: insets.bottom + 14, alignSelf: 'center', color: color.sobrePrimario, opacity: 0.75, fontFamily: fuente.cuerpo, fontSize: 13 }}>Pellizca para acercar</Text>
      </View>
    </Modal>
  );
}
