# Overview of Netidx

Netidx is a library, protocol, and server that facilitates publishing
the value of a variable in one program and consuming it in another
program, possibly on another computer. There are a lot of details, but
making that transaction as easy as possible, while still being secure
and performant is the essential goal.

## The Namespace

Netidx values are published to a hierarchical tuple space. The
structure of the names look just like a filename, e.g.

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

I've focused on designing a scaleable architecture, but I should also
mention that the resolver server itself is pretty fast, and uses a
number of strategies to minimize memory use. It's entirely possible to
put 100 million names in a single instance on a single machine with
32 - 64 gig of ram. You get roughly 1 million names per 500 MB of ram,
assuming your paths aren't crazy long. I have not explicitly tested
the resolve throughput, but given that it uses the same infrastructure
as the publisher/subscriber (which I have tested), and what it's
doing, I would not be at all surprised if you could support millions
of resolutions per second per core (yes it will use all your cores).

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
with kerberos encryption on. Obviously that number depends on the
exact hardware you're running on, and it depends on your workload
batching well.

The subscriber library also implements zero copy decoding for strings
and byte arrays, so it is possible to receive large binary encoded
things quite efficiently.

## Security

No system like netidx can be taken seriously without a plausible
design for securing data against unauthorized access, interception,
manipulation, etc.

The heart of netidx security is Kerberos v5. There are a lot of
systems I might have used, e.g. openssl + certificates, oauth +
openssl, and I'm sure many others. The reason I chose to use Kerberos
v5 is that most users who I think might want to deploy netidx services
already have Kerberos set up (even if they don't know it) in the form
of Microsoft Active Directory, Samba ADS, Redhat Directory Server, or
one of the many other compatible solutions.

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
Windows, and even Mac OS. It will probably work on many platforms I
haven't tried.
