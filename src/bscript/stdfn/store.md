# store

```
store(path: Expr, val: Expr)
```

store writes val to the specified path assuming it is valid. Store
does not evaluate to anything (in the future it may evaluate to the
result of the store).

A new write will be initiated each time the value of either argument
changes. For example, if the path changes to a new valid path, then
the most recent val will be written immediatly to that new path.

e.g.
```
store("/tmp/thing", 42)
```

write 42 to /tmp/thing


