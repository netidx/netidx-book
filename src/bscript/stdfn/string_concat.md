# string_concat

```
string_concat(Expr, ..., Expr)
```

Concatinate all arguments.

e.g.

```
string_concat(load("/foo"), load("/bar"), "baz")
```

is the same as writing `"[load("/foo")][load("/bar")]baz"`. And in
fact string interpolations are just syntactic sugar for this function.


