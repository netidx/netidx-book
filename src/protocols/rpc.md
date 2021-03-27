# Remote Procedure Call

At the library level RPCs in netidix are just like any other untyped
RPC. The procedure name is the netidx path, the arguments are an array
of netidx values. Below the library layer, mapping the RPC model into
netidx is quite simple. e.g.

```
/app/rpcs/do_thing                            <- the procedure
/app/rpcs/do_thing/doc                        <- procedure doc string
/app/rpcs/do_thing/arg0/val                   <- arguments are all named, this is 'arg0'
/app/rpcs/do_thing/arg0/doc                   <- doc string for arg0
/app/rpcs/do_thing/arg1/val                   <- 'arg1'
/app/rpcs/do_thing/arg1/doc                   <- arg1 doc string
...
/app/rpcs/do_thing/args-can-have-any-name/val <- args can be called anything
/app/rpcs/do_thing/args-can-have-any-name/doc <- doc string
```

We set arguments by writing to `.../arg-name/val`, and we call the
procedure by writing `null` to the procedure. The return value of the
procedure is sent back to the caller in one of two ways. If the caller
used `write_with_recipt`, then the return will be sent as the reply to
that write request. If the caller did a normal write, then the
procedure value will be updated with the return value, but only for
the calling client, other clients won't receive this update.

Since there can be time in between setting argument values and
triggering the procedure the rpc module keeps track of the set
argument values on a per client basis. This way, multiple clients may
make independent calls to the same procedure concurrently without
interfering with each other. If arguments are set, but a call is not
triggered within 60 seconds then the arguments may be garbage
collected if the rpc server is busy.

Because the protocol is so simple, it's perfectly possible to call a
netidx rpc directly from the browser using `ctrl+w`, from the command
line subscriber, or even manually in a program (though the library is
more convenient).

## Concurrent RPC Publishers

Because of the way netidx works it's entirely possible and supported
for multiple programs on multiple machines to publish the same RPC. As
long as each one publishes the same arguments clients will just pick
one of them at random when initially subscribing, and will use that
one from then on (unless it's forced to resubscribe for watever
reason).

You might wonder, since the procedure and the arguments are different
netidx paths, how it's possible to make sure that a client sends all
it's arguments to the same procedure. Normally in netidx subscriber
picks a random publisher from the set of all publishers publishing the
path it is subscribing to. However the resolver server supports
storing flags for each path, and one of the flags is called
`USE_EXISTING`, which causes any subscriber to always use an existing
publisher connection (if one exists) instead of picking a random
publisher. Since the RPC library sets this flag on the procedure, and
all the arguments it publishes, subscribers will choose a random
publisher of the RPC when they subscribe to the first path of the rpc,
and thereafter they will always use that publisher (if it fails then
subscriber will pick a new random rpc publisher).

Depending on what your RPC actually does you may need more or less
coordination between publishers, and the cluster protocol can help you
there, but in many cases load balancing is as simple as starting more
publishers to handle additional traffic.

## Overhead

Once subscribed, the network overhead of calling a netidx rpc is quite
low. For example, consider a procedure with 3 double precision
floating point arguments that also returns a double precision
float. Then the overhead of making a call to this procedure once
subscribed is,

```
# set float arg
tag:       1 byte, 
id:        1 byte, 
value:
  val_tag: 1 byte,
  double:  8 bytes
recipt:    1 byte

# call procedure
tag:    1 byte,
id:     1 byte,
value:  1 byte,
recipt: 1 byte
```

So to call a three argument procedure takes 12x3 + 4, or 40 bytes on
the wire, and 24 bytes of that are the actual argument data. The
return value is,

```
tag:       1 byte,
id:        1 byte,
value:
  val_tag: 1 byte,
  double:  8 bytes
```

11 bytes for the return, 8 of which are the actual return value
data. Clearly data size on the wire should be no impedement to using
netidx rpc in high performance applications. Aside from data size on
the wire netidx has some additional beneficial characteristics, for
example, because of the way subscriber and publisher are designed it
is possible for a single client to concurrently issue many rpc calls
to the same publisher, and in that case the messages will
automatically batch allowing processing overhead to be amortized on
both sides. e.g.

``` rust
futures::join_all(vec![
    proc.call(args1), 
    proc.call(args2), 
    proc.call(args3)
]).await
```

This will cause only one batch containing all the data needed to make
all three calls to be sent to the publisher. It isn't clear whether
the results will also be sent as a batch, simply because each call may
take a different amount of time to produce a result.

Depending on how the handler for this rpc is written, all three calls
may be evaluated in parallel on the publisher side.  In fact the
default behavior is for concurrent calls to the same procedure to run
in parallel, in order to degrade this one would need to e.g. depend on
a shared locked data structure.
