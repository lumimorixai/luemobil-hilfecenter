# Keycloak-Einrichtung

Schritt-für-Schritt-Konfiguration in der Keycloak-Admin-Konsole für den
Kundencheck und das Migrations-Cockpit. Die Menünamen beziehen sich auf die
aktuelle Keycloak-Admin-Konsole (Keycloak 2x); bei älteren Versionen heißen
einzelne Punkte leicht anders.

Beteiligt sind zwei Realms:

| Realm | Env-Variable | Zweck |
|---|---|---|
| Mitarbeiter-Realm, z. B. `swl-intern` | `KEYCLOAK_AUTH_REALM` | Anmeldung der Mitarbeitenden, Rollen |
| Kunden-Realm `mpluebeck` | `KEYCLOAK_REALM` | Datenquelle: Kundenkonten, Events |

Ist `KEYCLOAK_AUTH_REALM` leer, läuft auch der Login über den Kunden-Realm
(Einzel-Realm-Betrieb). Empfohlen ist die Trennung, damit Personalkonten nicht in
den Kundenzahlen auftauchen.

`<DOMAIN>` = öffentliche Adresse des Hilfecenters, z. B.
`https://hilfe.swl-innovation.de` (entspricht `APP_BASE_URL`).

---

## 1. Mitarbeiter-Realm: Login-Client

*Clients → Create client*

| Einstellung | Wert |
|---|---|
| Client type | OpenID Connect |
| Client ID | frei, z. B. `hilfecenter-intern` → `OIDC_CLIENT_ID` |
| Client authentication | **On** (vertraulicher Client) |
| Authentication flow | nur **Standard flow**; Direct access grants **Off**, Service accounts **Off** |
| Valid redirect URIs | `<DOMAIN>/api/auth/callback` |
| Valid post logout redirect URIs | `<DOMAIN>/` |
| Web origins | leer lassen (alle Aufrufe laufen serverseitig) |

Unter *Credentials* das **Client secret** kopieren → `OIDC_CLIENT_SECRET`.

Unter *Advanced → Advanced settings* empfiehlt sich **Proof Key for Code
Exchange Code Challenge Method = S256** (das Hilfecenter sendet PKCE immer mit).

Das Hilfecenter fordert die Scopes `openid profile email` an und liest:
- aus dem **ID-Token**: `sub`, `email` (bzw. `preferred_username`), `name`
- aus dem **Access-Token**: `realm_access.roles`

Die Rollen landen standardmäßig über den Client-Scope **`roles`**
(Mapper „realm roles") im Access-Token. Prüfen unter *Client scopes* des
Clients, dass `roles` als *Default* zugeordnet ist.

Lokal zusätzlich `http://localhost:3000/api/auth/callback` und
`http://localhost:3000/` eintragen, wenn gegen dieses Keycloak entwickelt wird.

## 2. Mitarbeiter-Realm: Rollen

*Realm roles → Create role*

| Rolle | Env-Variable (Standard) | Schaltet frei |
|---|---|---|
| `kundencheck` | `COCKPIT_ROLE_KUNDENCHECK` | Kundencheck |
| `cockpit` | `COCKPIT_ROLE_MIGRATION` | Migrations-Cockpit inkl. Patris-Upload und Reports |
| `support` | `COCKPIT_SUPPORT_ROLE` | beides |

Vergabe am besten über **Gruppen** (*Groups → Role mapping*), z. B.
„Servicecenter" → `kundencheck`, „Migrationsteam" → `support`. Die Rollen
gelten nach der **nächsten Anmeldung** (sie stehen im Session-Cookie, das
8 Stunden gültig ist).

## 3. Mitarbeiter-Realm: Login-Theme (optional)

SWL-Optik für die Anmeldeseite: `keycloak-theme/README.md`. Danach
*Realm settings → Themes → Login theme* = `swl`. Andere Realms bleiben unberührt.

---

## 4. Kunden-Realm: Service-Account-Client

Liest Konten und Events über die Admin-API (`grant_type=client_credentials`).

*Clients → Create client* im Realm `mpluebeck`

| Einstellung | Wert |
|---|---|
| Client ID | z. B. `luemobil-cockpit` → `COCKPIT_CLIENT_ID` |
| Client authentication | **On** |
| Authentication flow | **Service accounts roles On**; Standard flow Off; Direct access grants nur für den synthetischen Login (Abschnitt 6) |

*Credentials* → Client secret → `COCKPIT_CLIENT_SECRET`.

*Service accounts roles → Assign role → Filter by clients* → aus
`realm-management`:
- **`view-users`** (Konten, Kundennummer, Nutzerzahlen)
- **`view-events`** (Logins, Fehler, Registrierungen, Passwort-Events)

Keine weiteren Rollen vergeben — das Hilfecenter liest nur.

## 5. Kunden-Realm: Events speichern

*Realm settings → Events → User events settings*

| Einstellung | Wert |
|---|---|
| Save events | **On** |
| Expiration | nach Datenschutzvorgabe, z. B. 30 Tage **[offen: mit Datenschutz abstimmen]** |
| Event types (mindestens) | `LOGIN`, `LOGIN_ERROR`, `REGISTER`, `SEND_RESET_PASSWORD`, `RESET_PASSWORD`, `UPDATE_PASSWORD`, `SEND_VERIFY_EMAIL`, `VERIFY_EMAIL` |

Der Kundencheck zeigt Events der letzten 14 Tage — kürzere Expiration verkürzt
das Fenster entsprechend. Die Tageswerte im Cockpit werden zusätzlich in der
Hilfecenter-Datenbank gespeichert (`cockpit-daily`) und überleben die Expiration.

## 6. Synthetischer Login-Check (optional)

Die Status-Ampel „Login (Test)" meldet sich minütlich mit einem Testkunden an
(`grant_type=password`) und prüft damit die Kundenanmeldung Ende-zu-Ende.

1. Im Kunden-Realm einen **Testkunden** anlegen (bzw. einen migrierten
   Testkunden verwenden) → `SYNTH_LOGIN_USER` / `SYNTH_LOGIN_PASSWORD`.
2. Am Service-Account-Client aus Abschnitt 4 **Direct access grants On** —
   oder einen eigenen Client dafür anlegen und `SYNTH_LOGIN_CLIENT_ID` /
   `SYNTH_LOGIN_CLIENT_SECRET` (und ggf. `SYNTH_LOGIN_REALM`) setzen.

Logins dieser Clients zählt das Cockpit nicht als Kundenaktivität.

## 7. Kundenattribut Kundennummer

Der Kundencheck zeigt die Kundennummer aus dem Benutzerattribut `kundennummer`
(ersatzweise `customerNumber`) und sucht damit zusätzlich Patris-Tickets. Das
Attribut setzt das Migrations-Plugin beim Import aus Aboonline. **[offen:
bestätigen, dass das Plugin das Attribut unter diesem Namen schreibt]**

---

## 8. Prüfen

1. `<DOMAIN>` → „Intern anmelden" → Keycloak-Anmeldeseite des Mitarbeiter-Realms.
2. Nach der Anmeldung erscheinen die Reiter passend zur Rolle.
3. Im Cockpit zeigt die Status-Ampel Keycloak grün, die Kennzahlen haben Werte.
4. Kundencheck mit einer bekannten Kunden-E-Mail → Konto „vorhanden", Ereignisse.

| Symptom | Ursache |
|---|---|
| Keycloak meldet „Invalid redirect uri" | Redirect-URI aus Abschnitt 1 fehlt oder `APP_BASE_URL` falsch |
| Nach Login „Kein Zugriff" | Rolle fehlt oder nicht im Access-Token (Client-Scope `roles`), neu anmelden |
| Cockpit-Kennzahlen leer, Ampel Keycloak rot | Service-Account-Client falsch oder ohne `view-users`/`view-events` |
| Keine Events | *Save events* aus oder Event-Typen nicht gewählt |
| Abmelden bleibt bei Keycloak hängen | Post-Logout-Redirect-URI fehlt |
