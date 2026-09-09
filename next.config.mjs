import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 'standalone' nur im Docker-Build (lokal funktioniert `pnpm start` damit nicht)
  output: process.env.DOCKER_BUILD ? 'standalone' : undefined,
  // Sicherstellen, dass der PDF-Renderer (@react-pdf inkl. yoga/fontkit) samt
  // Assets ins Standalone-Image getract wird — sonst schlägt der Report-Versand
  // im Container fehl.
  outputFileTracingIncludes: {
    '/api/cockpit/report': ['./node_modules/@react-pdf/**/*', './node_modules/yoga-layout/**/*'],
  },
  experimental: {
    serverActions: {
      // Fehlermelde-Formular: bis zu 3 Screenshots à 4 MB + Formulardaten
      bodySizeLimit: '15mb',
    },
  },
}

export default withPayload(nextConfig)
