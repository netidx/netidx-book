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
  Anonymous, Local, or Krb5. Local must include the path to the local
  auth socket file that will be used to verify the identity of
  clients. Krb5 must include the server's spn.

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
