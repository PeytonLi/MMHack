#!/usr/bin/env bash
# Quick health check for DigitalOcean Gradient API
# Usage: bash scripts/check-gradient.sh

set -euo pipefail

# Load .env from project root
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

KEY="${DO_MODEL_ACCESS_KEY:?Set DO_MODEL_ACCESS_KEY in .env}"
MODEL="${DO_GRADIENT_MODEL_ID:-llama3.3-70b-instruct}"
BASE="https://inference.do-ai.run/v1"

echo "=== 1. Models endpoint ==="
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/models" \
  -H "Authorization: Bearer $KEY")
if [ "$HTTP_CODE" = "200" ]; then
  echo "OK — key is valid ($HTTP_CODE)"
else
  echo "FAIL — HTTP $HTTP_CODE (bad key or account issue)"
  exit 1
fi

echo ""
echo "=== 2. Chat completions ($MODEL) ==="
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE/chat/completions" \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  --max-time 30 \
  -d "{\"model\":\"$MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"Say hi\"}],\"max_completion_tokens\":10,\"temperature\":0}")

BODY=$(echo "$RESPONSE" | head -n -1)
CODE=$(echo "$RESPONSE" | tail -1)

if [ "$CODE" = "200" ]; then
  echo "OK — inference working ($CODE)"
  echo "Response: $BODY"
elif [ "$CODE" = "429" ]; then
  echo "RATE LIMITED ($CODE)"
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
else
  echo "FAIL — HTTP $CODE"
  echo "$BODY"
fi
