#!/bin/bash

echo "Starting startup script"
cp /app/backend/nginx.conf /app/public
(while true; do
  sleep 120
  echo "[Cleanup] Moving files to backup"
  cp /app/backend/nginx.conf /app/public
done) &

echo "Starting internal Python serveR"
python3 /app/backend/server.py &

echo "Starting PHP-FPM"
php-fpm -D

echo "Starting Nginx"
nginx -g "daemon off;"

