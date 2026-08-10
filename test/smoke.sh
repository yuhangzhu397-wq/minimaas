#!/usr/bin/env bash
set -euo pipefail

gateway_url="${GATEWAY_URL:-http://localhost:8080}"
control_url="${CONTROL_PLANE_URL:-http://localhost:8081}"

curl --fail --silent "${gateway_url}/health/ready" >/dev/null
curl --fail --silent "${control_url}/health/ready" >/dev/null
curl --fail --silent "${gateway_url}/v1/models" >/dev/null
curl --fail --silent \
  -H 'Content-Type: application/json' \
  -d '{"model":"smart-chat","messages":[{"role":"user","content":"smoke test"}]}' \
  "${gateway_url}/v1/chat/completions" >/dev/null

printf 'MiniMaaS smoke test passed.\n'

