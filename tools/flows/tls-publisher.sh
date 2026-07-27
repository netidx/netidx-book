#!/bin/bash
# Capture a publisher install joining an existing TLS admin domain, taking the
# "admin present" path (an admin authorizes here and now, rather than queueing
# for remote approval -- see flows/tls-workstation.sh for the queued path).
#
#   tools/flows/tls-publisher.sh [host] [admin] [password]
set -euo pipefail
HOST=${1:-192.168.50.17}
ADMIN=${2:-root}
PW=${3:-${ADMIN_PW:-testpw12345}}

here=$(cd "$(dirname "$0")/.." && pwd)
D=$here/../src/screens/tls/publisher
T=$here/tuicap.sh
export TUICAP_SESSION=${TUICAP_SESSION:-pub}
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

step 01-welcome            "Welcome to netidx"              -- Enter
step 02-role-menu          "Set Up This Machine"            -- Down Down Down
step 03-role-publisher     "publishes data"                 -- Enter
# A publisher has no stand-alone form -- it publishes to somebody's resolver or
# it does nothing -- so it goes straight to discovery with no membership question.
step 04-discovering        "discovered on the local network" -- Enter
step 05-confirm-glyph      "intend to trust"                -- a
step 06-identity-name      "TLS certificate name"           -- Enter
step 07-key-protection     "private-key protection"         -- Enter
step 08-admin-present      "admin present"                  -- y
step 09-id-map-groups      "id-map groups"                  -- Enter
# This field has no default; typing is mandatory or Enter errors.
step 10-admin-name         "admin name"                     --
"$T" key -l "$ADMIN"
"$T" key Enter
step 11-admin-password     "admin password"                 --
"$T" key -l "$PW"
"$T" key Enter
# Signing the CSR is a round trip to the CA; the screen is blank while it runs.
"$T" waitfor "publisher network bind"
step 12-publisher-bind     "publisher network bind"         -- Enter
step 13-register-service   "register OS service"            -- y
step 14-installed          "Configuration written"          -- Enter
# Dismissing the result lands on the role menu; Status is a further Enter.
step 15-local-menu         "Publisher"                      -- Enter
"$T" waitfor "Admin domain sync"
step 16-status             "Admin domain sync"              --

"$T" stop
echo "captured $(ls "$D"/*.ansi | wc -l) frames -> $D"
