# ==========================================
# 1. Base Image with Node.js
# ==========================================
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--no-network-family-autoselection"

# ==========================================
# 2. Install Dependencies
# ==========================================
FROM base AS deps
WORKDIR /app

# The lockfile contains the root package as a local `file:.` dependency. Copy
# the application files before npm ci so that dependency can be resolved in
# this layer. .dockerignore keeps host node_modules and build output out.
COPY . .

RUN npm ci --legacy-peer-deps

# ==========================================
# 3. Build Application
# ==========================================
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client. Runtime connection settings are supplied by Compose.
RUN npx prisma generate

# Build the app without embedding deployment-specific public WebSocket URLs.
RUN npm run build

# ==========================================
# 4. Production Runner
# ==========================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/generated ./generated

# Copy built artifacts and dependencies
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Fix ownership so the non-root 'nextjs' user can write to .next/cache
# (Next.js needs write access here for image optimization, ISR, etc.)
RUN chown -R nextjs:nodejs /app

USER nextjs

# Compose supplies runtime settings and maps the configured host port to 9086.
EXPOSE 3000

CMD ["npm", "start"]
