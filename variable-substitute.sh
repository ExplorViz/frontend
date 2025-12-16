#!/bin/sh
set -eu

# Auto-detect DNS resolver from /etc/resolv.conf for nginx dynamic upstream resolution
# Works in both Docker (127.0.0.11) and Kubernetes (cluster DNS)
if [ -z "${RESOLVER:-}" ]; then
  RESOLVER=$(grep -m1 '^nameserver' /etc/resolv.conf | awk '{print $2}')
fi
echo "RESOLVER: $RESOLVER"

# Substitute resolver directly in nginx template (before envsubst runs)
sed -i "s|\${RESOLVER}|$RESOLVER|g" /etc/nginx/templates/default.conf.template

echo "FRONTEND_HOST_URL: $FRONTEND_HOST_URL"

find /usr/share/nginx/html -type f \( -name '*.js' -o -name '*.css' \) -exec sed -i "s|change-code-url|$FRONTEND_HOST_URL|g" '{}' +

find /usr/share/nginx/html -type f \( -name '*.js' -o -name '*.css' \) -exec sed -i "s|change-vscode-url|$FRONTEND_HOST_URL|g" '{}' +

find /usr/share/nginx/html -type f \( -name '*.js' -o -name '*.css' \) -exec sed -i "s|change-user-url|$FRONTEND_HOST_URL|g" '{}' +

find /usr/share/nginx/html -type f \( -name '*.js' -o -name '*.css' \) -exec sed -i "s|change-collaboration-url|$FRONTEND_HOST_URL|g" '{}' +

find /usr/share/nginx/html -type f \( -name '*.js' -o -name '*.css' \) -exec sed -i "s|change-span-url|$FRONTEND_HOST_URL|g" '{}' +

find /usr/share/nginx/html -type f \( -name '*.js' -o -name '*.css' \) -exec sed -i "s|change-keycloak-url|$FRONTEND_HOST_URL|g" '{}' +

DEFAULT_TOKEN="${ONLY_SHOW_TOKEN:-}"
find /usr/share/nginx/html -type f \( -name '*.js' -o -name '*.css' \) -exec sed -i "s|change-token|$DEFAULT_TOKEN|g" '{}' +

exec "$@"
