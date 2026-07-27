# Remote Procedure Call

At the library level, netidx RPCs have a procedure path and a set of named
netidx-value arguments. Below the library layer, the procedure and its
discoverable interface map into netidx paths quite simply:

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

For manual calls, set arguments by writing to `.../arg-name/val`, then call the
procedure by writing `null` to the procedure. The current client library can
instead put the complete named argument set in the write to the procedure,
which makes a normal call one write rather than one write per argument. The
return value of the procedure is sent back to the caller in one of two ways. If the caller
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

An inline library call carries every argument in the write to the selected
procedure, so they inherently reach one publisher. The separately published
argument paths still support manual calls. The RPC server marks the procedure
and those paths `USE_EXISTING`, which makes a subscriber reuse an existing
publisher connection instead of independently choosing a publisher for each
path. If that publisher fails, the subscriber can select another RPC publisher.

Depending on what your RPC actually does you may need more or less
coordination between publishers, and the cluster protocol can help you
there, but in many cases load balancing is as simple as starting more
publishers to handle additional traffic.

## Overhead and batching

Once subscribed, a library call sends one write-with-receipt to the procedure.
Its value is a compact Pack array of `(argument-name, value)` pairs; the reply
is one netidx value. The exact byte count therefore depends on the argument
names and value encodings, rather than being a fixed per-argument write cost.

A single client can concurrently issue many calls to the same publisher. The
subscriber automatically batches the resulting writes, amortizing transport
and processing overhead on both sides. For example:

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

Whether the publisher evaluates those calls serially or in parallel is a
property of the application handler. The RPC transport permits either and does
not impose shared mutable state between calls.
