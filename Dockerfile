FROM node:20-alpine

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

# Variables para que Vite las incruste en dist/ durante el build
ARG VITE_GOOGLE_CLIENT_ID=791878516583-f9hht0avcqd4cvv3o2rvhovsqe7bdvat.apps.googleusercontent.com
ARG VITE_SUPERADMIN_EMAIL=usrubenroque@gmail.com
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_SUPERADMIN_EMAIL=$VITE_SUPERADMIN_EMAIL

RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
EXPOSE 80

CMD ["npx", "tsx", "server/index.ts"]
