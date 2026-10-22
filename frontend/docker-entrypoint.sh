#!/bin/sh
set -e

# nginx needs an explicit resolver; take the ones the platform gave us
# (Railway's private network is IPv6, so bracket v6 addresses).
NGINX_RESOLVER=$(awk '/^nameserver/ { print ($2 ~ /:/) ? "["$2"]" : $2 }' /etc/resolv.conf | tr '\n' ' ')
NGINX_RESOLVER=${NGINX_RESOLVER:-127.0.0.11}
export NGINX_RESOLVER

envsubst '$BACKEND_URL $BACKEND_DOMAIN $NGINX_RESOLVER' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

echo "nginx: proxying /api -> $BACKEND_URL (resolver: $NGINX_RESOLVER)"
exec nginx -g 'daemon off;'
