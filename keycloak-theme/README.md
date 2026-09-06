# SWL Keycloak Login-Theme

Eigenes Login-Theme im SWL-Design für den Mitarbeiter-Realm (`swl-intern`).
Es **erbt** das klassische `keycloak`-Login-Theme und zieht per CSS auf SWL um
(schwarz/weiß/orange, Inter self-hosted, 2px-Radius, keine Schatten, Verlaufsleiste).

Theme-Name = **`swl`**. Inhalt: `swl/login/` (theme.properties, resources/css, resources/fonts).

## Beeinträchtigt es andere Realms/Themes? Nein.
- Themes sind **pro Realm opt-in**: Das Theme wirkt **nur** dort, wo es explizit
  gewählt wird (Realm settings → Themes → Login theme = `swl`). Alle anderen Realms
  behalten ihr Theme unverändert.
- Es ist **eigenständig** unter dem Namen `swl` — es überschreibt **kein**
  eingebautes Theme. `parent=keycloak` bedeutet nur *erben von*, nicht *ändern von*;
  der Kunden-Realm `mpluebeck` und die Basis-Themes bleiben unberührt.
- Es definiert nur den Typ **`login`**; account/admin/email anderer Realms sind nicht
  betroffen.

## Deployment — Variante A: Verzeichnis-Mount (einfach)
```yaml
# im docker-compose.yml des Keycloak-Dienstes
services:
  keycloak:
    volumes:
      - ./keycloak-theme/swl:/opt/keycloak/themes/swl:ro
```
Keycloak neu starten. (Schnelles Iterieren: `KC_SPI_THEME_CACHE_THEMES=false`,
`KC_SPI_THEME_CACHE_TEMPLATES=false` — in Produktion weglassen.)

## Deployment — Variante B: Provider-JAR (Plugin-Form, für CI/Versionierung)
```bash
./keycloak-theme/build-jar.sh          # erzeugt swl-login-theme.jar
```
JAR nach `/opt/keycloak/providers/` legen und Keycloak neu bauen:
```yaml
services:
  keycloak:
    volumes:
      - ./keycloak-theme/swl-login-theme.jar:/opt/keycloak/providers/swl-login-theme.jar:ro
```
Beim Start baut der Container (bzw. `kc.sh build`) die Provider ein.

## Aktivieren
1. Realm **`swl-intern`** → **Realm settings → Themes → Login theme = `swl`** → Save.
2. Optional Kopftext: **Realm settings → General → Display name** = `LüMobil · Stadtwerke Lübeck`.

## Anpassen
- Optik: `swl/login/resources/css/swl-login.css` (nur SWL-Tokens).
- Schrift: `swl/login/resources/fonts/inter.woff2` (aus `@fontsource-variable/inter`).
- Kein Google-Fonts-Request (DSGVO) — Inter self-hosted.
