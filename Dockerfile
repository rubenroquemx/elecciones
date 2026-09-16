FROM node:20-alpine

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm ci

# Generar Prisma Client
COPY prisma ./prisma
RUN npx prisma generate

# Copiar código fuente y compilar frontend Vite
COPY . .
RUN npm run build

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# En el arranque del contenedor:
# 1. Sincroniza las tablas en PostgreSQL con prisma db push
# 2. Siembra los 378 líderes de Tabasco y secciones electorales si la BD está vacía
# 3. Arranca el servidor Express (API + Frontend SPA)
CMD ["sh", "-c", "npx prisma db push --skip-generate && npx tsx prisma/seed.ts && npx tsx server/index.ts"]
