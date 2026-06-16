FROM node:20-alpine AS base

WORKDIR /app

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

COPY .env.production.example .env
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src
COPY data ./data

RUN addgroup -S nodejs && adduser -S appuser -G nodejs
USER appuser

EXPOSE 5000

CMD ["node", "src/server.js"]
