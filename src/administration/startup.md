# Running the Resolver Server

The resolver server runs on Linux, macOS, and Windows. A normal
`netidx admin resolver install` writes an activation unit and the selected OS
service starts the activation supervisor; running the resolver executable by
hand is mainly useful for debugging.

```console
netidx resolver-server \
  --config /path/to/resolver.json \
  --id 0 \
  --delay-reads \
  --foreground
```

`--id` selects the zero-based entry in `member_servers` and defaults to 0.
On Unix, omitting `--foreground` daemonizes the process; on Windows the process
already remains in the foreground.

`--delay-reads` prevents the freshly started member from accepting read
clients for one `writer_ttl`. This gives publishers time to republish the
member's path table. Installer-generated resolver units include it by default.

Test the resolver through the client config installed on that host:

```console
netidx resolver list /
```

An empty result is normal when nothing is published; an authentication,
connection, or configuration error is not. For a small end-to-end check, keep
this publisher running in one terminal:

```console
netidx publisher
/users/YOUR-IDENTITY/test|string|hello world
```

Then subscribe from another:

```console
netidx subscriber /users/YOUR-IDENTITY/test
```

Replace `YOUR-IDENTITY` with the authenticated name shown by your deployment.
The default network-resolver permissions grant each user publish rights in
that subtree. On a default workstation, `/local/test` is a convenient
alternative.

The client config supplies the normal authentication choice. For Kerberos
diagnostics, `KRB5_TRACE=/dev/stderr` shows GSSAPI/KDC activity; use
`KRB5_KTNAME=FILE:/path/to/keytab` when a service keytab is outside the
platform default. `RUST_LOG=debug` enables detailed netidx diagnostics for any
authentication method.

## Rolling restarts

Resolver members do not replicate to one another. If a topology or member
configuration change requires a restart, restart one member, wait for its
`--delay-reads` warm-up to finish and verify it, then restart the next member.
Do not restart every member at once. Permission-only changes reload live and do
not require this procedure.
