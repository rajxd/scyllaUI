FROM node:20-alpine AS frontend
RUN apk upgrade --no-cache
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:20-alpine
RUN apk upgrade --no-cache
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src/ ./src/
COPY server.js ./
COPY --from=frontend /app/client/dist ./client/dist
RUN mkdir -p data && chown -R node:node /app
USER node
VOLUME ["/app/data"]
EXPOSE 3000
CMD ["node", "server.js"]
