# after_idle
```
after_idle(timeout: Expr, val: Expr)
```

After idle sets a timer when `val` updates, when the timer expires it
updates with the value produced by `val`. If `val` updates again
before the timer expires, then the timer is reset. The timer is a
number of seconds, fractional seconds are accepted, as well as
durations.

```
store("/foo", after_idle(0.8, event()))
```

E.G, do the store only after the user has stopped typing for 800ms.

