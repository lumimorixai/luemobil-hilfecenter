# ---- Build-Stage ----
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
ENV DOCKER_BUILD=1
# Dummy-Werte nur für den Build (zur Laufzeit kommen echte Werte aus docker-compose)
ENV DATABASE_URI=file:./build-dummy.db
ENV PAYLOAD_SECRET=build-dummy-secret
RUN pnpm build

# ---- Runtime-Stage ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# Seed-Grundlage & Skript mitnehmen (Erstimport auf dem Server)
COPY --from=builder /app/legacy ./legacy
COPY --from=builder /app/src ./src
COPY --from=builder /app/node_modules/tsx ./node_modules/tsx

RUN mkdir -p media && chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
