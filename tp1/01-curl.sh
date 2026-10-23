#!/usr/bin/env bash
# TP 1.1 — Premier appel, sans aucune bibliothèque.
# Usage : export $(grep -v '^#' .env | xargs) puis bash tp1/01-curl.sh
set -euo pipefail
BASE="${OPENAI_BASE_URL:-https://api.openai.com/v1}"
MODEL="${OPENAI_MODEL:-gpt-4.1-mini}"

echo "=== 1. Réponse complète (JSON) — et les en-têtes x-ratelimit-* (-D -) ==="
curl -sS -D - "$BASE/chat/completions" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "'"$MODEL"'",
    "temperature": 0.2,
    "max_tokens": 120,
    "messages": [
      {"role": "system", "content": "Tu réponds en français, en deux phrases maximum."},
      {"role": "user",   "content": "Explique ce qu est un token à un développeur."}
    ]
  }' | grep -iE '^(HTTP|x-ratelimit)|^\{'
echo; echo

echo "=== 2. La même chose en streaming (SSE) — observez les lignes data: ==="
# -N désactive le tampon de curl : on voit arriver les morceaux un par un.
curl -sS -N "$BASE/chat/completions" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "'"$MODEL"'", "stream": true, "max_tokens": 60,
       "stream_options": {"include_usage": true},
       "messages": [{"role": "user", "content": "Compte de 1 à 10 en toutes lettres."}]}'
echo

echo "=== 3. Provoquez une erreur : mauvaise clé → quel code HTTP ? ==="
curl -sS -o /dev/null -w "HTTP %{http_code}\n" "$BASE/chat/completions" \
  -H "Authorization: Bearer mauvaise-cle" -H "Content-Type: application/json" \
  -d '{"model": "'"$MODEL"'", "messages": [{"role": "user", "content": "test"}]}'
