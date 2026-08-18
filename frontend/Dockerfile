# syntax=docker/dockerfile:1
FROM node:22-slim AS builder
WORKDIR /build
# .npmrc is copied in the same layer as the lockfile: react-simple-maps
# declares react ^16.8||17||18 as a peer while this app is on React 19, so
# npm ci needs legacy-peer-deps=true to resolve (see frontend/.npmrc).
COPY package.json package-lock.json* .npmrc ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /build/dist /usr/share/nginx/html
EXPOSE 80 443
