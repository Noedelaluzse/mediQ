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
  pnpm --filter mobile version:generate   # versión automática: la copia no tiene .git
  rsync -a --delete --exclude .git --exclude apps/mobile/ios --exclude apps/mobile/android --exclude apps/mobile/.expo ./ ~/mediq-build/
  cd ~/mediq-build/apps/mobile && export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8
  pnpm exec expo run:ios --device <UDID> --no-bundler
  ```
  Metro se sigue ejecutando desde el repo real. Repite el `rsync` cada vez que cambie el código. No borra `ios/` de la copia (queda excluido). **Tras cada `rsync`, si `ios/` ya existe, correr `pod install` en `~/mediq-build/apps/mobile/ios`** (ver §3.23): el `rsync --delete` borra archivos que `expo-sqlite` generó dentro de `node_modules`. Para el iPhone, el mismo comando con el UDID del teléfono (`--device 00008120-…`).

### 1.2 `No space left on device` / `ENOSPC`
- **Síntoma:** Xcode muestra "Certificate installation failed … No space left on device"; el build se corta; incluso la herramienta de comandos de Claude falla con `ENOSPC` al abrir su archivo temporal.
- **Causa:** el disco interno del Mac se llenó (cada build nativo ocupa varios GB; ya llegó al 99 %).
- **Solución:**
  1. Borrar solo las cachés de build de mediQ (se regeneran): `rm -rf ~/Library/Developer/Xcode/DerivedData/mediQ-*`.
  2. También son seguras de borrar: `~/Library/Developer/Xcode/DerivedData/ModuleCache.noindex` y `~/Library/Caches/CocoaPods`.
  3. Si el disco está tan lleno que la herramienta de comandos no corre, usar la terminal integrada de la app.
  4. Las cachés globales de `~/.npm` (varios GB) y `DerivedData/ModuleCache.noindex` se regeneran solas: `npm cache clean --force` y `rm -rf ~/Library/Developer/Xcode/DerivedData/ModuleCache.noindex`.
  5. `~/Library/Developer/Xcode/iOS DeviceSupport/` guarda los símbolos de cada versión de iOS que conectaste (≈6 GB cada una). Si el iPhone ya se actualizó, la carpeta de la versión **vieja** se puede borrar (Xcode la regenera si hace falta). Es decisión del usuario.
  6. Dejar **al menos 10 GB libres** antes de compilar para un iPhone. Lo demás (simuladores, `iOS DeviceSupport`, almacén de pnpm) es decisión del usuario.

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

### 3.9 Probar en el simulador en modo simulado (sin tocar Firebase real) y sale el login real de Google
- **Síntoma:** al tocar "Continuar con Google" en el simulador aparece la hoja de `accounts.google.com`, aunque se haya intentado vaciar las variables `EXPO_PUBLIC_*` o iniciar Metro en otro puerto.
- **Causa:** (a) Expo carga `apps/mobile/.env.local` aunque las variables se pasen vacías por la línea de comandos; (b) la app compilada **siempre pide su código al puerto 8081**: el enlace `mediq://expo-development-client/?url=…` no cambia el puerto.
- **Solución:** para correr en modo simulado (útil para probar acciones destructivas como eliminar la cuenta): apartar el archivo (`mv apps/mobile/.env.local apps/mobile/.env.local.APARTADO`), apagar cualquier Metro que ocupe el 8081, iniciar `pnpm exec expo start --port 8081 --clear` y reabrir la app. Al terminar, **restaurar** el archivo y reiniciar Metro. Con credenciales reales, la hoja de Google exige que el usuario escriba su contraseña; no se prueba sin él.

### 3.10 Probar contra el emulador de Firestore (reglas y borrado reales, sin tocar la nube)
- **Para qué:** comprobar el SDK de Firestore y las reglas de `firebase/firestore.rules` de verdad, sin datos reales ni plan Blaze. Ejemplo: `FirestoreEliminadorDeDatos.emulator.test.ts` siembra una cuenta con subcolecciones, borra como el propio usuario y verifica que no quede nada, que no se toque a otro usuario y que las reglas bloqueen a un intruso.
- **Cómo:** `pnpm --filter mobile test:emulator` (con `JAVA_HOME` apuntando a Java 17 si el Java por defecto es otro). Estas pruebas se omiten solas en `pnpm test` si no hay emulador.
- **Detalle:** usa `firebase-tools@13` porque `firebase-tools@15` exige Java 21 y el Mac tiene Java 17; el emulador descarga su `.jar` la primera vez. La app no usa el emulador: solo las pruebas.

### 3.11 TypeScript 6 no encuentra `node:fs`, `node:path` ni `__dirname`
- **Causa:** desde TypeScript 6 la opción `types` está vacía por defecto: ya no se incluyen solos los `@types/*`.
- **Solución:** poner `/// <reference types="node" />` solo en los archivos que usan Node (por ejemplo las pruebas del emulador); no activar `types: ["node"]` global, porque contaminaría el código de React Native.

### 3.12 "Eliminar mi cuenta" vuelve al login pero los datos siguen en Firestore
- **Síntoma:** la app termina sin error y vuelve al login, pero `mediq_users/{uid}` sigue en la consola, incluso tras volver a entrar.
- **Causa más probable:** la app corría en **modo simulado** (sin `.env.local` o sin credenciales de Firebase): en ese modo el borrado es un "no hacer nada" y no toca la nube. No hay otra señal visible salvo el aviso de Perfil.
- **Cómo comprobarlo:** en Perfil, el recuadro naranja *"Modo de pruebas (simulado)…"* indica modo simulado; en la terminal de Metro, el log `[MediQ] modo: Firebase real` o `SIMULADO` aparece al arrancar. Además, el log `[eliminarCuenta] terminó bien` o `falló:` (con su causa) confirma el resultado.
- **Verificado:** el borrado real funciona en iPhone físico (iOS 27) y con el emulador de Firestore (§3.10). Si ves un fallo real, copia la línea `[eliminarCuenta] falló:` de la terminal de Metro.

### 3.8 Metro se detiene solo a las ~2 horas, o se cae con `EIO: i/o error, write`
- **Síntoma:** el iPhone o el simulador muestran pantalla de error o se quedan cargando; Metro ya no responde en `127.0.0.1:8081`.
- **Causa:** (a) los procesos en segundo plano de la herramienta de Claude tienen un límite de tiempo y matan a Metro; (b) `EIO` es un fallo de entrada/salida del disco externo donde vive el proyecto (cable, puerto o hub USB).
- **Solución:** iniciar Metro en la **terminal integrada de la app** (no tiene límite de tiempo): `cd apps/mobile && pnpm exec expo start --port 8081`. Si hubo `EIO`, comprobar que el disco esté montado y se pueda escribir (`touch apps/mobile/.expo/x`), revisar `git fsck --connectivity-only` y cambiar de cable o puerto.

### 3.13 La app del simulador no muestra los cambios nuevos, o no deja escribir texto

- **Síntoma:** abres la app en el simulador y sigue la pantalla vieja (por ejemplo el marcador "Médicos"), aunque el código ya cambió.
- **Causa:** la app de desarrollo conserva el paquete anterior si solo se vuelve a abrir el enlace.
- **Solución:** cierra y relanza la app (`xcrun simctl terminate booted com.michysoft.mediq`, luego `launch` y abre el enlace de Metro) y espera a que el terminal de Metro llegue a 100 %.
- **Abrir una pantalla sin navegar:** con el enlace del esquema de la app, por ejemplo `xcrun simctl openurl booted "mediq:///medicos-elegir"` (esquema `mediq`, en `app.json`).
- **Tip:** las capturas del simulador llegan con ~2 s de retraso: espera antes de fotografiar. Y la acción `text` de la herramienta del simulador **no** escribe en los campos de React Native (solo copia al portapapeles): los campos de texto los llena el usuario a mano. Los toques (`tap`) a veces no responden si son instantáneos: usa `duration` de ~0.15 s, espera ~2 s y vuelve a fotografiar antes de concluir que algo falló (2026-10-06, probando el formulario «Mi salud»).

### 3.14 Se agregó un paquete con código nativo (por ejemplo el selector de fecha) y la app falla al abrir esa pantalla
- **Síntoma:** error rojo tipo `Cannot find native module` / `RNDateTimePicker` al abrir la pantalla nueva en el simulador o en el iPhone.
- **Causa:** la app de desarrollo instalada se compiló antes de agregar el paquete; Metro solo cambia el JavaScript.
- **Solución:** recompilar e instalar la app de desarrollo (ver §1.1: copia sin espacios y `expo run:ios`; para el simulador `--device "iPhone 17 Pro"`). Repetirlo para el iPhone.

### 3.16 Al abrir Nueva consulta falla con `Cannot find native module 'ExpoSQLite'`
- **Síntoma:** error rojo al abrir la pantalla; el borrador no funciona.
- **Causa:** `expo-sqlite` es código nativo y la app instalada se compiló antes de agregarlo (igual que §3.14).
- **Solución:** recompilar e instalar la app de desarrollo (§1.1; antes del `rsync` correr `pnpm --filter mobile version:generate`). Después hay que iniciar sesión de nuevo (la reinstalación borra la sesión).

### 3.17 `Cannot read property 'ejecutar' of undefined` justo después de agregar un caso de uso
- **Síntoma:** al usar una pantalla nueva aparece un aviso genérico ("No pudimos guardar…") y el registro de Metro dice `TypeError: Cannot read property 'ejecutar' of undefined`.
- **Causa:** el contenedor (`app/container.ts`) se crea una sola vez al arrancar la app (`useState(crearContainer)`). El refresco en caliente de Metro **no** lo vuelve a crear, así que el caso de uso nuevo no existe en la app que ya estaba abierta.
- **Solución:** cerrar la app y volver a abrirla (`xcrun simctl terminate booted com.michysoft.mediq` y abrir el enlace de Metro). No es un error del código.

### 3.18 En el simulador, la herramienta de "texto" dice que pegó pero el campo queda vacío
- **Síntoma:** al automatizar el simulador, `text` responde "Pasted N characters" y el campo sigue mostrando su ejemplo en gris.
- **Causa:** el pegado del simulador no llega al campo en esta configuración (teclado de hardware conectado, sin teclado en pantalla). No es un error de la app.
- **Solución:** probar a mano en el simulador (o el iPhone), o cubrir el flujo con pruebas de dominio/emulador y verificar solo el diseño con capturas. Anotar en el informe que el teclado no se pudo automatizar. (Se probó el 2026-10-06: tras `text`, tocar el campo hace aparecer el menú «Paste» de iOS y tocarlo tampoco inserta el texto; sigue sin funcionar.)

### 3.19 `expo run:ios` falla con `xcrun devicectl list devices … --timeout 5 exited with non-zero code: 2`
- **Síntoma:** al compilar para el simulador, Expo se cae antes de empezar con ese error de `devicectl`.
- **Causa:** Expo lista simuladores **y** iPhones conectados con un tiempo límite de 5 s; con el iPhone «paired» por red `devicectl` a veces tarda más. Es intermitente y no depende del código.
- **Solución:** repetir el mismo comando (a la segunda o tercera suele pasar) y pasar el **UDID** del simulador en vez del nombre (`--device 25066934-…`; se ve con `xcrun devicectl list devices`).

### 3.20 Subir una foto a Storage falla con `Creating blobs from 'ArrayBuffer' and 'ArrayBufferView' are not supported`
- **Síntoma:** al adjuntar la foto de la receta aparece «No pudimos guardar la foto» y Metro registra ese error (visible gracias al `console.warn` de `FotoDeRecetaSeccion`).
- **Causa:** el SDK web de Firebase Storage (`uploadString` con base64 y `uploadBytes` con `Uint8Array`) crea un `Blob` a partir de bytes, y React Native no lo permite. En el emulador de Node sí funciona, por eso las pruebas pasan y el fallo solo aparece en el teléfono.
- **Solución:** armar el `Blob` con `fetch` sobre una URI `data:` (`(await fetch('data:image/jpeg;base64,…')).blob()`) y subirlo con `uploadBytes`. Para bajar, `getBytes` sí funciona.
- **No confundir** con `storage/unauthorized` (§3.21): ese es de reglas.

### 3.21 Subir una foto falla con `storage/unauthorized` en un bucket recién creado
- **Síntoma:** `User does not have permission to access 'mediq_users/…/receta.jpg'` aunque la sesión es correcta.
- **Causa:** Storage se creó en modo producción, que **bloquea todo** hasta publicar `firebase/storage.rules`. Las reglas de Firestore no aplican a Storage.
- **Solución:** `npx --yes firebase-tools@13 deploy --only storage --project <id>` (solo cuando el usuario lo pida) y anotarlo en `docs/14`.

### 3.22 Cambié el icono o la pantalla de carga y el teléfono sigue mostrando el anterior
- **Síntoma:** `app.json` y `assets/images/` ya tienen el logo nuevo, pero la app instalada muestra el icono o el splash de antes (o el de Expo).
- **Causa:** son recursos **nativos**: se incrustan al compilar, no con Metro. En la copia `~/mediq-build` la carpeta `ios/` ya existe y `expo run:ios` no la regenera; además iOS cachea los iconos.
- **Solución:** borrar `~/mediq-build/apps/mobile/ios`, repetir el `rsync` (§1.1) y `expo run:ios`; si el icono sigue igual, desinstalar la app y volver a instalarla. Ver `docs/15-identidad-visual-y-logos.md`.

### 3.23 Compilar para el iPhone falla con `cannot find 'exsqlite3_open' in scope` (63 errores en `expo-sqlite`)
- **Síntoma:** `xcodebuild` termina con código 65 y decenas de `❌ cannot find 'exsqlite3_…' in scope` en `SQLiteModule.swift`. En el simulador sí compilaba. Las constantes (`SQLITE_OK`) se encuentran; solo faltan las **funciones**.
- **Causa real (Xcode 27):** el encabezado paraguas de `ExpoSQLite` hace `#import "sqlite3.h"` y, con el SDK de iPhone de Xcode 27, eso resuelve al `sqlite3.h` **del sistema** en vez del que trae el paquete (con las funciones prefijadas `exsqlite3_*`). Con `#import <ExpoSQLite/sqlite3.h>` compila.
- **Solución (ya aplicada en el repo):** el plugin `plugins/withSqliteHeader.js` agrega al `post_install` del Podfile un parche que cambia ese `import` en cada `pod install`. Probado: `xcodebuild -scheme ExpoSQLite -sdk iphoneos` pasó de 63 errores a `BUILD SUCCEEDED`. Si cambia `expo-sqlite` o Xcode y falla de otra forma, revisar si el plugin sigue haciendo falta (borrarlo cuando el paquete lo corrija).
- **Pista terciaria (se repitió en 3 compilaciones):** aun repitiendo `pod install`, a veces el archivo real `expo-sqlite/ios/sqlite3.h` no existe (el enlace de `Pods/Headers` queda colgando) porque CocoaPods **no vuelve a ejecutar** el paso que lo copia cuando el pod ya está en caché. Síntoma: `'ExpoSQLite/sqlite3.h' file not found`. Solución directa, en la copia `~/mediq-build`: `cd node_modules/.pnpm/expo-sqlite@*/node_modules/expo-sqlite && cp vendor/sqlite3/sqlite3.c vendor/sqlite3/sqlite3.h ios/` y volver a compilar.
- **Pista secundaria:** el `pod install` de `expo-sqlite` también **copia `sqlite3.c` y `sqlite3.h` dentro de `node_modules`**, y el `rsync --delete` de §1.1 los borra de la copia `~/mediq-build`. Si `ios/` ya existe, el enlace de `Pods/Headers` queda roto y el síntoma es el mismo. Por eso, tras cada `rsync` con `ios/` existente, correr `pod install` en `~/mediq-build/apps/mobile/ios`. Si el plugin es nuevo para esa copia, antes `pnpm exec expo prebuild --platform ios --no-install` (regenera el Podfile sin borrar `ios/`).

### 3.24 Agregar `expo-notifications` rompe la firma en el iPhone, o `pnpm add` falla con `No matching version found for expo-constants`
- **Síntoma A (instalación):** `expo install expo-notifications` falla con `ERR_PNPM_NO_MATCHING_VERSION … expo-constants@~57.0.21`.
- **Causa A:** la última versión (57.0.22) exige un `expo-constants` que el registro todavía no ofrece. **Solución:** fijar la anterior: `pnpm --filter mobile add expo-notifications@57.0.21` (queda sin `~` en `package.json`; actualizar junto con `expo-constants` cuando salga). **Resuelto el 2026-10-06:** salió `expo-constants` 57.0.21 y `expo install --fix` dejó `expo-notifications` en 57.0.22 (sigue sin `~` en `package.json`; ya no hace falta fijarla).
- **Síntoma B (firma):** con el config plugin `expo-notifications` en `app.json`, `prebuild` agrega la entitlement `aps-environment` (notificaciones push) a `ios/mediQ/mediQ.entitlements`.
- **Causa B:** el plugin la agrega **siempre** (su opción `enableBackgroundRemoteNotifications` solo toca `UIBackgroundModes`) y una cuenta gratuita de Apple Developer no puede aprovisionar la capacidad de push: la compilación para el iPhone fallaría al firmar.
- **Solución:** **no usar el plugin**. El módulo nativo se enlaza solo con estar instalado, y las notificaciones locales no necesitan entitlements ni permiso especial más allá de la pregunta del sistema. Lo vigila `config/notificaciones.test.ts`. Si se agregó por error, borrar el plugin de `app.json` y la clave `aps-environment` del `.entitlements`.
- **Reaparece en la copia `~/mediq-build` (2026-10-07):** aunque `app.json` ya no tenga el plugin, el `ios/mediQ/mediQ.entitlements` de la copia (que el `rsync` no toca y `prebuild` no limpia) conserva `aps-environment` de una compilación vieja y `expo run:ios --device` falla con `Personal development teams … do not support the Push Notifications capability` y `Entitlements file defines the value "aps-environment"`. **Solución:** borrar esa clave del `.entitlements` de la copia y compilar **sin** volver a correr `prebuild` (`pnpm exec expo run:ios --no-bundler --device <UDID>`). Antes de cada compilación al iPhone, comprobar `grep aps-environment ~/mediq-build/apps/mobile/ios/mediQ/mediQ.entitlements` (no debe imprimir nada).
- **Cuándo sí hará falta:** notificaciones push remotas (no previstas) o cuenta de pago de Apple Developer.

### 3.25 Una imagen se ve gigante y recortada en iOS aunque el estilo tenga `width` y `aspectRatio`
- **Síntoma:** el logo del login (`logo-horizontal.png`, 720×166 px) se veía enorme y solo aparecía «MQ» y un trozo de «M»; en el código el estilo pedía `width: 160` y `aspectRatio`.
- **Causa:** con `aspectRatio` la imagen se pintó a su tamaño original en puntos (720) y la pantalla la recortó. No se vio en el simulador de otras pantallas porque era la única imagen de la app y el login nunca se había visto con sesión abierta.
- **Solución:** dar **ancho y alto explícitos** (`tamanoDelLogo(160)` en `shared/ui/logo.ts`, que los calcula de las medidas reales y no pasa del tamaño de la imagen). La prueba `logo.test.ts` falla si se cambia el archivo y las medidas no se actualizan.
- **Cómo ver el login con la sesión abierta (sin cerrarla):** crear una ruta temporal que exporte `LoginScreen`, abrirla con `xcrun simctl openurl booted mediq://<ruta>` (o `open_url`) y borrarla al terminar. La pantalla no redirige sola.

### 3.26 En el simulador la pantalla no cambia aunque guardé el archivo (Metro «corriendo» pero sin ver los cambios)
- **Síntoma:** editas un archivo, `curl localhost:8081/status` dice `packager-status:running`, pero el simulador sigue mostrando la versión de antes aunque esperes (las capturas llegan con ~2 s de retraso, pero aquí no cambia ni tras 10 s).
- **Causa:** Metro vigila los archivos y, con el proyecto en el disco externo, a veces no recibe el aviso de que cambiaron (le pasó el 2026-10-06 con una pantalla temporal). La recarga rápida no se dispara.
- **Solución:** reiniciar la app del simulador para que pida el código otra vez: `xcrun simctl terminate booted com.michysoft.mediq`, `xcrun simctl launch booted com.michysoft.mediq`, esperar ~12 s y abrir la ruta con `xcrun simctl openurl booted "mediq://<ruta>"`. Si aun así no cambia, reiniciar Metro con `--clear` (ver §3.x de Metro).
- **Rutas temporales para ver una pantalla sin sesión:** se agregan como `<Stack.Screen name="…" />` **fuera** de los grupos protegidos de `app/routes/_layout.tsx`, así se abren con o sin sesión; hay que borrarlas (el archivo y esa línea) antes de commitear.

### 3.27 Sin internet, «Guardar» se queda en «Guardando…» para siempre (o el Diario tarda ~10 s en fallar)
- **Síntoma:** con el teléfono sin red, guardar una consulta no termina nunca; el Diario muestra su error después de una larga espera.
- **Causa:** Firestore (SDK web, sin persistencia en React Native) **no rechaza una escritura sin conexión: la deja esperando** (y se pierde si se cierra la app). Una lectura sin copia espera ~10 s a la red antes de fallar.
- **Solución (F030):** la consulta nueva se valida sin red y, sin internet, va a una cola local que se envía sola; las lecturas del Diario y de médicos usan una copia local; los envíos tienen tiempo límite (`conTiempoLimite`, 15 s) y los errores de red se reconocen con `esErrorDeRed`. **Lo que aún no tiene cola** (editar o eliminar consultas, médicos, lugares, recetas, fotos, Mi salud, «Ya la tomé») sí puede quedarse esperando sin internet.
- **Detalle importante:** `@react-native-community/netinfo` es un módulo nativo: tras instalarlo hay que **recompilar** la app del simulador y la del iPhone (§1.1), o la app falla al arrancar con «RNCNetInfo» no encontrado.

### 3.28 La app queda sin responder a los toques tras agregar una pantalla de bloqueo (`Attempt to present … RCTFabricModalHostViewController … not in the window hierarchy`)
- **Síntoma:** la app abre y se ve normal, pero ningún toque funciona (ni las pestañas ni los botones); aparece el aviso amarillo «Open debugger to view warnings». En el registro del simulador (`xcrun simctl spawn <udid> log show --last 2m --predicate 'process == "mediQ"'`): `Attempt to present <RCTFabricModalHostViewController> … whose view is not in the window hierarchy`.
- **Causa:** un `Modal` de React Native que nace ya visible en el primer dibujado (como la pantalla de bloqueo del candado, F036, que arranca bloqueada) se presenta antes de que la app esté en pantalla; iOS rechaza la presentación y el `Modal` queda a medias bloqueando los toques.
- **Solución:** la pantalla de bloqueo es una capa normal (`View` con `StyleSheet.absoluteFill`) sobre toda la app, no un `Modal`. Como los `Modal` de la app (visor de foto) se dibujan por encima de cualquier capa, `shared/kernel/bloqueoDeApp.ts` avisa del bloqueo y `VisorDeImagen` se esconde mientras esté puesto. Regla general: **no montar un `Modal` ya visible en el arranque**; mostrarlo después de un cambio de estado asíncrono.
- **Detalle:** al recompilar tras instalar `expo-local-authentication`, `pod install` falló con `Unicode Normalization not appropriate for ASCII-8BIT` hasta definir `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8` (§1.1). Face ID en el simulador: se registra con `xcrun simctl spawn <udid> notifyutil -s com.apple.BiometricKit.enrollmentChanged 1` y `-p com.apple.BiometricKit.enrollmentChanged`; para simular una cara reconocida, `notifyutil -p com.apple.BiometricKit_Sim.pearl.match` (`…pearl.nomatch` para una que falla).
### 3.29 La fecha de nacimiento se guarda un día después (elijo 8 de diciembre de 1999 y sale 9)
- **Síntoma:** en «Mi salud», al elegir una fecha en el selector aparece un día después al guardar (8 dic → 9 dic). Pasa con fechas antiguas (años en que la zona horaria era distinta a la de hoy), no con las recientes.
- **Causa:** el selector nativo de iOS usa la zona horaria **histórica** (en 1999 Cancún estaba en UTC-6) y JavaScript (Hermes) aplica el desfase **de hoy** (UTC-5) a todas las fechas. Una fecha a medianoche (`new Date(1999, 11, 8)`) la ve iOS como las 23:00 del día anterior; al elegir otro día el selector conserva esa hora y, vuelta a JavaScript, salta un día. Se comprobó mostrando el estado: JavaScript tenía `Dec 09 1999 00:00 GMT-0500` mientras el selector mostraba «8 dic».
- **Solución:** las fechas sin hora (`AAAA-MM-DD`) se convierten en Date **a mediodía** local (`isoAFecha`, `nacimientoPorDefecto` en `formularioDeSalud.ts`): una diferencia de una o dos horas ya no cambia el día. Pruebas: mediodía, corrimientos de ±3 h y la fecha propuesta por «Elegir fecha».
- **Regla general:** nunca representar un «solo día» como medianoche en un Date que pase por un selector nativo; usar mediodía. **Los datos ya guardados con el día corrido hay que corregirlos a mano** (volver a elegir la fecha y guardar): el texto guardado `AAAA-MM-DD` es lo que el usuario eligió, no hay forma de saber que estaba corrido.

### 3.30 El botón de llamar (teléfono del médico) «no hace nada»
- **Síntoma:** en el detalle de la consulta o del médico, el botón verde del teléfono no responde: no abre la marcación ni dice nada.
- **Causa:** (1) en el **simulador de iOS no se pueden hacer llamadas** (`xcrun simctl openurl booted tel:…` falla con `LSApplicationWorkspaceErrorDomain 115`); en un iPhone con línea sí marca. (2) El botón no avisaba del fallo: en iOS `Linking.openURL` **no lanza error cuando el sistema no puede abrir el enlace, responde `false`**, y el código solo atendía la excepción.
- **Solución:** `shared/ui/llamar.ts` (`llamar`) revisa tanto la excepción como el `false` y muestra «No se pudo iniciar la llamada» con el número; `shared/kernel/llamada.ts` (`enlaceDeLlamada`, probado) limpia el número (solo dígitos y el + inicial) y avisa si no hay dígitos suficientes. Los dos botones (detalle de consulta y de médico) usan la misma función.
- **Para probar una llamada de verdad:** en un iPhone con línea o iPad con llamadas por Wi-Fi; iOS pide confirmar antes de marcar. En el simulador, el aviso es el resultado esperado.
- **No usar `Linking.canOpenURL('tel:…')` para decidir:** en iOS devuelve `false` si el esquema no está en `LSApplicationQueriesSchemes`, aunque el teléfono sí pueda llamar.

### 3.31 El iPhone dice «Could not connect to development server» (Metro se cerró)
- **Síntoma:** la app de desarrollo del iPhone, al abrirla o reiniciarla, muestra «Could not connect to development server» (2026-10-07, tras reiniciar la app con `xcrun devicectl device process launch`).
- **Causa:** la app instalada es de **desarrollo**: baja su código de Metro, que corre en el Mac. Metro se había cerrado (no quedaba el proceso y `curl localhost:8081/status` no respondía). No era la red ni el cortafuegos (estaba desactivado).
- **Cómo comprobarlo:** `curl -s -m 5 http://<IP-del-Mac>:8081/status` debe responder `packager-status:running`; la IP sale de `ifconfig | grep "inet "` (interfaz `en0`). Si no responde, Metro no está corriendo.
- **Solución:** iniciar Metro **sin** `--localhost` desde el repo real y reiniciar la app: `pnpm --filter mobile exec expo start --dev-client --port 8081` y `xcrun devicectl device process launch --device 00008120-000603503E31A01E --terminate-existing com.michysoft.mediq`.
- **Límites:** el Mac debe estar encendido y en la **misma red Wi-Fi** que el iPhone mientras se prueba. Un Metro lanzado desde una sesión de Claude puede cerrarse al terminar la sesión: para algo duradero, iniciarlo en una terminal propia. Si el código cambió solo en JavaScript, **no hace falta recompilar** la app nativa (solo si cambian paquetes nativos, `app.json` o plugins: §1.1); la versión de Perfil se actualiza solo al recompilar. Quitar la dependencia de Metro es F019 (versión Release).

### 3.32 «La sesión guardada no coincide con la cuenta de Firebase» (`SesionDesfasadaError`)
- **Síntoma:** al abrir una pantalla de datos (Diario, médicos, perfil) falla con ese mensaje y no carga nada (desde F039, 2026-10-07).
- **Causa:** el uid de la sesión guardada en SecureStore es distinto del de Firebase Auth (`auth.currentUser`). Pasa, por ejemplo, si se cambió de cuenta de Google sin cerrar sesión de la app, o si quedó una sesión vieja. La app prefiere no consultar nada antes que hacerlo con un uid equivocado.
- **Solución:** cerrar sesión (Perfil) y volver a iniciar con Google. Si no se puede abrir el Perfil, borrar la app del teléfono.
- **No confundir:** si Auth aún no tiene usuario (justo al abrir, antes de re-autenticar), no hay error: se usa el uid de la sesión guardada y Firestore rechaza lo no autenticado. Detalle en `docs/10-autenticacion-con-google.md`.

### 3.33 No puedo iniciar sesión después de publicar las reglas de F042 (`googleSub` del token)
- **Síntoma:** tras iniciar sesión con Google la app dice que no pudo contactar al servidor y vuelve al login (`permission-denied` al guardar `mediq_users/{uid}`).
- **Causa:** la regla `googleSubDelToken` exige que `googleSub` sea igual a `request.auth.token.firebase.identities['google.com'][0]`. Falla si el token no trae esa identidad (inicio de sesión con otro proveedor) o si la cuenta se guardó antes con un `googleSub` distinto (la app cae a `user.uid` si no encuentra el proveedor Google).
- **Cómo comprobarlo:** en desarrollo, imprimir `(await user.getIdTokenResult()).claims.firebase` (solo las claves) y comparar con `user.providerData`. El 2026-10-07 con Google real coincidían.
- **Solución rápida:** volver a publicar las reglas anteriores (`git show 258afe5:firebase/firestore.rules`, `deploy --only firestore:rules`). Después, corregir la causa.

### 3.34 Guardar o quitar una receta falla con `permission-denied` después de F048
- **Síntoma:** al guardar o quitar la receta de una consulta, la app muestra un error y en el registro sale `PERMISSION_DENIED` en una escritura de `visits/{id}`.
- **Causa:** desde F048 guardar la receta también escribe `hasPrescription` en la consulta, y las reglas de Firestore **publicadas** todavía no aceptan ese campo (`hasOnly` de `visitaValida`). El código nuevo corre contra reglas viejas.
- **Solución:** publicar las reglas de `firebase/firestore.rules` (procedimiento de docs/14: pruebas del emulador primero y luego `npx --yes firebase-tools@13 deploy --only firestore:rules --project <id>`) **antes** de usar la app nueva con Firebase real, y anotarlo en la tabla de docs/14. Las reglas nuevas solo amplían lo permitido, así que una app vieja sigue funcionando con ellas.
- **En pruebas de emulador:** si una prueba guarda una receta de una consulta que no existe, o la consulta sembrada no es válida por completo, falla con el mismo error: la consulta debe existir y ser válida (el ayudante `sembrarConsultas` ya las crea completas). Las cuentas de prueba con consentimiento sembrado usan solo ciertas letras (`CUENTAS_DE_PRUEBA`).

### 3.35 Cierro la app del todo, me quedo sin internet, la abro y me manda al inicio de sesión
- **Síntoma:** con sesión iniciada, cerrar la app (también del segundo plano) y abrirla sin internet muestra la pantalla de inicio de sesión. Con la app ya abierta o en segundo plano sí se podía usar sin internet.
- **Causa:** al abrir, `ObtenerSesionActual` volvía a autenticar con Google (`signInSilently`) y con Firebase, que necesitan internet, y cualquier fallo se trataba como «no hay sesión». No distinguía «no hay internet» de «Google rechazó la cuenta».
- **Solución (F052):** `SinConexionError` separa los fallos de red (`esErrorDeRed`, incluido `auth/network-request-failed`) de los rechazos reales; sin internet se entra con la sesión guardada, «sin verificar», y se verifica al volver la conexión (RNF-11). Si alguna vez vuelve a pasar: revisar que `ObtenerSesionActual` reciba la red del teléfono (`redDelTelefono`) y no `conectividad` (esa dice «sin internet» hasta que la sesión se verifica y nunca se verificaría).

### 3.15 Perfil muestra una versión vieja o 1.0.0
- **Síntoma:** después de hacer commits, "versión …" en Perfil no cambia; o en una app compilada dice `versión 1.0.0`.
- **Causa:** la versión se calcula con git cuando arranca Metro o se compila. (1) Metro sigue con la versión anterior (reiniciarlo, con `--clear`: la versión se incrusta al empaquetar y también queda en la caché); (2) se compiló desde `~/mediq-build`, que no tiene `.git`, y faltó `version.generated.json`.
- **Solución:** (1) reiniciar Metro; (2) correr `pnpm --filter mobile version:generate` en el repo real **antes** del `rsync` y recompilar. Ver `docs/generado/conventions.md`.

### 3.36 Probar un cambio de JavaScript en el simulador y la app sigue igual (Metro no registra ninguna conexión)
- **Síntoma:** Metro corre en el 8081 pero su terminal no muestra «Bundling…», y la app del simulador no cambia aunque se relance y se abra el enlace `mediq://expo-development-client/?url=…`. `ls "$(xcrun simctl get_app_container booted com.michysoft.mediq app)"` muestra un `main.jsbundle`.
- **Causa:** la app instalada en el simulador era una compilación con el JavaScript **embebido** (de una prueba de rendimiento en Release): nunca pide el código a Metro.
- **Solución:** recompilar una versión de desarrollo con §1.1 (`expo run:ios --device <UDID> --no-bundler`; la primera vez tarda ~30 min porque compila todos los pods). Si falla con `'ExpoSQLite/sqlite3.h' file not found`: §3.23 (pista terciaria); ojo, en la copia el `ls -d node_modules/.pnpm/expo-sqlite@*/…` va en la **raíz** de `~/mediq-build`, no en `apps/mobile`, y el `pnpm exec` de la copia puede reinstalar `node_modules` después de tu `pod install`.
- **Face ID del candado en el simulador:** si sale «Ingresa el código del iPhone», no se escribe nada: enrolar y confirmar con `notifyutil` (ver nota de F036: `com.apple.BiometricKit.enrollmentChanged` y luego `com.apple.BiometricKit_Sim.pearl.match`).

### 3.37 `Appearance.setColorScheme(null)` no compila (tema oscuro, F054)
- **Síntoma:** `tsc` dice `Type 'null' is not assignable to parameter of type 'ColorSchemeName'`.
- **Causa:** en React Native 0.86 los valores válidos son `'light' | 'dark' | 'unspecified'`; `null` ya no se acepta.
- **Solución:** para soltar el modo forzado y volver a seguir al teléfono se usa `'unspecified'` (`esquemaNativo()` en `shared/theme/preferencia.ts`).

### 3.38 `pnpm test:emulator`: «Port 8080 is not open… port taken», o una prueba de Storage falla sola (`storage/unauthorized`)
- **Síntoma A:** `Could not start Firestore Emulator, port taken`. **Causa:** quedó un emulador (proceso `java`, `cloud-firestore-emulator`) de una corrida interrumpida, por ejemplo cuando un `| head` cierra la tubería antes de que `firebase-tools` termine. **Solución:** comprobar con `lsof -iTCP:8080 -sTCP:LISTEN` que es el emulador de `demo-mediq` (sin datos reales) y cerrarlo: `pkill -f cloud-firestore-emulator; pkill -f cloud-storage-rules-runtime`.
- **Síntoma B:** una sola prueba de `FirestoreFotoDeReceta.emulator.test.ts` («el dueño puede borrar y listar su carpeta», `s8`) falla con `storage/unauthorized` en una corrida completa y pasa 3 de 3 veces sola y en la siguiente corrida completa. Es **inestabilidad del emulador de Storage** (2026-10-08, F062), no un fallo de las reglas. **Qué hacer:** repetir la suite; si vuelve a fallar, correr ese archivo solo antes de sospechar de un cambio.
- **En macOS no existe `timeout`:** para esperar un proceso largo usa un bucle con `sleep` o `run_in_background`, no `timeout 270 …`.
- Las pruebas de emulador necesitan `JAVA_HOME` en Java 17: `export JAVA_HOME=$(/usr/libexec/java_home -v 17)`.

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
- **Caso típico (`SyntaxError: Unexpected token 'typeof'`):** un archivo con lógica pura importa `expo-router` (por ejemplo para un hook). Mueve el hook a su propio archivo (`useMedicoElegido.ts` vs `seleccionDeMedico.ts`) y prueba solo el archivo puro.

### 4.4 `app.config.ts` no encuentra un módulo local (`Cannot find module './src/…'`)
- **Causa:** Expo evalúa `app.config.ts` sin transformar imports a otros `.ts`.
- **Solución:** los módulos que use `app.config.ts` o sus plugins deben ser **JavaScript plano CommonJS** (con su `.d.ts`), como `config/google.js` y `plugins/sceneLifecycle.js`.

### 4.5 El hook `block-main.sh` bloquea un comando por una palabra del texto
- **Causa:** el hook revisa el comando completo, también el texto de commits/PR; una frase que contenga `--no-verify` lo bloquea.
- **Solución:** reformular el texto sin esa cadena. Los hooks de verificación nunca se saltan.

### 4.6 Rutas Expo Router: tipos y plugin
- La raíz de rutas es `apps/mobile/src/app/routes` (opción `root` del plugin `expo-router` en `app.json`). `container.ts` vive en `src/app/`.

### 4.7 Un PR apilado se fusionó pero su contenido no está en `main`
- **Síntoma:** GitHub avisa "rama X had recent pushes" y `main` no tiene lo que ya se fusionó (por ejemplo F002 o la guía de errores).
- **Causa:** en una cadena de PRs apilados (`#7 → #6`, `#8 → #7`…), cada PR tiene como base la rama del anterior. Si se fusiona un PR **después** de que su base ya se fusionó en `main` sin borrar la rama, GitHub no lo reorienta: el PR se fusiona en la rama vieja y `main` no lo recibe.
- **Solución:** abrir un PR de consolidación desde la rama que contiene todo hacia `main` (`gh pr create --base main --head <rama>`); comprobar antes con `git log origin/main..origin/<rama>` y `git branch -r --contains <commit>` qué contenido falta en `main`.
- **Cómo evitarlo:** **todo PR se abre con base `main`**, aunque su rama dependa de trabajo aún sin fusionar (se apila por historia de git, no por base del PR). Se fusionan en orden y cada PR se reduce solo al contenido que le falta. Nunca usar la rama de otro PR como base. Pasó dos veces (#7–#9 y #11) antes de adoptar esta regla.

---

## 5. Firebase y Google

| Síntoma | Causa | Solución |
| --- | --- | --- |
| `permission-denied` al escribir | Reglas de Firestore sin publicar, o escribir sin iniciar sesión en Firebase | Publicar las reglas de `firebase/firestore.rules` (procedimiento en `docs/14-publicacion-y-proyecto-firebase.md`); el login entra a Firebase Auth con el `idToken` de Google antes de escribir |
| Firestore "no puede alcanzar el backend" / se cuelga | Canal por defecto de Firestore en React Native | Ya activado `experimentalAutoDetectLongPolling` en `firebase.ts` |
| Aviso amarillo "Auth state will default to memory persistence" | Firebase Auth sin AsyncStorage | **Intencional:** la sesión de la app vive en `expo-secure-store`; no instalar AsyncStorage solo por esto |
| "Acceso bloqueado / app no verificada" al iniciar con Google | Pantalla de consentimiento de OAuth en modo *Testing* | Agregar el correo como usuario de prueba en Google Cloud → APIs y servicios → Pantalla de consentimiento |
| La hoja de Google no vuelve a la app | Falta el esquema de URL invertido | Se genera de `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` en `app.config.ts`; revisar `.env.local` y regenerar con `expo prebuild` |
| `Your project … must be on the Blaze (pay-as-you-go) plan` al publicar | Las Cloud Functions exigen el plan de pago | MediQ no usa funciones (decisión del usuario). Alternativa gratuita para revocar sesiones: ver capítulo 10 (sesiones controladas por reglas de Firestore) |
| Una escritura que antes pasaba (renombrar o desvincular un lugar) da `permission-denied` tras endurecer las reglas | Las reglas de `visits` validan el documento **resultante** en cada `update`; una consulta sembrada en la prueba con solo `placeId` y `placeName` ya no es válida | Sembrar consultas válidas en las pruebas (ver `visitaValida` en `Firestore.emulator.test.ts` de médicos). Los datos creados por la app siempre son válidos |
| Agregué una validación a las reglas y Firestore la ignora | Las reglas **se suman** (OR): un `match` más amplio (por ejemplo `/mediq_users/{uid}/{document=**}`) ya permite todo | Enumerar las colecciones en `firebase/firestore.rules` en vez de un comodín general; **toda colección nueva debe listarse ahí**. Publicar con `firebase deploy --only firestore:rules` (la app no las despliega) |

Variables en `apps/mobile/.env.local` (git las ignora; plantilla en `.env.example`): `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, `EXPO_PUBLIC_FIREBASE_APP_ID`. **Nunca** subir claves, IDs ni el `GoogleService-Info.plist` al repo.

---

## 6. Diseño de referencia

- El archivo `docs/MediQ — prototipo móvil.html` viene **empaquetado** (gzip + base64 dentro de `<script type="__bundler/manifest">`): una búsqueda de texto no encuentra nada. Se decodifica con Python (json + base64 + gzip) o se abre en un navegador.
- Fuente legible del diseño: el canvas de diseño del usuario (artifact) con `Login`, `Main` (Diario), `Consulta`, `Nueva`, `Receta` y `Medicos`. Leerlo con la herramienta de artifacts y copiar medidas, colores y fuentes (Bricolage Grotesque para títulos, Figtree para cuerpo).
