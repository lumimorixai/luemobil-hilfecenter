/**
 * Jira-Cloud-Anbindung: legt aus einem bekannten Fehler ein Bug-Ticket an.
 *
 * Konfiguration über Umgebungsvariablen (nichts davon im Code):
 *   JIRA_BASE_URL      z. B. https://stadtwerke-luebeck.atlassian.net
 *   JIRA_EMAIL         E-Mail des Atlassian-Kontos zum API-Token
 *   JIRA_API_TOKEN     Atlassian-API-Token (Jira Cloud)
 *   JIRA_PROJECT_KEY   Ziel-Projekt, z. B. LUEM
 *   JIRA_ISSUE_TYPE    Vorgangstyp, Standard: Bug
 *   JIRA_SET_PRIORITY  "true", um die Priorität mitzusenden (sonst weglassen)
 *
 * Authentifizierung: HTTP Basic mit "E-Mail:API-Token" (Jira Cloud REST v3).
 */

export function jiraConfigured(): boolean {
  return Boolean(
    process.env.JIRA_BASE_URL &&
      process.env.JIRA_EMAIL &&
      process.env.JIRA_API_TOKEN &&
      process.env.JIRA_PROJECT_KEY,
  )
}

/** Basis-URL ohne abschließenden Schrägstrich. */
function jiraBase(): string {
  return (process.env.JIRA_BASE_URL || '').replace(/\/$/, '')
}

/** HTTP-Basic-Header aus E-Mail und API-Token (Jira Cloud). */
function jiraAuthHeader(): string {
  const auth = Buffer.from(
    `${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`,
  ).toString('base64')
  return `Basic ${auth}`
}

/** Kleiner Fetch-Wrapper mit Auth, JSON-Accept und Timeout. */
async function jiraFetch(path: string): Promise<Response> {
  return fetch(`${jiraBase()}${path}`, {
    headers: { Authorization: jiraAuthHeader(), Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  })
}

/** Baut ein einfaches Atlassian-Document-Format-Dokument aus mehrzeiligem Text. */
function toAdf(text: string) {
  return {
    type: 'doc',
    version: 1,
    content: text.split('\n').map((line) => ({
      type: 'paragraph',
      content: line ? [{ type: 'text', text: line }] : [],
    })),
  }
}

export type JiraIssueInput = {
  summary: string
  description: string
  priorityName?: string
  labels?: string[]
}

/** Feldnamen (fieldId), die wir beim Anlegen immer bzw. optional mitsenden. */
export const SUPPLIED_FIELD_IDS = ['project', 'issuetype', 'summary', 'description', 'labels', 'priority']

export async function createJiraIssue(input: JiraIssueInput): Promise<{ key: string; url: string }> {
  const base = jiraBase()
  const auth = jiraAuthHeader().replace(/^Basic /, '')

  const fields: Record<string, unknown> = {
    project: { key: process.env.JIRA_PROJECT_KEY },
    issuetype: { name: process.env.JIRA_ISSUE_TYPE || 'Bug' },
    summary: input.summary.slice(0, 250),
    description: toAdf(input.description),
  }
  if (process.env.JIRA_SET_PRIORITY === 'true' && input.priorityName) {
    fields.priority = { name: input.priorityName }
  }
  if (input.labels?.length) fields.labels = input.labels

  const res = await fetch(`${base}/rest/api/3/issue`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ fields }),
    signal: AbortSignal.timeout(15000),
  })

  const data = (await res.json().catch(() => ({}))) as { key?: string; errors?: unknown; errorMessages?: unknown }
  if (!res.ok || !data.key) {
    throw new Error(
      `Jira-Antwort ${res.status}: ${JSON.stringify(data.errors ?? data.errorMessages ?? data)}`,
    )
  }
  return { key: data.key, url: `${base}/browse/${data.key}` }
}

/** Schweregrad → Jira-Priorität. */
export function mapPriority(severity: string): string {
  return severity === 'hoch' ? 'High' : severity === 'mittel' ? 'Medium' : 'Low'
}

export type JiraFieldMeta = {
  fieldId: string
  name: string
  required: boolean
  hasDefaultValue: boolean
  type?: string
  /** Auswahlwerte (falls das Feld eine feste Werteliste hat). */
  allowedValues?: string[]
}

export type JiraCreateMeta = {
  project: string
  issueType: string
  fields: JiraFieldMeta[]
}

/**
 * Liest über die Jira-„createmeta“-Schnittstelle aus, welche Felder das
 * konfigurierte Projekt für den gewählten Vorgangstyp beim Anlegen erwartet —
 * inklusive der Angabe, welche davon Pflicht sind.
 *
 * Zwei Aufrufe (aktuelle Jira-Cloud-API):
 *   1) Vorgangstypen des Projekts holen und den passenden (Name) finden.
 *   2) Felder dieses Vorgangstyps holen (paginiert).
 */
export async function fetchCreateMeta(): Promise<JiraCreateMeta> {
  const projectKey = process.env.JIRA_PROJECT_KEY as string
  const issueTypeName = process.env.JIRA_ISSUE_TYPE || 'Bug'

  // 1) Vorgangstypen des Projekts
  const typesRes = await jiraFetch(
    `/rest/api/3/issue/createmeta/${encodeURIComponent(projectKey)}/issuetypes`,
  )
  if (!typesRes.ok) {
    throw new Error(
      `Jira createmeta (Vorgangstypen) ${typesRes.status}: ${await typesRes.text()}`,
    )
  }
  const typesData = (await typesRes.json()) as {
    values?: Array<{ id: string; name: string }>
  }
  const match =
    typesData.values?.find(
      (t) => t.name.toLowerCase() === issueTypeName.toLowerCase(),
    ) || typesData.values?.[0]
  if (!match) {
    throw new Error(
      `Kein Vorgangstyp im Projekt „${projectKey}“ gefunden (gesucht: „${issueTypeName}“).`,
    )
  }

  // 2) Felder dieses Vorgangstyps (paginiert einsammeln)
  const fields: JiraFieldMeta[] = []
  let startAt = 0
  for (let guard = 0; guard < 20; guard++) {
    const fieldsRes = await jiraFetch(
      `/rest/api/3/issue/createmeta/${encodeURIComponent(projectKey)}/issuetypes/${match.id}?startAt=${startAt}&maxResults=100`,
    )
    if (!fieldsRes.ok) {
      throw new Error(
        `Jira createmeta (Felder) ${fieldsRes.status}: ${await fieldsRes.text()}`,
      )
    }
    const data = (await fieldsRes.json()) as {
      values?: Array<{
        fieldId: string
        name: string
        required: boolean
        hasDefaultValue?: boolean
        schema?: { type?: string }
        allowedValues?: Array<{ name?: string; value?: string }>
      }>
      isLast?: boolean
      total?: number
    }
    for (const f of data.values || []) {
      fields.push({
        fieldId: f.fieldId,
        name: f.name,
        required: Boolean(f.required),
        hasDefaultValue: Boolean(f.hasDefaultValue),
        type: f.schema?.type,
        allowedValues: f.allowedValues
          ?.map((v) => v.name || v.value)
          .filter((v): v is string => Boolean(v)),
      })
    }
    startAt += data.values?.length || 0
    if (data.isLast || !data.values?.length || startAt >= (data.total ?? startAt)) break
  }

  return { project: projectKey, issueType: match.name, fields }
}
