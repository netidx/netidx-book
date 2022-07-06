# filter

```
filter(predicate: Expr, Expr)
```

filter evaluates to it's second argument if it's first argument
evaluates to true, otherwise it does not pass any events. Note: When
the predicate transitions from false to true then filter will
immediatly evaluate to the last value of it's second argument that it
saw.

e.g.
```
filter(load("[enabled]"), load("[thing]"))
```

Passes on updates to "[thing]" only if "[enabled]" is true


