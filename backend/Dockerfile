FROM node:22-alpine AS deps
WORKDIR /app
# bcrypt ships prebuilt binaries; build tools are only needed as a fallback
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s \
  CMD wget -qO- http://127.0.0.1:4000/api/health || exit 1
CMD ["node", "src/server.js"]
