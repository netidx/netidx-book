# Administration

## First Things First

If you plan to use Kerberos make sure you have it set up properly,
including your KDC, DNS, DHCP, etc. If you need help with kerberos I
suggest the [O'REILLY
book](https://www.oreilly.com/library/view/kerberos-the-definitive/0596004036/). If
you want something free the [RedHat
documentation](https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/8/)
isn't too bad, though it is somewhat specific to their product.

Problems with Kerberos/GSSAPI can often be diagnosed by setting
`KRB5_TRACE=/dev/stderr`, and/or `RUST_LOG=debug`. GSSAPI errors can
sometimes be less than helpful, but usually the KRB5_TRACE is more
informative.

## Resources and Gotchas

Most installations need not devote massive resources to the resolver
server, however you may want to use at least two instances on
different machines or VMs for redundancy. Here are a few rules of
thumb.

- Expect to use 300 MiB of ram in the resolver server for every 1
  million published values.
- Read operations will use multiple CPU cores (1 core per client)
- Write operations use only 1 core, however writes do not lock out
  reads, the server should remain available for reads even while a
  large write operation is in progress.
- Be mindful of the maximum number of available file descriptors per
  process on the resolver server machine when setting max_connections.

If you have, for example, a publisher that wants to publish 20 million
names all at once then you may want to segment that off onto a child
cluster (we'll get to how to do that) to prevent it from locking out
reads for everyone on the main cluster for several minutes (Work is
planned to make this problem better in the resolver server, but it can
never be totally eliminated because publishers can always get
bigger). A better strategy would be to not write such a publisher in
the first place, but that may not be under your control.

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

## Example Configuration

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

### Anonymous

It's possible to give anonymous users permissions even on a Kerberos
enabled system, and this could allow them to use whatever functions
you deem non sensitive, subject to some limitations. There is no
encryption. There is no tamper protection. There is no publisher ->
subscriber authentication. Anonymous users can't subscribe to non
anonymous publishers. Non anonymous users can't subscribe to anonymous
publishers. You name anonymous "" in the permissions file, e.g.

``` json
"/tmp": {
    "": "swlpd"
}
```

Now `/tmp` is an anonymous free for all. If you have Kerberos
deployed, it's probably not that useful to build such a hybrid system,
because any anonymous publishers would not be usable by kerberos
enabled users. It's mostly meant for very special cases.

### Groups

You'll might have noticed I'm using AD style group names above, that's
because my example setup uses Samba in ADS mode so I can test windows
and unix clients on the same domain. The most important thing about
the fact that I'm using Samba ADS and thus have the group names I have
is that it doesn't matter. Groups are just strings to netidx, for a
given user, whatever the `id` command would spit out for that user is
what it's going to use for the set of groups the user is in (so that
better match what's in your permissions file). You need to set up the
resolver server machines such that they can properly resolve the set
of groups every user who might use netidx is in.

Luckily you only need to get this right on the machines that run
resolver servers, because that's the only place group resolution
happens in netidx. You're other client and server machines can be a
screwed up and inconsistent as you want, as long as the resolver
server machine agrees that I'm a member of "RYU-OH\domain admins" then
whatever permissions to assign to that group in the permission file
will apply to me.

All the non resolver server machines need to be able to do is get
Kerberos tickets. You don't even need to set them up to use Kerberos
for authentication (but I highly recommend it, unless you really hate
your users), you can just force people to type `kinit foo@BAR.COM`
every 8 hours if you like.

### Starting It

Once you have all that together starting a resolver server is done
from the `netidx` command line tool (`cargo install netidx-tools`). e.g.

``` bash
$ netidx resolver-server --permissions ./netidx-perms.json --id 0
```

By default the server will daemonize, include `-f` to prevent
that. You can test that it's working by running,

``` bash
$ netidx resolver list /
```

Which should print nothing (since you have nothing published), but
should not error, and should run quickly. You can use the command line
publisher and subscriber to further test. In my case I can do,

``` bash
[eric@blackbird ~]$ netidx publisher --bind 192.168.0.0/24 --spn host/blackbird.ryu-oh.org@RYU-OH.ORG <<EOF
/test|string|hello world
EOF
```

and then I can subscribe using

``` bash
[eric@blackbird ~]$ netidx subscriber /test
/test|string|hello world
```

you'll need to make sure you have permission, that you have a keytab
you can read with that spn in it, etc. You may need to, for example,
run the publisher and/or resolver server with

`KRB5_KTNAME=FILE:/somewhere/keytabs/live/krb5.keytab`

`KRB5_TRACE=/dev/stderr` can be useful in debugging these issues.

## Fault Tolerance

As a system netidx depends on fault tolerant strategies in the
subscriber, publisher, and resolver server in order to minimize
downtime caused by a failure. Before I talk about the specific
strategies used by each component I want to give a short taxonomy of
faults so I clearly talk about different classes.

- Hang: Where a component of the system is not 'dead', but is no
  longer responding, or is so slow it may as well not be
  responding. IMHO this is the worst kind of failure. It can happen at
  many different layers, e.g.
  - You can simulate a hang by sending SIGSTOP to a unix process. It
    isn't dead, but it also won't do anything.
  - A machine with a broken network card, such that most packets are
    rejected due to checsum errors, it's still on the network, but
    it's effective bandwidth is a tiny fraction of what it should be.
  - A software bug causing a deadlock
  - A malfunctioning IO device
- Crash: A process or the machine it's running on crashes cleanly and
  completely.
- Bug: A semantic bug in the system that causes an effective end to
  service.
- Misconfiguration: An error in the configuration of the system that
  causes it not to work. e.g.
  - Resolver server addresses that are routeable by some clients and not others
  - Wrong Kerberos SPNs
  - Misconfigured Kerberos

### Subscriber & Publisher

- Hang: Most hang situations are solved by heartbeats. Publisher sends
  a heartbeat to every subscriber that is connected to it every 5
  seconds. Subscriber disconnects if it doesn't reveive at least 1
  message every 100 seconds.

  Once a hang is detected it is dealt with by disconnecting, and it
  essentially becomes a crash.
  
  The hang case that heartbeats don't solve is when data is flowing,
  but not fast enough. This could have multiple causes e.g. the
  subscriber is too slow, the publisher is too slow, or the link
  between them is too slow. Whatever the cause, the publisher can
  handle this condition by providing a timeout to it's `flush`
  function. This will cause any subscriber that can't consume the
  flushed batch within the specified timeout to be disconnected.
- Crash: Subscriber allows the library user to decide how to deal with
  a publisher crash. If the lower level `subscribe` function is used
  then on being disconnected unexpecetedly by the publisher all
  subscriptions are notified and marked as dead. The library user is
  free to retry, which could (randomly) choose a different, working,
  publisher if one is available. The library user could also use
  `durable_subscribe` which will dilligently keep trying to
  resubscribe, with linear backoff, until it is successful.
- Bug: There's not much that can be done to mitigate a system breaking bug.
- Misconfiguration: Unfortunatly there isn't much that can be done to
  prevent misconfiguration. One thing that is done is that IP
  addresses are classified such that 127.0.0.1 doesn't end up in a
  resolver server that also hosts non local addresses.

### Resolver

- Hang: Resolver clients deal with a resolver server hang with a
  dynamically computed timeout based on the number of requests in the
  batch. The rule is, minimum timeout 5 seconds or 10 microseconds per
  operation in the batch for reads or 30 microseconds per operation in
  the batch for writes, whichever is longer. So e.g. a 20 million item
  write batch would get 600 seconds to complete before a timeout. An
  expired timeout is treated as a connection failure, and so is
  handled the same way as a crash.
- Crash: Resolver clients deal with crashes differently depending on
  whether they are read or write connections.
  - Read Connections (Subscriber): Abandon the current connection, wait a random
    time between 1 and 4 seconds, and then go through the whole
    connection process again. That roughly entails taking the list of
    all servers, permuting it, and then connecting to each server in
    the list until one of them answers, says a proper hello, and
    successfully authenticates (if kerberos is on). For each batch a
    resolver client will do this abandon and reconnect dance 3 times,
    and then it will give up and return an error for that
    batch. Subsuquent batches will start over from the beginning. In a
    nutshell read clients will,
     - try every server 3 times in a random order
     - only give up on a batch if every server is down or unable to answer
     - remain in a good state to try new batches even if previous batches have failed
  - Write Connections (Publishers): Since write connections are
    responsible for replicating their data out to each resolver server
    they don't include some of the retry logic used in the read
    client. They do try to replicate each batch 3 times seperated by a
    1-4 second pause to each server in the cluster. If after 3 tries
    they still can't write to one of the servers then it is marked as
    degraded. The write client must send heartbeats periodically
    (configurable 1/2 writer_ttl), and it will try to replicate to a
    degraded server at each heartbeat interval. In a nutshell write clients,
     - try 3 times to write to each server
     - try failed servers again each 1/2 `writer_ttl`
     - return success for a batch if at least 1 server accepts it 
- Bug/Misconfig: There's really not much that can be done about either
  of these kinds of failures.

One important consequence of the write client behavior is that in
the event that all the resolver servers crash, as long as all the
publishers are still running they will start republishing everything
after a maximum of 1/2 `writer_ttl` has elapsed.
