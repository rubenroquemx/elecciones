# Etapa 1: Construcción
FROM node:20-alpine AS build

WORKDIR /app

# Copiar dependencias e instalarlas
COPY package*.json ./
RUN npm ci

# Copiar código fuente y compilar proyecto
COPY . .
RUN npm run build

# Etapa 2: Servidor web ligero Nginx
FROM nginx:alpine

# Configuración Nginx para SPA (Single Page Application)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar archivos compilados
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
