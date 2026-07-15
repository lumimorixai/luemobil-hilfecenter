import React from 'react'
import { jiraConfigured } from '../../lib/jira'

/**
 * Hinweis in der Admin-Navigation zur Jira-Anbindung.
 *
 * Primärweg: Sobald ein bekannter Fehler den Status „Gemeldet“ erhält, wird
 * automatisch EIN Jira-Ticket angelegt (Idempotenz über das Feld „Jira-Ticket“).
 * Der CSV-Export bleibt als Ausweichlösung erhalten, falls Jira (noch) nicht
 * konfiguriert ist.
 */
export function JiraExportLink() {
  const active = jiraConfigured()
  return (
    <div style={{ margin: '4px 0 12px' }}>
      <div
        style={{
          padding: '8px 10px',
          border: '1px solid #FF8200',
          borderRadius: 2,
          color: '#1a1a1a',
          fontSize: 12,
          lineHeight: 1.4,
          background: '#FFF6ED',
        }}
      >
        <strong style={{ color: '#FF8200' }}>Jira-Anbindung</strong>
        <br />
        {active
          ? 'Aktiv: Status „Gemeldet“ legt automatisch ein Ticket an.'
          : 'Nicht konfiguriert – bitte JIRA_* in der .env setzen.'}
        {active && (
          <>
            <br />
            <a
              href="/api/jira-meta"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#FF8200', fontSize: 12 }}
            >
              Pflichtfelder des Projekts prüfen
            </a>
          </>
        )}
      </div>
      <a
        href="/api/jira-export"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'block',
          marginTop: 6,
          fontSize: 12,
          color: '#666',
          textDecoration: 'underline',
        }}
      >
        Ausweichlösung: Fehler als CSV exportieren
      </a>
    </div>
  )
}
