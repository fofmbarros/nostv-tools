#Build stage
FROM node:20.16.0-alpine AS build

WORKDIR /build

COPY src ./src
COPY package.json ./
COPY package-lock.json ./
COPY tsconfig.json ./
COPY config.json ./

RUN npm install \
    && npm run build

#Production stage
FROM node:20.16.0-alpine AS production

WORKDIR /app/nostv

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY --from=build /build/package.json ./
COPY --from=build /build/package-lock.json ./
COPY --from=build /build/config.json ./
COPY --from=build /build/dist/ ./dist

RUN apk add --no-cache chromium && npm install --omit=dev

EXPOSE 6200
EXPOSE 6201

CMD ["npm", "start"]