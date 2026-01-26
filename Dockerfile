# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

# Install all dependencies (including dev) for build
RUN npm ci

COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Railway provides environment variables during build
# Create .env.production file from Railway's environment variables
# This ensures NEXT_PUBLIC_* vars are available during next build
RUN echo "NEXT_PUBLIC_BASE_RPC_URL=${NEXT_PUBLIC_BASE_RPC_URL:-}" > .env.production && \
    echo "NEXT_PUBLIC_MEGA_RPC_URL=${NEXT_PUBLIC_MEGA_RPC_URL:-}" >> .env.production && \
    echo "NEXT_PUBLIC_BASE_CHAIN_ID=${NEXT_PUBLIC_BASE_CHAIN_ID:-}" >> .env.production && \
    echo "NEXT_PUBLIC_MEGA_CHAIN_ID=${NEXT_PUBLIC_MEGA_CHAIN_ID:-}" >> .env.production && \
    echo "NEXT_PUBLIC_BAD_BUNNZ_BASE=${NEXT_PUBLIC_BAD_BUNNZ_BASE:-}" >> .env.production && \
    echo "NEXT_PUBLIC_BAD_BUNNZ_MEGA=${NEXT_PUBLIC_BAD_BUNNZ_MEGA:-}" >> .env.production && \
    echo "NEXT_PUBLIC_ETH_BRIDGE=${NEXT_PUBLIC_ETH_BRIDGE:-}" >> .env.production && \
    echo "NEXT_PUBLIC_MEGA_BRIDGE=${NEXT_PUBLIC_MEGA_BRIDGE:-}" >> .env.production && \
    echo "NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL:-}" >> .env.production && \
    echo "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=${NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:-}" >> .env.production

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
