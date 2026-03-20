#!/usr/bin/env bash
# Preflight check for ai-timeline entries
# Checks: frontmatter required fields, <!-- zh --> section, duplicate keys

set -euo pipefail

DIR="${1:-$(dirname "$0")/../../src/content/ai-timeline}"
DIR="$(cd "$DIR" && pwd)"

ISSUES=0
CHECKED=0

for f in "$DIR"/*.md; do
  [ -f "$f" ] || continue
  CHECKED=$((CHECKED + 1))
  base="$(basename "$f")"

  # Check for <!-- zh --> section
  if ! grep -q '<!-- zh -->' "$f"; then
    echo "MISSING_ZH: $base"
    ISSUES=$((ISSUES + 1))
  fi

  # Check required frontmatter fields
  for field in title date category; do
    if ! grep -q "^${field}:" "$f"; then
      echo "MISSING_FIELD($field): $base"
      ISSUES=$((ISSUES + 1))
    fi
  done

  # Check for duplicate frontmatter keys (between --- fences)
  dupes=$(awk '/^---$/{n++; next} n==1{print}' "$f" | grep -oE '^\w+:' | sort | uniq -d)
  if [ -n "$dupes" ]; then
    echo "DUPLICATE_KEY($dupes): $base"
    ISSUES=$((ISSUES + 1))
  fi
done

echo ""
echo "Checked: $CHECKED files"
echo "Issues: $ISSUES"

if [ "$ISSUES" -gt 0 ]; then
  exit 1
fi

echo "✅ All checks passed"
exit 0
