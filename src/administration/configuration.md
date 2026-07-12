## Resolver Server Configuration

Each resolver member reads a configuration describing the hierarchy and the
addresses it advertises to clients. The file may list several cluster members,
in which case startup selects this process's zero-based index; the default is
0. Listing every member is a client-configuration convenience, not a resolver
protocol requirement. Resolver members do not talk to or replicate to one
another, and a valid member-local file may list only that member.

> For most installs you should not hand-write this file —
> `netidx admin <role> install` generates a self-consistent one, and
> `netidx admin component resolver edit` (and the field-specific editors under
> `netidx admin component perms`, `netidx admin component activation`, …)
> maintain it
> against the live schema. The section below documents the schema for
> the cases where you do need to look at the raw JSON: debugging a
> hand-rolled config, integrating with deployment tooling, or
> understanding what the installer produced.

Here is an example config file for a resolver cluster that lives in
the middle of a three level hierarchy. Above it is the root server, it
is responsible for the /app subtree, and it delegates /app/huge0 and
/app/huge1 to child servers.

``` json
{
  "parent": {
    "path": "/app",
    "ttl": 3600,
    "addrs": [
      [
        "192.168.0.1:4654",
        {
          "Krb5": "root/server@YOUR-DOMAIN"
        }
      ]
    ]
  },
  "children": [
    {
      "path": "/app/huge0",
      "ttl": 3600,
      "addrs": [
        [
          "192.168.0.2:4654",
          {
            "Krb5": "huge0/server@YOUR-DOMAIN"
          }
        ]
      ]
    },
    {
      "path": "/app/huge1",
      "ttl": 3600,
      "addrs": [
        [
          "192.168.0.3:4654",
          {
            "Krb5": "huge1/server@YOUR-DOMAIN"
          }
        ]
      ]
    }
  ],
  "member_servers": [
    {
      "pid_file": "/var/run/netidx",
      "addr": "192.168.0.4:4654",
      "max_connections": 768,
      "hello_timeout": 10,
      "reader_ttl": 60,
      "writer_ttl": 120,
      "auth": {
        "Krb5": "app/server@YOUR-DOMAIN"
      }
    }
  ],
  "perms": {
    "/app": {
      "wheel": "swlpd",
      "adm": "swlpd",
      "domain users": "sl"
    }
  }
}
```

### parent

This section is either null if the cluster has no parent, or a record
specfying

- path: The path where this cluster attaches to the parent. For
  example a query for something in /tmp would result in a referral to
  the parent in the above example, because /tmp is not a child of
  /app, so this cluster isn't authoratative for /tmp. It's entirely
  posible that the parent isn't authoratative for /tmp either, in
  which case the client would get another referral upon querying the
  parent. This chain of referrals can continue until a maximum number
  is reached (to prevent infinite cycles).

- ttl: How long, in seconds, clients should cache this parent. If for
  example you reconfigured it to point to another IP, clients might
  still try to go to the old ip for as long as the ttl.

- addrs: The addresses of the servers in the parent cluster. This is a
  list of pairs of ip:port and auth mechanism. The authentication
  mechanism of the parent may not be Local, it must be either
  Anonymous or Krb5. In the case of Krb5 you must include the server's
  spn.

### children

This section contains a list of child clusters. The format of each
child is exactly the same as the parent section. The path field is the
location the child attaches in the tree, any query at or below that
path will be referred to the child.

### member_servers

This section is a list of all the servers in this cluster. The fields
on each server are,

- id_map_type / id_map_command / id_map_timeout: how the resolver
  translates a netidx principal name to a unix-style (uid, primary
  gid, supplementary groups) tuple for the permission lookup.
  
  `id_map_type` is one of:
  
  - `Command` (default): exec a `/bin/id`-compatible program and
    parse its output. `id_map_command` is the path to the program
    (default: the platform `/bin/id`). The program is invoked with
    the principal name as a single argument — e.g.
    `eric@RYU-OH.ORG` for Kerberos, `eric` for local auth, or the
    DNS SAN for TLS. The output format must match `/bin/id`'s
    (`uid=N(name) gid=M(primary) groups=...`).
  - `Socket`: connect to a unix-socket daemon at `id_map_command`
    and run the same `/bin/id`-style query over the socket. This is
    the recommended path for TLS deployments — see the
    [id-map daemon](./id_map.md) chapter, which the installer wires
    up automatically.
  - `DoNotMap`: skip lookup entirely. Every caller is treated as
    the bare name with no groups. Useful when permissions are
    indexed only by exact principal name.
  
  `id_map_timeout` (default 3600 s) is how long the resolver caches
  a successful lookup per caller before re-querying.

- pid_file: path of the pid file written when the resolver
  daemonises (i.e. when started without `-f`). The member-server
  index is set as the file extension, so a `pid_file` of
  `/var/run/netidx` becomes `/var/run/netidx.0` for server 0,
  `/var/run/netidx.1` for server 1, etc. Default is empty —
  daemonisation without an explicit pid file is rare in practice
  because the activation supervisor runs the resolver in the
  foreground.

- addr: The socket address and port that this member server will report
  to clients. This should be it's public ip, the ip clients use to connect
  to it from the outside. Must be a concrete address — using `0.0.0.0`
  here is rejected at config-load time because that's an instruction
  to *bind*, not an advertisable address.

- bind_addr: The socket address that the server will actually bind to on
  the local machine. Defaults to the IP from `addr`. Set this when the
  server is behind a NAT or has multiple interfaces and you want it to
  bind to a specific private address while advertising the public one.
  `0.0.0.0` is permitted *here* (it means listen on every interface).

  For `Local` auth, both `addr` and `bind_addr` must be loopback —
  mixing loopback with non-loopback addresses is rejected.

- max_connections: The maximum number of simultaneous client
  connections that this server will allow. Client connections in
  excess of this number will be accepted and immediatly closed (so
  they can hopefully try another server).

- hello_timeout: The maximum time, in seconds, that the server will
  wait for a client to complete the initial handshake
  process. Connections that take longer than this to handshake will be
  closed.
  
- reader_ttl: The maximum time, in seconds, that the server will retain
  an idle read connection. Idle read connections older than this will
  be closed.
  
- writer_ttl: The maximum time, in seconds, that the server will
  retain an idle write connection. Idle connections older than this
  will be closed, and all associated published data will be
  cleared. Publishers autoatically set their heartbeat interval to
  half this value. This is the maximum amount of time data from a dead
  publisher will remain in the resolver.

- auth: The authentication mechanism used by this server. One of
  Anonymous, Local, Krb5, or Tls. Local must include the path to the local
  auth socket file that will be used to verify the identity of
  clients. Krb5 must include the server's spn. Tls must include the
  server's expected name, the path to the trusted-CA bundle, the
  server's leaf certificate, and the path to the server's private
  key. For example,

  ``` json
  "Tls": {
      "name": "resolver.architect.com",
      "trusted": "trusted.pem",
      "certificate": "cert.pem",
      "private_key": "private.key"
  }
  ```

  The certificate's *subjectAltName* (not the CN) must include
  `resolver.architect.com`. Keys may be encrypted — at startup
  netidx asks once via askpass (typically `ssh-askpass`) and then
  stashes the password in the system keychain for subsequent runs.

### perms / include_permissions

The server permissions map. Covered in detail in the [Authorization]
(./authorization.md) chapter. If a member server's auth mechanism is
Anonymous, this map is ignored.

For installs where perms live in their own file (the default that
`netidx admin resolver install` lays down, for example), the resolver config
references it via `include_permissions: "<path>"`. The referenced
file is merged in at load time and re-loaded on `SIGHUP`, so perms
can be reshuffled without restarting the resolver.

## Client Configuration

Netidx clients such as publishers and subscribers try to load their
configuration files from the following places in order.

- $NETIDX_CFG
- config_dir:
  - on Linux: ~/.config/netidx/client.json
  - on Windows: ~\AppData\Roaming\netidx\client.json
  - on MacOS: ~/Library/Application Support/netidx/client.json
- global_dir
  - on Linux: /etc/netidx/client.json
  - on Windows: C:\netidx\client.json
  - on MacOS: /etc/netidx/client.json

Since the dirs crate is used to discover these paths, they are locally
configurable by OS specific means.

### Example

``` json
{
    "addrs":
    [
        ["192.168.0.1:4654", {"Krb5": "root/server@YOUR-DOMAIN"}]
    ],
    "base": "/"
}
```

#### addrs

A list of pairs or ip:port and auth mechanism for each server in the
cluster. Local should include the path to the local authentication
socket file. Krb5 should include the server's spn.

#### base

The base path *this* cluster attaches at in the tree. For a root
resolver this is `/`; for a non-root cluster it's the path under
which this cluster's namespace lives (e.g. `/local` for the
workstation template). Defaults to `/`.

#### default_auth

Optional. The authentication mechanism used when a CLI tool doesn't
specify `-a` / `--auth`. One of `Anonymous`, `Local`, `Krb5`, or
`Tls`. Defaults to `Krb5`. `netidx admin <role> install` writes a value
that matches the resolver's chosen auth (e.g. `Local` for the
workstation template, `Tls` for a TLS install) so the user rarely
has to pass `-a` by hand.

#### tls

This is required only if using tls. Because netidx is a 
distributed system, when in tls mode a subscriber may need to interact
with different organizations that don't necessarially trust each other enough
to share a certificate authority. That is why subscribers may be configured
with multiple identities. When connecting to another netidx entity a
subscriber will pick the identity that most closely matches the domain
of that entity. For example, in the below config, when connecting to 
`resolver.footraders.com` the client will use the `footraders.com` identity.
When connecting to `core.architect.com` it will choose the `architect.com`
identity. When connecting to `a-feed.marketdata.architect.com` it would
choose the `marketdata.architect.com` identity.
 
When publishing, the default identity is used unless another identity is
specified to the publisher.
 
``` json
"tls": {
    "default_identity": "footraders.com",
    "askpass": "/usr/bin/ssh-askpass",
    "identities": {
        "footraders.com": {
            "trusted": "/home/joe/.config/netidx/footradersca.pem",
            "certificate": "/home/joe/.config/netidx/footraders.crt",
            "private_key": "/home/joe/.config/netidx/footraders.key"
        },
        "architect.com": {
            "trusted": "/home/joe/.config/netidx/architectca.pem",
            "certificate": "/home/joe/.config/netidx/architect.crt",
            "private_key": "/home/joe/.config/netidx/architect.key"
        },
        "marketdata.architect.com": {
            "trusted": "/home/joe/.config/netidx/architectca.pem",
            "certificate": "/home/joe/.config/netidx/architectmd.crt",
            "private_key": "/home/joe/.config/netidx/architectmd.key"
        }
    }
}
```

`default_identity` is optional when exactly one identity is
configured — netidx auto-derives it. `askpass` is the command
netidx invokes when one of the configured private keys is
encrypted; the installer auto-discovers `ssh-askpass` and sets
this for you when you opt into a password during the initial
prompt. After the first successful unlock the password is stashed
in the system keychain, keyed by the on-disk key path, so
subsequent runs don't prompt.
