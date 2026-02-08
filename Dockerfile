FROM mcr.microsoft.com/playwright:v1.50.0-noble

WORKDIR /app

# Install dependencies (no --ignore-scripts so native modules build)
COPY package.json package-lock.json ./
RUN npm ci

# Install only Chromium browser for Playwright
RUN npx playwright install chromium

# Copy source and build
COPY . .

# Generate Drizzle migrations at build time
RUN npx drizzle-kit generate 2>/dev/null || true

# Build Next.js in standalone mode
RUN npm run build

# Create data directory
RUN mkdir -p /data/x-snap

# Copy static assets and drizzle migrations into standalone output
RUN cp -r drizzle .next/standalone/ 2>/dev/null || true
RUN cp -r public .next/standalone/public 2>/dev/null || true
RUN cp -r .next/static .next/standalone/.next/static 2>/dev/null || true

# Copy native node_modules that standalone mode misses
RUN cp -r node_modules/better-sqlite3 .next/standalone/node_modules/better-sqlite3 2>/dev/null || true

# Environment
ENV NODE_ENV=production
ENV XSNAP_DATA_DIR=/data/x-snap
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

WORKDIR /app/.next/standalone

CMD ["node", "server.js"]
