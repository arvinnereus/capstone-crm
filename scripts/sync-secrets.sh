#!/usr/bin/env bash
#
# Push API-key secrets from the local .dev.vars up to the deployed Worker.
#
#   ./scripts/sync-secrets.sh                    # sync every key in SYNCABLE
#   ./scripts/sync-secrets.sh OPENROUTER_API_KEY # sync just one
#   ./scripts/sync-secrets.sh --list             # show what's set remotely
#
# Values are piped with printf (never echo) — a trailing newline silently
# corrupts the stored secret and every downstream API call 401s.
#
# DELIBERATELY NOT SYNCED:
#   CRM_USERNAME / CRM_PASSWORD — .dev.vars holds throwaway local test creds
#     (arvin/arvin). Pushing those would replace the real production login.
#     Set those by hand: npx wrangler secret put CRM_PASSWORD
#   REALTIME_MODEL / REALTIME_VOICE — plain config, not secrets. They belong
#     in the "vars" block of wrangler.jsonc so they ship with the Worker.
#
set -euo pipefail
cd "$(dirname "$0")/.."

SYNCABLE=(OPENROUTER_API_KEY OPENAI_API_KEY KIE_API_KEY)
ENV_FILE=".dev.vars"

if [[ "${1:-}" == "--list" ]]; then
  echo "Secrets currently on the Worker:"
  npx wrangler secret list | python3 -c \
    "import json,sys; [print('  •', s['name']) for s in sorted(json.load(sys.stdin), key=lambda x: x['name'])]"
  exit 0
fi

[[ -f "$ENV_FILE" ]] || { echo "✘ $ENV_FILE not found — run from the repo root."; exit 1; }

targets=("${@:-}")
[[ -z "${targets[0]:-}" ]] && targets=("${SYNCABLE[@]}")

for key in "${targets[@]}"; do
  value=$(grep -E "^${key}=" "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'" | xargs || true)
  if [[ -z "$value" ]]; then
    echo "⊘ $key — not in $ENV_FILE, skipped"
    continue
  fi
  if printf '%s' "$value" | npx wrangler secret put "$key" >/dev/null 2>&1; then
    echo "✓ $key — uploaded (${#value} chars)"
  else
    echo "✘ $key — upload failed"
  fi
done

echo
echo "Done. Secrets take effect on the next deploy of the Worker."
