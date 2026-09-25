# The dashboard for Docker Compose (see migration_backend/docker-compose.yml): built once,
# then served as static files. It calls the API at http://localhost:5153 from the browser,
# which is where Compose publishes it.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
