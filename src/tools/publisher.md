# Command Line Publisher

The command line publisher allows you to publish values to netidx from
stdin. The format of a published value is pipe separated, and newline
delimited. e.g.

`/foo/bar|u32|42`

The three fields are,
- The path
- The type
- The value

or the special form

- The path
- `null`

or the special form

- DROP
- the path

e.g. `DROP|/foo/bar` stops publishing `/foo/bar`

or the special form

- WRITE
- the path

e.g. `WRITE|/foo/bar`

enables writing to `/foo/bar`, and publishes it as `null` if it was
not already published. Written values will be sent to stdout in the
same format as is written by subscriber.

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
    - local, selects 127.0.0.1/24
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
      but will advertise it's address to the resolver as 54.32.223.1.
    - 54.32.224.1:5001@172.31.23.234:5001 will bind to 172.31.23.234 on port 5001
      but will advertise it's address to the resolver as 54.32.224.1:5001. This
      would correspond to a typical single port forward NAT situation.
 - `-a, --auth`: optional, specifies the authentication mechanism,
  anonymous, local, or krb5.
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

The following types are supported,
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
  - `array`: an array of netidx values, consuming 1+zlen(array)+sum(len(elts))
  - `result`: OK, or Error + string, consuming 1-1+string length bytes
