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
