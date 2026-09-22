# Kundencheck — Kurzanleitung für das Servicecenter

Mit dem Kundencheck sehen Sie in wenigen Sekunden, ob ein Kunde laut Abo-System
ein Ticket hat, ob er in der LüMobil-App angemeldet sein kann und was Sie ihm
sagen sollten.

## Aufrufen

1. Hilfecenter öffnen und auf **„Intern anmelden"** klicken (in der Kopfzeile
   neben „Stadtwerke Lübeck · LüMobil" oder ganz unten auf der Seite).
2. Mit Ihrem Mitarbeiterkonto anmelden.
3. Reiter **„Kundencheck"** wählen.

Sehen Sie den Reiter nicht, fehlt Ihrem Konto die Berechtigung — bitte an
**[offen: Ansprechpartner für Zugänge]** wenden.

## Prüfen

1. Die **E-Mail-Adresse** eingeben, mit der sich der Kunde in der App anmeldet.
   Groß- und Kleinschreibung spielt keine Rolle.
2. **„Prüfen"** klicken.

Nur prüfen, wenn der Kunde selbst anfragt — jede Abfrage greift auf
Kundendaten zu.

## Ergebnis lesen

### Die Ampel

Oben steht eine Ampel mit Überschrift und einem Hinweis, was Sie dem Kunden
sagen. Die Hinweistexte können sich ändern; sie werden zentral gepflegt.

| Ampel | Bedeutet | Typische Aussage an den Kunden |
|---|---|---|
| **Grün** — Ticket gültig | Ticket laut Abo vorgesehen, Konto vorhanden, Ticket in der App ausgeliefert | Anmeldung mit E-Mail und bisherigem Passwort; bei Problemen „Passwort vergessen" in der App |
| **Grün** — Ticket in der App gekauft | Kein Abo-Ticket, aber kürzlich in der App gekauft und ausgeliefert | Ticket ist in der App vorhanden |
| **Gelb** — Konto fehlt noch | Ticket vorgesehen, aber noch kein Konto | Kunde soll sich in der App mit E-Mail und Aboonline-Passwort anmelden; das Konto entsteht dabei |
| **Gelb** — in der App nicht ausgeliefert | Ticket vorgesehen, Konto da, aber zuletzt kein Ticket ausgeliefert | App öffnen und anmelden; wenn weiterhin nichts erscheint: weitergeben (siehe unten) |
| **Gelb** — noch nicht gültig | Ticket beginnt erst später | Ticket erscheint ab dem genannten Datum |
| **Rot** — abgelaufen | Letztes Ticket ist abgelaufen | Aktuell kein gültiges Ticket; bei Fragen zum Abo an den Abo-Service |
| **Rot** — kein Ticket vorgesehen | Keine Einträge zur E-Mail | Schreibweise der E-Mail prüfen, ggf. andere Adresse erfragen; sonst Abo-Service |
| **Grau** — keine Daten | Ticketdaten fehlen im System | Technisches Problem — weitergeben |

### Ticket laut Patris

Produkt, Gültigkeit (von–bis), Name und Kundennummer aus dem Abo-System.
Stimmt der **Name** nicht mit dem Anrufer überein, keine Details nennen.

Unter „Datenstand Patris" steht, wann die Ticketdaten zuletzt aktualisiert
wurden. Ist ein Ticket sehr neu, kann es dort noch fehlen.

### Käufe in der LüMobil-App

Bestellungen aus der App, neueste zuerst. **Grüner Punkt** = Ticket wurde
ausgeliefert, **roter Punkt** = nicht ausgeliefert (z. B. abgebrochen).
„Keine Bestellungen" ist kein Fehler.

Steht hier ein Hinweis wie „derzeit nicht abrufbar", ist nur dieser Teil
gestört — die Ampel beruht dann auf den übrigen Angaben.

### Keycloak-Konto und letzte Ereignisse

Ob ein App-Konto existiert und welche Anmeldungen es in den letzten 14 Tagen
gab:

| Eintrag | Bedeutung |
|---|---|
| Erfolgreicher Login | Anmeldung hat geklappt |
| `invalid_user_credentials` | Konto existiert, Passwort falsch → „Passwort vergessen" |
| `user_not_found` | Adresse unbekannt → Tippfehler? andere Adresse? |
| `expired_code` | Anmeldung zu lange offen → neu starten |
| `account_disabled` | Konto gesperrt → weitergeben |
| `access_denied` | Anmeldung abgebrochen |

## Weitergeben (Eskalation)

| Fall | An |
|---|---|
| Graue Ampel, Fehlermeldungen im Kundencheck | **[offen: IT-Betrieb / Kontakt]** |
| Ticket vorgesehen, aber in der App nicht ausgeliefert | **[offen: Second-Level-Support]** |
| Fragen zu Abo, Vertrag, Zahlung | **[offen: Abo-Service]** |
| Konto gesperrt | **[offen]** |

## Hinweise

- „Zu viele Abfragen": kurz warten, dann erneut prüfen.
- Keine Screenshots mit Kundendaten weitergeben; Kundendaten nicht in
  Tickets/E-Mails kopieren, wenn es nicht nötig ist.
- Fachliche Grundlage der Ampel (für Rückfragen): `KUNDENCHECK-COCKPIT.md`,
  Abschnitt 2.2.
