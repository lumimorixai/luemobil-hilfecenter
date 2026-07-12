import React from 'react'

/** Login-Logo im Admin-Panel (SWL Innovation · LüMobil Hilfecenter). */
export function Logo() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '6px 2px',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/swl-innovation-mark.png" alt="SWL Innovation" width={52} height={52} />
      <div style={{ lineHeight: 1.2 }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#7A7474',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 4,
          }}
        >
          <span style={{ width: 9, height: 9, background: '#FF8200', display: 'inline-block' }} />
          Stadtwerke Lübeck · LüMobil
        </div>
        <div style={{ fontSize: 22, fontWeight: 800 }}>Hilfecenter — Redaktion</div>
      </div>
    </div>
  )
}
