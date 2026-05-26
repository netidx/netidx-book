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
resolver server, the publisher and subscriber CLIs, the conf tooling,
the id-map daemon, the activation supervisor, and the rest.

On Linux you'll also need these build dependencies:

- libclang (for bindgen) — `sudo apt install libclang-dev` on debian/ubuntu
- gssapi (for kerberos) — `sudo apt install libkrb5-dev` on debian/ubuntu

## One-Shot Install

```
netidx conf install workstation
```

This drops a local-auth resolver listening on `127.0.0.1:4654`, a
matching `client.json`, a `perms.json` granting your current Unix
user full rights under `/local`, and activation units for the
resolver and the netidx container. On a TTY it prompts to register
netidx as an OS service; say yes and the install is complete — the
resolver is already running and will start on boot. If you said no,
you can register the service later with `netidx conf service install`
(user scope) or `netidx conf service install --scope system`
(system-wide).

If port 4654 is busy use `--listen-port <n>` to pick a different one.
`--dry-run` prints the plan and writes nothing. The full surface
including the network-resolver and publisher-host templates is in
the [Configuration Tooling](./administration/conf.md) chapter.

> **Note**: local-auth uses a Unix-socket peer-credentials handshake
> and isn't supported on Windows. For Windows workstations use
> `netidx conf install resolver --auth tls` (or `--auth krb5`) instead.

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

`netidx conf install workstation` writes to the platform-default
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
