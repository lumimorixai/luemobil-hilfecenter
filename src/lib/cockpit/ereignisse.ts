/**
 * Keycloak-Ereignisse in Sätze übersetzen, die im Servicecenter weiterhelfen.
 *
 * Bisher stand in der Liste der technische Name („user_not_found"). Wer nicht
 * weiß, wie Keycloak arbeitet, kann damit nichts anfangen — und genau diese
 * Menschen sitzen am Telefon. Deshalb zu jedem Ereignis drei Angaben:
 *
 *   label       Was passiert ist, in einem Halbsatz.
 *   erklaerung  Was das technisch bedeutet.
 *   grund       Was erfahrungsgemäß dahintersteckt und was zu tun ist.
 *
 * Der technische Code bleibt zusätzlich sichtbar — für Rückfragen an uns.
 */

/**
 * Technischer Client-Name → Anwendung, wie sie am Telefon genannt wird.
 *
 * „Erfolgreich angemeldet" allein hilft nicht weiter: Ob sich jemand in der
 * App oder in der Aboverwaltung angemeldet hat, ist für die Auskunft ein
 * Unterschied. Der Abgleich ist absichtlich unabhängig von Groß- und
 * Kleinschreibung — die Schreibweisen in Keycloak sind uneinheitlich.
 *
 * Weitere Clients hier ergänzen; unbekannte erscheinen ohne Zusatz.
 */
const ANWENDUNGEN: Record<string, string> = {
  luemaas: 'LüMobil',
  abooonline: 'der Aboverwaltung',
  aboonline: 'der Aboverwaltung',
}

/** Anwendungsname zu einem Client, oder null wenn unbekannt. */
export function anwendung(clientId?: string): string | null {
  if (!clientId) return null
  return ANWENDUNGEN[clientId.toLowerCase()] ?? null
}

export type Ereignisdeutung = {
  label: string
  erklaerung: string
  /** Vermutung samt Handlungsvorschlag; fehlt, wo es nichts zu raten gibt. */
  grund?: string
  /** Ampelfarbe der Zeile. */
  kind: 'ok' | 'warn' | 'no'
}

/** Fehlgeschlagene Anmeldungen — der häufigste Fall am Telefon. */
const LOGIN_FEHLER: Record<string, Ereignisdeutung> = {
  user_not_found: {
    label: 'Anmeldung fehlgeschlagen — Adresse unbekannt',
    erklaerung: 'Zu dieser E-Mail-Adresse gibt es kein Konto im Anmeldesystem.',
    grund:
      'Meist ein Tippfehler oder eine andere Adresse als beim Abo. Manchmal ist das Konto auch noch gar nicht angelegt. Adresse gemeinsam prüfen, notfalls Registrierung anstoßen.',
    kind: 'no',
  },
  invalid_user_credentials: {
    label: 'Anmeldung fehlgeschlagen — Passwort falsch',
    erklaerung: 'Das Konto gibt es, das eingegebene Passwort passt nicht dazu.',
    grund:
      'Meist vergessen oder vertippt. „Passwort vergessen" in der App anbieten. Häufen sich solche Fehler bei vielen Menschen gleichzeitig, kann auch die Prüfung gegen das Altsystem gestört sein.',
    kind: 'no',
  },
  expired_code: {
    label: 'Vorgang abgelaufen',
    erklaerung: 'Der Anmelde- oder Bestätigungsvorgang war zu lange offen.',
    grund:
      'Die Seite lag im Hintergrund oder der Link aus der E-Mail wurde erst später angeklickt. Einfach neu beginnen lassen.',
    kind: 'warn',
  },
  account_disabled: {
    label: 'Anmeldung abgelehnt — Konto gesperrt',
    erklaerung: 'Das Konto ist im Anmeldesystem deaktiviert.',
    grund:
      'Wurde bewusst gesperrt, etwa nach einer Löschanfrage. Vor dem Entsperren klären, warum — nicht einfach freischalten.',
    kind: 'no',
  },
  access_denied: {
    label: 'Anmeldung abgebrochen',
    erklaerung: 'Der Vorgang wurde beendet, bevor er fertig war.',
    grund:
      'Meist hat die Person selbst abgebrochen oder eine Zustimmung verweigert. Kein technisches Problem.',
    kind: 'warn',
  },
  invalid_client_credentials: {
    label: 'Technischer Fehler bei der Anmeldung',
    erklaerung: 'Die App hat sich dem Anmeldesystem gegenüber nicht korrekt ausgewiesen.',
    grund:
      'Das liegt nicht an der Kundin oder dem Kunden, sondern an der Einrichtung. Bitte an die Technik melden.',
    kind: 'no',
  },
  identity_provider_login_failure: {
    label: 'Anmeldung über das Altsystem fehlgeschlagen',
    erklaerung: 'Die Prüfung gegen das Abo-System hat nicht funktioniert.',
    grund:
      'Häufig eine vorübergehende Störung. Später erneut versuchen lassen; tritt es bei mehreren auf, ist es eine Störung auf unserer Seite.',
    kind: 'no',
  },
}

/** Alles außerhalb der Anmeldung: Passwort, Bestätigung, Registrierung. */
const SONSTIGE: Record<string, Ereignisdeutung> = {
  LOGIN: {
    label: 'Erfolgreich angemeldet',
    erklaerung: 'Die Anmeldung hat funktioniert.',
    kind: 'ok',
  },
  LOGOUT: {
    label: 'Abgemeldet',
    erklaerung: 'Die Sitzung wurde beendet.',
    kind: 'ok',
  },
  REGISTER: {
    label: 'Konto selbst angelegt',
    erklaerung: 'Die Person hat sich in der App registriert.',
    kind: 'ok',
  },
  SEND_RESET_PASSWORD: {
    label: 'Passwort-Zurücksetzen angefordert',
    erklaerung: 'Eine E-Mail mit Link zum Zurücksetzen wurde verschickt.',
    grund:
      'Folgt darauf kein „Passwort neu gesetzt", ist die Mail nicht angekommen — Spam-Ordner prüfen lassen oder Adresse bestätigen.',
    kind: 'warn',
  },
  RESET_PASSWORD: {
    label: 'Passwort neu gesetzt',
    erklaerung: 'Das Zurücksetzen wurde abgeschlossen.',
    kind: 'ok',
  },
  UPDATE_PASSWORD: {
    label: 'Passwort geändert',
    erklaerung: 'Die Person hat ihr Passwort selbst geändert.',
    kind: 'ok',
  },
  SEND_VERIFY_EMAIL: {
    label: 'Bestätigungs-Mail verschickt',
    erklaerung: 'Eine E-Mail zur Bestätigung der Adresse wurde versendet.',
    grund:
      'Folgt darauf kein „E-Mail bestätigt", kam sie nicht an oder landete im Spam. Ohne Bestätigung bleiben manche Funktionen gesperrt.',
    kind: 'warn',
  },
  VERIFY_EMAIL: {
    label: 'E-Mail-Adresse bestätigt',
    erklaerung: 'Die Adresse wurde über den Link in der E-Mail bestätigt.',
    kind: 'ok',
  },
  UPDATE_PROFILE: {
    label: 'Profil geändert',
    erklaerung: 'Angaben am Konto wurden bearbeitet.',
    kind: 'ok',
  },
  DELETE_ACCOUNT: {
    label: 'Konto gelöscht',
    erklaerung: 'Das Konto wurde entfernt.',
    kind: 'no',
  },
}

/**
 * Deutung zu einem Ereignis. `error` ist nur bei Fehlertypen gesetzt.
 * Unbekannte Typen werden nicht verschwiegen, sondern mit ihrem Rohnamen
 * gezeigt — besser ein technischer Begriff als eine Lücke in der Liste.
 */
export function deuteEreignis(
  type: string,
  error?: string,
  clientId?: string,
): Ereignisdeutung {
  const wo = anwendung(clientId)

  if (type === 'LOGIN_ERROR') {
    const deutung = error && LOGIN_FEHLER[error] ? LOGIN_FEHLER[error] : null
    if (deutung) {
      // Bei Fehlern bleibt der Grund die Hauptsache; die Anwendung gehört in
      // die Erklärung, sonst wird die Überschrift unlesbar lang.
      return wo
        ? { ...deutung, erklaerung: `${deutung.erklaerung} Versucht wurde es in ${wo}.` }
        : deutung
    }
    return {
      label: 'Anmeldung fehlgeschlagen',
      erklaerung: error
        ? `Das Anmeldesystem meldet „${error}".`
        : 'Das Anmeldesystem nennt keinen genaueren Grund.',
      grund:
        'Für diesen Fall ist noch keine Erklärung hinterlegt. Bitte mit dem technischen Namen an die Technik melden.',
      kind: 'no',
    }
  }

  if (SONSTIGE[type]) {
    const deutung = SONSTIGE[type]
    // An- und Abmeldung sagen erst mit der Anwendung etwas aus.
    if (wo && type === 'LOGIN') {
      return { ...deutung, label: `Erfolgreich angemeldet in ${wo}` }
    }
    if (wo && type === 'LOGOUT') {
      return { ...deutung, label: `Abgemeldet von ${wo}` }
    }
    return deutung
  }

  const fehler = type.endsWith('_ERROR')
  return {
    label: fehler ? `Fehler: ${type}` : type,
    erklaerung: 'Für dieses Ereignis ist noch keine Erklärung hinterlegt.',
    kind: fehler ? 'no' : 'ok',
  }
}

/** Ereignistypen, die im Kundencheck gezeigt werden — ohne Token-Rauschen. */
export const KUNDENCHECK_TYPEN = [
  'LOGIN',
  'LOGIN_ERROR',
  'LOGOUT',
  'REGISTER',
  'SEND_RESET_PASSWORD',
  'RESET_PASSWORD',
  'UPDATE_PASSWORD',
  'SEND_VERIFY_EMAIL',
  'VERIFY_EMAIL',
  'UPDATE_PROFILE',
  'DELETE_ACCOUNT',
]
