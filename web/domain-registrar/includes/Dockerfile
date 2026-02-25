FROM php:8.2-fpm
RUN apt-get update && apt-get install -y \
    nginx \
    python3 \
    python3-pip \
    python3-dev \
    build-essential \
    libjpeg-dev \
    zlib1g-dev \
    libpng-dev

RUN sed -i 's/;security.limit_extensions = .php .php3 .php4 .php5 .php7/security.limit_extensions = .php .jpg .jpeg .png/' /usr/local/etc/php-fpm.d/www.conf

RUN pip3 install --no-cache-dir pillow --break-system-packages
RUN mkdir -p /app/backend /app/public /app/backup /app/script

COPY config/nginx.conf /etc/nginx/sites-available/default
COPY config/start.sh /app/script/start.sh
RUN chmod +x /app/script/start.sh
COPY src/ /app/backend/

RUN chown -R www-data:www-data /app/public /app/backup /app/backend
RUN chmod -R 777 /app/public /app/backup

WORKDIR /app/backend
EXPOSE 80
CMD ["/app/script/start.sh"]
