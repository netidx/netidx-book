# sample

```
sample(Expr, Expr)
```

Produces the value of it's second argument when it's first argument
updates.

e.g.
```
sample(load("[base]/timestamp"), load("[base]/voltage"))
```

Produces `[base]/voltage` whenever `[base]/timestamp` updates.


