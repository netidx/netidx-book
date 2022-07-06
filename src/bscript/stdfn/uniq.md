# uniq

```
uniq(Expr)
```

Produces the value of it's argument only if that value is different
from the previous one.

e.g.
```
uniq(load("[stock_base]/ibm/last"))
```

Would produce an event only when the last trade price of IBM changes.

