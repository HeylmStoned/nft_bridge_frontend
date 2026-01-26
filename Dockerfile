# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

# Install all dependencies (including dev) for build
RUN npm ci

COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Railway doesn't automatically pass env vars as build args
# Try to read them from environment, but use fallbacks if not available
# The fallback addresses in page.tsx will ensure it works either way
RUN echo "=== Checking Railway Environment Variables ===" && \
    node scripts/create-env.js && \
    echo "=== .env.production created ===" && \
    (cat .env.production 2>/dev/null || echo "No .env.production created - using fallback addresses") && \
    echo "Note: If env vars are NOT SET, the app will use hardcoded fallback addresses"

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built application from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/tsconfig.json ./

EXPOSE 3000

CMD ["npm", "run", "start"]
