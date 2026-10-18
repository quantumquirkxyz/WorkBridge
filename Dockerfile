FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps ./apps
COPY tsconfig.json vitest.config.ts ./
RUN npm ci

FROM base AS web
# Tailwind v4 only runs when Next can see this config. Without it the image
# ships raw @apply/@theme rules and utility classes never get generated.
COPY postcss.config.mjs ./
# The lockfile was created on Windows and only materializes the glibc oxide
# binary. Alpine needs the musl build or Tailwind cannot emit the logo CSS.
RUN npm install --no-save --include=optional @tailwindcss/oxide-linux-x64-musl@4.3.3
RUN npm run build --workspace @workbridge/web
WORKDIR /app/apps/web
ENV PORT=3001
EXPOSE 3001
CMD ["npx", "next", "start", "--hostname", "0.0.0.0", "--port", "3001"]

FROM base AS runtime
ENV PORT=3000
EXPOSE 3000
HEALTHCHECK CMD node -e "fetch('http://127.0.0.1:3000/health').then((response)=>process.exit(response.ok?0:1)).catch(()=>process.exit(1))"
CMD ["npx", "tsx", "apps/agent-runtime/src/application/main.ts"]
