# basename
```
basename(path: Expr)
```

Return the base name, or file name, of the specified path as a
string. If the argument is not a string return an error. If the path
has no basename, or the string is not a path return `null`

```
basename("/foo/bar") => "bar"
basename("/solar/stats/battery_sense_voltage") => "battery_sense_voltage"
```


