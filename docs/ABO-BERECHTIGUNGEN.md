# Abo-Berechtigungen: Struktur und Kennzahlen

Was die Berechtigungsdaten aus Patris enthalten und wie sie zu lesen sind.
Festgehalten am 25.09.2026 bei der Prüfung einer Anrufaktion, die dann nicht
weiterverfolgt wurde — die Erkenntnisse gelten unabhängig davon.

Alle Zahlen sind Summen, keine personenbezogenen Daten. Grundlage sind die
Produktiv-Dumps vom **15.09.2026** (`kk_mpswl` und `kk_swl` im Reporting-Projekt).

## Bestandssegment statt Produktname

Die Berechtigungen tragen **alle denselben** Produktnamen („D-Ticket 2.Kl"),
denselben Preis (63,00 €) und dieselbe Preisstufe (99). Am Produkt lässt sich
deshalb **nichts** unterscheiden. Das Merkmal ist die Spalte `product_number`,
im Reporting `bestandssegment`:

| Segment | Bedeutung | Berechtigungen | Durchschnittsalter |
|---|---|---:|---|
| **9999** | Deutschlandticket | 3.868 | 42,4 Jahre |
| **9995** | Schüler-Ticket | 4.399 | 15,9 Jahre |

Die Altersverteilung bestätigt die Zuordnung: In 9995 sind 3.192 Personen unter
18, in 9999 nur 162.

## Aktivierung

„Aktiviert" heißt: Zur E-Mail-Adresse der Berechtigung existiert ein Konto
(`src_mpswl.customers`). Eine Person kann mehrere Berechtigungszeilen haben,
gezählt wird über `ist_hauptzeile` eine Zeile je Person.

| | Personen |
|---|---:|
| Berechtigte gesamt | 8.215 |
| davon mit Konto | 1.698 (20,7 %) |
| ohne Konto | 6.517 |
| davon volljährig | 3.727 |
| davon minderjährig | 2.790 |

Die 6.517 decken sich mit der Arbeitsliste „Berechtigt, nicht aktiviert" im
Dashboard „Abo-Bestand" — die Rechnung ist also mit dem Reporting konsistent.

## Weitere Felder der Quelltabelle

`src_mpswl.abo_berechtigungen_luebeck` enthält mehr als die Reporting-Sicht
zeigt, unter anderem Anschrift (Straße, PLZ, Ort), Geburtsdatum und eine
Telefonnummer (bei 82,2 % der Zeilen gefüllt). Die Sicht `rpt.abo_berechtigung`
gibt die Telefonnummer bewusst nur als Ja/Nein-Merkmal (`telefon_bekannt`) weiter.

**Im Hilfecenter** wird davon nichts davon übernommen: Der Patris-Import
speichert nur die neun Spalten, die der Kundencheck braucht
(`KUNDENCHECK-COCKPIT.md`, Abschnitt 3.2). Telefonnummer und Anschrift bleiben
bewusst draußen.

## Wie die Zahlen nachgerechnet werden

Im Reporting-Projekt, ohne Umweg über eine Anwendung:

```sql
-- Aktivierungsquote
SELECT count(*) FILTER (WHERE aktiviert) AS mit_konto,
       count(*) FILTER (WHERE NOT aktiviert) AS ohne_konto,
       count(*) AS personen
FROM rpt.abo_berechtigung WHERE ist_hauptzeile;

-- Verteilung auf die Segmente
SELECT bestandssegment, count(*), round(avg(alter_jahre), 1) AS schnittalter
FROM rpt.abo_berechtigung WHERE ist_hauptzeile GROUP BY 1;
```
