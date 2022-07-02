# confirm

```
confirm(msg: Expr, val: Expr)
```

Asks the user msg with val appended, and if they say yes produces it's
second argument, otherwise does not produce anything.

e.g.
```
store(
  "[base]/volume", 
  confirm(
    "are you sure you want to change the volume to ", 
    volume
  )
)
```
Asks the user to confirm before writing the value of the variable
`volume` to `[base]/volume`.

