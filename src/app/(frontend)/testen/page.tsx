import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

export const metadata: Metadata = {
  title: 'Testen & Mitmachen · LüMobil Hilfecenter',
}

type Group = { heading: string; items: React.ReactNode[] }

const TEST_GROUPS: Group[] = [
  {
    heading: 'Kernfunktionen',
    items: [
      <>
        <strong>Verbindungen suchen:</strong> Start und Ziel eingeben, suchen, Ergebnisse öffnen —
        stimmen Route, Zeiten, Umstiege und Fußwege?
      </>,
      <>
        <strong>„Früher / Später“:</strong> Lassen sich weitere Verbindungen vor- und zurückblättern?
      </>,
      <>
        <strong>Favoriten:</strong> Orte und Haltestellen speichern, wiederfinden und wieder löschen.
      </>,
      <>
        <strong>Abfahrten & Haltestellen:</strong> Werden Abfahrten korrekt und aktuell angezeigt?
      </>,
      <>
        <strong>Konto:</strong> Registrieren, an- und abmelden, Daten ändern — funktioniert alles?
      </>,
    ],
  },
  {
    heading: 'Darstellung & Layout',
    items: [
      <>
        <strong>Buttons mit ganzem Text:</strong> Steht auf allen Schaltflächen der vollständige Text,
        ohne Kürzung?
      </>,
      <>
        <strong>Nichts abgeschnitten:</strong> Werden Texte, Überschriften und Elemente vollständig
        angezeigt, nichts überlappt oder wird abgeschnitten?
      </>,
      <>
        <strong>Verschiedene Bildschirmgrößen:</strong> Sieht es auf kleinen und großen Handys (und
        ggf. Tablet) gut aus?
      </>,
      <>
        <strong>Hoch- und Querformat:</strong> Bleibt die Darstellung beim Drehen des Geräts sauber?
      </>,
      <>
        <strong>Große Schrift:</strong> Bei erhöhter System-Schriftgröße alles noch lesbar und nichts
        abgeschnitten?
      </>,
    ],
  },
  {
    heading: 'Sprache & Erscheinungsbild',
    items: [
      <>
        <strong>Deutsch / Englisch:</strong> Ist bei umgestellter Sprache alles übersetzt — keine
        gemischten oder fehlenden Texte?
      </>,
      <>
        <strong>Hell / Dunkel:</strong> Folgt die App der Systemeinstellung des Handys und ist in
        beiden Modi alles gut lesbar (Kontraste, Symbole, Karten)?
      </>,
      <>
        <strong>Einheitliche Begriffe:</strong> Werden dieselben Dinge überall gleich benannt?
      </>,
    ],
  },
  {
    heading: 'Weitere Prüfpunkte',
    items: [
      <>
        <strong>Schlechte / keine Verbindung:</strong> Wie verhält sich die App offline oder bei
        langsamer Internetverbindung? Gibt es verständliche Hinweise?
      </>,
      <>
        <strong>Standort & Karte:</strong> Standortfreigabe, Kartenanzeige und Position korrekt?
      </>,
      <>
        <strong>Ladezeiten:</strong> Reagiert die App zügig, gibt es lange Wartezeiten?
      </>,
      <>
        <strong>Fehlermeldungen:</strong> Sind Hinweise verständlich und hilfreich formuliert?
      </>,
      <>
        <strong>Unterbrechungen:</strong> App in den Hintergrund legen und zurückkehren, Anruf
        zwischendurch — bleibt der Stand erhalten?
      </>,
      <>
        <strong>Datum & Uhrzeit:</strong> Werden Zeiten korrekt (richtige Zeitzone) angezeigt?
      </>,
    ],
  },
]

export default function TestenPage() {
  return (
    <div>
      <h2 className="lm-section-title" style={{ marginTop: 0 }}>
        Testen &amp; Mitmachen
      </h2>
      <p style={{ maxWidth: 680, fontSize: 15, lineHeight: 1.6, color: '#3F3B3B' }}>
        Vielen Dank, dass Sie LüMobil testen! Ihre Rückmeldungen helfen uns, die App vor dem Start
        zu verbessern. Auf dieser Seite finden Sie, wie Sie mitmachen können und worauf Sie beim
        Testen achten sollten.
      </p>

      <h3 className="lm-h2">Wie kann ich mitmachen?</h3>
      <p style={{ fontSize: 14.5, lineHeight: 1.6, color: '#3F3B3B', maxWidth: 680 }}>
        Nutzen Sie die App im Alltag und melden Sie alles, was auffällt — ob Fehler, unklare Stelle
        oder Verbesserungsidee. Jede Rückmeldung zählt, auch Kleinigkeiten.
      </p>
      <div className="lm-test-cta">
        <Link href="/fehler" className="lm-mini">
          ＋ Fehler melden
        </Link>
        <Link href="/fragen" className="lm-mini">
          ＋ Frage stellen
        </Link>
      </div>
      <div className="lm-tipbox" style={{ marginTop: 12 }}>
        <ul>
          <li>
            Beschreiben Sie kurz, <strong>was passiert ist</strong> und <strong>was Sie erwartet
            hatten</strong>.
          </li>
          <li>
            Nennen Sie die <strong>Schritte</strong>, mit denen sich das Verhalten wiederholen lässt.
          </li>
          <li>
            Hängen Sie nach Möglichkeit einen <strong>Screenshot</strong> an.
          </li>
          <li>
            Notieren Sie <strong>Gerät, Betriebssystem und Sprache/Modus</strong> (hell/dunkel), wenn
            es zur Darstellung passt.
          </li>
        </ul>
      </div>

      <h3 className="lm-h2" style={{ marginTop: 30 }}>
        Was sollte ich testen?
      </h3>
      <div className="lm-grid" style={{ marginTop: 8 }}>
        {TEST_GROUPS.map((g) => (
          <div key={g.heading} className="lm-roadmap-card">
            <h4 style={{ marginTop: 0 }}>{g.heading}</h4>
            <ul className="lm-checklist">
              {g.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="lm-short" style={{ marginTop: 24 }}>
        Etwas gefunden? Melden Sie es direkt über <Link href="/fehler">Fehler melden</Link> oder
        stellen Sie eine <Link href="/fragen">Frage</Link>. Vielen Dank fürs Mittesten!
      </div>
    </div>
  )
}
