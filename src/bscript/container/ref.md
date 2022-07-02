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
