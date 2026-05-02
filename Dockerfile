FROM node:20-bookworm-slim

# Install dependencies for Prisma, Canvas, and other native modules
RUN apt-get update && apt-get install -y \
    openssl \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

# Copy the rest of the application
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js app
RUN npm run build

# Expose port
EXPOSE 3000

# Start command is defined in docker-compose.yml (can be web or worker)
CMD ["npm", "start"]
