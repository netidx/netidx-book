#!/bin/bash
# Capture the CA's Admin Servers panel -- the inventory keyed by immutable
# server UUID, with the active CA protected from removal.
#
# Auth-scheme independent: the admin plane is TLS whatever the data plane is,
# so this runs against whichever admin domain the lab currently holds.
#
#   tools/flows/admin-servers-panel.sh [host] [screens-subdir] [domain]
set -euo pipefail
HOST=${1:-192.168.50.11}
SUB=${2:-krb5}
DOMAIN=${3:-netidx.test}
PW=${ADMIN_PW:-testpw12345}

here=$(cd "$(dirname "$0")/.." && pwd)
D=$here/../src/screens/$SUB/panels
T=$here/tuicap.sh
export TUICAP_SESSION=${TUICAP_SESSION:-servers}
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

"$T" waitfor "Status"
"$T" key Tab
# Wait for the row, not the panel title: the title renders while the list still
# says "Checking saved admin domains…", and an Enter with no visible row is
# dropped -- the domain only appears once its CA glyph has verified.
"$T" waitfor "$DOMAIN ("
"$T" key Enter
"$T" waitfor "admin name"
"$T" key Enter
"$T" waitfor "admin password"
"$T" key -l "$PW"
"$T" key Enter
"$T" waitfor "Connected"
"$T" key Enter
# Panel list: Enrollment Queue, Delegation Requests, Admin Roster, Admin Servers
"$T" waitfor "Admin Servers"
"$T" key Down Down Down
step 10-panel-admin-servers "Admin Servers" -- Enter

"$T" waitfor "Server identity"
# The rename landed here: this panel used to say CONTROLLER, "replace the
# controller first", and "c reconcile controller".
step 11-admin-servers "Server identity" --
"$T" expect "reconcile CA"
"$T" expect "Registered"

"$T" stop
echo "captured -> $D/11-admin-servers.ansi"
