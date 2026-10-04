import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTema } from '../theme';

export function Card({ children }: { children: ReactNode }) {
  const { color, radio, espacio } = useTema();
  return (
    <View
      style={{
        backgroundColor: color.superficie,
        borderColor: color.borde,
        borderWidth: 1,
        borderRadius: radio.lg,
        padding: espacio.lg,
        gap: espacio.sm,
      }}>
      {children}
    </View>
  );
}
