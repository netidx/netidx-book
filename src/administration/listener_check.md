# Listener Check

The listener check is an extra security measure that is intended to
prevent an authenticated user from denying service to another
publisher by overwriting it's gssapi session. When a client connects
to the resolver server for write, and kerberos is enabled, then after
authentication the resolver server encrypts a challenge using the
newly created gssapi session. It then connects to the write address
proposed by this new publisher and presents the challenge, which the
publisher must answer correctly, otherwise the old session will be
kept, and the new client will be disconnected. So in order to publish
at a given address you must,

- Be a valid kerberos user with a valid service ticket for the
  resolver server.
- Actually be listening on the write address you propose to use for
  publishing. And the write address must be routable from the resolver
  server's position on the network.
- Have permission to publish where you want to publish.

## Why is the listener check important?

Since connecting to the resolver as a publisher can be done by any
kerberos user who can get a service ticket for the resolver,
essentially anyone on your network, and since the address and port a
publisher is going to insert into the resolver server as their address
is just part of the hello message, without some kind of check anyone
on your network could figure out the address of an important
publisher, then connect to the resolver server and say they *are* that
publisher address. Even if they don't have permission to actually
publish paths where that publisher is publishing, the gssapi sessions
are tied to the write ip/port in the resolver server. If the gssapi
session of an existing publisher is replaced without it's knowledge,
then it would no longer be able to validate authorization tokens from
the resolver server, and all subscriptions to it would fail. So
essentially the listener check exists to prevent an unauthorized
elevation of privledges leading to a denial of service. There are
several other implications,

- publishers on different network segments that might share ip
  addresses can't use the same resolver server.
- the resolver must be able to route back to every publisher, and also
  it must be able to actually connect. For example your firewall must
  allow connections both ways.
