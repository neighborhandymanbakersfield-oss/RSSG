FROM node:18-alpine

WORKDIR /app

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

# Start server
CMD ["npm", "start"]