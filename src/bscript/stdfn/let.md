# let

```
let(name: Expr, val: Expr)
let name <- val
```

Let is does the same thing as set except that it always sets the
variable in it's own lexical scope. If no variable is defined in it's
lexical scope, then it will define it there. If the variable is
defined in a parent scope, let will cause it to be masked in the
current scope and it's children.

e.g.
```
{
    let v <- 42;
    {
        let v <- 43;
        v
    }; # evals to 43
    v
} # evals to 42
```
