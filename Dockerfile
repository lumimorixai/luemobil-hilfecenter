# ---- Build-Stage ----
FROM node:22-alpine AS builder
WORKDIR /app
# pnpm-Version exakt pinnen (passend zum Lockfile) — verhindert, dass corepack
# eine neuere pnpm-Version mit strengerer Supply-Chain-Policy zieht.
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
ENV DOCKER_BUILD=1
# Dummy-Werte nur für den Build (zur Laufzeit kommen echte Werte aus docker-compose)
ENV DATABASE_URI=file:./build-dummy.db
ENV PAYLOAD_SECRET=build-dummy-secret
# Payload-Typen vor dem Build frisch erzeugen, damit sie garantiert zum Code
# passen (verhindert Typfehler durch eine veraltete payload-types.ts).
RUN pnpm generate:types && pnpm build

# ---- Runtime-Stage ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# Legacy-Inhalte für den automatischen Erstimport (onInit / SEED_ON_INIT)
COPY --from=builder /app/legacy ./legacy

RUN mkdir -p media && chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
