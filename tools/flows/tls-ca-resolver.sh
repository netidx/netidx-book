#!/bin/bash
# Capture the founding install: a resolver that also mints the admin domain's
# CA, over a TLS data plane. Run against a torn-down host.
#
#   tools/flows/tls-ca-resolver.sh [host] [domain]
#
# Each step shoots the screen the reader must act on, asserts a phrase from it,
# then sends the keys. A failed assertion aborts with the screen dumped, so the
# wording audit and the screenshot run are one pass.
set -euo pipefail
HOST=${1:-192.168.50.11}
DOMAIN=${2:-netidx.test}
PW=${ADMIN_PW:-testpw12345}

here=$(cd "$(dirname "$0")/.." && pwd)
D=$here/../src/screens/tls/ca-resolver-hq
T=$here/tuicap.sh
export TUICAP_SESSION=${TUICAP_SESSION:-hq}
mkdir -p "$D"

step() { # step <name> <expect> -- <keys...>
    local name=$1 want=$2
    shift 3
    "$T" shot "$D/$name.ansi"
    [ -n "$want" ] && "$T" expect "$want"
    [ $# -gt 0 ] && "$T" key "$@"
    return 0
}

"$T" start 100 30 "TERM=xterm-256color ssh -tt -F /dev/null -o BatchMode=yes \
  -o StrictHostKeyChecking=no root@$HOST netidx admin"
sleep 4

step 01-welcome              "Welcome to netidx"                -- Enter
step 02-role-menu            "Set Up This Machine"              -- Down Down
step 03-role-resolver        "network-facing resolver server"   -- Enter
step 04-domain-mode          "Create a new admin domain"        -- Enter
step 05-ca-required          "Founding a new admin domain"      -- Enter
step 06-domain-name          "admin domain name"                -- C-u
"$T" key -l "$DOMAIN"
step 07-domain-name-typed    "$DOMAIN"                          -- Enter
# Lab VMs have no TPM. On TPM hardware this screen does not appear and the
# key-protection step below offers `seal` as well.
step 08-no-tpm-warning       "proceed without a TPM"            -- y
step 09-ca-identity          "Certificate authority created"    -- Enter
step 10-recovery-password    "CA recovery password"             -- Enter
step 11-admin-listen-ip      "admin server listen IP"           -- Enter
step 12-admin-listen-port    "admin server listen port"         -- Enter
step 13-root-admin-name      "root user name"                   -- Enter
step 14-root-admin-password  "admin password"                   -- Enter
"$T" key -l "$PW"
"$T" key Enter
step 15-password-confirm     "confirm password"                 --
"$T" key -l "$PW"
"$T" key Enter
step 16-ca-complete          "Admin domain setup complete"      -- Enter
step 17-auth-scheme          "auth scheme"                      -- Enter
step 18-resolver-cert-name   "resolver name"                    -- Enter
step 19-key-protection       "private-key protection"           -- Enter
step 20-resolver-listen      "listen"                           -- Enter
step 21-resolver-port        "resolver port"                    -- Enter
step 22-register-service     "register OS service"              -- y
step 23-installed            "Configuration written"            -- Enter
step 24-local-status         "Admin Domain"                     -- Enter
step 25-status-detail        "Admin domain sync"                --

"$T" stop
echo "captured $(ls "$D"/*.ansi | wc -l) frames -> $D"
