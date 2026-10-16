FROM node:20-bookworm-slim AS build

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends dumb-init

COPY package*.json ./
RUN npm ci --only=production

COPY . .

FROM gcr.io/distroless/nodejs20-debian12

WORKDIR /app

COPY --from=build /app /app
COPY --from=build /usr/bin/dumb-init /usr/bin/dumb-init
USER nonroot

EXPOSE 3001
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["/nodejs/bin/node", "server.js"]