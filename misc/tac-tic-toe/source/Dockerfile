# syntax=docker/dockerfile:1
FROM golang:1.25.3-bookworm
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /app/server /app/cmd/server

ENV LISTEN_ADDR=:3000
CMD ["/app/server"]
