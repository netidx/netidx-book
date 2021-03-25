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

- Expect to use about 500 MiB of ram in the resolver server for every
  1 million published values.
- Both read and write operations will make use of all available
  logical processors on the machine. So, in the case you are hitting
  performance problems, try allocating more cores before taking more
  drastic segmentation steps.
- Even when the resolvers are very busy they should remain fair. Large
  batches of reads or writes are broken into smaller reasonably sized
  batches for each logical processor. These batches are then
  interleaved pseudo randomly to ensure that neither reads nor writes
  are starved.
- Be mindful of the maximum number of available file descriptors per
  process on the resolver server machine when setting
  max_connections. You can easily raise this number on modern linux
  systems using ulimit.
  
- While the resolver server drops idle read client connections fairly
  quickly (default 60 seconds), if you have many thousands or tens of
  thousands of read clients that want to do a lot of reading
  simultaneously then you may need to raise the maximum number of file
  descriptors available, and/or deploy additional processes to avoid
  file descriptor exhaustion.

- Some implementations of Krb5/GSSAPI keep a file descriptor open for
  every active client/server session, which in our case means every
  read client, but also every publisher, connected or not. This has
  been fixed in recent versions of MIT Kerberos (but may still
  manifest if you are running with KRB5_TRACE). Keep this in mind if
  you're seeing file descriptor exhaustion.
