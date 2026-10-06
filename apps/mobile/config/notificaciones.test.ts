/// <reference types="node" />
// RF-40: los avisos son notificaciones LOCALES y no necesitan ninguna capacidad especial de iOS. El config plugin de
// expo-notifications SIEMPRE agrega la entitlement `aps-environment` (push), que no se puede aprovisionar con una cuenta gratuita
// de Apple Developer y rompe la firma de la app (su opción enableBackgroundRemoteNotifications solo toca UIBackgroundModes).
// Por eso el plugin NO se usa: el módulo nativo se enlaza solo con estar instalado. Ver docs/solucion-de-problemas.md §3.24.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const raiz = resolve(__dirname, '..');
const expo = JSON.parse(readFileSync(resolve(raiz, 'app.json'), 'utf8')).expo;
const paquete = JSON.parse(readFileSync(resolve(raiz, 'package.json'), 'utf8'));
const nombresDePlugins: string[] = expo.plugins.map((p: unknown) => (Array.isArray(p) ? p[0] : p));

describe('notificaciones (avisos de próxima cita)', () => {
  it('expo-notifications está instalado (se enlaza solo, sin config plugin)', () => {
    expect(paquete.dependencies['expo-notifications']).toBeDefined();
  });

  it('NO se usa el config plugin de expo-notifications: agregaría la capacidad de push y rompería la firma con cuenta gratuita', () => {
    expect(nombresDePlugins).not.toContain('expo-notifications');
  });

  it('no se declara ninguna capacidad de push en el proyecto iOS', () => {
    expect(Object.keys(expo.ios?.entitlements ?? {})).not.toContain('aps-environment');
  });
});
