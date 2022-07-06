# current_path
```
current_path()
```

Return the current path of the view in netidx (e.g. the .view netidx
value), or nothing if the view is being loaded from a file. This is
useful if you have an application that the view needs to interact
with, and you want to make the view independent of where the
application is published in netidx.

```
store("[current_path()]/play", event())
```

When the user clicks the play button, store `null` in `play` relative
to wherever the application lives in netidx.

