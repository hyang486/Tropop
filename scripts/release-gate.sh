#!/usr/bin/env bash
# Gate before and after `pod install` for any simulator/Release build. Run from the repo root of the tree you build.
# Usage: scripts/release-gate.sh pre|post   (pre: hidden flags must be 0; post: provider must list key modules)
set -euo pipefail
cd "$(dirname "$0")/../mobile"
case "${1:?pre|post}" in
  pre)
    n=$(/usr/bin/find -L node_modules -name expo-module.config.json -flags +hidden 2>/dev/null | wc -l | tr -d ' ')
    m=$(/usr/bin/find . -path ./node_modules -prune -o -flags +hidden -print 2>/dev/null | wc -l | tr -d ' ')
    echo "hidden module configs=$n, hidden files outside node_modules=$m"
    [ "$n" = 0 ] && [ "$m" = 0 ] || { echo "FAIL: chflags -R nohidden <real node_modules path> . and re-run" >&2; exit 1; } ;;
  post)
    P=$(ls ios/Pods/Target\ Support\ Files/Pods-*/ExpoModulesProvider.swift | head -1)   # Pods-Qrew before build 4, Pods-Tropop after
    for k in Haptics SecureStore Device GlassEffect SystemUI ExpoUI RouterToolbar ExpoApplication ExpoAppIntents; do
      c=$(grep -c "$k" "$P" || true); echo "$k=$c"; [ "$c" -gt 0 ] || { echo "FAIL: $k not registered" >&2; exit 1; }
    done
    [ -f .env.local ] && echo ".env.local ok" || { echo "FAIL: .env.local missing" >&2; exit 1; } ;;
esac
