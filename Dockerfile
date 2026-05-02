FROM node:20-alpine

# Install dependencies for Prisma, Canvas, and other native modules
RUN apk add --no-cache libc6-compat openssl
RUN apk add --no-cache \
    build-base \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev

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
