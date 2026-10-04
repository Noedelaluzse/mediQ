import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque';
import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
} from '@expo-google-fonts/figtree';

import type { NombreDeFuente } from './fonts';

/** Archivos de fuente para `useFonts`. El tipo obliga a registrar todos los nombres de `NOMBRES_DE_FUENTE`. */
export const fuentesACargar: Record<NombreDeFuente, number> = {
  'BricolageGrotesque-Bold': BricolageGrotesque_700Bold,
  'Figtree-Regular': Figtree_400Regular,
  'Figtree-Medium': Figtree_500Medium,
  'Figtree-SemiBold': Figtree_600SemiBold,
  'Figtree-Bold': Figtree_700Bold,
};
