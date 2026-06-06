FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/console/package.json ./apps/console/
COPY packages/api-client/package.json ./packages/api-client/
COPY packages/ui/package.json ./packages/ui/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/eslint-config/package.json ./packages/eslint-config/
RUN npm ci
# npm ci honors the lockfile literally, but tailwindcss v4's native packages
# (`lightningcss` and `@tailwindcss/oxide`) ship per-platform binaries as
# optionalDependencies, and npm only records the host platform's entry in
# package-lock.json. When the lockfile is generated on macOS, the Linux musl
# binaries are missing and the Next.js build fails with errors like
# `Cannot find module '../lightningcss.linux-*.node'` or
# `Cannot find module '@tailwindcss/oxide-linux-*-musl'`. Install the Linux
# binaries explicitly so the build works regardless of which OS/arch produced
# the lockfile.
RUN npm install --no-save --force \
      lightningcss-linux-arm64-musl \
      lightningcss-linux-arm64-gnu \
      lightningcss-linux-x64-musl \
      lightningcss-linux-x64-gnu \
      @tailwindcss/oxide-linux-arm64-musl \
      @tailwindcss/oxide-linux-arm64-gnu \
      @tailwindcss/oxide-linux-x64-musl \
      @tailwindcss/oxide-linux-x64-gnu

FROM base AS builder
ARG API_URL
ARG BRANDING_URL
ARG ORDER_URL
ARG CONSOLE_URL
ARG CONTACT_ENDPOINT
ENV API_URL=$API_URL
ENV BRANDING_URL=$BRANDING_URL
ENV ORDER_URL=$ORDER_URL
ENV CONSOLE_URL=$CONSOLE_URL
ENV CONTACT_ENDPOINT=$CONTACT_ENDPOINT
ENV NEXT_PUBLIC_API_URL=$API_URL
ENV NEXT_PUBLIC_BRANDING_URL=$BRANDING_URL
ENV NEXT_PUBLIC_ORDER_URL=$ORDER_URL
ENV NEXT_PUBLIC_CONSOLE_URL=$CONSOLE_URL
ENV NEXT_PUBLIC_CONTACT_ENDPOINT=$CONTACT_ENDPOINT
# Fail loud instead of silently baking mock fixtures into the prerendered HTML
# if a build-time catalog fetch fails. Production images must never serve mocks.
ENV NEXT_PUBLIC_DISABLE_MOCK_FALLBACK=true
COPY --from=deps /app/node_modules ./node_modules
# The console app pins deps (lucide-react, tailwind-merge, recharts, @radix-ui,
# zod) at versions that conflict with the other workspaces, so npm cannot hoist
# them to the root and installs them under apps/console/node_modules. That
# nested tree must be carried forward explicitly — .dockerignore excludes
# node_modules, so `COPY . .` will not bring it from the build context.
COPY --from=deps /app/apps/console/node_modules ./apps/console/node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx turbo run build --filter=console

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/console/.next/standalone ./
COPY --from=builder /app/apps/console/.next/static ./apps/console/.next/static
COPY --from=builder /app/apps/console/public ./apps/console/public
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "apps/console/server.js"]
