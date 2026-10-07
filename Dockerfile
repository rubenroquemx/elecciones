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
ARG VITE_SUPERADMIN_EMAIL=usrubenroqueguzman@gmail.com
ARG VITE_SUPERADMIN_PASSWORD=admin123
ENV VITE_AUTH_MODE=$VITE_AUTH_MODE
ENV VITE_SUPERADMIN_EMAIL=$VITE_SUPERADMIN_EMAIL
ENV VITE_SUPERADMIN_PASSWORD=$VITE_SUPERADMIN_PASSWORD
ENV SUPERADMIN_EMAIL=usrubenroqueguzman@gmail.com
ENV SUPERADMIN_PASSWORD=admin123

RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
EXPOSE 80

CMD ["npx", "tsx", "server/index.ts"]
