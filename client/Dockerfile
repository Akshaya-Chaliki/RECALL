# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# RECALL Client — Multi-Stage Dockerfile
# Stage 1: Build the Vite/React app
# Stage 2: Serve via nginx
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# ── Build Stage ──────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci --silent

COPY . .
RUN npm run build

# ── Production Stage ─────────────────────
FROM nginx:alpine

# Copy built assets to nginx html root
COPY --from=build /app/dist /usr/share/nginx/html

# SPA fallback: route all paths to index.html
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
