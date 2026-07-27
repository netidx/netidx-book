# Managing TLS

TLS can be used in two related but distinct places:

- the **data plane**, where resolvers, publishers, and subscribers authenticate
  one another, and
- the **admin plane**, where every admin server has a unique CA-issued machine
  identity and only the CA may deliver remote mutations.

`netidx admin` provisions both, but an admin-server certificate is not a
general-purpose data-plane identity. Its reserved SANs and CA role are
described in [Admin-Plane Security](./security.md).

## The normal installation path

For a human installation, run the TUI and select **Install a Role**:

```console
netidx admin
```

For a production deployment, the first decision is where the CA
belongs. Choose **CA** to dedicate this machine to that role, or
choose **Resolver** and let the first resolver install the CA locally
before installing itself. Resolver servers installed on other machines then
enroll with that CA.

The strict CLI entry points are:

```console
netidx admin ca install --help
netidx admin resolver install --auth tls --help
```

Supply the required choices as flags; use `--dry-run` to print the plan without
writing. A co-located first TLS resolver:

1. installs the one active CA, which is also the home CA, and its
   encrypted keyslot vault,
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
plane. `--with-admin-server` makes that choice explicit for an anonymous admin
domain; Kerberos and TLS installations set one up by default. Conversely,
`--no-admin-server` is the expert path that leaves configuration management,
enrollment, and renewal to some other system.

## Joining an existing admin domain

A joining node contacts any known admin server as a bootstrap hint, confirms
the home CA's glyph, then finds and verifies the CA before sending its
enrollment request. For example, start from:

```console
netidx admin workstation install \
  --admin-server 10.0.0.10:4565 \
  --accept-glyph 'THE CONFIRMED GROUPED FINGERPRINT' \
  --help
```

The request waits in the CA's Enrollment Queue. The enrollee and
approver compare the request glyph out of band. An admin-server enrollment also
shows its requested roles, listen address, resolver members, and requested
resolver cluster or resolver cluster join. Approval creates a CA-owned grant; registration may
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
encrypted keyslot vault. The CA's autorenew credential is sealed to
the machine, while a separately stored recovery password is the portable
off-box authority. See [Backup and Restore](./backup_recovery.md)
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
private key never leaves the CA vault. A trust bundle may contain more
than one CA for data-plane federation. That does not merge their admin planes:
admin authorization remains pinned to the one home-CA fingerprint stored by
each admin server.

The certificate SAN is load-bearing. Resolver and publisher TLS names are the
identities clients verify and the id-map uses; the certificate CN is not a
substitute. The `tls.identities` entries in `client.json` select among local
identities by reverse-domain pattern, with the closest match winning. This
allows one machine to hold separate identities for different admin domains.

## Renewal and revocation

The per-host renewal daemon authenticates with its current certificate,
generates a fresh key and CSR, and queues a verified renewal. The CA's
dedicated autorenew slot may approve that narrow request in process. Renewal
preserves an admin server's UUID and CA marker even when its key and
SPKI change.

Revocation updates the CA's signed CRL immediately. The CA fans the
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
root. For a human installation, the TUI carries the complete two-phase
ceremony:

1. Run `netidx admin` on the intended CA host and choose
   **CA**.
2. Enter the admin domain's domain name and answer **Yes** to **use an
   external root CA?**
3. Save the recovery password. Netidx generates its CA key locally and writes
   a subordinate-CA CSR. The CA remains stopped and no OS service is
   registered yet.
4. Have the organisational PKI or hardware root sign that CSR as a CA
   certificate. Only the CSR leaves the CA; the netidx CA key and the
   external root's private key stay on their respective machines.
5. Dismiss the result dialog in the same TUI and choose **Install Signed
   Certificate (External CA)**. Supply the signed intermediate certificate and,
   when it is not included in the returned chain, the external root's public
   certificate.

The TUI does not need to be closed while the CSR is being signed. Reopening it
is harmless: the local status reports **External CA: awaiting signature** and
offers the same install action. Installing the signed certificate validates the
key, CA constraints, chain, and issuer before configuring and starting the
CA.

For strict CLI automation, use the equivalent commands:

```console
netidx admin ca install --external-sign --help
netidx admin ca external status --help
netidx admin ca external emit-csr --help
netidx admin ca external install --help
```

The admin domain identity is a fingerprint of the netidx intermediate's public key,
so later certificates issued for the same key by the same external root
preserve the glyph and existing trust.

Netidx cannot automatically renew the intermediate certificate because it
does not hold the external root's key. Renewal does not take the CA out
of service:

1. Choose **Emit Renewal CSR (External CA)** in the CA TUI.
2. Have the same external PKI sign it.
3. Choose **Install Renewed Certificate (External CA)** and supply the returned
   certificate.

These actions use the protected local control socket while the CA
continues serving. They reuse the existing netidx CA key, so the glyph does not
change. New enrollments and certificate renewals receive the refreshed chain;
perform the ceremony comfortably before expiry so ordinary node renewal has
time to distribute it. A replacement intermediate key or a certificate signed
by a different external root is rejected.

Normal data-plane identities may also come from an existing PKI, provided the
SANs, algorithms, and trust bundle match the netidx configuration. Do not issue
the reserved `netidx-admin-server` SAN or admin URI identities through a
general corporate certificate template. Admin-server identities must go
through the CA-authorized enrollment path so their immutable UUID, role, and
admin-domain-map grant agree.
