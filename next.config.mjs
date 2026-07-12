import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 'standalone' nur im Docker-Build (lokal funktioniert `pnpm start` damit nicht)
  output: process.env.DOCKER_BUILD ? 'standalone' : undefined,
  experimental: {
    serverActions: {
      // Fehlermelde-Formular: bis zu 3 Screenshots à 4 MB + Formulardaten
      bodySizeLimit: '15mb',
    },
  },
}

export default withPayload(nextConfig)
