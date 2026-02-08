# Stage 1: Build
FROM node:22-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx drizzle-kit generate 2>/dev/null || true
RUN npm run build

# Stage 2: Production (slim image + only Chromium)
FROM node:22-bookworm-slim AS runner
WORKDIR /app

# Install system libraries required by Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
    libdrm2 libxkbcommon0 libgbm1 libpango-1.0-0 libcairo2 \
    libasound2 libxshmfence1 libx11-xcb1 libxcomposite1 \
    libxdamage1 libxfixes3 libxrandr2 libatspi2.0-0 \
    fonts-liberation fonts-noto-color-emoji ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy standalone Next.js build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/drizzle ./drizzle

# Copy native modules and playwright that standalone misses
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder /app/node_modules/playwright ./node_modules/playwright
COPY --from=builder /app/node_modules/playwright-core ./node_modules/playwright-core

# Install Chromium browser binary via Playwright
RUN npx playwright install chromium

RUN mkdir -p /data/x-snap

ENV NODE_ENV=production
ENV XSNAP_DATA_DIR=/data/x-snap
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

CMD ["node", "server.js"]
