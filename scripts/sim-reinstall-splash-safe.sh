#!/usr/bin/env bash
# Over-install an app build on a simulator without bringing back a stale launch splash.
# Usage: scripts/sim-reinstall-splash-safe.sh <sim-udid> <path/to/App.app> [9k6|fake]
# 9k6 = build signed with team 9K6BKSS4U6 (host/spare); fake = FAKETEAMID build (guests).
# Never uninstalls or erases: the data container (accounts) is kept.
# Fails closed: any lookup error before the install stops the run without installing.
set -euo pipefail
UDID="${1:?sim udid}"; APP="${2:?path to the .app}"; APP="${APP%/}"; KIND="${3:-}"
case "$KIND" in ''|9k6|fake) ;; *) echo "kind must be 9k6 or fake, got: $KIND" >&2; exit 1 ;; esac
BID=com.iyaproject.moment
SIMCTL=${SIMCTL:-xcrun simctl}   # override only for dry-run fault injection
die() { echo "$*" >&2; exit 1; }

# The executable is named after the app (Qrew before build 4, Tropop from build 4): read it from Info.plist.
exe() { local n; n=$(/usr/libexec/PlistBuddy -c 'Print CFBundleExecutable' "$1/Info.plist") || return 1; echo "$1/$n"; }
NEW_EXE=$(exe "$APP") && [ -f "$NEW_EXE" ] || die "not an app bundle: $APP"
want_name=$(basename "$APP")
want_ver=$(plutil -extract CFBundleVersion raw "$APP/Info.plist") || die "no CFBundleVersion in $APP"
want_hash=$(shasum -a 256 "$NEW_EXE" | cut -d' ' -f1)

# Simulator Keychain items (the session key) are scoped by application-identifier: a mismatch can open signed out.
# Simulator builds carry their entitlements in the __TEXT,__entitlements section (codesign -d shows none for them).
appid() {
  local t id; t=$(mktemp -d) || return 1
  { lipo -thin arm64 "$1" -output "$t/m" 2>/dev/null || cp "$1" "$t/m"; } &&
    xcrun segedit "$t/m" -extract __TEXT __entitlements "$t/e" >/dev/null 2>&1 &&
    id=$(plutil -extract application-identifier raw "$t/e" 2>/dev/null) || id=""
  rm -rf "$t"; [ -n "$id" ] && echo "$id"
}
new_id=$(appid "$NEW_EXE") || die "cannot read application-identifier of the new build $APP"
case "$new_id" in FAKETEAMID.*) new_kind=fake ;; 9K6BKSS4U6.*) new_kind=9k6 ;; *) die "unexpected app-id $new_id" ;; esac
[ -z "$KIND" ] && KIND=$new_kind
[ "$KIND" = "$new_kind" ] || die "build is $new_kind ($new_id), not the $KIND variant"

state=$($SIMCTL list devices | grep "$UDID" | grep -o '(Booted)\|(Shutdown)' || true)
[ -n "$state" ] || die "no simulator $UDID"
[ "$state" = "(Booted)" ] || $SIMCTL boot "$UDID"
$SIMCTL bootstatus "$UDID" >/dev/null 2>&1

# Installed app path: "" only when listapps proves the app is absent; any other lookup failure aborts.
installed() {
  local p; if p=$($SIMCTL get_app_container "$UDID" "$BID" app 2>/dev/null) && [ -d "$p" ]; then echo "$p"; return 0; fi
  local apps; apps=$($SIMCTL listapps "$UDID" 2>/dev/null) || return 1
  [ -n "$apps" ] || return 1
  if grep -q "\"$BID\"\|$BID =" <<<"$apps"; then return 1; fi   # listed but no path: registry error
  echo ""
}
# Data container path; fails unless it is an existing directory.
datadir() { local d; d=$($SIMCTL get_app_container "$UDID" "$BID" data 2>/dev/null) && [ -n "$d" ] && [ -d "$d" ] && echo "$d"; }
# Every install moves the data container to a new UUID and copies it, so check its contents, not its UUID.
kept() { [ -n "$1" ] && [ -d "$1" ] || return 1; (cd "$1" && { find Documents "Library/Application Support" -type f 2>/dev/null || true; } | sort); }
# true once the registry points at the NEW bundle: new path, new name, new version, new executable bytes
is_new() {
  [ -n "$1" ] && [ "$1" != "${old:-}" ] && [ "$(basename "$1")" = "$want_name" ] && [ -f "$1/Info.plist" ] &&
    [ "$(plutil -extract CFBundleVersion raw "$1/Info.plist" 2>/dev/null)" = "$want_ver" ] &&
    local e && e=$(exe "$1" 2>/dev/null) && [ -f "$e" ] && [ "$(shasum -a 256 "$e" | cut -d' ' -f1)" = "$want_hash" ]
}

old=$(installed) || die "cannot tell whether $BID is installed on $UDID (lookup error); nothing installed"
before=""
if [ -n "$old" ]; then
  old_exe=$(exe "$old") && [ -f "$old_exe" ] || die "installed app at $old has no readable executable"
  old_id=$(appid "$old_exe") || die "cannot read application-identifier of the installed app $old; ask before changing"
  [ "$old_id" = "$new_id" ] || die "application-identifier mismatch: installed $old_id, new $new_id; ask before changing"
  d0=$(datadir) || die "cannot resolve the data container before install"
  before=$(kept "$d0") || die "cannot list the data container $d0"
fi

$SIMCTL terminate "$UDID" "$BID" 2>/dev/null || true
$SIMCTL install "$UDID" "$APP"
# install returns before the bundle is fully in place; shutting down too early leaves a half install
nb=""
for _ in $(seq 1 60); do
  nb=$($SIMCTL get_app_container "$UDID" "$BID" app 2>/dev/null || true)
  is_new "$nb" && break
  sleep 1
done
is_new "$nb" || die "install did not complete (registry: ${nb:-none})"
DATA=$(datadir) || die "cannot resolve the data container after install"   # resolved after it moved
$SIMCTL shutdown "$UDID"
SNAP="$DATA/Library/SplashBoard/Snapshots"
[ -d "$SNAP" ] && find "$SNAP" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
$SIMCTL boot "$UDID"
$SIMCTL bootstatus "$UDID" >/dev/null 2>&1
fin=""
for _ in $(seq 1 60); do   # the app container path is re-registered a few seconds after boot
  fin=$($SIMCTL get_app_container "$UDID" "$BID" app 2>/dev/null || true)
  [ -n "$fin" ] && [ "$(basename "$fin")" = "$want_name" ] && [ -f "$fin/Info.plist" ] && break
  sleep 1
done
[ -n "$fin" ] && [ "$(basename "$fin")" = "$want_name" ] || die "after reboot the registry points at ${fin:-none}, not $want_name"
d1=""
for _ in $(seq 1 30); do d1=$(datadir) && break; sleep 1; done   # the data path also settles after boot
[ -n "$d1" ] || die "cannot resolve the data container after reboot"
after=$(kept "$d1") || die "cannot list the data container $d1"
lost=$(comm -23 <(echo "$before") <(echo "$after") | grep -c . || true)
[ "$lost" -eq 0 ] || die "data check FAILED: $lost file(s) from Documents/Application Support missing after install"
echo "ok $UDID $want_name CFBundleVersion=$want_ver app-id=$new_id data=$(basename "$d1") kept=$(echo "$before" | grep -c . || true) files"
