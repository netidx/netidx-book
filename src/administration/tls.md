# Managing TLS

Tls authentication requires a bit more care than even Kerberos. Here we'll go over
a quick configuration using the openssl command line tool. I'll be using,

```
$ openssl version
OpenSSL 3.0.2 15 Mar 2022 (Library: OpenSSL 3.0.2 15 Mar 2022)
```

## Setting Up a Local Certificate Authority

Unless you already have a corporate certificate authority, or you actually want to buy
certificates for your netidx resolvers, publishers, and users from a commercial CA then
you need to set up a certificate authority. This sounds like a big deal, but it's actually
not. A CA is really just a certificate and accompanying private key that serves as the root
of trust. That means that it is self signed, and people in your organization choose to trust
it. It will then sign certificates for your users, publishers, and resolver servers, and they
will be configured to trust certificates that it has signed.

```
openssl genrsa -aes256 -out ca.key 4096
```

This will generate the private key we will use for the local ca. This is the most important
thing to keep secret. Use a strong password on it, and ideally keep it somewhere safe.

```
openssl req -new -key ./ca.key -x509 -sha512 -out ca.crt -days 7300 \
  -subj "/CN=mycompany.com/C=US/ST=Some State/L=Some City/O=Some organization" \
  -addext "basicConstraints=critical, CA:TRUE" \
  -addext "subjectKeyIdentifier=hash" \
  -addext "authorityKeyIdentifier=keyid:always, issuer:always" \
  -addext "keyUsage=critical, cRLSign, digitalSignature, keyCertSign" \
  -addext "subjectAltName=DNS:mycompany.com"
```

This will generate a certificate for the certificate authority and sign it with the private key.
The `-addext` flags add x509v3 attributes. Once this is complete we can view the certificate with

```
openssl x509 -text -in ca.crt
```

## Generating User, Resolver, and Publisher Certificates

Now we can create certificates for various parts of the netidx system. Lets make one for the resolver
server.

```
# generate the resolver server key. It must not be encrypted.
openssl genrsa -out resolver.key 4096

# generate a certificate signing request that will be signed our CA
openssl req -new -key ./resolver.key -sha512 -out resolver.req \
  -subj "/CN=resolver.mycompany.com/C=US/ST=Some State/L=Some City/O=Some organization"

# sign the certificate request with the CA key and add restrictions to it using x509v3 extentions
openssl x509 -req -in ./resolver.req -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out resolver.crt -days 730 -extfile <(cat <<EOF
basicConstraints=critical, CA:FALSE
subjectKeyIdentifier=hash
authorityKeyIdentifier=keyid:always, issuer:always
keyUsage=nonRepudiation,digitalSignature,keyEncipherment
subjectAltName=DNS:resolver.mycompany.com
EOF
)

 # check it
openssl verify -trusted ca.crt resolver.crt
```

This has one extra step, the generation of the request to be signed. If we were using a commercial
certificate authority we would send this request to them and they would return the signed certificate
to us. In this case it's just an extra file we can delete once we've signed the request.

The resolver server private key must not be encrypted, this is because it probably doesn't have any
way to ask for a password on startup, since it's likely running on a headless server somewhere.
So it's extra important to keep this certificate safe.

Generating user and publisher certificates is exactly the same as the above, except that they are
permitted to have password protected private keys. However if you do this, make sure there is an
`askpass` command configured, and that your system level keychain service is running and unlocked.
Once the password has been entered once, it will be added to the keychain and should not need to 
be entered again.

It's possible to use the same certificate for multiple services, however it's probably not a great
idea unless it's for multiple components of the same system (e.g. lots of publishers in a cluster),
or if a user is testing a new publisher it can probably just use their certificate.

## Distributing Certificates

With the configuration above you only need to distribute the CA certificate. Every netidx component
that will participate needs to have a copy of it, and it needs to be configured as trusted in the client
config, and the resolver server config.

Other components only need to have their own certificate, as well as their private key.
