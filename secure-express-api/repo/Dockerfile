# ── Stage 1: Builder ──────────────────────────────────────────────────────
FROM node:22-alpine AS builder

# Install only build dependencies
WORKDIR /app

# Copy dependency manifests first (better layer caching)
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL deps (including devDeps needed for tsc)
RUN npm ci --ignore-scripts

# Copy source and build
COPY src/ ./src/
RUN npm run build

# ── Stage 2: Production ───────────────────────────────────────────────────
FROM node:22-alpine AS production

# Security: run as non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

WORKDIR /app

# Copy only production dependency manifests
COPY package*.json ./

# Install production deps only, skip lifecycle scripts to prevent supply-chain attacks
RUN npm ci --omit=dev --ignore-scripts && \
    npm cache clean --force

# Copy compiled output from builder stage
COPY --from=builder /app/dist ./dist

# Copy .env.example so dotenv-safe can validate at runtime
COPY .env.example ./

# Security: no write permission on app files after setup
RUN chown -R appuser:appgroup /app && \
    mkdir -p /app/logs && \
    chown -R appuser:appgroup /app/logs

# Switch to non-root user
USER appuser

# Expose port (document only — actual port set via env)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Start app
CMD ["node", "dist/index.js"]
