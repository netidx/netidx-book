# strip_prefix

```
strip_prefix(pfx: Expr, val: Expr)
```

assuming both it's arguments are strings, then strip_prefix evaluates
to val with pfx removed from the beginning.

e.g.
```
strip_prefix("Hello ", "Hello World!")
```

evaluates to "World!"


