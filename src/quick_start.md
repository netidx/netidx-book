# Quick Start for Linux

Install [rust](https://www.rust-lang.org/tools/install) via rustup if
you haven't already. Ensure `~/.cargo/bin` is in your PATH.

`cargo install netidx-tools`

This will build and install the `netidx` command, which contains all
the built in command line tools necessary to run to the resolver
server, as well as the publisher/subscriber command line tools

```
{
    "parent": null,
    "children": [],
    "pid_file": "",
    "addrs": ["127.0.0.1:4564"],
    "max_connections": 512,
    "hello_timeout": 10,
    "reader_ttl": 60,
    "writer_ttl": 120,
    "auth": "Anonymous"
}
```

Install the above config in `~/.config/netidx.json`. This config will
only allow communication on your local machine. Make sure port 4564 is
free, or change it to a free port of your choosing.

run `netidx resolver-server`. This command will return immediatly, and
the resolver server will daemonize. Check that it's running using `ps
auxwww | grep netidx`.

To test the configuration run,

`netidx stress publisher --bind 127.0.0.1/0 --delay 1000 1000 10`

This will publish 10,000 items following the pattern `/bench/$r/$c`
where `$r` is a row number and `$c` is a column
number. e.g. `/bench/100/8` corresponds to row 100 column 8. The
browser will draw this as a table with 1000 rows and 10 columns,
however for this test we will use the command line subscriber to look
at one cell in the table.

`netidx subscriber /bench/0/0`

should print out one line like this every second

`/bench/0/0|v64|1`

The final number should increment, and if that works then netidx is
set up on your local machine. If it didn't work, try setting the
environment variable `RUST_LOG=debug` and running the stress publisher
and the subscriber again.
