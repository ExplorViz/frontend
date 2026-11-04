FROM nginx:1.19-alpine

RUN rm /etc/nginx/conf.d/default.conf

# Run before the official 20-envsubst-on-templates.sh hook.
COPY variable-substitute.sh /docker-entrypoint.d/19-variable-substitute.sh
RUN chmod +x /docker-entrypoint.d/19-variable-substitute.sh

COPY dist /usr/share/nginx/html
COPY default.conf.template /etc/nginx/templates/

# Internal Docker addresses; override only when using a different backend layout.
ENV CODE_ANALYZER_URL=http://code-analyzer:8078 \
  LANDSCAPE_SERV_URL=http://landscape-service:8085 \
  TRACE_SERV_URL=http://trace-service:8080 \
  METRICS_SERV_URL=http://metrics-service:8080 \
  LOG_SERV_URL=http://log-service:8080 \
  USER_SERV_URL=http://user-service:8080 \
  VSCODE_SERV_URL=http://vs-code-backend:3000 \
  COPILOT_SERV_URL=http://chatbot-service:4300 \
  KEYCLOAK_URL=http://keycloak:8080
