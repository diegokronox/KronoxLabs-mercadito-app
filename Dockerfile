# ── STAGE 1: Build ────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Instala dependencias
COPY package*.json ./
RUN npm install

# Copia el código fuente
COPY . .

# Genera la carpeta dist
RUN npm run build

# ── STAGE 2: Serve ────────────────────────────────────────────────────
FROM nginx:alpine

# Copia el build al servidor nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Configuración nginx para SPA (maneja rutas correctamente)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
