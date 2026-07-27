#!/bin/bash
# Capture the founding install with a Kerberos data plane under the TLS admin
# plane -- the deployment shape where netidx authenticates data-plane clients
# against an existing Kerberos realm while the admin plane still runs on the
# netidx CA.
#
# Requires: a KDC reachable from the host, /etc/krb5.conf naming the realm, and
# a keytab entry for the resolver's own SPN.
#
#   tools/flows/krb5-ca-resolver.sh [host] [domain] [id-map]
#
# id-map defaults to `none`. `platform` shells out to `id user@REALM` and needs
# a working site IdM (SSSD/FreeIPA); without one every lookup fails and clients
# are denied, so a lab without SSSD must use none.
set -euo pipefail
HOST=${1:-192.168.50.11}
DOMAIN=${2:-netidx.test}
IDMAP=${3:-none}
PW=${ADMIN_PW:-testpw12345}

here=$(cd "$(dirname "$0")/.." && pwd)
D=$here/../src/screens/krb5/ca-resolver-hq
T=$here/tuicap.sh
export TUICAP_SESSION=${TUICAP_SESSION:-hq}
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

step 01-welcome            "Welcome to netidx"            -- Enter
step 02-role-menu          "Set Up This Machine"          -- Down Down
step 03-role-resolver      "network-facing resolver"      -- Enter
step 04-domain-mode        "Create a new admin domain"    -- Enter
step 05-ca-required        "Founding a new admin domain"  -- Enter
step 06-domain-name        "admin domain name"            -- C-u
"$T" key -l "$DOMAIN"
"$T" key Enter
"$T" waitfor "TPM"
step 07-no-tpm             "proceed without a TPM"        -- y
"$T" waitfor "Certificate authority created"
step 08-ca-identity        "Certificate authority created" -- Enter
step 09-recovery-password  "CA recovery password"         -- Enter
step 10-admin-listen-ip    "admin server listen IP"       -- Enter
step 11-admin-listen-port  "admin server listen port"     -- Enter
step 12-root-admin-name    "root user name"               -- Enter
step 13-admin-password     "admin password"               --
"$T" key -l "$PW"
"$T" key Enter
step 14-password-confirm   "confirm password"             --
"$T" key -l "$PW"
"$T" key Enter
"$T" waitfor "Admin domain setup complete"
step 15-ca-complete        "Admin domain setup complete"  -- Enter

# ---- this is where krb5 diverges from TLS ----
step 16-auth-scheme        "auth scheme"                  -- Up
step 17-auth-krb5          "krb5"                         -- Enter
# Prefilled netidx/<fqdn>@<REALM> from /etc/krb5.conf's default_realm plus the
# hostname; it must match a key in the host's keytab.
step 18-spn                "Kerberos service principal"   -- Enter
step 19-resolver-listen    "listen address"               -- Enter
step 20-resolver-port      "resolver port"                -- Enter
# krb5 only: TLS never asks, because a TLS identity already names the principal.
step 21-id-map-mode        "user/group id-map source"     --
case "$IDMAP" in
    platform) : ;;
    netidx)   "$T" key Down ;;
    none)     "$T" key Down Down ;;
esac
step 22-id-map-selected    "user/group id-map source"     -- Enter
step 23-register-service   "register OS service"          -- y
"$T" waitfor "Configuration written"
step 24-installed          "Configuration written"        -- Enter
step 25-local-menu         "Resolver (running)"           -- Enter
"$T" waitfor "Recovery slot"
step 26-status-detail      "Data-plane auth: krb5"        --

"$T" stop
echo "captured $(ls "$D"/*.ansi | wc -l) frames -> $D"
