import { describe, expect, it } from 'vitest';

import { agregarManifiestoDeEscena, parcharAppDelegate } from './sceneLifecycle';

const APP_DELEGATE = `internal import Expo
import React

@main
class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    reactNativeFactory = factory

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
`;

describe('parcharAppDelegate', () => {
  const parchado = parcharAppDelegate(APP_DELEGATE);

  it('hace que AppDelegate provea la fábrica de React Native a la escena', () => {
    expect(parchado).toContain('class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {');
  });

  it('ya no crea la ventana ni arranca React Native (lo hace la escena)', () => {
    expect(parchado).not.toContain('UIWindow(frame:');
    expect(parchado).not.toContain('startReactNative');
  });

  it('conserva la ventana, la fábrica y la llamada a super', () => {
    expect(parchado).toContain('var window: UIWindow?');
    expect(parchado).toContain('reactNativeFactory = factory');
    expect(parchado).toContain('return super.application(application, didFinishLaunchingWithOptions: launchOptions)');
  });

  it('es idempotente', () => {
    expect(parcharAppDelegate(parchado)).toBe(parchado);
  });

  it('falla con un mensaje claro si la plantilla cambió', () => {
    expect(() => parcharAppDelegate('class Otra {}')).toThrow(/AppDelegate/);
  });
});

describe('agregarManifiestoDeEscena', () => {
  const resultado = agregarManifiestoDeEscena({ CFBundleName: 'mediQ' });

  it('declara EXExpoAppSceneDelegate como delegado de la escena de la ventana', () => {
    const manifiesto = resultado.UIApplicationSceneManifest as {
      UIApplicationSupportsMultipleScenes: boolean;
      UISceneConfigurations: Record<string, { UISceneConfigurationName: string; UISceneDelegateClassName: string }[]>;
    };
    expect(manifiesto.UIApplicationSupportsMultipleScenes).toBe(false);
    expect(manifiesto.UISceneConfigurations.UIWindowSceneSessionRoleApplication).toEqual([
      { UISceneConfigurationName: 'Default Configuration', UISceneDelegateClassName: 'EXExpoAppSceneDelegate' },
    ]);
  });

  it('conserva el resto de las llaves y es idempotente', () => {
    expect(resultado.CFBundleName).toBe('mediQ');
    expect(agregarManifiestoDeEscena(resultado)).toEqual(resultado);
  });
});
