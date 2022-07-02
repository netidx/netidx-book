Container server specific bscript functions. These are only definied in the container.

# event
```
event()
```

When placed in an on_write formula, event produces the value that the
user wrote. The final value of the formula becomes the value that is
actually saved.

```
filter_err(sum(ref(rel(1)), event()))
```

Sum the user's input with the column to the right to produce the final
saved value, but filter out errors in case the user tries to write a
non numeric value.

# ref
```
ref(path: Expr)
```

This is equivelent to `load(path)`, however it is vastly more
efficient. It only works for paths published by the same container
server as is running the formula containg `ref`.

```
ref("/container/sheet0/0000/001")
```

# rel
```
rel()
rel(col: Expr)
rel(row: Expr, col: Expr)
```

Return the path of a cell relative to the position of the cell `rel`
is in. In the first form `rel()`, the path of the current cell will be
returned. In the second form `rel(col)`, the path to a cell in the
same row, but a different column will be returned. In the third form
`rel(row, col)`, the path to a cell in a different row and column will
be returned. The `row` and `col` arguments must be integers between
-255 and 255.

```
sum(1, ref(rel(-1)))
```

Add 1 to the value in the column to the left of this formula.
