# Fault Tolerance

As a system netidx depends on fault tolerant strategies in the
subscriber, publisher, and resolver server in order to minimize
downtime caused by a failure. Before I talk about the specific
strategies used by each component I want to give a short taxonomy of
faults as I think of them so we can be clear about what I'm actually
talking about.

- Hang: Where a component of the system is not 'dead', e.g. the
  process is still running, but is no longer responding, or is so slow
  it may as well not be responding. IMHO this is the worst kind of
  failure. It can happen at many different layers, e.g.
  - You can simulate a hang by sending SIGSTOP to a unix process. It
    isn't dead, but it also won't do anything.
  - A machine with a broken network card, such that most packets are
    rejected due to checksum errors, it's still on the network, but
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
  free to retry. The library user could also use `durable_subscribe`
  which will dilligently keep trying to resubscribe, with linear
  backoff, until it is successful. Regardless of whether you retry
  manually or use `durable_subscribe` each retry will go through the
  entire process again, so it will eventually try all the publishers
  publishing a value, and it will pick up any new publishers that
  appear in the resolver server.

### Resolver

- Hang: Resolver clients deal with a resolver server hang with a
  dynamically computed timeout based on the number of requests in the
  batch. The rule is, minimum timeout 15 seconds or 6 microseconds per
  operation in the batch for reads or 12 microseconds per operation in
  the batch for writes, whichever is longer. That timeout is a timeout
  to get an answer, not to finish the batch. Since the resolver server
  breaks large batches up into smaller ones, and answers each micro
  batch when it's done, the timeout should not usually be hit if the
  resolver is just very busy, since it will be sending back something
  periodically for each micro batch. The intent is for the timeout to
  trigger if the resolver is really hanging.
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
     - never fail a batch, just log an error and keep trying next 1/2 `writer_ttl`

One important consequence of the write client behavior is that in the
event all the resolver servers crash, when they come back up
publishers will republishing everything after a maximum of 1/2
`writer_ttl` has elapsed.
