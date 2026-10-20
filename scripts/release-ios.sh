#!/usr/bin/env bash
# F019: compila e instala en el iPhone una versión RELEASE de mediQ (el JavaScript va dentro de la app: no necesita Metro ni el Mac).
# Uso: bash scripts/release-ios.sh <UDID-del-iPhone>      (UDID: `xcrun devicectl list devices`)
# Compila desde una copia SIN ESPACIOS en la ruta (~/mediq-build): los scripts de CocoaPods fallan con «Macbook EHD» (solucion-de-problemas §1.1).
# Pasos y problemas conocidos: docs/solucion-de-problemas.md §1 y §3.23 y docs/14. Con la cuenta gratuita de Apple la app caduca a los 7 días.
set -euo pipefail

UDID="${1:?Falta el UDID del iPhone. Uso: bash scripts/release-ios.sh <UDID> (xcrun devicectl list devices)}"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
COPIA="$HOME/mediq-build"
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8
paso() { echo; echo "== $1 =="; }

paso "1/7 Variables EXPO_PUBLIC_* completas (se incrustan al empaquetar)"
node "$REPO/apps/mobile/config/entornoDeRelease.js" "$REPO/apps/mobile/.env.local"

paso "2/7 Espacio libre (hacen falta ≥ 10 GB en el disco interno)"
LIBRE_KB="$(df -k "$HOME" | awk 'NR==2 {print $4}')"
if [ "$LIBRE_KB" -lt 10485760 ]; then echo "Solo hay $((LIBRE_KB / 1048576)) GB libres: libera espacio (solucion-de-problemas §1.2)." >&2; exit 1; fi
echo "  $((LIBRE_KB / 1048576)) GB libres"

paso "3/7 Versión que mostrará Perfil (la copia no tiene .git)"
(cd "$REPO" && pnpm --filter mobile version:generate)

paso "4/7 Copia sin espacios en la ruta"
mkdir -p "$COPIA"
rsync -a --delete --exclude .git --exclude apps/mobile/ios --exclude apps/mobile/android --exclude apps/mobile/.expo "$REPO/" "$COPIA/"

paso "5/7 Pods y archivos que el rsync borra"
SQLITE_DIR="$(ls -d "$COPIA"/node_modules/.pnpm/expo-sqlite@*/node_modules/expo-sqlite | head -1)"
if [ ! -f "$SQLITE_DIR/ios/sqlite3.h" ]; then cp "$SQLITE_DIR/vendor/sqlite3/sqlite3.c" "$SQLITE_DIR/vendor/sqlite3/sqlite3.h" "$SQLITE_DIR/ios/"; echo "  sqlite3.h copiado (§3.23)"; fi
if [ -d "$COPIA/apps/mobile/ios" ]; then
  (cd "$COPIA/apps/mobile/ios" && pod install >/tmp/mediq-pod.log 2>&1 || { tail -20 /tmp/mediq-pod.log; exit 1; })
  if grep -q aps-environment "$COPIA/apps/mobile/ios/mediQ/mediQ.entitlements" 2>/dev/null; then
    echo "El .entitlements de la copia trae aps-environment (cuenta gratuita no admite Push): bórralo (solucion-de-problemas §3.24)." >&2; exit 1
  fi
else
  echo "  (primera vez: expo run:ios genera ios/ con prebuild)"
fi

paso "6/7 Compilar en Release (sin Metro) con permiso para crear el perfil de firma"
# `expo run:ios` no deja pasar -allowProvisioningUpdates y falla con «No profiles for 'com.michysoft.mediq'»: si ios/ no existe, el prebuild lo genera primero.
cd "$COPIA/apps/mobile"
if [ ! -d ios ]; then pnpm exec expo prebuild --platform ios --no-install; (cd ios && pod install >/tmp/mediq-pod.log 2>&1 || { tail -20 /tmp/mediq-pod.log; exit 1; }); fi
(cd ios && xcodebuild -workspace mediQ.xcworkspace -scheme mediQ -configuration Release -destination "id=$UDID" -derivedDataPath "$HOME/mediq-dd" -allowProvisioningUpdates COMPILER_INDEX_STORE_ENABLE=NO build >/tmp/mediq-xcb.log 2>&1) || { grep "error:" /tmp/mediq-xcb.log | head -10 >&2; echo "Detalle: /tmp/mediq-xcb.log (iPhone desbloqueado? solucion-de-problemas §1.4)" >&2; exit 1; }

paso "7/7 Instalar en el iPhone"
xcrun devicectl device install app --device "$UDID" "$HOME/mediq-dd/Build/Products/Release-iphoneos/mediQ.app"
echo "Si sale «Desarrollador no confiable»: Ajustes → General → VPN y administración de dispositivos → confiar en el certificado."
echo "Abre mediQ en el iPhone: no debe pedir Metro. Vuelve a iniciar sesión con Google. La app caduca a los 7 días (cuenta gratuita)."
