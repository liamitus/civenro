#!/usr/bin/env bash
set -euo pipefail

# Idempotent Vercel environment variable setup for Govroll.
#
# Reads values from .env (or .env.local) and upserts them into the Vercel
# project. Safe to run repeatedly — existing vars are updated, missing vars
# are created, vars not in the list are left alone.
#
# Usage:
#   ./scripts/setup-vercel-env.sh              # uses .env
#   ENV_FILE=.env.production ./scripts/setup-vercel-env.sh

SCOPE="govroll"
ENV_FILE="${ENV_FILE:-.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: $ENV_FILE not found. Create it or set ENV_FILE=path/to/file"
  exit 1
fi

# Vars that must be set for the app to function.
REQUIRED_VARS=(
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  ANTHROPIC_API_KEY
)

# All vars to sync. Add new ones here as features grow.
# NOTE: DATABASE_URL is excluded — prod uses the Supabase pooler URL,
# not the local dev DB. Set it manually via:
#   npx vercel env add DATABASE_URL production --value "..." --scope govroll --yes --force
SYNC_VARS=(
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  ANTHROPIC_API_KEY
  OPENAI_API_KEY
  CONGRESS_DOT_GOV_API_KEY
  GOOGLE_CIVIC_API_KEY
  ADMIN_API_KEY
  STRIPE_SECRET_KEY
  STRIPE_PUBLISHABLE_KEY
  STRIPE_WEBHOOK_SECRET
  CRON_SECRET
)

# Target environments for each var.
# NEXT_PUBLIC_ vars need all three; secrets need production only.
# Preview inherits from production. The Vercel CLI has a known issue where
# the "preview" target prompts for a git branch even with --yes, so we
# skip it and rely on inheritance.
env_targets() {
  local name="$1"
  if [[ "$name" == NEXT_PUBLIC_* ]]; then
    echo "production development"
  else
    echo "production"
  fi
}

# Read a value from the env file. Handles KEY=VALUE and KEY="VALUE" formats.
read_env_value() {
  local key="$1"
  local val
  val=$(grep -E "^${key}=" "$ENV_FILE" | head -1 | sed "s/^${key}=//" | sed 's/^"//' | sed 's/"$//')
  echo "$val"
}

# Get list of existing var names from Vercel.
echo "Fetching existing env vars from Vercel (scope: $SCOPE)..."
EXISTING=$(npx vercel env ls --scope "$SCOPE" 2>&1 | awk 'NR>3 && $1 ~ /^[A-Z_]/ {print $1}')

# Check required vars are present in the env file.
missing=()
for var in "${REQUIRED_VARS[@]}"; do
  val=$(read_env_value "$var")
  if [[ -z "$val" ]]; then
    missing+=("$var")
  fi
done
if [[ ${#missing[@]} -gt 0 ]]; then
  echo "Error: Required vars missing from $ENV_FILE: ${missing[*]}"
  exit 1
fi

# Sync each var.
synced=0
skipped=0
for var in "${SYNC_VARS[@]}"; do
  val=$(read_env_value "$var")
  if [[ -z "$val" ]]; then
    echo "  SKIP  $var (not set in $ENV_FILE)"
    ((skipped++))
    continue
  fi

  targets=$(env_targets "$var")

  # --force upserts (creates or overwrites). No need to rm first.
  for target in $targets; do
    npx vercel env add "$var" "$target" --value "$val" --scope "$SCOPE" --yes --force 2>/dev/null
  done

  echo "  OK  $var → [$targets]"
  ((synced++))
done

echo ""
echo "Done. $synced synced, $skipped skipped."
echo ""
echo "If you added new vars, redeploy with:"
echo "  npx vercel --prod --scope $SCOPE --yes"
