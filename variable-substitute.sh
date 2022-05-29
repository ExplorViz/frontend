#!/bin/sh
set -eu

sed -i "s#change-landscape-url#$FRONTEND_HOST_URL#g" /usr/share/nginx/html/index.html
sed -i "s#change-trace-url#$FRONTEND_HOST_URL#g" /usr/share/nginx/html/index.html
sed -i "s#change-user-url#$FRONTEND_HOST_URL#g" /usr/share/nginx/html/index.html
sed -i "s#change-collab-url#$FRONTEND_HOST_URL#g" /usr/share/nginx/html/index.html
sed -i "s#change-collaboration-url#$FRONTEND_HOST_URL#g" /usr/share/nginx/html/index.html
sed -i "s#change-collaboration-socket-path#$COLLABORATION_SOCKET_PATH#g" /usr/share/nginx/html/index.html
sed -i "s#change-frontend-host-name#$FRONTEND_HOST_NAME#g" /usr/share/nginx/html/index.html
sed -i "s#change-auth0-logo-url#$AUTH0_LOGO_URL#g" /usr/share/nginx/html/index.html
sed -i "s#change-auth0-callback-url#$AUTH0_CALLBACK_URL#g" /usr/share/nginx/html/index.html
sed -i "s#change-auth0-logout-url#$AUTH0_LOGOUT_URL#g" /usr/share/nginx/html/index.html

exec "$@"
