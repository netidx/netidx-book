# once
```
once(Expr)
```

Returns the value of expr one time. Ignores subsuquent updates.

```
let foo <- once(filter_err(load("/foo")))
```

Save a snapshot of the first non error value of `/foo`.


