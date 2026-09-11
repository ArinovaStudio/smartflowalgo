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

COPY package.json package-lock.json* ./
COPY prisma ./prisma/

RUN npm ci --legacy-peer-deps

# ==========================================
# 3. Build Application
# ==========================================
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Copy the root .env so Next.js build can read DATABASE_URL,
# NEXTAUTH_SECRET, and all other variables at build time
COPY .env .env

# Generate Prisma Client (needs DATABASE_URL from .env)
RUN npx prisma generate

# Build Next.js app (reads .env for NEXT_PUBLIC_* vars etc.)
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

# Copy .env so runtime env vars (PORT, DATABASE_URL, etc.) are available
COPY --from=builder /app/.env .env

# Fix ownership so the non-root 'nextjs' user can write to .next/cache
# (Next.js needs write access here for image optimization, ISR, etc.)
RUN chown -R nextjs:nodejs /app

USER nextjs

# PORT is read from .env at runtime; docker-compose maps it dynamically.
# Expose the default 3000; actual port override comes from .env / env_file.
EXPOSE 3000

CMD ["npm", "start"]