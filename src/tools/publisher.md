# Command Line Publisher

The command line publisher allows you to publish values to netidx from
stdin. The format of a published value is pipe separated, and newline
delimited. e.g.

`/foo/bar|u32|42`

The three fields are,
- The path
- The type
- The value

To publish a null value use `PATH|null|null` — every regular line is
always three fields. Two special two-field directives exist for
control:

- DROP
- the path

e.g. `DROP|/foo/bar` stops publishing `/foo/bar`

or the special form

- WRITE
- the path

e.g. `WRITE|/foo/bar`

enables writing to `/foo/bar`, and publishes it as `null` if it was
not already published. Each accepted write is sent to stdout as
`PATH|VALUE`, where `VALUE` uses netidx's self-describing value syntax (for
example `/foo/bar|u32:42`). This two-field write-notification format is
different from the subscriber's three-field `PATH|TYPE|VALUE` output.

If you want to publish to a path that has a `|` character in it then
you must escape the `|` with `\`, e.g. `\|`. If you want to publish a
path that has a `\` in it, then you must also escape it,
e.g. `\\`. e.g.

`/this/path/has\|pipes\|and\\in-it|string|pipe and backslash everywhere`

## Arguments

There are several command line options to the `netidx publisher` command,

- `-b, --bind`: optional, specify the network address to bind to. This can
  be specified in three forms.
  - an expression consisting of an ip/netmask that must match a unique
    network interface on the machine running the publisher. This is
    prefered, e.g.
    - local, selects loopback (127.0.0.1)
    - 10.0.0.0/8 selects the interface bound to a 10.x.x.x address
    - 192.168.0.0/16 selects the interface bound to a 192.168.x.x address
    - The publisher will choose a free port automatically starting at 5000
  - if you must specify an exact address and port e.g.
    - 127.0.0.1:5000
    - 127.0.0.1:0, in which case the OS will choose the port at
      random, depending on the OS/libc this may pick an ephemeral
      port, so be careful.
  - a public ip followed by the first or second forms for the internal bind ip. 
    Use this if you are running publishers behind a NAT (e.g. aws elastic ips)
    - 54.32.223.1@172.31.0.0/16 will bind to any interface matching 172.31.0.0,
      but will advertise it's address to the resolver as 54.32.223.1.
    - 54.32.224.1@0.0.0.0/32 will bind to every interface on the local machine
      but will advertise its address to the resolver as 54.32.224.1.
    - 54.32.224.1:5001@172.31.23.234:5001 will bind to 172.31.23.234 on port 5001
      but will advertise it's address to the resolver as 54.32.224.1:5001. This
      would correspond to a typical single port forward NAT situation.
- `-c, --config <path>`: optional, alternate client config path
  (overrides the auto-discovered `client.json`).
- `-a, --auth`: optional, specifies the authentication mechanism —
  `anonymous`, `local`, `krb5`, or `tls`. Defaults to the
  `default_auth` setting in the client config.
- `--spn`: optional, required if -a krb5, the service principal name
  the publisher should run as. This principal must have permission to
  publish where you plan to publish, must exist in your krb5
  infrastructure, and you must have access to a keytab with it's
  credentials. If that keytab is in a non standard location then you
  must set the environment variable
  `KRB5_KTNAME=FILE:/the/path/to/the/keytab`
- `--upn`: optional, if you want to authenticate the publisher to the
  resolver server as a prinicpal other than the logged in user then
  you can specify that principal here. You must have a TGT for the
  specified principal.
- `--identity`: optional, the tls identity to use for publishing.
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

The command line publisher cannot be a default publisher.

## Environment Variables

In addition to all the krb5 environment variables, the command line
publisher uses envlogger, and so will respond to `RUST_LOG`,
e.g. `RUST_LOG=debug` will cause the publisher to print debug and
higher priority messages to stderr.

## Types

The following types are supported. Every value has a one-byte type tag in
addition to the payload sizes described below.

  - `u8`, `i8`: 8 bit unsigned / signed integer, 1-byte payload
  - `u16`, `i16`: 16 bit unsigned / signed integer, 2-byte payload
  - `u32`: unsigned 32 bit integer, 4-byte payload
  - `v32`: unsigned 32 bit integer [LEB128 encoded](https://en.wikipedia.org/wiki/LEB128), 1–5 byte payload depending on magnitude
  - `i32`: signed 32 bit integer, 4-byte payload
  - `z32`: signed 32 bit integer, zigzag + LEB128 encoded, 1–5 byte payload
  - `u64`: unsigned 64 bit integer, 8-byte payload
  - `v64`: unsigned 64 bit integer, LEB128 encoded, 1–10 byte payload
  - `i64`: signed 64 bit integer, 8-byte payload
  - `z64`: signed 64 bit integer, zigzag + LEB128 encoded, 1–10 byte payload
  - `f32`: 32 bit single precision floating point number, 4-byte payload
  - `f64`: 64 bit double precision floating point number, 8-byte payload
  - `decimal`: a 128-bit fixed-point decimal, useful when binary
    floating-point rounding is unacceptable (financial data and accounting),
    with a 16-byte payload
  - `datetime`: a date + time encoded as an i64 timestamp representing
    the number of seconds since jan 1 1970 UTC and a u32 number of sub
    second nanoseconds fixing the exact point in time; 12-byte payload
  - `duration`: a duration encoded as a u64 number of seconds plus a u32
    number of sub second nanoseconds; 12-byte payload
  - `bool`: true or false; the tag itself carries the value, so there is no payload
  - `string`: a Unicode string, encoded as a LEB128 byte length followed by UTF-8 bytes
  - `bytes`: a byte array, encoded as a LEB128 length followed by its bytes
  - `array`: an array of netidx values, with a LEB128 element count followed by the values
  - `map`: a map of netidx values to netidx values, consuming
    a LEB128 entry count followed by each key and value
  - `error`: an error value wrapping any other value (typically a
    string with diagnostic text)
  - `null`: the literal `null`. Use `PATH|null|null` to publish a
    null value.
  - `abstract`: a user-defined type registered via the abstract-type
    registry; rarely used from the CLI publisher
