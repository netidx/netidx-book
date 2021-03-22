## Configuration

The netidx configuration file is the same for all the different
components of the system, resolver, publisher, and subscriber. By
default it is stored,

- on Linux: ~/.config/netidx.json
- on Windows: ~\AppData\Roaming\netidx.json
- on MacOS: ~/Library/Application Support/netidx.json

Since the dirs crate is used to discover these paths, they are locally
configurable by OS specific means. Everyone who will use netidx needs
access to this file.

``` json
{
    "parent": null,
    "children": [],
    "pid_file": "",
    "addrs": ["192.168.0.1:4564"],
    "max_connections": 768,
    "hello_timeout": 10,
    "reader_ttl": 60,
    "writer_ttl": 120,
    "auth": {
        "Krb5": {"192.168.0.1:4564": "netidx/washu-chan.ryu-oh.org@RYU-OH.ORG"}
    }
}
```

Here's about the simplest possible Kerberos enabled
configuration. I'll go through each field,

- parent: null unless this server has a parent
- children: empty unless this server has children
- pid_file: prefix to add to the pid file which will otherwise be
  e.g. 0.pid for the first server in the cluster, or 1.pid for the
  second, etc.
- addrs: The list of all resolver servers in this level of the
  cluster, e.g. not children or parents, just this level. When
  starting the server you must pass in an index into this array on the
  command line as --id to identify which server you want to start.
- max_connections: The maximum number of simultaneous connections to
  allow (both read and write) before starting to reject new
  connections.
- hello_timeout: The amount of time to wait for a client to say a
  proper hello before dropping the connection.
- reader_ttl: The amount of time, in seconds, to keep an idle read
  connection open.
- writer_ttl: The amount of time, in seconds, to wait for a publisher
  to heartbeat before deleting everything it has published. The
  publisher will send heartbeats at 1/2 this interval. e.g. 120 means
  publishers will heartbeat every minute.
- auth: either "Anonymous", or "Krb5". If "Krb5", then a service
  principal name should be included for every resolver server in the
  cluster. Each resolver server instance must have access to the
  corresponding SPN's key via a keytab or other means, and of course
  you must create the corresponding service principal for each
  instance.

If you're using Kerberos then you also need a permissions file, which
is covered in the next section.
