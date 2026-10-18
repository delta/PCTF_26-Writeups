exit(1)

# PWSH scripts during dev
pwsh -Command '$env:GOOS="js"; $env:GOARCH="wasm"; go build -o public/main.wasm ./cmd/wasm'
cp "C:\Program Files\Go\lib\wasm\wasm_exec.js" ..\public\

# RUN
go run ./cmd/server
