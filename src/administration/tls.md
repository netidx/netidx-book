# Managing TLS

TLS authentication in netidx leans on three pieces working together:
a local certificate authority (or your existing one) that signs
identities, the resolver and clients that present and verify those
identities, and — for non-trivial deployments — the
[id-map daemon](./id_map.md) that translates a certificate SAN into
the unix-style uid/group identity the perms file is keyed on. Most
of this is automated by `netidx conf` and you rarely need to think
about the X.509 plumbing directly.

## The Painless Path

```
netidx conf install resolver --auth tls
```

On a TTY this prompts for everything it needs. With no prior CA on
the machine the prompt for the resolver's certificate defaults to
the literal token `generate`: pick it and the installer

1. creates a local CA under `${basedir}/ca/` (encrypting the CA key
   with a password it then stashes in the system keychain),
2. issues the resolver's leaf certificate from that CA,
3. writes the resolver-server config wired to `auth: Tls`,
4. drops a matching `client.json` reusing the resolver's own cert
   (so commands on the resolver host work without further setup),
5. installs the id-map daemon alongside the resolver,
6. lays down the activation units, and
7. offers to register netidx as an OS service.

For a workstation pick `netidx conf install workstation --auth tls`
instead — same idea, different defaults.

If your organisation already has a CA you want to use, point
`--tls-cert`, `--tls-key`, and `--tls-trusted` at existing PEM files
instead of letting the installer call `generate`.

## Local CA Management — `netidx conf ca`

`netidx conf install ... --tls-cert generate` calls into this same
tooling, but `netidx conf ca` is also the supported way to manage
identities after the initial install. One CA per netidx install,
lives at `${basedir}/ca/`.

```
netidx conf ca init       # create the local CA (if you haven't yet)
netidx conf ca issue      # issue a new leaf cert from the local CA
netidx conf ca request    # generate a key + CSR locally (for an external CA)
netidx conf ca sign       # sign a CSR with the local CA
netidx conf ca list       # list local CAs
```

`init` and `issue` both prompt for the X.509 fields they need; the
defaults agree with the in-the-loop installer. `request` is for
when you want a certificate signed by some other CA: you generate
the key locally (which never leaves the host), and hand over only
the CSR. `sign` is the corresponding receive-side for somebody else's
CSR.

`netidx conf ca sign` is deliberately strict about SubjectAltName:
the CA is authoritative for the identity it issues, so it never
silently inherits whatever SAN the CSR claims. Pass `--san dns:foo`
to set the SAN explicitly, or `--accept-csr-san` if you've verified
the CSR's claim and want to inherit it on purpose.

## Encrypted Private Keys

The resolver's own key, the CA key, and user identity keys may all
be encrypted. netidx loads them via an askpass helper at startup —
on most systems `ssh-askpass` works out of the box and the installer
auto-discovers it. Once you've entered the password once, netidx
stashes it in the system keychain (`netidx::tls::save_password_for_key`)
keyed by the on-disk path, so subsequent startups don't prompt
again.

The `tls.askpass` field on `client.json` lets you override the helper
explicitly if the auto-discovered one doesn't fit; the install flow
sets this for you when you opt into a password during the initial
prompt.

## On-Disk Layout

Cert and key material for each TLS identity lives under
`${basedir}/tls/<our-name>/`, where `<our-name>` is the SAN
embedded in the cert. The `tls.identities` map in `client.json` is
keyed by *reverse-domain pattern* — `mazikeen.example.com` matches
the pattern `com.example`, and the closest match wins. The
installer derives that pattern from the SAN automatically (the
`--tls-server-pattern` flag is there if you need to override it).

This indirection lets one machine carry multiple identities (e.g.
one for an internal cluster and one for a partner organisation)
without having to switch configs.

## Trust Distribution

Every netidx component — resolver, publishers, subscribers — needs
the trust bundle (the CA cert, or chain) installed and named in
`client.json` under `tls.trusted`. With the local-CA flow, that
file is `${basedir}/ca/certificate.pem`; with an external CA, it's
whatever your org gave you. Beyond that, each component only needs
its own leaf cert and private key. The CA's *private* key never
needs to be copied off the CA host.

## By Hand with `openssl`

Most readers don't need this section, but if you're integrating with
an existing corporate CA whose signing flow is out-of-band (raise a
ticket, get a PEM back), the following is the openssl recipe that
matches what `netidx conf ca` does internally. You can use it to
understand the extension layout the resolver expects, or to drive
the issuance yourself.

Creating a CA:

```
openssl genrsa -aes256 -out ca.key 4096
openssl req -new -key ./ca.key -x509 -sha512 -out ca.crt -days 7300 \
  -subj "/CN=mycompany.com/C=US/ST=Some State/L=Some City/O=Some organization" \
  -addext "basicConstraints=critical, CA:TRUE" \
  -addext "subjectKeyIdentifier=hash" \
  -addext "authorityKeyIdentifier=keyid:always, issuer:always" \
  -addext "keyUsage=critical, cRLSign, digitalSignature, keyCertSign" \
  -addext "subjectAltName=DNS:mycompany.com"
```

Issuing a leaf:

```
# resolver key (encrypted; askpass + keychain handles the password)
openssl genrsa -aes256 -out resolver.key 4096

# CSR
openssl req -new -key ./resolver.key -sha512 -out resolver.req \
  -subj "/CN=resolver.mycompany.com/C=US/ST=Some State/L=Some City/O=Some organization"

# Sign
openssl x509 -req -in ./resolver.req -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out resolver.crt -days 730 -extfile <(cat <<EOF
basicConstraints=critical, CA:FALSE
subjectKeyIdentifier=hash
authorityKeyIdentifier=keyid:always, issuer:always
keyUsage=nonRepudiation,digitalSignature,keyEncipherment
subjectAltName=DNS:resolver.mycompany.com
EOF
)

# Sanity check
openssl verify -trusted ca.crt resolver.crt
```

The SAN is load-bearing — it's what netidx matches identities on,
not the CN. If you can leave the key unencrypted (e.g. the host is
otherwise hardened and you don't want a keychain dependency at
boot), drop the `-aes256` from `genrsa`. Otherwise an encrypted key
works fine; netidx will ask once via askpass and remember.

User and publisher certificates are generated the same way. One
identity per certificate is the usual practice, with the obvious
exception of a cluster's worth of homogeneous publishers sharing
one identity.
