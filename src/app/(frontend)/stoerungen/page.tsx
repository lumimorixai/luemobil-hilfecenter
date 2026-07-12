import type { Metadata } from 'next'
import React from 'react'

const SOURCE_URL = 'https://www.enrico-peter.de/luebeck'

export const metadata: Metadata = {
  title: 'Aktuelle Störungen · LüMobil Hilfecenter',
}

export default function DisruptionsPage() {
  return (
    <div>
      <h2 className="lm-section-title" style={{ marginTop: 0 }}>
        Aktuelle Störungen
      </h2>
      <p style={{ maxWidth: 640, fontSize: 15, lineHeight: 1.6, color: '#3F3B3B' }}>
        Live-Übersicht der aktuellen Störungsmeldungen für Bus und Bahn in Lübeck.
      </p>
      <div className="lm-iframe-wrap">
        <iframe
          src={SOURCE_URL}
          title="Aktuelle Störungsmeldungen für Lübeck"
          loading="lazy"
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      </div>
      <p className="lm-caption" style={{ marginTop: 10 }}>
        Quelle: extern eingebundene Seite{' '}
        <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">
          enrico-peter.de/luebeck
        </a>
        . Wird die Übersicht oben nicht angezeigt, öffnen Sie die Quelle bitte direkt über den
        Link.
      </p>
    </div>
  )
}
