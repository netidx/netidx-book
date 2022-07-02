# call

```
call(trigger: Expr, rpc: Expr, Expr, ..., Expr)
```

Call the netidx rpc specified by the second argument, passing the
specified keyword arguments, and producing the return value of the
call. Keyword arguments are encoded as pairs of a name followed by a
value. The rpc will only be called when the specified `trigger`
updates. If the trigger is a constant then the rpc will only be called
one time after all the args are resolved.

e.g.
```
let sessionid <- call(
  null,
  "/solar/archive/session", 
  "start", "-10d", 
  "speed", "unlimited", 
  "play_after", "2s"
)
```

call `/solar/archive/session` one time with arguments to replay the
last 10 days, starting 2 seconds after the call finishes, at unlimited
speed, and store the resulting session id in the variable `sessionid`.
