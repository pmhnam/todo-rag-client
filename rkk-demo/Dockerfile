FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
COPY src ./src
COPY rkk-demo/package*.json ./rkk-demo/

RUN npm ci
RUN cd rkk-demo && npm ci

COPY rkk-demo ./rkk-demo

RUN cd rkk-demo && npm run build

FROM nginx:1.27-alpine

COPY rkk-demo/nginx.conf /etc/nginx/conf.d/default.conf
COPY rkk-demo/docker-entrypoint.d/10-env.sh /docker-entrypoint.d/10-env.sh
COPY --from=build /app/rkk-demo/dist /usr/share/nginx/html

RUN chmod +x /docker-entrypoint.d/10-env.sh
