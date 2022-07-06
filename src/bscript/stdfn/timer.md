# timer
```
timer(duration: Expr, repeat: Expr)
```

Set a timer, which will update after `duration` seconds has
elapsed. If repeat is true, the timer will continue to update every
`duration` seconds forever. If repeat is a number `n`, then the timer
will repeat `n` times. If repeat is `false`, then the timer will
update just once.

```
store("/foo/bar", sample(timer(0.5, true), v))
```

Store the value of v to `/foo/bar` twice per second even if it didn't
change.


