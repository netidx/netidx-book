# string_join

```
string_join(sep: Expr, ..., Expr)
```

Concatinate all arguments from 2 ... n using the first argument as a
separator.

e.g.

```
string_join("/", base, "foo", "bar")
```

is the same a writing `"[base]/foo/bar"`


