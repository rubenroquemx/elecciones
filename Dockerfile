FROM node:20-alpine

# Instalar dependencias del sistema necesarias para Prisma en Alpine
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copiar dependencias e instalarlas
COPY package*.json ./
RUN npm ci

# Generar cliente de Prisma
COPY prisma ./prisma
RUN npx prisma generate

# Copiar código fuente y compilar frontend
COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
EXPOSE 80

# Arranca directamente el servidor Node (que inicia de inmediato e inicializa la BD en background)
CMD ["npx", "tsx", "server/index.ts"]
