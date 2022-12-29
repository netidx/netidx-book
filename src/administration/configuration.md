## Resolver Server Configuration

Each resolver server cluster shares a configuration file. At startup
time each member server is told it's zero based index in the list of
member servers. Since the default is 0 the argument can be omitted if
there is only one server in the cluster.

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
      "addr": "192.168.0.4:4564",
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

- id_map_command: Optional. The path to the command the server should run
  in order to map a user name to a user and a set of groups that user is
  a member of. Default is `/usr/bin/id`. If a custom command is specified
  then it's output MUST be in the same format as the `/usr/bin/id` command.
  This command will be passed the name of the user as a single argument.
  Depending on the auth mechanism this "name" could be e.g. `eric@RYU-OH.ORG` for
  kerberos, just `eric` for local auth, or `eric.users.architect.com` for
  tls auth (it will pass the common name of the users' certificate)

- pid_file: the path to the pid file you want the server to write. The
  server id folowed by .pid will be appended to whatever is in this
  field. So server 0 in the above example will write it's pid to
  /var/run/netidx0.pid

- addr: The socket address and port that this member server should
  bind to.
  
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
  domain name of the server, the path to the trusted certificates, 
  the server's certificate (it's CN must match the domain name), 
  and the path to the server's private key. For example,
  
  ``` json
  "Tls": {
      "name": "resolver.architect.com",
      "trusted": "trusted.pem",
      "certificate": "cert.pem",
      "private_key": "private.key"
  }
  ```
  
  The certificate `CN` must be `resolver.architect.com`. The
  may not be encrypted.

### perms

The server perissions map. This will be covered in detail in the
authorization chapter. If a member server's auth mechanism is
anonymous, then this is ignored.

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
  - on MacOS: /etc/netix/client.json

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

The base path of this server cluster in the tree. This should
correspond to the server cluster's parent, or "/" if it's parent is
null.

#### default_auth

Optional. Specify the default authentication mechanism. May be one of
`Anonymous`, `Local`, `Krb5`, or `Tls`

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