# eval

```
eval(Expr)
```

Compiles and executes the browser script program specified by it's
argument, or produces an error if the program is invalid. This will
produce a node event graph that keeps running until the text of the
code fed to eval changes, which will cause the new program to be
evaluated. As such, once eval is successful for a specific program,
that program will not be semantically distinguisible from bscript that
is part of a view definition or in a container cell.

e.g.
```
eval(load("[base]/program"))
```

Load and execute browser script from `[base]/program`.


