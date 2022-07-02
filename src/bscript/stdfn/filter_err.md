# filter_err
```
filter_err(Expr)
```

Filters out errors in expr. This is equivelent to
`filter(not(is_error(expr)), expr)`, but is more concise.

```
filter_err(load("/foo"))
```

get the non error values of `/foo`


