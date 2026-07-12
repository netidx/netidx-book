# Quick Start for Linux

This walk-through sets up a netidx *workstation* — a local-auth
resolver plus matching client — on your machine. It's enough to do
netidx development, run publishers and subscribers locally, and try
out the tools.

## Install Rust and Netidx

Install [rust](https://www.rust-lang.org/tools/install) via rustup if
you haven't already, then

`cargo install netidx-tools`

This builds the `netidx` binary with every built-in subcommand: the
resolver server, the publisher and subscriber CLIs, the admin tooling,
the id-map daemon, the activation supervisor, and the rest.

On Linux you'll also need these build dependencies:

- libclang (for bindgen) — `sudo apt install libclang-dev` on debian/ubuntu
- gssapi (for kerberos) — `sudo apt install libkrb5-dev` on debian/ubuntu

## One-Shot Install

```
netidx admin workstation install --with-service
```

This drops a local-auth resolver listening on `127.0.0.1:4654`, a
matching `client.json`, a `perms.json` granting your current Unix
user full rights under `/local`, and activation units for the
resolver and the netidx container, then registers the OS service. For an
interactive install, run bare `netidx admin`, choose Workstation, and answer
the service question in the TUI. If you initially skip it, register later with
`netidx admin component service install` (see its `--help` for user/system
scope).

If port 4654 is busy use `--listen-port <n>` to pick a different one.
`--dry-run` prints the plan and writes nothing. The full surface
including the network-resolver and publisher-host templates is in
the [netidx admin](./administration/admin.md) chapter.

> **Note**: local-auth uses a Unix-socket peer-credentials handshake
> and isn't supported on Windows. For Windows workstations use
> join a TLS or Kerberos network through the `netidx admin` TUI instead.

## Smoke Test

Publish 10,000 dummy values from one shell:

```
netidx stress publisher --base /local/bench --delay 1000 1000 10
```

This writes `/local/bench/$r/$c` for `r` in `0..1000` and `c` in
`0..10` — 1000 rows × 10 columns — and updates each value once a
second (`--delay` is in milliseconds).

In another shell, look at one cell:

```
netidx subscriber /local/bench/0/0
```

You should see one line per second like

```
/local/bench/0/0|v64|N
```

with `N` incrementing. If that works, your workstation is set up. If
not, run both commands again with `RUST_LOG=debug` — that usually
points at the problem.

The subscriber doesn't need `-a local` because the workstation's
`client.json` has `default_auth: local` already. Other commands
(`netidx resolver list`, `netidx browser`, etc.) inherit the same
default.

### MacOS and Windows config paths

`netidx admin workstation install` writes to the platform-default
config directory. The paths above use the Linux convention
(`~/.config/netidx/…`); the equivalents on other platforms are:

- MacOS: `~/Library/Application Support/netidx/`
- Windows: `~\AppData\Roaming\netidx\` (i.e. `{FOLDERID_RoamingAppData}\netidx`)

## Optional GUI Browser

The netidx browser is an optional GTK-based GUI for navigating the
netidx tree. To build it you need GTK development files installed:

```
sudo apt install libgtk-3-dev libgtksourceview-4-dev
```

then

```
cargo install netidx-browser
```

A TUI browser is also built into `netidx-tools` — run `netidx browser`
for a terminal-based view of the namespace.
