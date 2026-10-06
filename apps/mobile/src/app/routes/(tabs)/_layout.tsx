import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useSaludPendiente } from '@/modules/auth/presentation/saludPendiente';
import { useSaludAlEntrar } from '@/modules/auth/presentation/useSaludAlEntrar';
import { useTema } from '@/shared/theme';

export default function TabsLayout() {
  const { color } = useTema();
  useSaludAlEntrar();
  const saludPendiente = useSaludPendiente();
  return (
    <NativeTabs backgroundColor={color.superficie} indicatorColor={color.primarioSuave} tintColor={color.primario}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Diario</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={require('@/assets/images/tabIcons/home.png')} renderingMode="template" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="medicos">
        <NativeTabs.Trigger.Label>Médicos</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={require('@/assets/images/tabIcons/explore.png')} renderingMode="template" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="perfil">
        <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
        {/* Sin texto, la insignia es un puntito: faltan datos de salud por llenar (F028). */}
        <NativeTabs.Trigger.Badge hidden={!saludPendiente} />
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }}
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
