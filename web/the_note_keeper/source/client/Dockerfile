FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY public src eslint.config.mjs jsconfig.json next.config.mjs postcss.config.mjs .
RUN npm run build

# Run stage
FROM node:22-alpine
WORKDIR /app
COPY --from=build /app ./

CMD ["npm", "start"]

