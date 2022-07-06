# Authorization

When using the Kerberos or Local auth mechanisms we also need to
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
