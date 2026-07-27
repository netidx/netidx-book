# Backup and Restore

Backup and restore operate on the installed **role**, not on individual
configuration files. The same two commands cover a workstation, publisher,
resolver, dedicated CA, or a CA that also runs a resolver:

```console
netidx admin backup /srv/netidx-backups/office-2026-07-12
netidx admin restore /srv/netidx-backups/office-2026-07-12
```

Restore is a special install. It puts the role back into working order,
including configuration, activation units, machine credentials, and the OS
service. When a replacement identity needs CA approval, restore runs the
normal enrollment ceremony and waits for the administrator.

A combined CA-and-resolver installation is one role for backup and
restore purposes. Its bundle contains both components; restoring it recovers
the CA first, starts it, and then re-enrolls the co-located resolver's
disposable TLS identity against that recovered CA.

The bare `netidx admin` TUI exposes **Back Up This Install** on every installed
role. On a fresh machine, press `r` on the Local tab to restore a bundle.

## Take a backup

Run backup on the machine being protected. The target must be a new directory;
netidx never overwrites an existing backup:

```console
netidx admin backup /srv/netidx-backups/office-2026-07-12
```

The bundle records:

- the installed role and any co-located components,
- the current client, resolver, permissions, id-map, and admin-server
  configuration,
- activation units and OS-service intent,
- the admin domain's pinned CA identity and an admin-server address, and
- which disposable machine credentials must be re-enrolled.

Runtime sockets, locks, login sessions, temporary files, autorenew keytabs,
and private keys sealed to the source machine are not backup assets. Copy the
completed directory as a unit to protected off-host storage.

### CA consistency

A CA backup uses its protected local control socket. The CA
briefly pauses durable mutations, captures its CA vault, certificate and CRL,
issuance and revocation records, authoritative map, delegation state, audit
material, and referenced role configuration into memory, then resumes service
before writing the target.

That CA snapshot has a versioned manifest signed by the CA key. The
CA vault remains encrypted; possession of the bundle does not reveal the CA
key without the separately stored recovery password.

## Prepare CA recovery

When a CA is created, netidx displays its recovery password once. Store it in
an offline credential system under a different failure domain from the backup.
Check that the recovery slot exists with:

```console
netidx admin ca recovery status
```

While the original CA still works, a lost or exposed recovery password
can be replaced locally:

```console
netidx admin ca recovery rotate
```

Record the newly displayed password and retire the old copy.

## Restore a workstation or publisher

Install the same or a compatible netidx release on a clean replacement
machine, copy the bundle to it, and run:

```console
netidx admin restore /srv/restore/workstation-2026-07-12
```

Local, anonymous, and Kerberos configurations need no CA ceremony. Kerberos
credentials managed by the site's realm remain an external dependency.

For TLS, restore generates a fresh key on the replacement machine, protects it
with the local TPM/Secure Enclave when available, and queues normal enrollment.
The user's terminal shows the request code; an administrator sees the same
identity and code in the CA queue. Network loss while waiting is harmless:
repeat the restore command after connectivity returns. A byte-identical staged
restore is resumed; different live configuration is never overwritten.

The source machine's TLS certificate is retained only as restoration metadata.
Its private key is not transplanted.

## Restore a resolver satellite

Run the same command:

```console
netidx admin restore /srv/restore/eu-resolver-2026-07-12
```

Restore first re-enrolls the resolver's data-plane identities. It then submits
an admin-server replacement enrollment containing:

- the requested roles,
- listen address,
- stable resolver cluster and base,
- resolver members, and
- the immutable UUID of the failed server being replaced.

The approving administrator sees all of those facts in the CLI or TUI. On
approval the CA grants a fresh server UUID in the same resolver cluster,
removes the failed UUID, and immediately revokes every old serving certificate.
The active CA cannot be replaced through this ceremony.

If the CA cannot be found at the address recorded in the bundle, name
a verified candidate explicitly:

```console
netidx admin restore /srv/restore/eu-resolver-2026-07-12 \
  --admin-server CA.example.com:4565
```

No credential is sent until the candidate is verified against the backup's
pinned CA identity and confirmed to be the active CA.

## Restore a CA

### 1. Fence the old CA

Before unlocking the backup, prove the old CA cannot return to the
network. Power it off and remove its network access, revoke its cloud or
hypervisor identity, or use the site's normal split-brain fencing procedure.

Software on the replacement host cannot prove that the old machine is dead.
Restore therefore requires an explicit attestation:

```text
--old-CA-fenced
```

### 2. Run restore on a clean host

When the replacement host keeps the old addresses, omit the address options.
When its addresses change, supply both the CA address and the
co-located resolver's advertised address. `--resolver-bind` is needed only
when the resolver binds a different local interface address, such as behind
NAT:

```console
netidx admin restore /srv/restore/CA-2026-07-12 \
  --old-CA-fenced \
  --listen 10.0.0.20:4565 \
  --resolver-listen 10.0.0.20:4564 \
  --resolver-bind 10.0.0.20 \
  --recovery-password-stdin
```

The TUI asks for the replacement CA address and, when the bundle also
contains a resolver, its advertised address and local bind IP. It detects the
replacement host's interfaces just as installation does: the suggested IP and
bind come from the current machine, while each port comes from the backup.
Review the values when restoring behind NAT or inside a container.

Use `--recovery-password-file` for automation with a short-lived mode-0600
file supplied by the site's secret manager. Never place the password directly
on the command line.

Restore verifies the complete outer bundle and the signed CA snapshot
before writing. It then:

1. restores the CA and authoritative administrative state,
2. verifies the CA fingerprint and CA UUID against the admin domain map,
3. generates fresh CA serving and autorenew credentials sealed to the
   replacement machine,
4. issues a serving certificate carrying the same CA UUID,
5. revokes all superseded CA serving certificates and republishes the
   CRL,
6. relocates managed paths and updates the CA address,
7. recreates and starts the recorded OS service, and
8. re-enrolls any co-located resolver identities through the now-running
   CA, then reconciles the CA-owned resolver endpoint and hierarchy.

For a combined CA-and-resolver restore, the resolver address change is
one operation: restore updates the owned member in `resolver.json`, the local
`client.json`, the install's bootstrap hint, and the authoritative admin domain map.
The server UUID, resolver cluster UUID, placement, roles, and data-plane authentication
do not change. The CA then pushes the updated topology to registered
admin servers. A failed target is reported by server UUID and address, and
repeating restore resumes the same idempotent reconciliation.

The old CA identity is preserved because it is the admin domain's sole
authority. All other machine identities are disposable and receive fresh
keys.

If the CA is an intermediate CA and its bundled certificate has
expired, have the external PKI issue a fresh certificate for the preserved CA
key, then include it in the same restore transaction:

```console
netidx admin restore /srv/restore/CA-2026-07-12 \
  --old-CA-fenced \
  --recovery-password-stdin \
  --external-cert netidx-intermediate.pem \
  --external-root corporate-root.pem
```

The replacement is accepted only when it carries the same CA key and chains to
the already pinned external issuer.

`--insecure-no-tpm` exists for disposable test CAs. It writes replacement
CA credentials in plaintext and is not appropriate for production.

### 3. Reconcile an offline site

At startup the recovered CA sends its address, authoritative map, and
current CRL to every registered server. Restore also reconciles resolver
member and referral configuration when a co-located resolver moved. If a site
is offline, repeat the idempotent reconciliation after it returns:

```console
netidx admin ca reconcile-CA \
  --server 10.0.0.20:4565 \
  --admin operations \
  --accept-glyph 'THE CONFIRMED GROUPED FINGERPRINT'
```

The result identifies every target by immutable UUID and address. Topology
reconciliation writes resolver configuration but never restarts a resolver.
Use the normal rolling procedure: restart one resolver cluster member, wait its
delay-reads interval for publishers to republish, then restart the next. There
is no automatic delayed restart or background retry.

## Validate and drill

After any restore, verify the role's status, service state, and one normal data
operation. After CA recovery also confirm the preserved CA glyph and
CA UUID, inspect the admin-server roster, and check that superseded
certificates are revoked.

A backup is proven only by a restore drill. Periodically restore onto an
isolated VM, record the release and manifest digest, exercise the required
credential and approval paths, then destroy the test secrets.
