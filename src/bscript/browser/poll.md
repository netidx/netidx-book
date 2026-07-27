# poll

```
poll(path, trigger)
```

Checks whether the resolver subtree at `path` has changed whenever `trigger`
updates. If the resolver reports a change, `poll` produces `path`; otherwise it
produces no event. Changing `path` also requests a check of the new subtree.

This is useful for refreshing a derived list without polling continuously. For
example, a timer can periodically check a subtree and feed the path into code
that lists or redraws it:

```
poll("/apps", timer(5.0, true))
```
