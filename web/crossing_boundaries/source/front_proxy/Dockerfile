# syntax=docker/dockerfile:1
FROM golang:1.25.3-bookworm AS builder
WORKDIR /app
COPY go.mod ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /app/myapp .

FROM scratch
COPY --from=builder /app/myapp /
CMD ["/myapp"]
