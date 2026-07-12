# The `netidx admin` Tool

Every netidx install is shaped by a small handful of JSON files — the client
config, the resolver-server config, a permissions file, and (for TLS
deployments) some keys and certificates. You can write all of this by hand, and
the [Configuration](./configuration.md) chapter shows you the schema, but in
practice the supported way to stand up and run netidx is `netidx admin`.

It brings the whole admin plane together:

- **templated installs** that lay down a self-consistent set of files for a
  known role — workstation, network resolver, publisher host — and register
  the OS service that brings the node up on boot,
- a **certificate authority** and an enrollment workflow for TLS deployments,
- **remote cluster administration** — approving new members, editing
  permissions, restarting a resolver — over the network, with no SSH, and
- **editors** for the individual config files that validate before they save.

This chapter is the map. The workflows themselves get their own chapters
([installing a role](./configuration.md), [TLS and the CA](./tls.md),
[authorization](./authorization.md), [admin-plane security](./security.md), and
[controller recovery](./backup_recovery.md)); here we cover the *shape* of the
tool and the two ways you drive it.

## Two faces, one program

`netidx admin` has an interactive face and a scripted face, and they are the
same program underneath — every workflow is defined once and both faces call
it. That means the TUI never does anything the CLI can't, and a script is never
a second-class citizen.

**The TUI.** Run `netidx admin` with no subcommand and you get a full-screen
terminal interface. This is the right choice for a human doing setup or
day-to-day cluster administration: it discovers what's on your machine and your
network, walks you through decisions, and shows you things a flag can't — like
the identicon you match to approve a new member (below). It needs a real
terminal.

**The strict CLI.** Run `netidx admin <command> --flags…` and you get a
non-interactive command that does exactly what you told it. It is *strict*:
every decision is a flag, and a missing required flag is an error, never a
silent default or a prompt. That is deliberate — it makes the CLI safe to put
in a provisioning script, an Ansible playbook, or a Dockerfile, where a
blocking prompt or an inferred default would be a bug. Every command has an
exhaustive `--help`; this book covers the common shapes and points you there
for the full flag list.

Use whichever fits: the TUI to learn the system and to run a cluster by hand,
the CLI to automate what you learned.

## The command map

```
netidx admin                     # no subcommand → interactive TUI

  workstation install|status|update|join     # a dev machine: local resolver + client
  resolver    install|status|update          # a network-facing resolver server
              add-parent                      #   attach under a parent by delegation
              list-delegations|approve-delegation|deny-delegation   # (as the parent admin)
  publisher   install|status|update          # a publisher host's client config

  ca          init|issue|sign|inspect-csr    # a local certificate authority
              queue|approve|deny              #   the enrollment queue
              issued|revoke                   #   issued certs + revocation (CRL)
              servers|remove-server           #   immutable admin-server inventory
              backup|recover-controller       #   disaster recovery
              reconcile-controller            #   retry address/map/CRL fanout
              admin                           #   CA admin keyslots (RBAC)
              auto-approve|recovery|external  #   automation + recovery credentials
              fingerprint|list

  login|logout                               # sealed reusable admin sessions
  perms       show|edit                       # a cluster's permissions, remotely
  discover                                    # find netidx networks on the LAN (mDNS)
  uninstall                                   # tear down config + OS service

  component   client|resolver|perms|units    # low-level, single-component editors
              activation|server|tls|id-map|service
```

Three things are worth pulling out of that map.

The **role commands** (`workstation`, `resolver`, `publisher`) are the front
door. `install` lays down a working node; `status` tells you what a host is and
whether it is still in sync with its network; `update` reconciles it after the
network has changed (say, a resolver was added to the cluster). See the
[Configuration](./configuration.md) chapter for a walk through an install.

The **`ca` commands** are the certificate authority and the enrollment
workflow. In a TLS deployment this is where new nodes get their identities. The
[Managing TLS](./tls.md) chapter covers it end to end; the key idea — the glyph
— is below.

The **`component` commands** are the low-level layer the role commands are
built on. You reach for them directly when you want to edit one config file
(`component resolver`, `component client`, `component perms`), run the admin
server (`component server`), or control the activation supervisor's services
(`component activation restart|start|stop|status`). They are deliberately
narrow: for example, *defining* an activation unit (`component activation
add`/`remove`) is a local-only operation — a unit is an arbitrary command line,
so creating one is equivalent to running code on the box, and that is never
something a remote admin can do to you. Restarting an already-defined unit, on
the other hand, *can* be done remotely, subject to permissions.

## The interactive TUI

The TUI opens on one of two tabs.

**Local** is about *this* machine: install a role, look at and control the
services running here, and — if this host runs an admin server — manage its
admin roster and permissions over a local, no-password control socket (being
the local superuser is authority enough on your own box). A controller also
offers an online recovery backup here. On a fresh machine the TUI greets you
and offers to install a role.

**Cluster** is about administering a netidx cluster *over the network*. It
lists the clusters this machine knows about (each verified live by its CA
identity before it's shown), lets you discover more on the LAN, or connect to
one by address. Once you're connected to a cluster's admin server you get a set
of panels:

- **Queue** — pending enrollment requests waiting for a human to approve.
- **Delegations** — pending requests from resolvers asking to join under a
  parent you administer.
- **Roster** — the CA's admin keyslots and their policies (RBAC).
- **Admin Servers** — immutable server identities, current addresses, granted
  roles and cluster placement; this is also where a dead satellite can be
  force-removed and controller reconciliation retried.
- **Issued** — the certificates this CA has issued, with a revoke action.
- **Perms** — a cluster level's permissions, edited in your `$EDITOR`.
- **Services** — the resolvers (and other units) on a chosen cluster member,
  with start / stop / restart.

Everything the Cluster tab does is authenticated and authorized by the admin
server; connecting to it does not require an account on the remote machine.
The TUI logs in once and reuses a short-lived session, never retaining the
administrator password after login succeeds. See
[Admin-Plane Security](./security.md) for the controller-verification and
session rules.

Remote service control is always explicit. In particular, the admin plane does
not restart resolver servers after a topology or configuration change. For a
serious cluster, restart one member, wait its `delay-reads` period for
publishers to republish, verify it, and only then restart the next member.

## The glyph

The one human trust decision in a TLS deployment is: *is this really the CA (or
the node) I think it is?* netidx makes that decision concrete with a **glyph** —
an 8×8 identicon plus a short grouped code (a fingerprint of the key), shown
wherever an identity has to be confirmed.

When a node enrolls, it displays its request's glyph. The approving admin, on
the CA side, sees the same glyph beside the queued request. The enrollee sends
the admin a screenshot of their window out of band (a chat message, a photo),
the admin compares the two identicons, and only approves if they match. An
attacker who can talk on your network still can't forge the glyph of a key they
don't hold, so this one visual check is what bootstraps trust — everything
after it is pinned to the confirmed fingerprint automatically.

You'll see the same glyph when you first connect to a cluster (confirming the
CA's identity), and you can print any CA's glyph for out-of-band comparison with
`netidx admin ca fingerprint` (optionally against a remote `ip:port`).

## Teardown

`netidx admin uninstall` reverses an install: it removes the config directory
and unregisters the OS service. `--with-ca` additionally deletes the local CA's
private key and issued certificates — only do this when you are sure, because
anything signed by that CA cannot be re-issued without bootstrapping a new chain
of trust.
