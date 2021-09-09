# What is Netidx

- It's a directory service; like LDAP or X.500
  - It keeps track of a hierarchical directory of things
  - It's browsable and queryable
  - It's distributed, lightweight, and scalable

- It's a tuple space; like JavaSpaces, zookeeper, or memcached
  - Except it's distributed. The directory server keeps track of where
    things are, publishers keep the data.
  - Each tuple is identified by a unique path in the directory server,
    and holds a flexible set of primitive data types

- It's a publish/subscribe messaging system; like MQTT
  - Except there is no centralized broker. Communication happens
    directly between publishers and subscribers
  - Message archiving and other services provided by MQTT brokers can
    be provided by normal publishers, or omitted if they aren't needed
  - Decentralization allows it to scale to huge message rates

## The Namespace

Netidx values are published to a hierarchical [tuple
space](https://en.wikipedia.org/wiki/Tuple_space). The structure of
the names look just like a filename, e.g.

    /apps/solar/stats/battery_sense_voltage

Is an example name. Unlike a file name, a netidx name may point to a
value, and also have children. So keeping the file analogy, it can be
both a file and a directory. For example we might have,

    /apps/solar/stats/battery_sense_voltage/millivolts

Where the `.../battery_sense_voltage` points to the number in volts,
and it's 'millivolts' child gives the same number in millivolts.

Sometimes a name like `battery_sense_voltage` is published deep in the
hierarchy and it's parents are just structure. Unlike the file system
the resolver server will create and delete those structural containers
automatically, there is no need to manually manage them.

The term 'points to' is literal. In netidx the actual data is
completely separate from the names. The names are stored in the
resolver server cluster. Each name points to the ip address and port
of the publisher that actually has the data.

When a client wants to subscribe to the value pointed to by a name, it
queries the resolver server cluster, and is given the addresses of all
the publishers that publish said data point. It then randomly permutes
that list, and tries to subscribe to each address. If one of them
succeeds, then the subscription succeeds, if they all fail then it
doesn't. All the actual data flows from publishers to subscribers
directly without ever going through any kind of centralized
infrastructure.

## What's a Value

Values are primitives, e.g. various kinds of number, strings,
durations, timestamps, and byte arrays. Values don't have any inherent
structure, but of course you can use byte arrays to publish anything
that can be serialized, and since byte arrays are zero copy that is
even quite efficient.

Published values have some other properties as well,

* Every non structural name points to a value
* Every new subscription immediately delivers it's most recent value
* When a value is updated, every subscriber receives the new value
* Updates arrive reliably and in the order the publisher made them
  (like a TCP stream)

## Scale

Netidx is meant to be a building block, and as such a lot of thought
has gone into scale. There are multiple different parts of the system
that need to scale. The resolver servers, being the only centralized
piece of infrastructure, are perhaps the most important piece, though
the publisher and subscriber also need to be fast or it won't be worth
using.

### Resolver Server

The resolver servers implement two strategies to achieve
scale. Replication is the first, one can deploy multiple replicas to
multiple machines in order to protect against a single machine outage,
and also increase throughput. In netidx, the publisher itself is the
primary, and as such it is responsible for replicating the names it
publishes out to all the configured resolver servers. This makes the
system very resilient, as even if the entire resolver server cluster
goes down, the data isn't lost if the publishers are still alive. They
will keep trying to republish their data with linear backoff until
they are killed.

Hierarchy is the second scaling strategy. When a system grows too big
to fit in even a large cluster of servers, then busy parts of the
namespace can be delegated to 'child' server clusters. Readers
familiar with DNS will recognize the basic strategy, though the
details not exactly the same. The administration overhead is similarly
hierarchical, since each cluster config file must only know about it's
immediate superior and immediate children. It's entirely possible for
a large organization to run a central 'root' resolver server cluster
without needing to micro manage the delegation going on in various
organizational units.

While the primary design goal was a scaleable architecture, the
resolver server itself is also architected for efficiency, and uses a
number of strategies to minimize memory use. As a result it's possible
to put 100 million names in a single instance on a single machine with
32 - 64 gig of ram. As a rule of thumb you get roughly 1 million names
per 500 MB of ram, assuming your paths are a reasonable length.

### Publisher/Subscriber

On the wire, the netidx protocol is almost exactly the same as
protobuf. In protobuf, each record is extensible and rather cleverly
encoded. Each field in the record has a LEB128 Id, followed by a data
value.

In netidx, the subscriber sends the name it wants to one of the
publishers specified by the resolver server cluster. The publisher
looks up that value, and responds with the id it will use in
subsequent messages, along with the current value. From then on
updates to that value transmit only the id, which is LEB128 encoded,
and the updated value. So on the wire, in terms of overhead, it looks
very much like a protobuf record where the fields are exactly what the
subscriber has requested and nothing more. The overhead of sending an
f64 can be as small as 2 additional bytes (so 10 in total, 1 id byte,
1 tag byte).

Publisher and subscriber performance is fairly good, such that sending
many millions of messages per second is possible. As of this writing a
fast machine can send about 15 million kerberos encrypted
messages/second and more then 20 million in the clear. The per message
overhead is on the order of about 50ns of wall clock time per message
with kerberos encryption on. That depends on the exact hardware you're
running on, and it depends on your workload batching well.

The subscriber library also implements zero copy decoding for strings
and byte arrays, so it is possible to receive large binary encoded
things quite efficiently.

## Security

No system like netidx can be taken seriously without a plausible
design for securing data against unauthorized access, interception,
manipulation, etc.

The heart of netidx security is Kerberos v5, mainly because most users
already have it set up in the form of Microsoft Active Directory,
Samba ADS, Redhat Directory Server, or one of the many other
compatible solutions.

That said security is optional in netidx. It's possible to deploy a
netidx system with no security at all, and it's possible to deploy a
system where some publishers require security, and some do not. While
it's possible to mix secured and non secured publishers on the same
resolver cluster there are some restrictions. 

* If a subscriber is configured with security, then it won't talk to
  publishers that aren't.
* If a publisher is configured with security, then it won't talk to a
  subscriber that isn't.

When security is enabled you get the following guarantees,

* **Mutual Authentication**, the publisher knows the subscriber is who
  they claim to be, and the subscriber knows the publisher is who they
  claim to be. This applies for the resolver <-> subscriber, and
  resolver <-> publisher as well.
  
* **Confidentiality** and Tamper detection, all messages are encrypted,
  and data cannot be altered undetected by a man in the middle.

* **Authorization**, The user subscribing to a given data value is
  authorized to do so. The resolver servers maintain a permissions
  database specifying who is allowed to do what where in the
  tree. Thus the system administrator can centrally control who is
  allowed to publish and subscribe where.

## Cross Platform

While netidx is primarily developed on Linux, it has been tested on
Windows, and Mac OS.
