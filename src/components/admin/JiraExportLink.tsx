import React from 'react'

/** Link in der Admin-Navigation zum Jira-CSV-Export der bekannten Fehler. */
export function JiraExportLink() {
  return (
    <a
      href="/api/jira-export"
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        margin: '4px 0 12px',
        padding: '8px 10px',
        border: '1px solid #FF8200',
        borderRadius: 2,
        color: '#FF8200',
        fontSize: 13,
        fontWeight: 600,
        textDecoration: 'none',
      }}
    >
      ⬇ Fehler → Jira (CSV)
    </a>
  )
}
