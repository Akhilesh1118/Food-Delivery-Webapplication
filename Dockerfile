FROM node:20-alpine

WORKDIR /app

# Copy root and workspace package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY admin/package*.json ./admin/
COPY backend/package*.json ./backend/

# Install dependencies across all workspaces
RUN npm install --no-audit --no-fund

# Copy application source code
COPY . .

# Build frontend and admin assets
RUN npm run build

EXPOSE 3000
ENV NODE_ENV=production

CMD ["node", "server.js"]
