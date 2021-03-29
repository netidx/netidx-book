# Clustering

The cluster protocol uses the resolver server to ease building
distributed services. A cluster is rooted at a particular path. Each
member of the cluster will publish it's uuid under that path, and will
poll for other members. The api provides methods to broadcast to all
members, as well as determine who is the primary (based on uuid sort
order). A cluster with two members might look like, e.g.

```
/app/cluster/2d66247f02344b5d958039a337b7e218
/app/cluster/bc60c115971e4e1b96c94a3a17f51a86
```

Calling the `send_to_others` method in either member would write a
message to the other. Also, both members would agree that
`2d66247f02344b5d958039a337b7e218` is the primary, though what meaning
that has depends on the application.

An example application using the cluster protocol is the
recorder. Each recorder shard has access to part of the whole data
set, so in order to replay data accurately, they must coordinate
creating sessions, as well as their position, rate, start, end,
etc. When a shard receives an rpc call asking for a new session, it
forwards that request to all the other shards. Once a session is
created each shard publishes the control interface. Whenever one
receives a command, it forwards that command to the other shards,
ensuring that every shard stays in sync with the user's requests. In
this example, the concept of "primary" is not used, as all the shards
are equal.
