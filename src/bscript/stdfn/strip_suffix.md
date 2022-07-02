# strip_suffix

```
strip_suffix(sfx: Expr, val: Expr)
```

assuming both it's arguments are strings, then strip_suffix evaluates
to val with sfx removed from the end.

e.g.
```
strip_suffix(" World!", "Hello World!")
```

evaluates to "Hello"


