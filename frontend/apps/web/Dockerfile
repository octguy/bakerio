FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
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
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx turbo run build --filter=web

FROM nginx:alpine AS runner
COPY --from=builder /app/apps/web/out /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
