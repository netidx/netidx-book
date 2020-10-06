# Overview of Netidx

Netidx, in a small nutshell, is a library, protocol, and server that
facilitates publishing the value of a variable in one program on one
computer and consuming it in another program on another
computer. There are a lot of details, but making that transaction as
easy as possible while still being secure and performant is the
essential goal.

## The Namespace

Netidx values are published to a hierarcical tuple space. The
structure of the names look just like filename, e.g.

    /apps/solar/stats/battery_sense_voltage

Is an example name. Unlike in a filesystem, in netidx a name may point
to a value, and have children. For example we might have,

    /apps/solar/stats/battery_sense_voltage/millivolts

Where the .../battery_sense_voltage points to the number in volts, and
it's 'millivolts' child gives the same number in millivolts.

Sometimes a name like .../battery_sense_voltage is published deep in
the hierarchy and it's parents are just structure. Unlike the
filesystem the resolver server will create and delete those structural
containers automatically, there is no need to manually manage them.

The term 'points to' is literal. In netidx the actual data is
completely seperate from the names. The names are stored in the
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

So I've said names point to values, but what exactly do I mean by a
'value'.

* Every non structural name points to a value
* Every value immediatly delivers it's most recent value to new
  subscribers
* When a value is changed, every subscriber receives the new value
* No changes are ever dropped, and they arrive in the order they were
  made
* Changes to different values published by the same publisher arrive
  in the order they were made.
* Everything has type 'Value', which is a primitive number, string,
  datetime, or byte array

So every non structural name always has a value, and the value is
always a primitive type. When you subscribe you get the most recent
value, and after that you get updates in an ordered lossless stream.

Since each value is a primitive, there isn't any 'structure', because
the structure is in the namespace.

## Scale

Netidx is meant to be a building block, and as such a lot of thought
has gone into scale. There are multiple different parts of the system
that need to scale. The resolver servers, being the only centralized
piece of infrastructure, are perhaps the most important piece, though
the publisher and subscriber also need to be fast or it won't be worth
using.

### Resolver Server Scale

The resolver servers implement two strategies to achieve
scale. Replication is the first, one can deploy multiple replicas to
multiple machines in order to protect against a single machine outage,
and also increase throughput. In netidx, the publisher itself is the
primary, and as such it is responsible for replicating the names it
publishes out to all the configured resolver servers. This makes the
system very resiliant, as even if the entire resolver server cluster
goes down, the data isn't lost if the publishers are still alive. They
will keep trying to republish their data with linear backoff until
they are killed.

Hierarchy is the second scaling strategy. When a system grows too big
to fit in even a large cluster of servers, then busy parts of the
namespace can be delegated to 'child' server clusters. Readers
familiar with DNS will recognize the basic strategy, though the
details not exactly the same. The administration overhead is simliarly
hierarchical, since each cluster config file must only know about it's
immediate superior and immediate children. It's entirely possible for
a large organization to run a central 'root' resolver server cluster
without needing to micro manage the delegation going on in various
organizational units.

I've focused on designing a scaleable architecture, but I should also
mention that the resolver server itself is pretty fast, and uses a
number of strategies to minimize memory use. It's entirely possible to
put 100 million names in a single instance on a single machine with
32 - 64 gig of ram. You get roughly 1 million names per gig of ram,
assuming your paths aren't crazy long. I have not explicitly tested
the resolve throughput, but given that it uses the same infrastructure
as the publisher/subscriber (which I have tested), and what it's
doing, I would not be at all surprised if you could support millions
of resolutions per second per core (yes it will use all your cores).

### Publisher/Subscriber Scale

If the theme of taking lots of pages from lots of well established
books and integrating them together has come through by this point
then you've caught on to my design philosophy. In this section we're
going to steal from protbuf, as that is essentially the model, if not
the actual implementation, of the netidx wire protocols.

In protobuf, each record is extensible and rather cleverly
encoded. Each field in the record has a LEB128 Id, followed by a data
value. This allows, for example, an older implementation of a protocol
to talk to a server that has added some new fields without breaking
anything.

Netidx is almost entirely the same on the wire. The subscriber sends
the name it wants to one of the publishers specified by the resolver
server cluster. The publisher looks up that value, and responds with
the id it will use in subsuquent messages, along with the current
value. From then on updates to that value transmit only the id, which
is LEB128 encoded, and the updated value. So on the wire, in terms of
overhead, it looks very much like a protobuf record where the fields
are exactly what the subscriber has requested, and nothing more. The
overhead of sending an f64 can be as small as 2 bytes.

Publisher and subscriber performance is fairly good, such that sending
many millions of messages per second is possible. The per message
overhead is on the order of about 70ns of wall clock time per message
with kerberos encryption on (Skylake x86_64 8x5Ghz). Obviously that
number depends on the exact hardware you're running on, and it depends
on your workload batching well. A raw tcp socket, coded properly, will
always be faster, the goal is that it won't be faster by enough that
it's worth using.

The subscriber library also implements zero copy decoding for strings
and byte arrays, so it is possible to receive large binary encoded
things quite efficiently.

## Security

Ah, the S word. No system remotely like netidx can be taken seriously
without a plausable design for securing data against unauthorized
access, interception, manipulation, etc.

The heart of netidx security is Kerberos v5. There are a lot of
systems I might have used, e.g. openssl + certificates, oauth +
openssl, and I'm sure many others. The reason I chose to use Kerberos
v5 is that most users who want to deploy netidx services already have
Kerberos set up (even if they don't know it) in the form of Microsoft
Active Directory, Samba ADS, Redhat Directory Server, or one of the
many other compatible solutions.

Security is optional. It's possible to deploy a netidx system with no
security at all (and that might even be reasonable), and it's possible
to deploy a system where some publishers require security, and some do
not. If any of the three parties involved in a given transaction
(publisher, resolver, subscriber) request security, then it's
mandatory for all parties of that transaction.

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

While netidx is primarially developed on PPC64le linux, it is tested
on aarch64, and x86_64 linux, Mac OS, and even Windows. It will
probably work on many platforms I haven't tried.
