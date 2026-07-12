import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 'standalone' nur im Docker-Build (lokal funktioniert `pnpm start` damit nicht)
  output: process.env.DOCKER_BUILD ? 'standalone' : undefined,
}

export default withPayload(nextConfig)
