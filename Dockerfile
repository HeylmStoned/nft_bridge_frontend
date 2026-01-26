FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Install all dependencies (including dev) for build
RUN npm ci

COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN npm run build

# Remove dev dependencies after build to reduce image size
RUN npm prune --omit=dev

EXPOSE 3000

CMD ["npm", "run", "start"]
