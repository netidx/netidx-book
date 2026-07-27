# Command Line Tools

You don't need to program to use netidx — the `netidx` binary
includes a generous set of built-in subcommands for everything from
publishing data to debugging the resolver. The chapters below cover
the ones with significant surface; this overview lists the rest as
pointers.

Core data-plane tools:

- `netidx publisher` — publish values from stdin.
- `netidx subscriber` — subscribe to values, print updates to stdout,
  optionally write or call RPCs from stdin.
- `netidx resolver` — query and (carefully) edit the resolver server.
- `netidx record` (Unix) / `netidx record-client` — archive netidx values to
  disk, replay history, compress and index archives.
- `netidx container` — a persistent KV store that publishes its
  contents.
- `netidx activation` — process supervisor that runs other
  netidx-facing services on demand or at startup.
- `netidx stress` — load generator (publisher / subscriber /
  channel-publisher / channel-subscriber).

Configuration management (covered in
[netidx admin](../administration/admin.md)):

- `netidx admin <role> install` — templated installs (workstation,
  resolver, publisher).
- `netidx admin uninstall` — tear down an install.
- `netidx admin ca` — certificate authority + enrollment management.
- `netidx admin perms` / `netidx admin component service` — remote
  permission editing and OS-service registration.
- `netidx admin component {client,resolver,perms,activation,id-map}`
  — per-config editors.

Other:

- `netidx browser` — a built-in TUI browser for the namespace.
- The separately installed GTK browser — the production graphical browser and
  BScript GUI builder documented in the [GTK Browser](../browser/overview.md)
  section.
- `netidx wsproxy` — a WebSocket bridge so browsers can talk to
  netidx publishers directly.
- `netidx resolver-server` — the resolver server itself (usually
  managed under activation, not invoked by hand).
- `netidx id-map serve` — the Unix id-mapper daemon (see the
  [Id-Map Daemon](../administration/id_map.md) chapter).

Every subcommand has an exhaustive `--help`; the chapters that
follow focus on the moving parts that aren't obvious from the help
output.
