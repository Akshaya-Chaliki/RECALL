# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# RECALL Server — Node/Express Dockerfile
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FROM node:20-alpine

WORKDIR /app

# Install dependencies first (layer caching)
COPY package*.json ./
RUN npm ci --silent --omit=dev

# Copy application source
COPY . .

# Expose the Express port
EXPOSE 5000

# Start the server
CMD ["node", "src/server.js"]
