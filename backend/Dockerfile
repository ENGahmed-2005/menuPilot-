FROM php:8.3-cli

RUN apt-get update && apt-get install -y \
    git unzip libzip-dev libpng-dev libonig-dev libxml2-dev \
    && docker-php-ext-install pdo pdo_mysql mbstring exif pcntl bcmath gd zip \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /var/www
COPY composer.json composer.lock* ./
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader --no-scripts
COPY . .
RUN composer dump-autoload --optimize \
    && php artisan config:clear \
    && php artisan route:clear \
    && php artisan view:clear
# Safe production defaults; values set in the Render dashboard override them.
#  - APP_DEBUG=false: never show stack traces / config to visitors
#  - PHP_CLI_SERVER_WORKERS: `artisan serve` handles several requests at once
#    (a single worker froze the app while one live screen was open)
ENV APP_ENV=production \
    APP_DEBUG=false \
    LOG_CHANNEL=stderr \
    LOG_LEVEL=warning \
    SESSION_DRIVER=file \
    CACHE_STORE=file \
    PHP_CLI_SERVER_WORKERS=6
EXPOSE 10000
CMD ["sh", "-c", "php artisan migrate --force && php artisan db:seed --class=AdminSeeder --force && php artisan optimize:clear && php artisan serve --host=0.0.0.0 --port=$PORT"]
