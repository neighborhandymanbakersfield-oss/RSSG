FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# Copy root package
COPY package*.json ./
RUN npm install

# Copy client
COPY client ./client
WORKDIR /app/client
RUN npm install && npm run build

# Copy server
WORKDIR /app
COPY server ./server
WORKDIR /app/server
RUN npm install && npm run build

# Expose port
EXPOSE 3000

# Compatibility shim: allows Railway services still configured with `start.sh` to boot.
RUN printf '#!/usr/bin/env sh\nexec node /app/server/dist/index.js\n' > /usr/local/bin/start.sh \
  && chmod +x /usr/local/bin/start.sh

# Start server
CMD ["node", "dist/index.js"]
