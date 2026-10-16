#!/usr/bin/env bash
set -euo pipefail

SRC_DIR="$PWD/source"
OUT_DIR="$PWD/release"
ZIP_NAME="source.zip"

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
  ".gitignore"
  "admin.js"
  "admin-helper.js"
  "auth.js"
  "bot-pool.js"
  "cdn.js"
  "db.js"
  "docker-compose.yml"
  "Dockerfile"
  "helpers.js"
  "index.js"
  "layout.js"
  "package.json"
  "profile.js"
  "verify.js"
)

cd "$SRC_DIR"

zip -r "$OUT_DIR/$ZIP_NAME" "${FILES[@]}"
