import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 'standalone' nur im Docker-Build (lokal funktioniert `pnpm start` damit nicht)
  output: process.env.DOCKER_BUILD ? 'standalone' : undefined,
  // Sicherstellen, dass der PDF-Renderer samt aller dynamisch nachgeladenen
  // Assets ins Standalone-Image getract wird — sonst schlägt der Report-Versand
  // im Container fehl (pdfkit lädt Standard-Schriften wie Helvetica.cjs sowie
  // fontkit-Daten erst zur Laufzeit; die `**` überbrücken die pnpm-.pnpm-Ebene).
  // Am pnpm-Pfad verankerte Globs (kein führendes ** über ganz node_modules,
  // sonst wird „Collecting build traces" extrem langsam). Erfasst die dynamisch
  // nachgeladenen Assets: pdfkit-Standardschriften + fontkit-Shaper-Daten.
  outputFileTracingIncludes: {
    '/api/cockpit/report': [
      './node_modules/.pnpm/pdfkit@*/node_modules/pdfkit/js/**',
      './node_modules/.pnpm/fontkit@*/node_modules/fontkit/**',
    ],
    '/api/cockpit/cron': [
      './node_modules/.pnpm/pdfkit@*/node_modules/pdfkit/js/**',
      './node_modules/.pnpm/fontkit@*/node_modules/fontkit/**',
    ],
  },
  experimental: {
    serverActions: {
      // Fehlermelde-Formular: bis zu 3 Screenshots à 4 MB + Formulardaten
      bodySizeLimit: '15mb',
    },
  },
}

export default withPayload(nextConfig)
