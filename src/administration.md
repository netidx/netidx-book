# Administration

## First Things First

If you plan to use Kerberos make sure you have it set up properly,
including your KDC, DNS, DHCP, etc. If you need help with kerberos I
suggest [the O'rielly book](https://www.oreilly.com/library/view/kerberos-the-definitive/0596004036/).

Problems with Kerberos/GSSAPI can often be diagnosed by setting
`KRB5_TRACE=/dev/stderr`, and/or `RUST_LOG=debug`. GSSAPI errors can
sometimes be less than helpful, but usually the KRB5_TRACE is more
informative.

## Resources and Gotchas

Most installations need not devote massive resources to the resolver
server, however you may want to use at least two instances on
different machines or VMs for redundancy. Here are a few rules of
thumb.

- Expect to use 1 GB of ram for every 1 million published values
- Read operations will use multiple CPU cores (1 core per client)
- Write operations use only 1 core and lock out reads (but take on the
  order of 100 ns. Work is planned to use all cores and reduce locking.)
- Be mindful of the maximum number of available file descriptors when
  setting max_connections.

If you have, for example, a publisher that wants to publish 20 million
names all at once then you may want to segment that off onto a child
cluster (we'll get to how to do that) to prevent it from locking out
reads for everyone on the main cluster for several minutes (Work is
planned to make this problem better in the resolver server, but it can
never be totally eliminated). A better strategy would be to not write
such a publisher in the first place.

The resolver server drops idle read client connections fairly quickly
(configurable, recommended default 60 seconds), however if you have
many thousands or tens of thousands of read clients that want to do a
lot of reading simultaneously then you may need to raise the maximum
number of file descriptors available, and/or deploy additional
processes to avoid file descriptor exhaustion.

As of this writing the resolver server only runs on Unix, and has only
been extensively tested on Linux. There's no reason it couldn't run on
Windows, it's just a matter of some work around group name resolution
and service integration.

## Simple Example Configuration

The netidx configuration file is the same for all the different
components of the system, resolver, publisher, and subscriber. By
default it is stored,

- on Linux: ~/.config/netidx.json
- on Windows: ~\AppData\Roaming\netidx.json
- on MacOs: ~/Library/Application Support/netidx.json

Since the dirs crate is used to discover these paths, they are locally
configurable by OS specific means. 

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

- parent: null unless this server has a parent, which I'll document later
- children: empty unless this server has children, which I'll document later
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
  publishers will heartbeat every minute. Processing a heartbeat does
  not take the write lock.
- auth: either "Anonymous", or "Krb5". If "Krb5", then a service
  principal name should be included for every resolver server in the
  cluster. Each resolver server instance must have access to the
  corresponding SPN's key via a keytab or other means.

When using Kerberos we also need a permissions file in order to run a
resolver server, it's a separate file because it's not meant to be
shared with everyone using the cluster.

``` json
{
    "/": {
        "eric@RYU-OH.ORG": "swlpd"
    },
    "/solar": {
	    "svc_solar@RYU-OH.ORG": "pd"
    }
}
```

In order to do the corresponding action in netidx a user must have
that permission bit set, no bit, no action.

Permission bits are computed starting from the root proceeding down
the tree to the node being acted on. The bits are accumulated on the
way down, and can also be removed at any point in the tree. Each bit
is represented by a 1 character symbolic tag, e.g.

- !: Deny, changes the meaning of the following bits to deny the
  corresponding permission instead of grant it. Must be the first
  character of the permission string.
- s: Subscribe
- w: Write
- l: List
- p: Publish
- d: Publish default

For example if I was subscribing to
`/solar/stats/battery_sense_voltage` we would walk down the path from
left to right and hit this permission first,

``` json
"/": {
    "eric@RYU-OH.ORG": "swlpd"
},
```

This applies to a Kerberos principal "eric@RYU-OH.ORG", the resolver
server will check the user principal name of the user making the
request, and it will check all the groups that user is a member of,
and if any of those are "eric@RYU-OH.ORG" then it will `or` the
current permission set with "swlpd". In this case this gives me
permission to do anything I want in the whole tree (unless it is later
denied). Next we would hit,

``` json
"/solar": {
    "svc_solar@RYU-OH.ORG": "pd"
}
```

Which doesn't apply to me, and so would be ignored, and since there
are no more permissions entries my effective permissions at
`/solar/stats/battery_sense_voltage` are "swlpd", and so I would be
allowed to subscribe.

Suppose however I changed the above entry,

``` json
"/solar": {
    "svc_solar@RYU-OH.ORG": "pd",
    "eric@RYU-OH.ORG": "!swl",
}
```

Now, in our walk, when we arrived at `/solar`, we would find an entry
that matches me, and we would remove the permission bits s, w, and l,
leaving our effective permissions at
`/solar/stats/battery_sense_voltage` as "pd", since that doesn't give
me the right to subscribe my request would be denied. We could, for
example, do this by group instead.

``` json
"/solar": {
    "svc_solar@RYU-OH.ORG": "pd",
    "RYU-OH\domain admins": "!swl",
}
```

As you would expect, this deny permission will still apply to me
because I am a member of the domain admins group. A slightly more
subtle point is that permissions are accumulated. For example, if I am
a member of two groups, and both groups have different bits denied,
then all of those bits would be removed. e.g.

``` json
"/solar": {
    "svc_solar@RYU-OH.ORG": "pd",
    "RYU-OH\domain admins": "!swl",
    "RYU-OH\enterprise admins": "!pd",
}
```

Now my effective permissions under `/solar` are empty, I can do
nothing. Now, if I am a member of more than one group, and one denies
permissions that the other grants the deny always takes precidence.

Each server cluster is completely independent for permissions. If for
example this cluster had a child cluster, the administrators of that
cluster would be responsible for deciding what permissions file it
should use. It certainly could use the same file, but the point is the
clusters don't talk to each other about permissions (or really
anything else actually).
