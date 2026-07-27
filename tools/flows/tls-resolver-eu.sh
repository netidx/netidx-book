#!/bin/bash
# Capture a satellite resolver joining an existing admin domain across a routed
# boundary and requesting a delegated subtree -- the two-level hierarchy.
#
# EU sits on an isolated subnet, so mDNS never reaches HQ. That is deliberate:
# it exercises the empty-discovery screen and the manual-address path, which is
# what any real WAN deployment does.
#
#   tools/flows/tls-resolver-eu.sh [host] [hq-admin-server] [subtree] [certname]
set -euo pipefail
HOST=${1:-192.168.60.15}
HQ=${2:-192.168.50.11:4565}
SUBTREE=${3:-/eu}
CERTNAME=${4:-resolver-eu.netidx.test}
ADMIN=${ADMIN_NAME:-root}
PW=${ADMIN_PW:-testpw12345}

here=$(cd "$(dirname "$0")/.." && pwd)
D=$here/../src/screens/tls/resolver-eu
T=$here/tuicap.sh
export TUICAP_SESSION=${TUICAP_SESSION:-eu}
mkdir -p "$D"

step() { local name=$1 want=$2; shift 3
    "$T" shot "$D/$name.ansi"
    [ -n "$want" ] && "$T" expect "$want"
    [ $# -gt 0 ] && "$T" key "$@"
    return 0
}

"$T" start 100 30 "TERM=xterm-256color ssh -tt -F /dev/null -o BatchMode=yes \
  -o StrictHostKeyChecking=no root@$HOST netidx admin"
sleep 4

step 01-welcome           "Welcome to netidx"                -- Enter
step 02-role-menu         "Set Up This Machine"              -- Down Down
step 03-role-resolver     "network-facing resolver server"   -- Enter
step 04-domain-mode       "Use an existing CA"               -- Down
step 05-use-existing-ca   "Use an existing CA"               -- Enter
# Isolated subnet: discovery finds nothing, which is the screen to document.
step 06-no-domains-found  "No admin domains found"           -- Down
step 07-manual-selected   "Enter an address manually"        -- Enter
step 08-admin-server-addr "admin server address"             --
"$T" key -l "$HQ"
"$T" key Enter
"$T" waitfor "intend to trust"
step 09-confirm-glyph     "intend to trust"                  -- a
step 10-delegated-subtree "delegated subtree"                --
"$T" key -l "$SUBTREE"
"$T" key Enter
step 11-auth-scheme       "auth scheme"                      -- Enter
# A joining resolver is asked for the full certificate name, already qualified
# with the domain -- not the split label/domain a founding resolver gets.
step 12-cert-name         "TLS certificate name"             -- C-u
"$T" key -l "$CERTNAME"
"$T" key Enter
step 13-key-protection    "private-key protection"           -- Enter
step 14-admin-present     "admin present"                    -- y
step 15-id-map-groups     "id-map groups"                    -- Enter
step 16-admin-name        "admin name"                       --
"$T" key -l "$ADMIN"
"$T" key Enter
step 17-admin-password    "admin password"                   --
"$T" key -l "$PW"
"$T" key Enter
# Signing + registration is a round trip to HQ across the WAN link; do not stop
# the session here or the install dies mid-flight with no config written.
"$T" waitfor "listen"
step 18-resolver-listen   "listen"                           -- Enter
step 19-resolver-port     "resolver port"                    -- Enter
# A satellite resolver also stands up its own admin server, so the listen
# address/port pair is asked twice -- once for the resolver, once for the
# admin server -- and it enrolls a second identity for that server.
step 20-admin-listen-ip   "admin server listen IP"           -- Enter
step 21-admin-listen-port "admin server listen port"         -- Enter
step 22-admin-present-srv "admin present"                    -- y
step 23-admin-name-srv    "admin name"                       --
"$T" key -l "$ADMIN"
"$T" key Enter
step 24-admin-password-srv "admin password"                  --
"$T" key -l "$PW"
"$T" key Enter

# ---- the flow blocks here until a parent admin approves the delegation ----
# This screen animates, so `shot` warns about never settling; that is expected.
"$T" waitfor "waiting for the parent admin"
step 25-awaiting-delegation "waiting for the parent admin"   --
echo
echo "PAUSED: approve the delegation of $SUBTREE at the parent:"
echo "  netidx admin  ->  Admin Domain  ->  Delegation Requests  ->  a"
echo "Waiting..."
TUICAP_MAXPOLL=2400 "$T" waitfor "register OS service"

step 26-register-service  "register OS service"              -- y
"$T" waitfor "Configuration written"
step 27-installed         "Configuration written"            -- Enter
step 28-local-menu        "Resolver (running)"               -- Enter
"$T" waitfor "Admin domain sync"
step 29-status-detail     "Admin domain sync"                --

"$T" stop
echo "captured $(ls "$D"/*.ansi | wc -l) frames -> $D"
