'use client'

/**
 * Live-Systemstatus + Auto-Refresh im Cockpit-Kopf.
 * - Pollt /api/cockpit/health alle 30 s → Ampel (Keycloak/Login/DB/Aboonline).
 * - Aktualisiert die Seitendaten alle 60 s via router.refresh() (ohne Reload).
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Health, ServiceHealth } from '@/lib/cockpit/types'

const SERVICES: { key: keyof Omit<Health, 'mock'>; label: string }[] = [
  { key: 'keycloak', label: 'Keycloak' },
  { key: 'login', label: 'Login (Test)' },
  { key: 'database', label: 'Datenbank' },
]

function dotClass(s?: ServiceHealth): string {
  if (!s || !s.configured) return 'off'
  return s.ok ? 'ok' : 'no'
}

export function LiveStatus() {
  const router = useRouter()
  const [health, setHealth] = useState<Health | null>(null)
  const [ago, setAgo] = useState(0)

  // Ampel alle 30 s
  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const res = await fetch('/api/cockpit/health', { headers: { Accept: 'application/json' } })
        if (res.ok && alive) setHealth((await res.json()) as Health)
      } catch {
        /* still zeigen, was zuletzt bekannt war */
      }
    }
    load()
    const id = setInterval(load, 30_000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])

  // Sekundenzähler
  useEffect(() => {
    const id = setInterval(() => setAgo((a) => a + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // Seitendaten alle 60 s auffrischen
  useEffect(() => {
    const id = setInterval(() => {
      router.refresh()
      setAgo(0)
    }, 60_000)
    return () => clearInterval(id)
  }, [router])

  return (
    <div className="cx-statusbar">
      <div className="cx-status">
        {SERVICES.map((s) => {
          const h = health?.[s.key]
          return (
            <span className="cx-status-item" key={s.key} title={h?.note ?? ''}>
              <span className={`cx-dot cx-dot--${dotClass(h)}`} />
              {s.label}
              {h?.ms != null && <em className="cx-status-ms">{h.ms} ms</em>}
            </span>
          )
        })}
      </div>
      <span className="cx-live">
        <span className="cx-live-dot" /> live · aktualisiert vor {ago}s
      </span>
    </div>
  )
}
