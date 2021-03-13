# Command Line Subscriber

The command line subscriber allows you to subscribe to values in
netidx. You can either specify a list of paths you want to subscribe
to on the command line, or via commands sent to stdin. Once subscribed
a line in the form `PATH|TYPE|VALUE` will be printed for every update
to a subscribed value, including the initial value. e.g. on my local
network I can get the battery voltage of my solar array by typing,

```
netidx subscriber /solar/stats/battery_sense_voltage
/solar/stats/battery_sense_voltage|f32|26.796875
```

## Directives via stdin

The command line subscriber reads commands from stdin which can direct it to,
- subscribe to a new path
  - `ADD|/path/to/thing/you/want/to/add`
- end a subscription
  - `DROP|/path/to/thing/you/want/to/drop`
- write a value to a subscribed path
  - `WRITE|/path/to/thing/you/want/to/write|TYPE|VALUE`
  - if the path you are writing to has a `|` in it, then you must
    escape it, e.g. `\|`. If it has a literal `\` in it, then you also
    must escape it e.g. `\\`.

If the subscriber doesn't recognize a command it will print an error
to stderr and continue reading commands. If stdin is closed subscriber
will not quit, but it will no longer be possible to issue commands.

## Notes

The format subscriber writes to stdout is compatible with the format
the publisher reads. This is by design, to make applications that
subscribe, manipulate, and republish data easy to write.
