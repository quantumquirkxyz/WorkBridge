FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps ./apps
COPY tsconfig.json vitest.config.ts ./
RUN npm ci
ENV PORT=3000
EXPOSE 3000
HEALTHCHECK CMD node -e "fetch('http://127.0.0.1:3000/health').then((response)=>process.exit(response.ok?0:1)).catch(()=>process.exit(1))"
CMD ["npx", "tsx", "apps/agent-runtime/src/application/main.ts"]
