# Managing TLS

TLS can be used in two related but distinct places:

- the **data plane**, where resolvers, publishers, and subscribers authenticate
  one another, and
- the **admin plane**, where every admin server has a unique CA-issued machine
  identity and only the controller may deliver remote mutations.

`netidx admin` provisions both, but an admin-server certificate is not a
general-purpose data-plane identity. Its reserved SANs and controller role are
described in [Admin-Plane Security](./security.md).

## The normal installation path

For a human installation, run the TUI and select **Install a Role**:

```console
netidx admin
```

Choose Resolver, TLS authentication, and the advertised resolver address and
name. The TUI shows every decision before it writes anything. On the strict
CLI the corresponding entry point is:

```console
netidx admin resolver install --auth tls --help
```

Supply the required choices as flags; use `--dry-run` to print the plan without
writing. A first TLS resolver normally:

1. creates the home CA and its encrypted keyslot vault,
2. creates the one active admin controller,
3. prints the off-box recovery password once,
4. issues separate admin-server and resolver identities,
5. writes `resolver.json`, a matching local `client.json`, and `perms.json`,
6. installs the id-map daemon, and
7. writes activation units and, when selected, the OS service.

TLS resolver certificates map SANs to Unix-style identities, so the id-map
daemon is installed automatically unless `--no-id-map` is explicitly chosen.
The resolver host's client config reuses its resolver identity by default so
local diagnostic commands work immediately; `--no-client` suppresses that.

An anonymous or Kerberos data plane can still use the TLS-protected admin
plane. `--with-admin-server` makes that choice explicit for an anonymous
network; Kerberos and TLS installations set one up by default. Conversely,
`--no-admin-server` is the expert path that leaves configuration management,
enrollment, and renewal to some other system.

## Joining an existing network

A joining node contacts any known admin server as a bootstrap hint, confirms
the home CA's glyph, then finds and verifies the controller before sending its
enrollment request. For example, start from:

```console
netidx admin workstation install \
  --admin-server 10.0.0.10:4565 \
  --accept-glyph 'THE CONFIRMED GROUPED FINGERPRINT' \
  --help
```

The request waits in the controller's Enrollment Queue. The enrollee and
approver compare the request glyph out of band. An admin-server enrollment also
shows its requested roles, listen address, resolver members, and requested
cluster or cluster join. Approval creates a CA-owned grant; registration may
activate that grant but cannot change it.

The node generates its private key locally. A CSR crosses the network; the
private key does not. Interrupted enrollment is recoverable: rerunning the
polling/install workflow uses the queued request rather than granting arbitrary
new map state.

## Key protection

New private keys support three protection modes through `--key-protection`:

- `seal` binds the key to the host's TPM or Secure Enclave,
- `password` encrypts it with an operator-supplied password, and
- `none` writes an unencrypted key.

The TUI offers the appropriate choices for the platform. Strict CLI automation
passes password material through `--key-password-file` or
`--key-password-stdin`, never as an argument. Sealing is the production default
when supported because copying a disk or config directory does not copy a
usable key.

The CA is different from an ordinary leaf. Its private key lives in an
encrypted keyslot vault. The controller's autorenew credential is sealed to
the machine, while a separately stored recovery password is the portable
off-box authority. See [Controller Backup and Recovery](./backup_recovery.md)
before putting a CA into service.

`--insecure-no-tpm` is for disposable test CAs. It leaves the autorenew
credential in plaintext, which makes every disk image or ordinary filesystem
backup sensitive CA material.

## Trust and identity distribution

A data-plane TLS participant needs:

- its own leaf certificate and matching private key,
- the trusted CA bundle, and
- the expected peer name or identity pattern in its config.

Install flows distribute these files as part of approved enrollment; the CA
private key never leaves the controller vault. A trust bundle may contain more
than one CA for data-plane federation. That does not merge their admin planes:
admin authorization remains pinned to the one home-CA fingerprint stored by
each admin server.

The certificate SAN is load-bearing. Resolver and publisher TLS names are the
identities clients verify and the id-map uses; the certificate CN is not a
substitute. The `tls.identities` entries in `client.json` select among local
identities by reverse-domain pattern, with the closest match winning. This
allows one machine to hold separate identities for different networks.

## Renewal and revocation

The per-host renewal daemon authenticates with its current certificate,
generates a fresh key and CSR, and queues a verified renewal. The controller's
dedicated autorenew slot may approve that narrow request in process. Renewal
preserves an admin server's UUID and controller marker even when its key and
SPKI change.

Revocation updates the CA's signed CRL immediately. The controller fans the
CRL out to registered nodes and renewal daemons also pull it. Fanout failures
name the immutable server UUID and current address so the operator can retry
after a partition; a failed automatic delivery does not silently change the
authoritative revocation state.

Inspect and revoke from the TUI's **Issued Certificates** panel, or start with:

```console
netidx admin ca issued --help
netidx admin ca revoke --help
```

## Existing organisational PKI

The netidx CA can run as an intermediate beneath an existing organisational
root:

```console
netidx admin ca init --external-sign --help
netidx admin ca external status --help
netidx admin ca external emit-csr --help
netidx admin ca external install --help
```

The CA key and CSR are generated locally. Your PKI signs the CA CSR; installing
the returned certificate completes or renews the chain. Netidx cannot
automatically renew that CA certificate because it does not hold the external
root's key.

Normal data-plane identities may also come from an existing PKI, provided the
SANs, algorithms, and trust bundle match the netidx configuration. Do not issue
the reserved `netidx-admin-server` SAN or admin URI identities through a
general corporate certificate template. Admin-server identities must go
through the CA-authorized enrollment path so their immutable UUID, role, and
network-map grant agree.
