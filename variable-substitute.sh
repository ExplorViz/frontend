#!/bin/sh
set -eu

# This hook runs before nginx's 20-envsubst-on-templates.sh. Keep nginx variables
# intact by substituting only the resolver here; the official hook handles ENV.
RESOLVER=${RESOLVER:-$(awk '/^nameserver/ { print $2; exit }' /etc/resolv.conf)}
: "${RESOLVER:?No DNS resolver found; set RESOLVER explicitly}"
sed -i "s|\${RESOLVER}|$RESOLVER|g" /etc/nginx/templates/default.conf.template

# Retain support for images built with the older URL placeholders. Empty bases
# produce same-origin requests without knowing the server's hostname or scheme.
# Escape sed replacement characters (values are inserted into string literals).
escape_replacement() {
  printf '%s' "$1" | sed 's/[\\&|]/\\&/g'
}
PUBLIC_BASE=$(escape_replacement "${FRONTEND_HOST_URL:-}")
DEFAULT_NICKNAME=$(escape_replacement "${VITE_AUTH_DISABLED_NICKNAME:-dev-user}")
DEFAULT_TOKEN=$(escape_replacement "${ONLY_SHOW_TOKEN:-}")
case "${KEYCLOAK_AUTH_ENABLED:-false}" in
  true) SKIP_LOGIN=false ;;
  false) SKIP_LOGIN=true ;;
  *) echo 'KEYCLOAK_AUTH_ENABLED must be true or false' >&2; exit 1 ;;
esac

find /usr/share/nginx/html -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' \) \
  -exec sed -i \
    -e "s|change-code-analyzer-url|$PUBLIC_BASE|g" \
    -e "s|change-landscape-url|$PUBLIC_BASE|g" \
    -e "s|change-trace-url|$PUBLIC_BASE|g" \
    -e "s|change-metrics-url|$PUBLIC_BASE|g" \
    -e "s|change-log-url|$PUBLIC_BASE|g" \
    -e "s|change-vscode-url|$PUBLIC_BASE|g" \
    -e "s|change-git-facade-url|$PUBLIC_BASE|g" \
    -e "s|change-user-url|$PUBLIC_BASE|g" \
    -e "s|change-copilot-url|$PUBLIC_BASE|g" \
    -e "s|change-keycloak-url|$PUBLIC_BASE|g" \
    -e "s|change-nickname|$DEFAULT_NICKNAME|g" \
    -e "s|change-token|$DEFAULT_TOKEN|g" '{}' +

# Write runtime values separately: Vite folds build-time boolean comparisons.
printf 'window.explorvizConfig = {"skipLogin":%s};\n' "$SKIP_LOGIN" \
  > /usr/share/nginx/html/runtime-config.js
