# The Id-Map Daemon

When the resolver authorises an operation it looks up the caller's
*unix-style* identity — a uid, a primary gid, and a list of
supplementary group names — and matches that against the entries in
`perms.json`. The default platform mapper uses `/bin/id` on Unix and native
account/local-group APIs on Windows. For TLS, the principal is a certificate
SAN — a DNS name like `alice.example.com` or `mazikeen.local` — and
the platform account database usually has nothing useful to say about it.

On Unix, the id-map daemon (`netidx id-map serve`) is the answer. It reads a
small JSON file mapping netidx names to uids, primary groups, and
supplementary group memberships, and answers the resolver's lookup
queries over a unix socket using the same `/bin/id`-style line format
the resolver already understands.

## Wiring it into the resolver

Two fields in the resolver-server config:

``` json
{
  "id_map_type": "Socket",
  "id_map_command": "/var/run/netidx/id-map.sock"
}
```

`id_map_type` chooses between `Command` (the platform default, or execute the
program in `id_map_command`), `Socket` (connect to the Unix daemon at the
given path), and `DoNotMap` (skip lookup entirely; every caller is treated as
the bare SAN with no groups). `id_map_timeout` (default 3600 s) controls how
long the resolver caches successful lookups per caller. Id-map sockets are not
supported on Windows; its platform default mapper is native.

`netidx admin resolver install --auth tls` writes this section for you
and, on Unix, drops a matching `id-map.unit` so the daemon comes up alongside
the resolver under the activation supervisor. Pass `--no-id-map` to
skip that and use the platform mapper instead.

## The JSON schema

The on-disk file is a single `IdMap` object with four keys:

``` json
{
  "$default_uid": 65534,
  "$default_gid": 65534,
  "groups": {
    "users":   { "gid": 100 },
    "wheel":   { "gid": 10 }
  },
  "identities": {
    "alice.example.com": {
      "uid": 1000,
      "primary_group": "users",
      "groups": ["wheel"]
    }
  }
}
```

- `$default_uid` / `$default_gid` are returned for queries that don't
  match any identity. They're the equivalent of the `nobody` /
  `nogroup` fallback that `/bin/id` would emit for an unknown user.
  If `$default_gid` matches a registered group, the daemon reports
  that group's name in the fallback line; otherwise it emits the
  literal `nogroup` token. Most perms files have no entries for
  `nogroup`, which makes the fallback effectively "no permissions" —
  the safe default.
- `groups` maps a group name (as it appears in `perms.json`) to a
  numeric gid. The number is decorative for TLS deployments (the
  resolver reads only the group name), but it has to be present and
  unique so the daemon can produce well-formed responses.
- `identities` maps a netidx name to a `{uid, primary_group, groups}`
  record. The uid is similarly decorative for TLS; only the
  local-auth peer-credentials path ever reverses uid → name.

Validation runs at save time and again whenever the daemon reloads
the file. The interesting invariants:

1. Every group named by an identity (primary or secondary) must exist
   in the `groups` table.
2. Names may not contain `(`, `)`, `,`, `=`, or whitespace — the
   resolver parses responses by scanning parenthesised tokens, and a
   group named e.g. `wheel) gid=0(root` could inject extra group
   memberships into the reply.
3. No identity name may parse as a `u32`; the wire protocol
   distinguishes uid queries from name queries by integer-parsing the
   query string, so an identity literally named `"1000"` would be
   unreachable by name.
4. No two identities may share a uid (reverse lookups would otherwise
   be order-dependent).

## Editing the file

`netidx admin component id-map` is the supported way to edit the JSON:

- `netidx admin component id-map init` — create an empty file at the canonical
  user path.
- `netidx admin component id-map list` — print identities and groups in a table.
- `netidx admin component id-map show` — pretty-print the underlying JSON.
- `netidx admin component id-map edit` — open in `$VISUAL` / `$EDITOR`, validate
  on save.
- `netidx admin component id-map add-group <name> [--gid N]` — add or update a
  group. `--gid` is auto-allocated when omitted.
- `netidx admin component id-map add-user <name> [--uid N] [primary-group]
  [-g secondary]...` — add or update an identity. The uid is
  auto-allocated, the primary group lists available groups and
  defaults to `users` if present.
- `netidx admin component id-map add-member <user> <group>` /
  `remove-member <user> <group>` — manipulate secondary group
  membership.
- `netidx admin component id-map remove-user <name>` /
  `remove-group <name>` — delete entries (groups can't be removed
  while in use).

`add-user` and `add-group` keep their numeric ids when applied to
an existing entry, so re-running them to tweak group membership
won't renumber the identity.

## Running the daemon by hand

Most installs let the activation supervisor manage the daemon. If
you're debugging or running outside of the standard layout:

``` shell
$ netidx id-map serve \
    --foreground \
    --config /etc/netidx/id-map.json \
    --socket /var/run/netidx/id-map.sock \
    --socket-mode 0o660
```

The daemon watches the config file and reloads when it changes — a
`netidx admin component id-map edit` (which writes atomically) is enough to push
new entries live without a restart. `SIGHUP` forces a re-read for
environments where the filesystem watch is unreliable (some network
mounts, some container setups). Parse errors keep the previous
good map in place rather than locking out every TLS identity.

Use `--socket-mode 0o660` and `chgrp` the socket to a shared service
account when the resolver runs under a different uid than the
id-mapper. The default `0o600` keeps the socket per-user, which is
the right choice when both processes run as the same user (the
common case for the workstation template).
