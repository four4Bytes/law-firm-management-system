# =============================
# Stage 1: Base
# =============================
FROM node:22-alpine AS base
ARG NEXT_PUBLIC_APP_VERSION=0.0.0-dev
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION
RUN corepack enable && corepack prepare pnpm@11.8.0 --activate

# =============================
# Stage 2: Dependencies
# =============================
FROM base AS deps
WORKDIR /app

# Copy dependency manifests and Prisma schema
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma

# Install production dependencies only (frozen lockfile ensures reproducibility)
RUN pnpm install --frozen-lockfile

# =============================
# Stage 3: Builder
# =============================
FROM base AS builder
WORKDIR /app

# Reuse installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Generate Prisma Client and build Next.js
RUN pnpm prisma generate
RUN pnpm build

# =============================
# Stage 4: Runner (production)
# =============================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV CI=true
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Create a non-root user for security
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# Copy only the files needed at runtime (minimal image size)
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Ensure the non-root user owns all files
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose application port
EXPOSE 3000

# Start the production server
CMD ["pnpm", "start"]
