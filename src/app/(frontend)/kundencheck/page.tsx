import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/**
 * Der Kundencheck ist in das Cockpit gezogen (Bereich „Werkzeuge").
 * Diese Adresse bleibt als Weiterleitung bestehen, damit Lesezeichen und
 * verlinkte Anleitungen weiter funktionieren.
 */
export default function KundencheckWeiterleitung() {
  redirect('/cockpit/kundencheck')
}
