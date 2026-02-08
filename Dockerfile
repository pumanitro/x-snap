# Stage 1: Build + download Chromium
FROM node:22-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Download Chromium browser binary in builder (where playwright is installed)
RUN npx playwright install chromium

COPY . .
RUN npx drizzle-kit generate 2>/dev/null || true
RUN npm run build

# Stage 2: Production (slim runtime)
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

# Copy native/external modules that standalone misses
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder /app/node_modules/playwright ./node_modules/playwright
COPY --from=builder /app/node_modules/playwright-core ./node_modules/playwright-core

# Copy Chromium browser binary from builder
COPY --from=builder /root/.cache/ms-playwright /root/.cache/ms-playwright

RUN mkdir -p /data/x-snap

ENV NODE_ENV=production
ENV XSNAP_DATA_DIR=/data/x-snap
ENV HOSTNAME=0.0.0.0

# Copy startup wrapper for debugging
COPY start.js ./start.js

EXPOSE 8080

CMD ["node", "start.js"]
