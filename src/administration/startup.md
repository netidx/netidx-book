# Running the Resolver Server

As of this writing the resolver server only runs on Unix, and has only
been extensively tested on Linux. There's no reason it couldn't run on
Windows, it's just a matter of some work around group name resolution
and service integration. Starting a resolver server is done from the
`netidx` command line tool (`cargo install netidx-tools`). e.g.

``` bash
$ KRB5_KTNAME=FILE:/path/to/keytab \
netidx resolver-server --permissions ./netidx-perms.json
```

By default the server will daemonize, include `-f` to prevent that. If
your cluster has multiple replica servers then you must pass `--id
<index>` to specify which one you are starting, however since the
default is 0 you can omit the id argument in the case where you only
have 1 replica.

You can test that it's working by running,

``` bash
$ netidx resolver list /
```

Which should print nothing (since you have nothing published), but
should not error, and should run quickly. You can use the command line
publisher and subscriber to further test. In my case I can do,

``` bash
[eric@blackbird ~]$ netidx publisher \
    --bind 192.168.0.0/24 \
    --spn host/blackbird.ryu-oh.org@RYU-OH.ORG <<EOF
/test|string|hello world
EOF
```

and then I can subscribe using

``` bash
[eric@blackbird ~]$ netidx subscriber /test
/test|string|hello world
```

you'll need to make sure you have permission, that you have a keytab
you can read with that spn in it, and that the service principal
exists etc. You may need to, for example, run the publisher and/or
resolver server with

`KRB5_KTNAME=FILE:/somewhere/keytabs/live/krb5.keytab`

`KRB5_TRACE=/dev/stderr` can be useful in debugging kerberos issues.
