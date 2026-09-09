import { NextRequest, NextResponse } from 'next/server'
import { isMock } from '@/lib/cockpit/config'
import { logoutUrl } from '@/lib/auth/oidc'
import { SESSION_COOKIE } from '@/lib/auth/session'

export const runtime = 'nodejs'

/** Meldet ab: löscht die Session und (real) die Keycloak-SSO-Sitzung. */
export async function GET(req: NextRequest) {
  const base = (process.env.APP_BASE_URL || new URL(req.url).origin).replace(/\/$/, '')
  let target = `${base}/`
  if (!isMock()) {
    try {
      target = (await logoutUrl()) ?? target
    } catch {
      /* Fallback: lokale Abmeldung genügt. */
    }
  }
  const res = NextResponse.redirect(target)
  res.cookies.delete(SESSION_COOKIE)
  return res
}
