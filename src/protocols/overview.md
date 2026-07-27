# Higher Level Protocols Built on Netidx

Netidx is meant to be a building block out of which more complex things can be
constructed. The `netidx-protocols` crate currently provides bidirectional
channels (including a typed Pack channel), RPC, and lightweight service
clustering. The following chapters cover RPC and clustering; the channel API
is also what the channel stress tool exercises.
