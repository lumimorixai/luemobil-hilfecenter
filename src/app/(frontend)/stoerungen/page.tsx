import type { Metadata } from 'next'
import React from 'react'
import { AutoResizeIframe } from '@/components/AutoResizeIframe'

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
        {/* Höhe passt sich dem Inhalt an; läuft über den eigenen Proxy
            (/api/stoerungen-proxy), daher gleiche Origin und Höhenmessung möglich. */}
        <AutoResizeIframe
          src="/api/stoerungen-proxy/luebeck"
          title="Aktuelle Störungsmeldungen für Lübeck"
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
