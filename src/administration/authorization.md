# Authorization

When using the Kerberos, Local, or Tls auth mechanisms we also need to
specify permissions in the cluster config file, e.g.

``` json
...
"perms": {
    "/": {
        "eric@RYU-OH.ORG": "swlpd"
    },
    "/solar": {
	    "svc_solar@RYU-OH.ORG": "pd"
    }
}
```

In order to do the corresponding action in netidx a user must have
that permission bit set. Permission bits are computed starting from
the root proceeding down the tree to the node being acted on. The bits
are accumulated on the way down. Each bit is represented by a 1
character symbolic tag, e.g.

- !: Deny, changes the meaning of the following bits to deny the
  corresponding permission instead of grant it. May only be the first
  character of the permission string.
- s: Subscribe
- w: Write
- l: List
- p: Publish
- d: Publish default

For example if I was subscribing to
`/solar/stats/battery_sense_voltage` we would walk down the path from
left to right and hit this permission first,

``` json
"/": {
    "eric@RYU-OH.ORG": "swlpd"
},
```

This applies to a Kerberos principal "eric@RYU-OH.ORG", the resolver
server will check the user principal name of the user making the
request, and it will check all the groups that user is a member of,
and if any of those are "eric@RYU-OH.ORG" then it will `or` the
current permission set with "swlpd". In this case this gives me
permission to do anything I want in the whole tree (unless it is later
denied). Next we would hit,

``` json
"/solar": {
    "svc_solar@RYU-OH.ORG": "pd"
}
```

Which doesn't apply to me, and so would be ignored, and since there
are no more permissions entries my effective permissions at
`/solar/stats/battery_sense_voltage` are "swlpd", and so I would be
allowed to subscribe.

Suppose however I changed the above entry,

``` json
"/solar": {
    "svc_solar@RYU-OH.ORG": "pd",
    "eric@RYU-OH.ORG": "!swl",
}
```

Now, in our walk, when we arrived at `/solar`, we would find an entry
that matches me, and we would remove the permission bits s, w, and l,
leaving our effective permissions at
`/solar/stats/battery_sense_voltage` as "pd". Since that doesn't give
me the right to subscribe my request would be denied. We could also do
this by group.

``` json
"/solar": {
    "svc_solar@RYU-OH.ORG": "pd",
    "RYU-OH\domain admins": "!swl",
}
```

As you would expect, this deny permission will still apply to me
because I am a member of the domain admins group. If I am a member of
two groups, and both groups have different bits denied, then all of
them would be removed. e.g.

``` json
"/solar": {
    "svc_solar@RYU-OH.ORG": "pd",
    "RYU-OH\domain admins": "!swl",
    "RYU-OH\enterprise admins": "!pd",
}
```

Now my effective permissions under `/solar` are empty, I can do
nothing. If I am a member of more than one group, and one denies
permissions that the other grants the deny always takes precidence.

Each server cluster is completely independent for permissions. If for
example this cluster had a child cluster, the administrators of that
cluster would be responsible for deciding it's permissions map.

### Dynamic Entries (`$[user]` and `$[group]`)

The normal entries above are *static* — entity names and paths are
fixed. Two template patterns let an entry match a *family* of
identities or paths at evaluation time.

**`$[user]`** is a per-user subtree pattern. The path ends in
`$[user]` and the entity inside the entry is literally `$[user]`. At
lookup time the resolver substitutes the connecting principal's name
for `$[user]` and grants the listed bits to the matching child:

``` json
"/users/$[user]": {
    "$[user]": "swlpd"
}
```

means "the direct child of `/users` whose name matches the
connecting user's principal gets `swlpd`". So `alice@RYU-OH.ORG`
gets full rights under `/users/alice@RYU-OH.ORG/**`, while
`bob@RYU-OH.ORG` gets full rights under `/users/bob@RYU-OH.ORG/**`,
and neither can touch the other's subtree.

Two constraints to be aware of. First, a `$[user]` path may not
appear directly under root — the PMap loader rejects it because the
dirname of `/$[user]` is empty. Anchor the entry under a real
directory (the conventional one being `users`, so `/users/$[user]`
or `<base>/users/$[user]`). Second, the entity inside a `$[user]`
entry can only be the literal `$[user]` — there's no mixing it with
named entities in the same entry.

**`$[group]`** is the analogous pattern for groups, with one
extra degree of freedom: the entity may *contain* `$[group]` as a
substring, letting you encode a prefix or suffix. The basename of
the path must contain `$[group]`. At lookup the resolver takes the
basename being accessed, substitutes it into the entity's
`$[group]` template, and checks whether the user is a member of
the resulting group. For example:

``` json
"/team/$[group]": {
    "RYU-OH\\$[group]": "swl"
}
```

means "to access `/team/operations`, the user must be a member of
`RYU-OH\operations`; to access `/team/finance`, the user must be a
member of `RYU-OH\finance`". The prefix lets one entry cover a
whole organisational-unit naming convention without listing each
group by hand.

### The Default Seeded `perms.json`

`netidx admin workstation install` and `netidx admin resolver install`
auto-seed a starter `perms.json` (unless you pass `--no-perms` or
`--perms-seed`). Its shape is:

``` json
{
    "<base>": {
        "users": "swl"
    },
    "<base>/users/$[user]": {
        "$[user]": "swlpd"
    }
}
```

where `<base>` is the resolver's base path (`/local` for the
workstation template, `/` for the standalone resolver).

The first entry grants every member of the `users` group the right
to subscribe (`s`), write (`w`), and list (`l`) anywhere under the
resolver's base — read-and-write of existing paths, but *not*
publish (so a user can't drop new top-level paths into other
people's subtrees). The second entry — the `$[user]` dynamic — gives
each authenticated user full rights (`swlpd`) under their *own*
subtree `<base>/users/<their-name>/**`.

This produces a shared read-write tree at the resolver's base, plus
a per-user playground under `<base>/users` — a sensible default for
a workstation. The `users`-group entry assumes group resolution
returns `users` for human accounts; for TLS deployments wire
`netidx admin resolver install --auth tls` to the [id-map
daemon](./id_map.md) and add identities there.

### Anonymous

It's possible to give anonymous users permissions even on a Kerberos
or Local auth mechanism system, and this could allow them to use
whatever functions you deem non sensitive, subject to some
limitations. There is no encryption. There is no tamper
protection. There is no publisher -> subscriber
authentication. Anonymous users can't subscribe to non anonymous
publishers. Non anonymous users can't subscribe to anonymous
publishers. You name anonymous "" in the permissions file, e.g.

``` json
"/tmp": {
    "": "swlpd"
}
```

Now `/tmp` is an anonymous free for all. If you have Kerberos
deployed, it's probably not that useful to build such a hybrid system,
because any anonymous publishers would not be usable by kerberos
enabled users. However it might be useful if you have embedded systems
that can't use kerberos, and you don't want to build a separate
resolver server infrastructure for them.

### Groups

You'll might have noticed I'm using AD style group names above, that's
because my example setup uses Samba in ADS mode so I can test windows
and unix clients on the same domain. The most important thing about
the fact that I'm using Samba ADS and thus have the group names I have
is that it doesn't matter. Groups are just strings to netidx, for a
given user, whatever the `id` command would spit out for that user is
what it's going to use for the set of groups the user is in (so that
better match what's in your permissions file). You need to set up the
resolver server machines such that they can properly resolve the set
of groups every user who might use netidx is in.

Luckily you only need to get this right on the machines that run
resolver servers, because that's the only place group resolution
happens in netidx. You're other client and server machines can be as
screwed up and inconsistent as you want, as long as the resolver
server machine agrees that I'm a member of "RYU-OH\domain admins" then
whatever permissions assigned to that group in the permission file
will apply to me.

All the non resolver server machines need to be able to do is get
Kerberos tickets. You don't even need to set them up to use Kerberos
for authentication (but I highly recommend it, unless you really hate
your users), you can just force people to type `kinit foo@BAR.COM`
every 8 hours if you like.
