FROM node:20-alpine AS frontend
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src/ ./src/
COPY server.js ./
COPY --from=frontend /app/client/dist ./client/dist
RUN mkdir -p data
VOLUME ["/app/data"]
EXPOSE 3000
CMD ["node", "server.js"]
