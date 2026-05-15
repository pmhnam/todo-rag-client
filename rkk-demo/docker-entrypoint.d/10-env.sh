#!/bin/sh
set -eu

api_base_url="${VITE_API_BASE_URL:-http://localhost:3000/api/v1}"
escaped_api_base_url=$(printf '%s' "$api_base_url" | sed 's/\\/\\\\/g; s/"/\\"/g')

cat > /usr/share/nginx/html/env.js <<EOF
window.__RKK_DEMO_CONFIG__ = {
  VITE_API_BASE_URL: "${escaped_api_base_url}"
};
EOF
