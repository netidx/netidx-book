# replace

```
replace(pat: Expr, replacement: Expr, val: Expr)
```

assuming all it's arguments are strings then replace evaluates to val
with all instances of pat replaced with replacement.

e.g.
```
replace("foo", "bar", "foobarbaz")
```

evaluates to "barbarbaz"


