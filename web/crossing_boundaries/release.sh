# compose.yml
# proxy/main.go
# backend/src/admin.go

#!/usr/bin/env bash
set -euo pipefail

SRC_DIR="$PWD/source"
OUT_DIR="$PWD/release"
ZIP_NAME="partial-source.zip"

if [ ! -d "$OUT_DIR" ]; then
  echo "Release dir DNE"
  exit 1
fi

if [ ! -d "$SRC_DIR" ]; then
  echo "Source dir DNE"
  exit 1
fi

if [ -f "$OUT_DIR/$ZIP_NAME" ]; then
  rm "$OUT_DIR/$ZIP_NAME"
fi

# List the exact files you want (relative to SRC_DIR)
FILES=(
  "proxy/main.go"
  "backend/src/admin.go"
  "front_proxy/haproxy.cfg"
  "compose.yml"
)

cd "$SRC_DIR"

zip -r "$OUT_DIR/$ZIP_NAME" "${FILES[@]}"

echo "Given files are partial source code snippets. iykyk." > "$OUT_DIR/README.txt"
