Browser specific bscript functions. These are only defined in the
browser.

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

# event

```
event()
```

Produces a widget specific event depending on which widget and which
event handler the pipeline containing it is attached to. For example,
when attached to an entry `on_change` handler it produces the string
value of the entry whenever the user changes the text. When attached
to the on_activate handler of the entry, it produces the string value
of the entry when the user presses the Enter key. When attached to the
`on_click` handler of a button, it produces Null every time the button
is clicked.

e.g.
```
store("/text", event())
```

When attached to the `on_change` event of an entry would write the
text to `/text` every time the user changes it.

# navigate

```
navigate(Expr)
```

Navigate the browser to the location specified by it's first
argument. The syntax of a location is one of, 

- a valid absolute netidx path, e.g. /foo/bar/baz
- a view file e.g. file:/path/to/view/file
- a netidx: prefixed netidx path, e.g. netidx:/foo/bar/baz

e.g.
```
navigate(confirm("go to ", "file:[next_view]"))
```

