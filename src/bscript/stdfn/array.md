# array
```
array(Expr, Expr, ...)
[ Expr, Expr, ... ]
```

Construct an array from the values of the specified expressions. If
any of the expressions update, a new array will be constructed with
the updated values and the array function will update.

```
[ load("/foo"), load("/bar") ]
```

Construct a pair from the values of "/foo" and "/bar", update the pair
whenever either of those values changes.


