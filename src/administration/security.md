# Admin-Plane Security

The admin plane is separate from the resolver, publisher, and subscriber data
plane. It is also optional: a deployment may be managed entirely through
configuration files and never run an admin server.

This chapter starts with the authority model an administrator needs in order
to operate the system safely. It then explains the certificate and glyph trust
ceremony. The wire identities, request classes, discovery rules, and session
internals are collected under [Implementation details](#implementation-details)
for readers who need to audit the mechanism.

## Who holds the power

An admin domain has one active **CA** — the admin server that holds the
certificate authority. It is the central enforcer for the admin domain.

- Administrators authenticate to the CA. It applies their policy and
  decides whether an operation is allowed.
- The CA owns the authoritative record of admin servers, resolver
  clusters, roles, and the resolver hierarchy.
- All remote administrative changes are authorized and dispatched by the
  CA. It sends each approved change to the affected machines and
  records the result.
- Other admin servers are satellites. They serve their local resolver or
  identity-map role, but they do not become administrative authorities and
  cannot order changes on other machines.
- Satellites accept remote mutations only from their home CA.

The normal flow is therefore:

```text
administrator  →  CA  →  selected satellite(s)  →  local change
                         │
                         └── authoritative admin domain map and audit record
```

This is the most important security property in the system: compromising an
ordinary satellite must not give an attacker CA authority. Additional
CAs trusted for data-plane federation do not gain that authority either.

The CA is consequently both powerful and operationally important.
Compromise of its host, the CA recovery password, or a signing-tier
administrator is a CA compromise. If the CA is offline, enrollment
and remote administration stop, but existing resolvers, publishers, and
subscribers keep operating. On-box privileged controls and hand-edited
configuration also remain available.

## How certificates and glyphs establish trust

Every admin server has a certificate issued by its home CA.
Certificates let a satellite distinguish its CA from every other
machine, and let the CA distinguish one enrolled satellite from
another. The CA's certificate carries the additional authority to
issue remote changes; ordinary admin-server certificates do not.

Certificates solve machine-to-machine authentication after trust exists. A
human still has to establish that trust the first time. Netidx represents a
certificate or enrollment key with a **glyph**: a colored 8×8 identicon plus a
grouped fingerprint code. Two screens showing the same glyph represent the
same key.

The glyph is compared over an independent channel. For example, the person
installing a satellite can send a screenshot or read the grouped code over a
phone call. The CA administrator approves only when the independently
received glyph matches the request shown by the CA. Network discovery
alone is never sufficient evidence.

After the CA glyph has been confirmed, an administrative client verifies the
CA before it sends an administrator password or login session. A real
satellite can offer discovery information, but it cannot persuade the client
to reveal credentials by claiming to be the CA.

## What enrollment looks like

Enrollment is deliberately two-person-friendly. The joining user proves
possession of a newly generated private key; the administrator decides what
that key is allowed to represent.

A workstation joining a TLS admin domain uses this ceremony to obtain its client
certificate. It does not thereby become an admin server or acquire a place in
the authoritative map. A workstation joining a Kerberos or anonymous admin domain
still confirms the CA glyph used to identify the admin domain, but it has no TLS
client-certificate request to approve. Admin-server enrollment uses the same
glyph ceremony and additionally requests roles, a listen address, and resolver
resolver cluster placement.

| Joining user or node | CA administrator |
|---|---|
| Selects the requested certificate identity. An admin server also supplies its requested roles, resolver addresses, and resolver cluster placement. | Opens the CA's **Enrollment Queue**. |
| Generates the private key locally. The private key never crosses the network. | Sees the requested role, listen address, resolver members, and resolver cluster base or ID. |
| Sends a certificate request and sees its glyph and grouped code. | Sees the same request glyph and code. |
| Sends that glyph to the administrator out of band, then waits. Losing the network while waiting is recoverable. | Compares the glyphs and checks that the requested placement and roles are appropriate before approving or denying. |
| Receives the signed certificate after approval. An admin server then registers its granted identity. | The CA issues the certificate. For an admin server, it records the grant and updates the authoritative map. |

Approval does not allow the joining machine to invent its identity or rewrite
the map. The CA, acting as the certificate authority, assigns the
identity and records the approved roles and resolver cluster placement before
registration. Registration merely activates that existing grant and reports
the node's current address.

## Administrator accounts and sessions

Administrators have named slots with policies in the CA vault. A
signing-tier administrator has full authority; role administrators may be
limited to particular path scopes and operations. Policy is evaluated by the
CA when the operation is performed, not copied permanently into a
client.

An administrator may authenticate with a password for one operation or use
`netidx admin login` to create a reusable session. The password is sent only to
the verified CA. A successful login lets the CLI or TUI reuse a
short-lived bearer session without retaining the password. Removing the
administrator, rotating the password, or reducing the policy takes effect
immediately for existing sessions.

Persistent session caches are sealed by the platform TPM or Secure Enclave.
If sealing is unavailable, one-shot password authentication remains possible
and the TUI may keep a session only in process memory.

## Revocation, outages, and partial changes

Certificate revocation is authoritative immediately at the CA. The
CA distributes the updated revocation list to registered nodes; an
unreachable site is reported as a failed target rather than silently treated
as updated.

The same rule applies to other multi-machine operations. A WAN partition can
leave a change only partly delivered. Results identify each target, and the
operator repeats the idempotent operation after connectivity returns. There is
no durable background job that unexpectedly retries a change later.

The admin plane never automatically restarts resolver members. Resolver
members do not replicate to or communicate with one another. When a resolver
configuration change requires a restart, restart one member, wait its
`delay-reads` period for publishers to republish, verify it, and only then
restart the next member.

## Implementation details

Everything below explains how the preceding authority model is enforced. It
is useful for security review and troubleshooting but is not required for
day-to-day operation.

### Certificate identities

Every admin-server certificate contains the DNS SAN
`netidx-admin-server`, used for TLS name verification, and exactly one URI
identity:

```text
urn:netidx:admin:server:<uuid>
```

Only the CA certificate also contains:

```text
urn:netidx:admin:role:ca
```

The CA creates server and resolver-cluster UUIDs; an enrollee cannot
choose them. Renewal may rotate the key and SPKI, but preserves the server UUID
and CA marker. A second live CA identity cannot be issued
until the old one is revoked.

Each node stores its server UUID and exact home-CA fingerprint in
`admin-server.json` and checks them against its serving certificate at startup.
An address is mutable routing data; the UUID is identity. `trusted.pem` may
contain other CAs for data-plane federation, but admin authorization is pinned
to the exact home CA rather than to any certificate in that bundle.

### Bootstrap and CA verification

The first contact with an admin domain is a no-secret inspection. mDNS and direct
addresses choose candidate machines; they do not establish trust. mDNS
includes the actual admin socket address, including a non-standard port. A
direct connection accepts `host:port`; a bare hostname uses port 4565.

After the operator confirms the CA glyph, the client:

1. pins the admin domain to that home-CA fingerprint,
2. treats the bootstrap server's map and peer list only as candidate hints,
3. resolves and connects to the CA under the same home CA, and
4. requires the expected CA identity and CA role in its
   certificate.

Only then does it collect, unseal, or transmit an administrator credential.

The protocol is length-delimited [Pack](../protocols/overview.md) over TLS.
Protocol version 6 is an epoch: peers require exact equality before a request
or credential is sent. Compatible releases append defaulted fields and retain
old fields; removals, changed tags, or security-sensitive semantic breaks
advance the epoch. Admin servers, clients, and renewal daemons must be upgraded
together across an epoch change.

### Request authorization classes

Every request is assigned one class in a central classifier:

| Class | Required caller | Examples |
|---|---|---|
| Public | No authenticated admin identity | discovery hints, CRL fetch, enrollment submission and polling |
| CA only | Home CA's certificate carrying the CA role | apply permission, referral, CRL, identity-map, CA-state, and service-control changes |
| Node self | Admin-server certificate issued by the home CA | register or deregister only that certificate's server identity |
| Admin authenticated | Verified CA plus administrator password or session | approve enrollment or delegation, issue or revoke, edit permissions, manage administrators, remove a server |
| Local only | Protected on-box control socket | the CA component of a role-level backup, recovery/autorenew credential rotation, and external-CA CSR or certificate installation |

The local endpoint is not a loopback TCP shortcut. On Unix it is a mode-0600
socket, and the server checks peer credentials for root or the daemon UID.

### Authoritative admin domain map

The CA owns the admin domain map. Server records are keyed by immutable
server UUID and contain the mutable admin address, granted roles,
resolver-resolver cluster UUID, and enrollment state. Only registered servers are
routing targets. Resolver clusters have stable UUIDs and are either pending or
active; pending resolver clusters are excluded from normal routing.

Enrollment approval creates the grant before registration. Every
non-CA admin server must have the resolver role. The CA role
is never accepted from an enrollee, and the identity-map role is granted
explicitly. A role administrator may approve only resolver cluster bases covered by
their enrollment scopes and roles included in their allowed set.

Registration is identity-implicit. A node may update only its own admin
address. Its reported resolver members, base, and referral topology must match
the CA-approved resolver cluster. It cannot change its identity, roles, placement,
another node, or arbitrary map content.

Security-sensitive reads use the verified CA's map. Maps cached on
satellites remain discovery hints. Before sending a mutation, the CA
verifies the target's exact server UUID. Permission changes go to registered
members of the selected resolver cluster, service control to the selected server UUID,
and identity registration only to registered servers granted the identity-map
role.

![The CA's Admin Servers panel distinguishes immutable identities from
mutable addresses and protects the active CA from
removal.](./tui-admin-servers.png)

### Password and session handling

The CA authenticates administrator passwords with Argon2 and never
stores a reusable plaintext password. Failed network attempts are throttled by
source address (IPv6 by `/64`): each failure adds one second of delay within a
ten-minute sliding window. Only one password KDF per source runs at once, and a
global semaphore bounds aggregate Argon2 memory use.

Login creates a random 256-bit bearer token. The CA retains only its
SHA-256 hash in memory, associated with the vault slot's stable UUID and
credential revision. Defaults are an eight-hour absolute lifetime, a
30-minute idle timeout, and 4096 sessions. A CA restart invalidates
every session.

The CA resolves the slot and its current policy on every use. Removing
and recreating an administrator with the same name does not revive an old
session. Password rotation invalidates existing sessions; policy reductions
and expansions apply immediately.

The client keeps one sealed cache per normalized CA fingerprint. An explicit
password takes precedence over a cache. Expired or rejected caches are deleted,
and logout always deletes the local cache while making a best-effort server-side
revocation.

### Fanout, audit, and reconciliation

CA fanout is limited to 32 concurrent targets with a per-target
timeout. Results are sorted by server UUID and include the last known address.
Every operation receives an operation ID carried in target logs, the
CA's audit records, and the response.

Removing a dead server revokes all live serving certificates for its UUID,
removes its grant, recomputes resolver cluster membership, and distributes the new
topology and CRL. The active CA cannot be removed this way. Fanout has
no durable job storage or automatic retries; repeating the corresponding
idempotent operation is the manual reconciliation path.

Disaster recovery cannot prove that an old CA will never return.
Fencing the old host is an operator responsibility and a mandatory part of the
[recovery procedure](./backup_recovery.md).
