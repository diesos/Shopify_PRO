FROM php:8.2-fpm

RUN apt-get update && apt-get install -y \
        git curl unzip zip \
        libpng-dev libjpeg-dev libonig-dev libxml2-dev libzip-dev libicu-dev \
    && docker-php-ext-configure gd --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" pdo pdo_mysql zip gd intl opcache \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY docker/php/uploads.ini /usr/local/etc/php/conf.d/uploads.ini

WORKDIR /var/www/symfony
