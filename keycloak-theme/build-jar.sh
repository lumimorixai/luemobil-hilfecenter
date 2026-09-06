#!/usr/bin/env bash
# Paketiert das SWL-Login-Theme als Keycloak-Provider-JAR (Plugin-Form).
# Ergebnis: swl-login-theme.jar → nach /opt/keycloak/providers/ kopieren,
# dann Keycloak mit `kc.sh build` bzw. Container-Neustart neu bauen lassen.
#
# JAR-interne Struktur (Achtung: „theme" Singular):
#   META-INF/keycloak-themes.json
#   theme/swl/login/...
set -euo pipefail
cd "$(dirname "$0")"

rm -rf build swl-login-theme.jar
mkdir -p build/theme
cp -r swl build/theme/swl
cp -r META-INF build/META-INF

( cd build && jar cf ../swl-login-theme.jar META-INF theme )
rm -rf build
echo "Fertig: $(pwd)/swl-login-theme.jar"
