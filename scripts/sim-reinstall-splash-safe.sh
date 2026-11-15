#!/usr/bin/env bash
# Over-install a Qrew build on a simulator without bringing back a stale launch splash.
# Usage: scripts/sim-reinstall-splash-safe.sh <sim-udid> <path/to/Qrew.app> [9k6|fake]
# 9k6 = build signed with team 9K6BKSS4U6 (host/spare); fake = FAKETEAMID build (guests).
# Never uninstalls or erases: the data container (accounts) is kept.
set -euo pipefail
UDID="${1:?sim udid}"; APP="${2:?path to Qrew.app}"; KIND="${3:-}"
BID=com.iyaproject.moment

[ -f "${APP:?}/Qrew" ] || { echo "not an app bundle: $APP" >&2; exit 1; }
new_fake=$(strings -a "$APP/Qrew" | grep -c FAKETEAMID || true)
[ -z "$KIND" ] && { [ "$new_fake" -gt 0 ] && KIND=fake || KIND=9k6; }
want_fake=0; [ "$KIND" = fake ] && want_fake=1
[ $((new_fake>0)) -eq "$want_fake" ] || { echo "build is not the $KIND variant" >&2; exit 1; }

state=$(xcrun simctl list devices | grep "$UDID" | grep -o '(Booted)\|(Shutdown)' || true)
[ "$state" = "(Booted)" ] || xcrun simctl boot "$UDID"
xcrun simctl bootstatus "$UDID" >/dev/null 2>&1

old=$(xcrun simctl get_app_container "$UDID" "$BID" app 2>/dev/null || true)
if [ -n "$old" ]; then
  old_fake=$(strings -a "$old/Qrew" | grep -c FAKETEAMID || true)
  [ $((old_fake>0)) -eq "$want_fake" ] || { echo "installed app-id differs from the $KIND variant; ask before changing" >&2; exit 1; }
fi

xcrun simctl terminate "$UDID" "$BID" 2>/dev/null || true
xcrun simctl install "$UDID" "$APP"
DATA=$(xcrun simctl get_app_container "$UDID" "$BID" data)   # resolve while booted
# install returns before the bundle is fully in place; shutting down too early leaves a half install
for _ in $(seq 1 60); do
  nb=$(xcrun simctl get_app_container "$UDID" "$BID" app 2>/dev/null || true)
  [ -n "$nb" ] && [ -f "$nb/Info.plist" ] && break
  sleep 1
done
[ -f "${nb:?}/Info.plist" ] || { echo "install did not complete" >&2; exit 1; }
xcrun simctl shutdown "$UDID"
SNAP="${DATA:?}/Library/SplashBoard/Snapshots"
[ -d "$SNAP" ] && find "${SNAP:?}" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
xcrun simctl boot "$UDID"
xcrun simctl bootstatus "$UDID" >/dev/null 2>&1
for _ in $(seq 1 60); do   # the app container path is re-registered a few seconds after boot
  fin=$(xcrun simctl get_app_container "$UDID" "$BID" app 2>/dev/null || true)
  [ -n "$fin" ] && [ -f "$fin/Info.plist" ] && break
  sleep 1
done
echo "ok $UDID CFBundleVersion=$(plutil -extract CFBundleVersion raw "${fin:?}/Info.plist")"
