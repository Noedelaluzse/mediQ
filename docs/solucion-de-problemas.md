# Solución de problemas

Guía de errores que ya ocurrieron en este proyecto, con su causa y su solución. **Consúltala primero cuando aparezca cualquier error** de compilación, instalación, firma, simulador, iPhone, Metro o Firebase. Cuando resuelvas un error nuevo, agrégalo aquí (síntoma → causa → solución).

Contexto fijo del proyecto:

| Dato | Valor |
| --- | --- |
| Bundle ID | `com.michysoft.mediq` (iOS y Android) |
| Team ID de Apple (Personal Team) | `3T5S4YR2DT` |
| iPhone de pruebas | "iPhone de Noah", iPhone 15, iOS 27.0, UDID `00008120-000603503E31A01E` |
| Simulador de pruebas | iPhone 17 Pro, UDID `25066934-67CC-4304-B6B9-9EC3ABEC8EF9` (iOS 26.5) |
| Proyecto Firebase | `nuvia-dev-5ddce` (compartido con otra app; MediQ solo escribe en `mediq_users`) |
| Gestor de paquetes | pnpm (monorepo) |

---

## 1. Compilación nativa de iOS

### 1.1 `No such file or directory: /Volumes/Macbook` al compilar
- **Síntoma:** `xcodebuild` falla en los pasos `[CP] Copy XCFrameworks` y `Generate app.config for prebuilt Constants.manifest`.
- **Causa:** la ruta del repo (`/Volumes/Macbook EHD/...`) tiene un **espacio**; los scripts de CocoaPods no entrecomillan la ruta y la cortan.
- **Solución:** compilar desde una copia sin espacios.
  ```bash
  rsync -a --delete --exclude .git --exclude apps/mobile/ios --exclude apps/mobile/android --exclude apps/mobile/.expo ./ ~/mediq-build/
  cd ~/mediq-build/apps/mobile && export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8
  pnpm exec expo run:ios --device <UDID> --no-bundler
  ```
  Metro se sigue ejecutando desde el repo real. Repite el `rsync` cada vez que cambie el código. No borra `ios/` de la copia (queda excluido).

### 1.2 `No space left on device` / `ENOSPC`
- **Síntoma:** Xcode muestra "Certificate installation failed … No space left on device"; el build se corta; incluso la herramienta de comandos de Claude falla con `ENOSPC` al abrir su archivo temporal.
- **Causa:** el disco interno del Mac se llenó (cada build nativo ocupa varios GB; ya llegó al 99 %).
- **Solución:**
  1. Borrar solo las cachés de build de mediQ (se regeneran): `rm -rf ~/Library/Developer/Xcode/DerivedData/mediQ-*`.
  2. También son seguras de borrar: `~/Library/Developer/Xcode/DerivedData/ModuleCache.noindex` y `~/Library/Caches/CocoaPods`.
  3. Si el disco está tan lleno que la herramienta de comandos no corre, usar la terminal integrada de la app.
  4. Dejar **al menos 10 GB libres** antes de compilar para un iPhone. Lo demás (simuladores, `iOS DeviceSupport`, almacén de pnpm) es decisión del usuario.

### 1.3 `ApplicationVerificationFailed` / `No code signature found`
- **Síntoma:** el build termina con éxito pero la instalación falla: `Failed to verify code signature of …/hermesvm.framework : 0xe800801c (No code signature found.)`.
- **Causa:** el build dejó **sin firma** varios frameworks embebidos (hermesvm, React, ExpoModulesCore…).
- **Solución:** firmar frameworks y app con el certificado de desarrollo y reinstalar.
  ```bash
  APP=~/Library/Developer/Xcode/DerivedData/mediQ-*/Build/Products/Debug-iphoneos/mediQ.app
  ID=$(security find-identity -v -p codesigning | awk 'NR==1{print $2}')
  codesign -d --entitlements :- $APP > /tmp/mediq.entitlements
  for f in $APP/Frameworks/*.framework $APP/*.dylib; do codesign --force --sign $ID --timestamp=none "$f"; done
  codesign --force --sign $ID --timestamp=none --entitlements /tmp/mediq.entitlements $APP
  xcrun devicectl device install app --device <UDID> $APP
  ```
  Comprobar antes: `for f in $APP/Frameworks/*.framework; do codesign -v "$f" || echo "SIN FIRMA $f"; done`. La causa de fondo no está resuelta; en builds incrementales a veces ya queda firmado.

### 1.4 Xcode: "Certificate installation failed" / "No profiles for 'com.michysoft.mediq' were found"
- **Causa habitual:** disco lleno (ver 1.2) o el equipo de firma no se ha elegido.
- **Solución:** liberar espacio y pulsar **Try Again** en Xcode → mediQ → Signing & Capabilities. Debe estar marcado *Automatically manage signing* con **Team = Personal Team**. La contraseña del llavero la escribe el usuario ("Permitir siempre" para `codesign`).

---

## 2. iPhone físico

### 2.1 El iPhone aparece `available` y no `connected`, o `unpaired`
- **Solución:** desbloquear el teléfono, aceptar "Confiar en esta computadora" y ejecutar:
  ```bash
  xcrun devicectl manage pair --device <UDID>
  xcrun devicectl list devices      # debe decir: connected / available (paired)
  ```
  Además: **Modo desarrollador** activo (Ajustes → Privacidad y seguridad), cable conectado.

### 2.2 "Desarrollador no confiable" al abrir la app
- **Solución:** en el iPhone: Ajustes → General → VPN y administración de dispositivos → tu Apple ID → **Confiar**.

### 2.3 La app se abre y se cierra sola (iOS 27)
- **Síntoma:** `App terminated due to signal 5`; el informe de caída muestra `EXC_BREAKPOINT` en `___UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`.
- **Causa:** iOS 27 aborta las apps compiladas con su SDK que no adoptan el ciclo de vida por escenas (UIScene). El simulador con iOS 26.x no lo exige.
- **Solución:** ya resuelto con el plugin local `apps/mobile/plugins/withSceneLifecycle.js` (registrado en `app.config.ts`): `AppDelegate` conforma `ExpoReactNativeFactoryProvider` y `Info.plist` declara `EXExpoAppSceneDelegate`. Si reaparece, regenerar con `expo prebuild --platform ios` y revisar que ambos cambios estén.
- **Cómo ver el informe de caída:**
  ```bash
  xcrun devicectl device copy from --device <UDID> --domain-type systemCrashLogs --source / --destination /tmp/crash
  xcrun devicectl device process launch --terminate-existing --console --device <UDID> com.michysoft.mediq
  ```

### 2.4 La app deja de abrir a los 7 días
- **Causa:** cuentas gratuitas de Apple firman por 7 días.
- **Solución:** reinstalar con `expo run:ios --device <UDID> --no-bundler` (ver 1.1). La versión de pago de Apple Developer evita la caducidad.

### 2.5 La app abre pero no carga / pantalla de error roja en el iPhone
- **Causa:** el teléfono no alcanza a Metro. El teléfono y el Mac deben estar en el **mismo Wi-Fi** y Metro debe estar corriendo.
- **Solución:** ver 3.1 y probar abrir con la dirección real del Mac:
  ```bash
  xcrun devicectl device process launch --terminate-existing --device <UDID> --payload-url "mediq://expo-development-client/?url=http%3A%2F%2F<IP_DEL_MAC>%3A8081" com.michysoft.mediq
  ```
  La IP se obtiene con `ipconfig getifaddr en0`.

---

## 3. Metro, Expo y simulador

### 3.1 `Could not connect to development server` / `127.0.0.1:8081`
- **Causa:** Metro se inició con `--localhost` y escucha solo en IPv6; el simulador conecta por `127.0.0.1`.
- **Solución:** iniciar Metro **sin** `--localhost`: `pnpm exec expo start --port 8081`. Comprobar: `curl 127.0.0.1:8081/status` debe responder `packager-status:running`.

### 3.2 Puerto 8081 ocupado ("Port 8081 is running this app in another window")
- **Solución:** buscar el proceso y cerrarlo por su PID: `lsof -iTCP:8081 -sTCP:LISTEN -n -P` y `kill <pid>`. **No usar** `pkill -f "expo start"` dentro de un comando que contenga ese mismo texto: se mata a sí mismo.

### 3.3 Rutas con tipos desactualizados tras mover archivos
- **Síntoma:** errores de typecheck como `Type '"/"' is not assignable to type …"/routes"…`.
- **Solución:** reiniciar Metro regenerando tipos: `rm -rf apps/mobile/.expo/types && pnpm exec expo start --clear`.

### 3.4 Expo Go: `Cannot find native module 'ExpoAsset'`, `Tried to register two views with the same name RNS…`
- **Causa:** Expo Go quedó en mal estado tras recargar sobre una sesión abierta (los avisos `RNS…` son inofensivos en desarrollo). `expo-font` necesita `expo-asset` instalado.
- **Solución:** `pnpm exec expo install expo-asset`, cerrar Expo Go por completo (`xcrun simctl terminate <UDID> host.exp.Exponent`) y abrir de nuevo.

### 3.5 Login real con Google no funciona en Expo Go
- **Causa:** `@react-native-google-signin` es código nativo; Expo Go no lo trae.
- **Solución:** usar un **development build** (`expo run:ios`). En Expo Go la app usa automáticamente el adaptador simulado.

### 3.6 Ver el login en el simulador cuando ya hay sesión guardada
- **Solución:** reiniciar el llavero del simulador (solo afecta al simulador de pruebas): `xcrun simctl keychain <UDID> reset`, y reabrir la app.

### 3.7 Pantalla gris o error de arranque tras instalar paquetes nativos
- **Causa:** un paquete nuevo con código nativo exige recompilar el development build.
- **Solución:** `expo install <paquete>` y volver a hacer `expo run:ios` (ver 1.1). Paquetes solo JS (como `firebase`) no necesitan recompilar.

---

## 4. Herramientas del repo

### 4.1 `ERR_PNPM_IGNORED_BUILDS`
- **Causa:** pnpm 10+ no ejecuta scripts de instalación sin permiso.
- **Solución:** en `pnpm-workspace.yaml`, bajo `allowBuilds`, poner `false` al paquete (o `true` si hace falta su script). Hoy: `unrs-resolver`, `@firebase/util`, `protobufjs` en `false`.

### 4.2 ESLint falla con `contextOrFilename.getFilename is not a function`
- **Causa:** ESLint 10 no es compatible con `eslint-plugin-react` (que usa `eslint-config-expo`).
- **Solución:** mantener **ESLint 9**.

### 4.3 Vitest no puede importar paquetes de React Native (`Flow is not supported`)
- **Causa:** `@expo-google-fonts/*`, `firebase/*`, `react-native` importan código que Node no entiende.
- **Solución:** separar la lógica pura (probable) del código que importa esos paquetes. Ver `fonts.ts` / `fonts.assets.ts` y `FirebaseAuthRepository.ts` / `FirebaseServicioIdentidad.ts`.

### 4.4 `app.config.ts` no encuentra un módulo local (`Cannot find module './src/…'`)
- **Causa:** Expo evalúa `app.config.ts` sin transformar imports a otros `.ts`.
- **Solución:** los módulos que use `app.config.ts` o sus plugins deben ser **JavaScript plano CommonJS** (con su `.d.ts`), como `config/google.js` y `plugins/sceneLifecycle.js`.

### 4.5 El hook `block-main.sh` bloquea un comando por una palabra del texto
- **Causa:** el hook revisa el comando completo, también el texto de commits/PR; una frase que contenga `--no-verify` lo bloquea.
- **Solución:** reformular el texto sin esa cadena. Los hooks de verificación nunca se saltan.

### 4.6 Rutas Expo Router: tipos y plugin
- La raíz de rutas es `apps/mobile/src/app/routes` (opción `root` del plugin `expo-router` en `app.json`). `container.ts` vive en `src/app/`.

---

## 5. Firebase y Google

| Síntoma | Causa | Solución |
| --- | --- | --- |
| `permission-denied` al escribir | Reglas de Firestore sin publicar, o escribir sin iniciar sesión en Firebase | Publicar las reglas de `docs/generado/verification.md`; el login entra a Firebase Auth con el `idToken` de Google antes de escribir |
| Firestore "no puede alcanzar el backend" / se cuelga | Canal por defecto de Firestore en React Native | Ya activado `experimentalAutoDetectLongPolling` en `firebase.ts` |
| Aviso amarillo "Auth state will default to memory persistence" | Firebase Auth sin AsyncStorage | **Intencional:** la sesión de la app vive en `expo-secure-store`; no instalar AsyncStorage solo por esto |
| "Acceso bloqueado / app no verificada" al iniciar con Google | Pantalla de consentimiento de OAuth en modo *Testing* | Agregar el correo como usuario de prueba en Google Cloud → APIs y servicios → Pantalla de consentimiento |
| La hoja de Google no vuelve a la app | Falta el esquema de URL invertido | Se genera de `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` en `app.config.ts`; revisar `.env.local` y regenerar con `expo prebuild` |

Variables en `apps/mobile/.env.local` (git las ignora; plantilla en `.env.example`): `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, `EXPO_PUBLIC_FIREBASE_APP_ID`. **Nunca** subir claves, IDs ni el `GoogleService-Info.plist` al repo.

---

## 6. Diseño de referencia

- El archivo `docs/MediQ — prototipo móvil.html` viene **empaquetado** (gzip + base64 dentro de `<script type="__bundler/manifest">`): una búsqueda de texto no encuentra nada. Se decodifica con Python (json + base64 + gzip) o se abre en un navegador.
- Fuente legible del diseño: el canvas de diseño del usuario (artifact) con `Login`, `Main` (Diario), `Consulta`, `Nueva`, `Receta` y `Medicos`. Leerlo con la herramienta de artifacts y copiar medidas, colores y fuentes (Bricolage Grotesque para títulos, Figtree para cuerpo).
