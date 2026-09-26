'use client'

/**
 * Umschalter zwischen heller und dunkler Fassung.
 *
 * Beide teilen sich denselben Satz CSS-Variablen; umgeschaltet wird nur das
 * Attribut data-cx-theme auf der Hülle. Die Wahl bleibt im Browser der
 * jeweiligen Person gespeichert und verlässt den Rechner nicht.
 */
import { useEffect, useState } from 'react'

const SCHLUESSEL = 'cockpit-theme'

export function ThemeSchalter() {
  const [dunkel, setDunkel] = useState(false)

  // Beim ersten Rendern die gespeicherte Wahl übernehmen.
  useEffect(() => {
    try {
      setDunkel(window.localStorage.getItem(SCHLUESSEL) === 'dunkel')
    } catch {
      // Privater Modus oder gesperrter Speicher: helle Fassung bleibt.
    }
  }, [])

  useEffect(() => {
    const huelle = document.querySelector('.cx-app')
    if (!huelle) return
    // Immer explizit setzen: Sonst gewönne das Vorab-Attribut auf <html>,
    // wenn jemand von dunkel zurück auf hell schaltet.
    huelle.setAttribute('data-cx-theme', dunkel ? 'dunkel' : 'hell')
  }, [dunkel])

  const wechseln = () => {
    setDunkel((d) => {
      const neu = !d
      try {
        window.localStorage.setItem(SCHLUESSEL, neu ? 'dunkel' : 'hell')
      } catch {
        // Nicht schlimm — die Wahl gilt dann nur für diese Sitzung.
      }
      return neu
    })
  }

  return (
    <button
      type="button"
      onClick={wechseln}
      className="cx-knopf"
      style={{ padding: '6px 14px', fontSize: 12 }}
      aria-pressed={dunkel}
      title={dunkel ? 'Zur hellen Fassung wechseln' : 'Zur dunklen Fassung wechseln'}
    >
      {dunkel ? 'Hell' : 'Dunkel'}
    </button>
  )
}

/**
 * Setzt die gespeicherte Wahl, bevor der Browser zeichnet — sonst blitzt die
 * helle Fassung kurz auf, wenn jemand dunkel gewählt hat.
 */
export function ThemeVorabSkript() {
  const code = `(function(){try{if(localStorage.getItem('${SCHLUESSEL}')==='dunkel'){document.documentElement.setAttribute('data-cx-vorab','dunkel')}}catch(e){}})()`
  return <script dangerouslySetInnerHTML={{ __html: code }} />
}
