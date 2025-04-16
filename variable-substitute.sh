#!/bin/sh
set -eu

echo "FRONTEND_HOST_URL: $FRONTEND_HOST_URL"

find /usr/share/nginx/html -type f \( -name '*.js' -o -name '*.css' \) -exec sed -i "s|change-code-url|$FRONTEND_HOST_URL|g" '{}' +

find /usr/share/nginx/html -type f \( -name '*.js' -o -name '*.css' \) -exec sed -i "s|change-vscode-url|$FRONTEND_HOST_URL|g" '{}' +

find /usr/share/nginx/html -type f \( -name '*.js' -o -name '*.css' \) -exec sed -i "s|change-user-url|$FRONTEND_HOST_URL|g" '{}' +

find /usr/share/nginx/html -type f \( -name '*.js' -o -name '*.css' \) -exec sed -i "s|change-collaboration-url|$FRONTEND_HOST_URL|g" '{}' +

find /usr/share/nginx/html -type f \( -name '*.js' -o -name '*.css' \) -exec sed -i "s|change-span-url|$FRONTEND_HOST_URL|g" '{}' +

DEFAULT_NICKNAME="${VITE_AUTH_DISABLED_NICKNAME:-Jessy}"
find /usr/share/nginx/html -type f \( -name '*.js' -o -name '*.css' \) -exec sed -i "s|change-nickname|$FRONTEND_HOST_URL|g" '{}' +
sed -i "s#change-nickname#$DEFAULT_NICKNAME#g" /usr/share/nginx/html/index.html

DEFAULT_TOKEN="${ONLY_SHOW_TOKEN:-}"
find /usr/share/nginx/html -type f \( -name '*.js' -o -name '*.css' \) -exec sed -i "s|change-token|$DEFAULT_TOKEN|g" '{}' +

exec "$@"
