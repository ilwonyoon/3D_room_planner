#!/usr/bin/env bash
#
# Downloads manifest assets from the Figma CDN into local files.
# Figma MCP CDN links expire after 7 days, so run this once after extraction.
#
# Usage:
#   chmod +x download-figma-assets.sh
#   ./download-figma-assets.sh
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANIFEST="$SCRIPT_DIR/asset-manifest.json"
OUT_PUBLIC_ICONS="$SCRIPT_DIR/../../../public/icons"
OUT_RAW="$SCRIPT_DIR/raw"

mkdir -p "$OUT_PUBLIC_ICONS" "$OUT_RAW"

if ! command -v jq &> /dev/null; then
  echo "jq is required. Run: brew install jq"
  exit 1
fi

echo "Downloading 10 category icons..."
for cat in new wallfloor sofa chair table storage decor lighting appliance bed; do
  url=$(jq -r ".categoryIcons.${cat}" "$MANIFEST")
  echo "  - ${cat}"
  curl -sSL "$url" -o "$OUT_PUBLIC_ICONS/category-${cat}.svg"
done

echo "Downloading UI icons..."
for ui in coin chevron-down back-arrow wallet-chevron; do
  url=$(jq -r ".ui[\"${ui}\"]" "$MANIFEST")
  echo "  - ${ui}"
  ext="svg"
  if [[ "$ui" == "coin" ]]; then
    ext="png"
  fi
  curl -sSL "$url" -o "$OUT_PUBLIC_ICONS/ui-${ui}.${ext}"
done

echo "Downloading handler icons..."
for h in up-down-arrow rotate-left rotate-right move-4way delete edit handler-circle-white; do
  url=$(jq -r ".handlers[\"${h}\"]" "$MANIFEST")
  echo "  - ${h}"
  target="$OUT_PUBLIC_ICONS/handler-${h}.svg"
  if [[ "$h" == "handler-circle-white" ]]; then
    target="$OUT_PUBLIC_ICONS/handler-circle-white.svg"
  fi
  curl -sSL "$url" -o "$target"
done

echo ""
echo "Done. SVG files were saved to public/icons/."
