FROM nginx:1.19-alpine

RUN rm /etc/nginx/conf.d/default.conf

COPY variable-substitute.sh /docker-entrypoint.d/

COPY dist /usr/share/nginx/html
COPY default.conf.template /etc/nginx/templates/

#CMD ["nginx", "-g", "daemon off;"]
