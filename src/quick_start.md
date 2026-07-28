# Quick Start

Choose the setup that matches what you want to try. The commands are the same
on Linux, macOS, and Windows.

## One machine: a standalone workstation

Use this when you want to experiment with netidx on one development machine.
Install [Rust](https://www.rust-lang.org/tools/install) if necessary, then run:

```console
cargo install netidx-tools
netidx admin workstation install --with-service
```

This installs a local resolver and matching client rooted at `/local`. Start a
publisher in one terminal and leave it running:

```console
netidx publisher
/local/hello|string|hello from netidx
```

In another terminal, read the value:

```console
netidx subscriber -o /local/hello
```

The configuration lives in the platform's normal per-user configuration
directory: `~/.config/netidx` on Linux, `~/Library/Application Support/netidx`
on macOS, and `%APPDATA%\netidx` on Windows.

## Several machines: a secure local network

This walkthrough creates one TLS-secured resolver that is also the admin
domain's CA, then joins a workstation to it. It uses the interactive TUI
throughout. Install the tools on both machines first:

```console
cargo install netidx-tools
```

The names and addresses in these screenshots are examples. Use a domain and
LAN addresses appropriate for your network.

### Create the admin domain and resolver

On the machine that will remain running as the resolver, start the TUI:

```console
netidx admin
```

**1. Start the installation.** On a fresh machine, read the welcome message and
press **Enter**.

![The welcome message on a fresh machine.](./quick-start/resolver/01-welcome.png)

**2. Select Resolver.** Use the arrow keys to select **Resolver**, then press
**Enter**.

![Resolver selected in the role list.](./quick-start/resolver/02-select-resolver.png)

**3. Create the admin domain.** Select **Create a new admin domain (creates a
CA)**. This creates the admin domain's one active CA on this resolver host.

![Creating a new admin domain.](./quick-start/resolver/03-create-admin-domain.png)

**4. Acknowledge the CA setup.** The installer explains that a new admin
domain needs a certificate authority. Press **Enter**.

![The installer explains that it will create a CA.](./quick-start/resolver/04-ca-required.png)

**5. Name the admin domain.** Enter the domain name under which this admin
domain will be discovered. The example uses `netidx.test`.

![Entering the admin domain's domain name.](./quick-start/resolver/05-domain.png)

**6. Record the CA identity.** The new CA displays a glyph and grouped
fingerprint. This is the identity that joining machines must confirm. Save it
somewhere the workstation operator can verify independently, then press
**Enter**.

![The newly created CA's glyph and grouped fingerprint.](./quick-start/resolver/06-ca-identity.png)

**7. Store the recovery password off the machine.** This password can unlock
the CA vault after loss of the original host. Store it in your normal secrets
or disaster-recovery system before acknowledging the screen; it cannot be
shown again.

> The credential visible below belonged to the deleted, disposable CA used for
> this walkthrough. Never publish a recovery password for a live CA.

![The one-time CA recovery-password screen.](./quick-start/resolver/07-recovery-password.png)

**8. Choose the admin-server address.** Enter a LAN address that other machines
can reach, not a loopback address. The example resolver is `192.168.50.11`.

![Entering the admin server's listen address.](./quick-start/resolver/08-admin-listen-address.png)

**9. Choose the admin-server port.** The conventional port is `4565`; accept it
unless it conflicts with your network policy.

![Entering the admin server's listen port.](./quick-start/resolver/09-admin-listen-port.png)

**10. Create the first administrator.** Enter the name this administrator will
use when authorizing enrollment and other CA operations.

![Entering the first CA administrator's name.](./quick-start/resolver/10-root-admin-name.png)

**11. Set the administrator password.** The password is masked while you type
and is stored only as an Argon2 password verifier in the CA vault.

![Entering the first CA administrator's password.](./quick-start/resolver/11-root-admin-password.png)

**12. Continue to the resolver.** The CA is now installed.
Press **Enter** to configure the resolver role on the same machine.

![The CA setup is complete and resolver setup is next.](./quick-start/resolver/12-ca-complete.png)

**13. Select TLS authentication.** This secures and authenticates data-plane
connections between the resolver and its clients.

![TLS selected as the resolver authentication scheme.](./quick-start/resolver/13-auth-scheme.png)

**14. Name the resolver certificate.** Enter the resolver's DNS label. It is
joined with the admin domain name to form the certificate name; this
example becomes `resolver.netidx.test`.

![Entering the resolver certificate name.](./quick-start/resolver/14-resolver-name.png)

**15. Protect the resolver private key.** Choose **seal** when the machine has a
supported TPM or Secure Enclave. Sealing binds the key to this machine while
still allowing unattended service startup. Password protection is the
portable fallback; **none** is suitable only for disposable systems.

![Selecting private-key protection for the resolver.](./quick-start/resolver/15-key-protection.png)

**16. Choose the resolver address.** Enter the reachable LAN address on which
the resolver will accept data-plane connections.

![Entering the resolver's listen address.](./quick-start/resolver/16-resolver-listen-address.png)

**17. Choose the resolver port.** The conventional resolver port is `4564`.

![Entering the resolver's listen port.](./quick-start/resolver/17-resolver-port.png)

**18. Register the OS service.** Select **Yes** so the CA, resolver, and
supporting components start automatically.

![Registering the resolver installation as an OS service.](./quick-start/resolver/18-register-service.png)

**19. Finish the install.** The result confirms that configuration was written
and the service was registered. Dismiss it with any key.

![The successful resolver-install result.](./quick-start/resolver/19-installed.png)

**20. Check local status.** The TUI now shows the resolver as running and offers
its local administrative operations.

![The running resolver on the TUI Local tab.](./quick-start/resolver/20-status.png)

### Join the workstation

On the workstation, start the same TUI:

```console
netidx admin
```

**1. Start the installation.** Read the welcome message and press **Enter**.

![The welcome message on the fresh workstation.](./quick-start/workstation/01-welcome.png)

**2. Select Workstation.** A workstation combines a local `/local` resolver
with a matching client configuration.

![Workstation selected in the role list.](./quick-start/workstation/02-select-workstation.png)

**3. Join the admin domain.** Select **Join an admin domain** rather than
installing a standalone workstation.

![Choosing to join an existing admin domain.](./quick-start/workstation/03-join-admin-domain.png)

**4. Select the discovered admin domain.** The TUI searches the local network
and lists what it finds, with each candidate's CA glyph and fingerprint. A
discovery result is only a candidate; nothing sensitive has been sent yet.

![A discovered admin domain and its CA glyph.](./quick-start/workstation/04-select-admin-domain.png)

**5. Confirm the CA identity.** Compare both the glyph and grouped fingerprint
with the copy recorded on the resolver in step 6. Reject the admin domain if
either differs. Once accepted, the workstation pins all further setup to this
exact CA.

![Confirming the discovered admin domain's CA identity.](./quick-start/workstation/05-confirm-ca.png)

**6. Choose the workstation certificate name.** This is the workstation's TLS
identity, defaulted from the machine's name. The example uses
`root.netidx.test`.

![Entering the workstation's TLS certificate name.](./quick-start/workstation/06-tls-name.png)

**7. Protect the workstation private key.** Choose hardware sealing when it is
offered, password protection when portability is required, or **none** only for
a disposable machine. This lab workstation did not offer hardware sealing.

![Choosing private-key protection on the workstation.](./quick-start/workstation/07-key-protection.png)

**8. Enroll without an administrator present.** Select **No**. The
administrator is at the resolver rather than at this machine, so the request
goes to the CA's enrollment queue for approval. Select **Yes** instead when you
are sitting at the machine with the administrator password to hand; the TUI
then asks for that password directly and skips the queue.

![Choosing queued enrollment.](./quick-start/workstation/08-admin-present.png)

**9. Send the verification code to the administrator.** The workstation now
waits, displaying a code and a glyph derived from the key it just generated.
Send them to the administrator over any channel you can both recognize each
other on. The install blocks here until the request is approved.

![The queued enrollment request and its verification code.](./quick-start/workstation/09-queued.png)

#### Approve the enrollment

Leave the workstation waiting and return to the resolver, where the
administrator approves the request.

**a. Open the Admin Domain tab.** Press **Tab** to switch tabs. The admin
domain this machine hosts is listed with its CA glyph.

![The Admin Domain tab listing the local admin domain.](./quick-start/approve/01-admin-domains-tab.png)

**b. Authenticate as an administrator.** Press **Enter** to connect, then enter
the administrator name created in step 10 of the resolver install.

![Entering the administrator name.](./quick-start/approve/02-admin-name.png)

**c. Enter the administrator password.**

![Entering the administrator password.](./quick-start/approve/03-admin-password.png)

**d. Open the Enrollment Queue.** It is the first entry in the panel list.

![The connected admin panel menu.](./quick-start/approve/04-panel-menu.png)

**e. Read the pending request.** The queue shows the requested name, the role,
and the same glyph and code the workstation is displaying.

![The pending enrollment request with its glyph and code.](./quick-start/approve/05-enrollment-queue.png)

**f. Compare, then approve.** Press **a**. The confirmation repeats the code and
glyph. Approve only if they match what the workstation operator sent you. This
comparison is the whole security of enrollment: it is what stops an attacker
who can reach the network from having a certificate issued to them.

![Confirming the enrollment against the code sent out of band.](./quick-start/approve/06-approve-confirm.png)

**g. Assign id-map groups.** The default `users` group suits this example. Your
own administrator policy caps which groups you may assign.

![Assigning the new identity to the users group.](./quick-start/approve/07-id-map-groups.png)

**h. The certificate is issued.** The workstation, still waiting, receives it
and continues.

![The approved enrollment.](./quick-start/approve/08-approved.png)

#### Finish on the workstation

**10. Register the OS service.** Select **Yes** so the local resolver and client
support services start automatically.

![Registering the workstation as an OS service.](./quick-start/workstation/10-register-service.png)

**11. Finish the install.** Dismiss the successful result with any key.

![The successful workstation-install result.](./quick-start/workstation/11-installed.png)

**12. Check local status.** The workstation is now running and enrolled in the
TLS admin domain.

![The running workstation on the TUI Local tab.](./quick-start/workstation/12-status.png)

### Try the secure connection

On the resolver machine, start a publisher and leave it running. Fresh resolver
permissions give each authenticated identity full control under
`/users/<identity>`; the resolver certificate created above is
`resolver.netidx.test`:

```console
netidx publisher
/users/resolver.netidx.test/quick-start/message|string|hello from the resolver
```

On the workstation, read it through the local resolver. The local resolver
follows its configured parent to the network resolver, and the connection is
authenticated with the certificate issued during enrollment:

```console
netidx subscriber -o /users/resolver.netidx.test/quick-start/message
/users/resolver.netidx.test/quick-start/message|string|"hello from the resolver"
```

This single-resolver layout is intentionally small. A serious installation
normally runs at least two resolver members per resolver cluster so they can be
restarted one at a time without interrupting clients. Continue with
[Administration](./administration/overview.md) for redundant resolver clusters,
authorization, backup and recovery, and larger hierarchies. The admin plane is
a provisioning and operations convenience; netidx's data plane also works with
configuration files maintained entirely by other tools.

If something goes wrong, rerun the relevant command with `RUST_LOG=debug` for
detailed diagnostics.
