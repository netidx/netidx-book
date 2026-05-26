# Configuration Tooling (`netidx conf`)

Every netidx install is shaped by a small handful of JSON files — the
client config, the resolver-server config, a permissions file, and
(for TLS deployments) some keys and certificates. You can write all of
this by hand, and earlier chapters do show you the schema, but in
practice the supported way to set up netidx is the `netidx conf`
subcommand suite. It groups three things in one place:

- **templated installs** that lay down a self-consistent set of files
  for a known role (workstation, network resolver, publisher host),
- **editors** that load, validate, and atomically rewrite the
  individual config files, and
- **OS-service integration** that registers the activation supervisor
  with systemd or launchd so the cluster comes up on boot.

This chapter is a tour. Every subcommand has its own `--help` with
exhaustive flags; here we focus on the shape and the common workflows.

## Templated Installs

The fast path is `netidx conf install <role>`. Three roles ship today:

```
netidx conf install workstation   # local resolver + matching client
netidx conf install resolver      # network-facing resolver, optional client
netidx conf install publisher     # publisher-host config + units
```

### Workstation

This is the right pick for a single developer machine. Run

``` shell
$ netidx conf install workstation
```

with no flags and the installer drops a local-auth resolver listening
on `127.0.0.1:4654`, a matching `client.json`, a `perms.json` granting
your current Unix user full rights under `/local`, an activation unit
for the resolver, and (by default) one for the netidx container too.
On a TTY it asks if you also want to register netidx as an OS service;
say yes and you're done.

Useful flags:

- `--dry-run` — print the plan, write nothing.
- `--force` — overwrite an existing install.
- `--base /alt` — change the local namespace root from `/local` to
  something else.
- `--owner alice` — grant full rights to `alice` instead of the
  current user (useful when installing as root on someone's behalf).
- `--no-perms`, `--no-container`, `--no-service`, `--no-units` — opt
  out of pieces of the default bundle.
- `--parent-addr`, `--parent-auth`, `--parent-path`, `--parent-ttl`
  (+ auth-specific `--parent-spn` / `--parent-tls-name` /
  `--parent-socket`) — attach this resolver to a parent cluster so
  the workstation participates in a federated namespace.

### Network resolver

`netidx conf install resolver` is the standalone-resolver template.
It prompts (or takes flags) for the listen address, auth scheme,
and where to source TLS material. The most useful pieces:

- `--auth {anonymous,local,krb5,tls}` — chooses the authentication
  scheme the resolver exposes. Prompted when omitted.
- `--listen <addr>` — the address subscribers and publishers will
  use to find this resolver. Must be concrete (not `0.0.0.0`); use
  `--bind` separately if the socket itself should bind a different
  address.
- `--tls-cert generate` — when using `--auth tls`, the literal token
  `generate` issues a fresh resolver cert from the local CA, creating
  the CA first if none exists. This is the painless path for the
  common "resolver host is also the CA host" case.
- `--no-id-map` — skip auto-installing the id-mapper daemon. By
  default a TLS resolver gets one (cert SANs have no meaningful
  `/bin/id` translation path); see the [id-map chapter](./id_map.md)
  for what it does and when you want it.
- `--no-client` — skip dropping a matching `client.json` on the
  resolver host. Default is to drop one so `netidx resolver list`
  works locally without further setup.
- `--perms-seed <path>` — load a starter `perms.json` from a file
  instead of the built-in `/users/$[user]` template.

### Publisher host

`netidx conf install publisher` writes the client-side config a
dedicated publisher machine needs to find a remote cluster and offer
itself for inbound subscriber connections. It takes one or more
cluster addresses (`--addr`, repeatable), an auth scheme, and
optionally a `default_bind_config` so the publisher knows which local
interface to advertise.

## Local CA

`netidx conf ca` manages a local certificate authority that lives at
`${basedir}/ca/`. One CA per netidx install.

- `netidx conf ca init` — create the CA. Prompts for CN and other
  X.509 fields; `--no-password` writes an unencrypted private key
  (otherwise the key is encrypted and the password is stashed in the
  system keychain).
- `netidx conf ca issue` — issue a leaf certificate directly from
  the local CA. Used by `netidx conf install ... --tls-cert generate`
  under the hood, and stands on its own for issuing additional
  identities later.
- `netidx conf ca request` — generate a key + CSR locally, to be
  signed by a CA on another machine.
- `netidx conf ca sign` — sign an externally-supplied CSR with the
  local CA. Use `--san` to set the SubjectAltName authoritatively
  (the CA never silently inherits the CSR's claimed SAN; pass
  `--accept-csr-san` if you really do want that).
- `netidx conf ca list` — list known CAs.

## Configuration Editors

For each JSON file netidx maintains there's a matching pair under
`netidx conf <file>`. The editors load the file, drop it in
`$VISUAL` / `$EDITOR`, run the same validation netidx runs at
startup, and only on success atomically replace the on-disk copy.
A botched edit leaves the original untouched and offers a re-edit
prompt.

- `netidx conf client {show,edit}` — the client config.
- `netidx conf resolver {show,edit}` — the resolver-server config.
- `netidx conf perms {list,set,remove}` — permission entries. `set`
  takes an entity, a path, and a bit string like `swlpd` (see the
  [Authorization](./authorization.md) chapter for the bits).
- `netidx conf activation {list,add,remove}` — activation units
  used by the supervisor.
- `netidx conf id-map ...` — the id-map JSON used by the
  id-mapper daemon. Has its own [chapter](./id_map.md).

## OS Service Integration

`netidx conf service` registers (or unregisters) netidx as an OS
service, so the activation supervisor starts on boot.

- `netidx conf service install` — install. Defaults to user scope
  (no privileges needed); pass `--scope system` to install
  system-wide (this re-execs under sudo).
- `netidx conf service uninstall` — remove the service.
- `netidx conf service status` — report whether the service is
  running.

`netidx conf install <role>` already prompts to do this for you on a
TTY; the standalone `service` subcommand is for cases where you
declined that prompt or want to flip between user and system scope
later.

## Teardown

`netidx conf uninstall` reverses an install: removes the config
directory and the OS service registration. `--dry-run` previews the
plan. `--with-ca` additionally deletes the local CA's private key
and issued certificates — only do this when you are sure: anything
signed by the CA cannot be re-issued without bootstrapping a new
chain of trust.
