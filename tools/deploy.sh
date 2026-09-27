#!/bin/bash
# Deploy the committed HEAD to GitHub Pages (via push) and Cloudflare Pages (via wrangler).
# Requires: gh/git push access to origin, `wrangler login` done once.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -z "$(git status --porcelain)" ] || { echo "工作区有未提交改动,先 commit"; exit 1; }
for f in js/*.js; do node --check "$f"; done
git push
D=$(mktemp -d); git archive HEAD | tar -x -C "$D"; rm -rf "$D/tools" "$D/AGENTS.md" "$D/HANDOFF.md" "$D/start.command"
wrangler pages deploy "$D" --project-name inkstrike --branch main --commit-dirty=true
rm -rf "$D"
echo "Live: https://inkstrike.pages.dev  |  https://badabadabing.github.io/inkstrike/ (GitHub Pages 构建约 1 分钟)"
