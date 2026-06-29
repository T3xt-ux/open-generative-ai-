#!/bin/bash
# One-command deploy: Open-Generative-AI (T3 patched) → Vercel
# Run from project root after extracting open-generative-ai-patched.zip

set -e

echo "=== Open-Generative-AI T3 Patched → Vercel Deploy ==="
echo ""

# ── 1. Submodules ─────────────────────────────────────────────────────────────
echo "[1/4] Initializing submodules..."
git submodule update --init --recursive 2>/dev/null || {
  echo "  git submodule failed — fetching HEADs manually..."
  for pkg in packages/Open-AI-Design-Agent packages/Open-Poe-AI packages/Vibe-Workflow; do
    cd "$pkg"
    git fetch --depth=1 origin HEAD && git checkout FETCH_HEAD
    cd - > /dev/null
  done
}
echo "  ✓ submodules ready"

# ── 2. Install ────────────────────────────────────────────────────────────────
echo "[2/4] npm install..."
npm install --silent
echo "  ✓ installed"

# ── 3. Build sub-packages ─────────────────────────────────────────────────────
echo "[3/4] Building sub-packages (studio, workflow, agents, design-agent)..."
npm run build:packages
echo "  ✓ packages built"

# ── 4. Vercel deploy ──────────────────────────────────────────────────────────
echo "[4/4] Deploying to Vercel (team: team_ncnXIOvvpOJIIcoj5ZH1j3Ud)..."

if ! command -v vercel &> /dev/null; then
  echo "  Installing Vercel CLI..."
  npm install -g vercel
fi

vercel deploy . \
  --yes \
  --prod \
  --scope team_ncnXIOvvpOJIIcoj5ZH1j3Ud \
  --project open-generative-ai-t3 \
  --build-env MUAPI_PROXY_DEBUG=0 \
  --build-env UPLOAD_PROXY_ALLOWED_HOSTS= \
  --env MUAPI_PROXY_DEBUG=0 \
  --env UPLOAD_PROXY_ALLOWED_HOSTS=

echo ""
echo "✓ Done. Test your T3 endpoint:"
echo ""
echo "  curl -X POST https://open-generative-ai-t3.vercel.app/api/t3/generate \\"
echo "    -H 'x-muapi-key: YOUR_MUAPI_KEY' \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"character\":\"microdjimz\",\"hook\":\"Deep the Mand\",\"platform\":\"tiktok\"}'"
echo ""
echo "Expected response: { ok: true, media_url: \"...\", aspect_ratio: \"9:16\" }"
