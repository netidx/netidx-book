# Command Line Publisher

The command line publisher allows you to publish values to netidx from
stdin. The format of a published value is pipe separated, and newline
delimited. It has 3 fields,

- The path
- The type which is one of,
  - `u32`: unsigned 32 bit integer, 4 bytes on the wire
  - `v32`: unsigned 32 bit integer [LEB128 encoded](https://en.wikipedia.org/wiki/LEB128), 1-5 bytes on the wire depending on how big the number is. e.g. 0-128 is just 1 byte
  - `i32`: signed 32 bit integer, 4 bytes on the wire
  - `z32`: signed 32 bit integer [LEB128 encoded](https://en.wikipedia.org/wiki/LEB128) 1-5 bytes on the wire
  - `u64`: unsigned 64 bit integer, 8 bytes on the wire
  - `v64`: unsigned 64 bit integer [LEB128 encoded](https://en.wikipedia.org/wiki/LEB128), 1-10 bytes on the wire
  - `i64`: signed 64 bit integer, 8 bytes on the wire
  - `z64`: signed 64 bit integer [LEB128 encoded](https://en.wikipedia.org/wiki/LEB128), 1-10 bytes on the wire
  - `f32`: 32 bit single precision floating point number, 4 bytes on the wire
  - `f64`: 64 bit double precision floating point number, 8 bytes on the wire
  - `datetime`: a date + time encoded as an i64 timestamp representing
    the number of seconds since jan 1 1970 UTC and a u32 number of sub
    second nanoseconds fixing the exact point in time. 12 bytes on the
    wire
  - `duration`: a duration encoded as a u64 number of seconds plus a u32
    number of sub second nanoseconds fixing the exact duration. 12 bytes on the wire
  - `bool`: true, or false. 1 byte on the wire
  - `string`: a unicode string, limited to 1 GB in length. Consuming 1-10 + number of bytes in the string on the wire (the length is LEB128 encoded)
  - `bytes`: a byte array, limited to 1 GB in length, Consuming 1-10 + number of bytes in the array on the wire
  - `result`: OK, or Error + string, consuming 1-1+string length bytes
- The value

or the special form

- The path
- `null`

For example `/the/path/to/the/thing|u32|42`. If you want to publish to
a path that has a `|` character in it then you must escape the `|`
with `\`, e.g. `\|`. If you want to publish a path that has a `\` in
it, then you must also escape it, e.g. `\\`.

## Arguments

There are several command line options to the `netidx publisher` command,

- `--bind`: required, specify the network address to bind to. This can
  be specified in two forms.
  - an exact address and port e.g.
    - 127.0.0.1:5000
    - 127.0.0.1:0, in which case the OS will choose the port at random
  - an expression consisting of an ip/netmask that must match a unique
    network interface on the machine running the publisher. e.g.
    - 127.0.0.0/24 selects the `lo` interface
    - 10.0.0.0/8 selects the interface bound to a 10.x.x.x address
    - 192.168.0.0/16 selects the interface bound to a 192.168.x.x address
- `--spn`: optional, required if using krb5, the service principal
  name the publisher should run as. This principal must have
  permission to publish where you plan to publish, must exist in your
  krb5 infrastructure, and you must have access to a keytab with it's
  credentials. If that keytab is in a non standard location then you
  must set the environment variable
  `KRB5_KTNAME=FILE:/the/path/to/the/keytab`
- `--timeout <seconds>`: optional, if specified requires subscribers
  to consume published values within the specified number of seconds
  or be disconnected. By default the publisher will wait forever for a
  subscriber to consume an update, and as a result could consume an
  unbounded amount of memory.

## Behavior

When started the publisher runs until killed, it reads lines from
stdin as long as stdin remains open, and attempts to parse them as
`PATH|TYPE|VALUE` triples. If parsing fails, it prints an error to
stderr and continues reading. If parsing succeeds it checks if it has
already published `PATH`, if not, it publishes it with the specified
type and value, if it has, then it updates the existing published
value. It is not an error to change the type of an existing published
value. If stdin is closed publisher does not stop, however it is no
longer possible to update existing published values, or publish new
values without restarting it.

## Limitations

The command line publisher cannot respond to write requests, and
cannot be a default publisher.

## Environment Variables

In addition to all the krb5 environment variables, the command line
publisher uses envlogger, and so will respond to `RUST_LOG`,
e.g. `RUST_LOG=debug` will cause the publisher to print debug and
higher priority messages to stderr.
