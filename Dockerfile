FROM node:20-bookworm-slim AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres \
    DIRECT_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres \
    NEXTAUTH_URL=http://127.0.0.1:3000 \
    NEXTAUTH_SECRET=build-only-nextauth-secret-1234567890 \
    APP_BASE_URL=http://127.0.0.1:3000 \
    EMAIL_PROVIDER=noop \
    DIGEST_TIMEZONE=America/New_York \
    DIGEST_MIN_THRESHOLD=4 \
    DIGEST_MAX_AGE_DAYS=180

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate && npm run build && npm prune --omit=dev

FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=8080

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next

EXPOSE 8080

CMD ["sh", "-c", "npm run start -- -H 0.0.0.0 -p ${PORT:-8080}"]
