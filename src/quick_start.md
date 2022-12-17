# Quick Start for Linux

In this quick start we will set up a Netidx resolver server and
related tools on your local machine. This configuration is sufficient
for doing development of netidx services and for trying out various
publishers, subscribers, and tools without much setup.

## First Install Rust and Netidx

Install [rust](https://www.rust-lang.org/tools/install) via rustup if
you haven't already. Ensure cargo is in your and then run,

`cargo install netidx-tools`

This will build and install the `netidx` command, which contains all
the built in command line tools necessary to run to the resolver
server, as well as the publisher/subscriber command line tools

You will need some build dependencies,

- libclang, necessary for bindgen, on debian/ubuntu `sudo apt install libclang-dev`
- gssapi, necessary for kerberos support, on debian/ubuntu `sudo apt install libkrb5-dev`

## Resolver Server Configuration

``` json
{
  "parent": null,
  "children": [],
  "member_servers": [
    {
      "pid_file": "",
      "addr": "127.0.0.1:4564",
      "max_connections": 768,
      "hello_timeout": 10,
      "reader_ttl": 60,
      "writer_ttl": 120,
      "auth": {
        "Local": "/tmp/netidx-auth"
      }
    }
  ],
  "perms": {
    "/": {
      "wheel": "swlpd",
      "adm": "swlpd",
      "domain users": "sl"
    }
  }
}
```

Install the above config in
`~/.config/netidx/netidx-resolver.json`. This is the config for the
local resolver on your machine. Make sure port 4564 is free, or change
it to a free port of your choosing. If necessary you can change the
local auth socket to one of your choosing.

run `netidx resolver-server -c
~/.config/netidx/netidx-resolver.json`. This command will return
immediatly, and the resolver server will daemonize. Check that it's
running using `ps auxwww | grep netidx`.

### Systemd

If desired you can start the resolver server automatically with systemd. 

```
[Unit]
Description=Netidx Activation

[Service]
ExecStart=/home/eric/.cargo/bin/netidx resolver-server -c /home/eric/.config/netidx-resolver.json -f

[Install]
WantedBy=default.target
```

Modify this example systemd unit to match your configuration and then
install it in `~/.config/systemd/user/netidx.service`. Then you can run

`systemctl --user enable netidx`

and

`systemctl --user start netidx`

## Client Configuration

``` json
{
    "addrs":
    [
        ["127.0.0.1:4564", {"Local": "/tmp/netidx-auth"}]
    ],
    "base": "/"
}
```

Install the above config in `~/.config/netidx/client.json`. This is
the config all netidx clients (publishers and subscribers) will use to
connect to the resolver cluster.

- On Mac OS replace `~/.config/netidx` with `~/Library/Application Support`.
- On Windows replace `~/.config/netidx` with `~\AppData\Roaming`
  (that's `{FOLDERID_RoamingAppData}`)

To test the configuration run,

`netidx stress -a local publisher -b 127.0.0.1/0 --delay 1000 1000 10`

This will publish 10,000 items following the pattern `/bench/$r/$c`
where `$r` is a row number and `$c` is a column
number. e.g. `/bench/100/8` corresponds to row 100 column 8. The
browser will draw this as a table with 1000 rows and 10 columns,
however for this test we will use the command line subscriber to look
at one cell in the table.

`netidx subscriber -a local /bench/0/0`

should print out one line like this every second

`/bench/0/0|v64|1`

The final number should increment, and if that works then netidx is
set up on your local machine. If it didn't work, try setting the
environment variable `RUST_LOG=debug` and running the stress publisher
and the subscriber again.

## Optional Netidx Browser

The browser is an optional gui browser for the netidx tree, you need
  gtk development files installed to build it, on debian/ubuntu add those with 

`sudo apt install libgtk-3-dev`

and then

`cargo install netidx-browser`
