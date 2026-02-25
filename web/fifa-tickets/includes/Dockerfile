FROM golang:1.24-alpine AS builder

# 1. Install Protobuf tools (needed for backend)
RUN apk add --no-cache protobuf
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@latest \
    && go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

WORKDIR /app

COPY go.mod ./
COPY go.sum ./
RUN go mod download

# 3. Copy source code
COPY . .

RUN protoc --go_out=. --go_opt=module=fifa-chal \
    --go-grpc_out=. --go-grpc_opt=module=fifa-chal \
    proto/service.proto

# 5. Build BOTH binaries
RUN go build -o backend ./backend/backend.go
RUN go build -o proxy ./proxy/proxy.go

# --- Final Stage ---
FROM alpine:latest
WORKDIR /app

# 6. Copy BOTH binaries
COPY --from=builder /app/backend .
COPY --from=builder /app/proxy .

# 7. Copy frontend assets (needed for proxy)
COPY --from=builder /app/proxy/frontend ./frontend

# 8. Set fallback environment variables
ENV REDIS_ADDR=redis:6379
