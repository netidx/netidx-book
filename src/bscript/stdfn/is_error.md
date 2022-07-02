# is_error

```
is_error(Expr)
```

is_error evaluates to true if it's argument evaluates to an error.

e.g.
```
do(
    set("val", load("/tmp/thing")),
    if(is_error(val), "#REF", val)
)
```

if load("/tmp/thing") fails then evaluate to "#REF" otherwise to the
value of load("/tmp/thing").


