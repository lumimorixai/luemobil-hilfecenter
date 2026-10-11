'use client'

/**
 * Inhalts-Update aus dem Cockpit anstoßen.
 *
 * Gedacht für Produktion: Dort gibt es keine CLI (Standalone-Image ohne pnpm,
 * tsx und Quelltext), die redaktionellen Zielzustände stecken aber im Code.
 * Der Knopf ruft denselben Lauf über HTTP auf und zeigt, was er bewirkt hat.
 */
import { useState } from 'react'

type Ergebnis = {
  neu: number
  geaendert: number
  bilderNeu: number
  bilderFehlen: string[]
}

export function InhalteUpdate() {
  const [laeuft, setLaeuft] = useState(false)
  const [erg, setErg] = useState<Ergebnis | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  async function starten() {
    setLaeuft(true)
    setErg(null)
    setFehler(null)
    try {
      const res = await fetch('/api/cockpit/inhalte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job: 'handbuch-v2' }),
      })
      const daten = await res.json().catch(() => ({}))
      if (!res.ok || !daten.ok) {
        setFehler(daten.detail || daten.error || `Fehlgeschlagen (${res.status})`)
      } else {
        setErg(daten as Ergebnis)
      }
    } catch (e) {
      setFehler((e as Error).message)
    }
    setLaeuft(false)
  }

  return (
    <div className="cx-kampagne-aktionen">
      <p className="cx-card-hint">
        Schreibt die zwölf Handbuch-Kapitel auf den Stand der App-Version 2 und lädt die
        Screenshots nach. Fehlende Kapitel werden angelegt, vorhandene überschrieben — gelöscht
        wird nichts. Ein zweiter Lauf ändert nichts mehr.
      </p>

      <div className="cx-knopfreihe">
        <button type="button" className="cx-knopf cx-knopf--akzent" disabled={laeuft} onClick={starten}>
          {laeuft ? 'läuft …' : 'Handbuch aktualisieren'}
        </button>
      </div>

      {erg && (
        <div className="cx-hinweis">
          <p>
            Fertig: {erg.neu} Kapitel angelegt, {erg.geaendert} aktualisiert, {erg.bilderNeu} Bilder
            geladen.
          </p>
          {erg.bilderFehlen.length > 0 && (
            <p>
              Nicht gefunden: {erg.bilderFehlen.join(', ')} — die Texte stehen trotzdem. Prüfen Sie,
              ob der Bildordner im Image liegt.
            </p>
          )}
        </div>
      )}

      {fehler && <p className="cx-fehler">{fehler}</p>}
    </div>
  )
}
