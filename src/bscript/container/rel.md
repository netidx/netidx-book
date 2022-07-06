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
