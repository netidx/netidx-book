# set

```
set(name: Expr, val: Expr)
name <- val
```

Store the value of val in the variable specified by name. Return
nothing, or an error if name is not a valid variable name. Set will
set the variable defined in the lexical scope closest to it. If the
variable is not defined yet, then set will set it in the global
scope. The second form is a more consise syntax for the first, however
it is less powerful, as name must be a literal name and may not be an
expression.

e.g.
```
set("volume", cast("f32", event()))
```


