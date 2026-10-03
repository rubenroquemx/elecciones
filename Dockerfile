FROM node:20-alpine

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

# Variables para que Vite las incruste en dist/ durante el build
ARG VITE_AUTH_MODE=closed_system
ARG VITE_SUPERADMIN_EMAIL=admin@estrategia-territorial.mx
ENV VITE_AUTH_MODE=$VITE_AUTH_MODE
ENV VITE_SUPERADMIN_EMAIL=$VITE_SUPERADMIN_EMAIL

RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
EXPOSE 80

CMD ["npx", "tsx", "server/index.ts"]
