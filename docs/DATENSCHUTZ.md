# Datenschutz — technische Dokumentation

Grundlage für das Verzeichnis von Verarbeitungstätigkeiten (Art. 30 DSGVO), die
Datenschutzerklärung und die Abstimmung mit dem/der Datenschutzbeauftragten.

Dieses Dokument beschreibt **technisch**, welche personenbezogenen Daten das
Hilfecenter verarbeitet. Die **rechtliche Bewertung** (Rechtsgrundlagen,
Fristen, Verträge) ist mit **[offen]** markiert und muss von den
Verantwortlichen ergänzt werden. Stand: 22.09.2026.

## 1. Überblick der Verarbeitungen

| # | Verarbeitung | Betroffene | Daten | Speicherort | Löschung heute |
|---|---|---|---|---|---|
| V1 | Öffentliche Website | Besucher:innen | keine Speicherung; Server-Zugriffslogs von Caddy/Docker | VPS | Log-Rotation des Servers **[offen: Frist festlegen]** |
| V2 | Fehlermeldungs-Formular (`/fehler`) | Melder:innen | Name/Abteilung (freiwillig), Beschreibung, Screenshots | DB `bug_reports`, Volume `media` | manuell im Admin **[offen: Frist]** |
| V3 | Fragen-Formular (`/fragen`) | Einreichende | Name/Abteilung, Kontakt (freiwillig), Frage | DB `question_submissions` | manuell im Admin **[offen: Frist]** |
| V4 | Redaktions-Zugang `/admin` | Redakteur:innen | E-Mail, Passwort-Hash, Benachrichtigungs-Einstellung | DB `users` | manuell |
| V5 | Interner Login (Keycloak) | Mitarbeitende | Keycloak-ID, E-Mail, Name, Rollen im Session-Cookie | Browser-Cookie, 8 h | Ablauf/Abmelden |
| V6 | Kundencheck | Kund:innen | siehe Abschnitt 2 | teils DB, teils nur live abgefragt | siehe Abschnitt 2 |
| V7 | Migrations-Cockpit | Kund:innen | Benutzername/E-Mail bei fehlgeschlagenen Logins (Fehlertabelle), Zählwerte | live aus Keycloak; nur Zählwerte in DB `cockpit_daily` | Tageswerte unbefristet (ohne Personenbezug) |
| V8 | Benachrichtigungen | Redaktion, Betrieb | Inhalt neuer Meldungen (inkl. Name/Kontakt) per E-Mail; Alarm- und Report-Mails ohne Kundendaten | SMTP-Server, Postfächer | nach Postfach-Regeln |
| V9 | Jira-Export | Melder:innen | Inhalte bekannter Fehler; bei übernommenen Meldungen Name des Melders im Feld „Fundort" | Jira Cloud (Atlassian) | nach Jira-Regeln |
| V10 | Datensicherung | alle oben | vollständige DB + Medien | Backup-Ordner, 14 Tage | automatisch nach 14 Tagen |

Kein Tracking, keine Analyse-Werkzeuge, keine externen Schriftarten (Inter
self-hosted), keine Einbettung von Drittinhalten im Browser (die Störungsseite
wird serverseitig über `/api/stoerungen-proxy` geladen — Besucher-IPs gehen
nicht an den Drittanbieter).

## 2. Kundencheck im Detail

Zweck: Das Servicecenter beantwortet Kundenanfragen zu Konto und Ticket.
Zugriff nur für Mitarbeitende mit Rolle `kundencheck`, `cockpit` oder
`support` (Keycloak); Abfrage nur einzeln per E-Mail-Adresse, Rate-Limit
30 Abfragen pro Minute und Person.

| Quelle | Daten | Gespeichert im Hilfecenter? |
|---|---|---|
| Patris-CSV (Upload) | Entitlement-ID, Gültigkeit, Produkt, Kundennummer, E-Mail, Vor- und Nachname | **Ja**, Tabelle `patris_entitlements`, bis zum nächsten Upload (dann vollständig ersetzt). Nur diese 9 Spalten; alle übrigen CSV-Spalten werden verworfen |
| Keycloak (Kunden-Realm) | Konto vorhanden, Kundennummer, Anlagedatum; Login-Ereignisse der letzten 14 Tage (Zeit, Ergebnis, Client) | Nein, live abgefragt |
| LüMobil Ticket-API | Bestellungen: Zeitpunkt, Bestellnummer, Produkt, Tarif, Menge, Preis, Status | Nein, live abgefragt |
| Upload-Protokoll | Dateiname, Zeitpunkt, E-Mail der hochladenden Person, Zeilenzahl | Ja, Global `patris_import` (nur letzter Upload) |

- Die **gesuchte E-Mail-Adresse wird im Hilfecenter nicht protokolliert** (weder
  in der Datenbank noch in Logs).
- Die **Ticket-API protokolliert** jede Abfrage auf ihrer Seite (gesuchte
  Adresse, Bearbeiter-E-Mail aus `X-Bearbeiter`, Zeitpunkt, Trefferzahl).
  Aufbewahrung dort laut API-Betreiber: Vorschlag 12 Monate **[offen: mit
  Datenschutz abstimmen]**.
- Keycloak-Events enthalten zusätzlich die IP-Adresse; das Hilfecenter zeigt sie
  nicht an und speichert sie nicht.
- Token und Rohantworten verlassen den Server nicht; der Browser erhält nur die
  aufbereitete Anzeige.

## 3. Technische und organisatorische Maßnahmen (Auszug)

| Maßnahme | Umsetzung |
|---|---|
| Transportverschlüsselung | HTTPS über Caddy (Let's Encrypt); Ticket-API mit Zertifikatsprüfung |
| Zugriffskontrolle intern | Keycloak-Login mit Rollen, serverseitig je Seite/API geprüft |
| Zugriffskontrolle CMS | Payload-Login; Meldungen und Cockpit-Daten nur für Angemeldete |
| Formularschutz | Honeypot, Längen- und Dateigrößenlimits, REST-Schreibzugriff gesperrt |
| Session | HttpOnly, SameSite=Lax, signiert, 8 h; `Secure`, sobald `APP_BASE_URL` mit `https` beginnt |
| Secrets | `.env` und `secrets/` nur auf dem Server, nicht im Repository |
| Datensparsamkeit | Patris: nur benötigte Spalten; Kundencheck ohne Abfrageprotokoll |
| Datensicherung | täglich, 14 Tage, Ordner nur für root lesbar (`docs/BACKUP-RESTORE.md`) |
| Suchmaschinen | `noindex` in der Testphase; `/admin` immer `noindex` |

## 4. Beteiligte Dienstleister / Empfänger

| Empfänger | Zweck | Vertrag |
|---|---|---|
| VPS-Hoster | Betrieb | **[offen: Anbieter, AV-Vertrag, Standort]** |
| Keycloak-Betreiber | Login, Kundenkonten | **[offen: intern oder Dienstleister]** |
| Betreiber der Ticket-API | App-Bestellungen | **[offen]** |
| SMTP-Anbieter | E-Mail-Versand | **[offen]** |
| Atlassian (Jira Cloud) | Fehler-Tickets | **[offen: AV-Vertrag, Drittlandtransfer]** |

## 5. Offene Punkte für die Verantwortlichen

1. **Impressum und Datenschutzerklärung** sind seit 22.09.2026 im Footer jeder
   öffentlichen Seite auf die SWHL-Seiten verlinkt
   (`https://www.swhl.de/impressum/`, `https://www.swhl.de/datenschutz/`).
   **[offen: prüfen, ob die SWHL-Datenschutzerklärung das Hilfecenter abdeckt —
   insbesondere die Formulare (V2, V3) und den Kundencheck (V6); sonst dort
   ergänzen lassen.]**
2. Rechtsgrundlagen je Verarbeitung (V1–V10) festlegen.
3. Löschfristen für Meldungen (V2, V3), Server-Logs (V1), Keycloak-Events und
   das Abfrageprotokoll der Ticket-API festlegen — ggf. automatische Löschung
   umsetzen lassen.
4. Prüfen, ob für den Kundencheck (Zusammenführung mehrerer Kundendatenquellen)
   eine Datenschutz-Folgenabschätzung nötig ist.
5. Hinweis an die Formularnutzer:innen, dass Name/Kontakt freiwillig sind und
   wofür sie verwendet werden (V2, V3).
6. Verträge zur Auftragsverarbeitung mit den Dienstleistern (Abschnitt 4).
