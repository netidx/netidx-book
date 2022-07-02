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
