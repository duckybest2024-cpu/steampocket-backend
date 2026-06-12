# ── Stage 1: build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --include=dev

COPY tsconfig.json ./
COPY src ./src/

RUN npm run build

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev && npx prisma generate

COPY --from=builder /app/dist ./dist/
COPY public ./public/

EXPOSE 3000

# Run migrations then start the server
CMD ["sh", "-c", "DATABASE_URL=${DATABASE_URL:-file:/data/casino.db} npx prisma migrate deploy && node dist/server.js"]
