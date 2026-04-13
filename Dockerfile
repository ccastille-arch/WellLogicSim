FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx vite build

# Production image — Node serves both the API and the static Vite build
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY server/ ./server/
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "server/index.js"]
