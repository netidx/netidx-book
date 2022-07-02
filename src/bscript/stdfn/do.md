# do

```
do(Expr, ..., Expr)
{ Expr; ...; Expr }
```

Do evaluates to the value of it's final argument, all other arguments
are evaluated for side effect. Each do block aside from the toplevel
one introduces a new lexical scope, let variables defined in such a
scope are not visible outside it.

e.g.
```
{
    let foo <- "Hello world!";
    store("/tmp/foo", foo);
    foo
}
```

evaluates to "Hello world!", but also sets the variable "foo", and
stores it's value to "/tmp/foo".


