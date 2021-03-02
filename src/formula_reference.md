# Language Overview

The browser scripting language exists to glue the widgets in your gui
to the inputs and outputs in netidx. If you're familiar with the model
view controller gui paradigm, browser script is the controller
layer. Because of it's purpose it works rather differently from most
scripting languages, in that it is a 'reactive' or 'incremental'
language. Instead of describing e.g. "steps the computer performs when
I click the button" like most other languages browser script describes
the plumbing that events flow through on their way to their final
destination.

For example the event handler for a button might look like so,
```
store("[base]/app/do_action", event())
```

The store function writes it's 2nd argument to the netidx path
specified by it's first argument. The event function produces a widget
specific event, in this case it produces a Null whenever the button is
clicked. The path argument is actually a string with an expression
interpolation that will generate the path we will write to. So we can
think of this expression as building an event pipeline that looks
something like this,

```
load_var(base) ------------1-> concat_string ----
                                ^                |
                                |                |
"/app/do_action" -------------2-                 1
                                                 v
event() -----------------------------------2-> store
```

So not only do we write a Null whenever the button is clicked, but we
also change were we write whenever the variable `base`
changes. Constants like `"/app/do_action"` never change.

# Types and Constants

Types in browser script correspond to the netidx value type, and are
named,

- u32: unsigned 4 byte integer
- v32: unsigned leb128 encoded integer
- i32: signed 4 byte integer
- z32: signed leb128 zig-zag encoded integer
- u64: unsigned 8 byte integer
- v64: unsigned leb128 encoded integer
- i64: signed 8 byte integer
- z64: signed leb128 zig-zag encoded integer
- f32: single precision floating point number
- f64: double precision floating point number
- bool: boolean
- string: unicode string
- bytes: byte array
- result: ok or error:description of error

Constants may be prefixed with the type name followed by a colon, e.g.

`f32:3.14`

However constant expressions have a default type if none is specified,

- floating point numbers: f64
- integers: u64
- strings: string
- true/false: bool
- ok: result

e.g. `3.1415` is the same as `f64:3.1415`, and both forms will be
accepted.

# Expression Interpolation

In a string literal you may substitute any number of expressions by
surrounding them with `[]`. To produce a literal `[` or `]` you must
escape them with `\`, e.g. `\[` and `\]`. To produce a literal `\` you
may escape it as well, e.g. `\\`. Any expression is a valid
interpolation (including another interpolation), e.g. numeric
expressions will be cast to strings. Any expression that cannot be
cast to a string will be ignored.

e.g.
```
"[base]/some/path"
"[base]/bar/[if(load("[base]/enabled"),"enabled","disabled")]/thing"
```

# Reference

## load

```
load(Expr)
```

Subscribes to the netidx path specified by it's argument, which must
evaluate to a string.

e.g.
```
load("/some/path/in/netidx")
load("[base]/thing")
```

## any

```
any(Expr, ..., Expr)
```

Any produces an event every time any of it's arguments produce an event.

```
any(42, load("/foo/bar"), load("/foo/baz"))
```

Will produce 42, and then all the updates to `/foo/bar` and `/foo/baz`
in whatever order they arrive.

```
mean(any(load("/bench/0/0"), load("/bench/0/1")))

```

Will produce the average of the values of `/bench/0/0` and
`/bench/0/1`.

## all

```
all(Expr, ..., Expr)
```

All produces an if the current values of all it's arguments are equal.

```
all(11, load("/volume"))
```

Will produce 11 only when `/volume` is 11.

## sum

```
sum(Expr, ..., Expr)
```

Produces the sum of it's arguments.

e.g.
```
sum(load("/offset"), load("/random"))
```

sums `/offset` and `/random`

## product

```
product(Expr, ..., Expr)
```

Produces the product of it's arguments.

e.g. 
```
product(2, 2)
```

## divide

```
divide(Expr, Expr, ..., Expr)
```

Divides it's first argument by it's subsuquent arguments.

```
divide(load("/volume"), 2, load("/additional_divisor"))
```

First divides `"/volume"` by 2 and then divides it by
"/additional_divisor".

## mean

```
mean(Expr)
```

Computes the average of it's argument over time.

e.g.
```
mean(load("/volume"))
```

Produce the average volume over the observed time period.

## min

```
min(Expr, ..., Expr)
```

Produces the smallest value of any of it's arguments.

e.g.
```
min(42, load("/volume"))
```

produces the value of `"/volume"` if it is less than 42, otherwise it
produces 42.

## max

```
max(Expr, ..., Expr)
```

Produces the largest value of any of it's arguments.

e.g.
```
max(5, load("/volume"))
```

produces the value of "/volume" if it is greater than 5, otherwise it
produces 5.

## and

```
and(Expr, ..., Expr)
```

Produces true if all of it's arguments are true, otherwise false.

e.g.
```
and(load("/cake"), load("/diet"))
```

Would produce false.

## or

```
or(Expr, ..., Expr)
```

Produces true if any of it's arguments is true, otherwise false.

e.g.
```
or(load("/cake"), load("/death"))
```

Would produce true.

## not

```
not(Expr)
```

Produces the opposite of it's argument, e.g. true if it's argument is
false, false otherwise.

e.g.
```
not(load("/solar/control/charging"))
```

true if the battery is not charging.

## cmp

```
cmp(Expr, Expr, Expr)
```

Produces the result of performing the comparison specified by it's
first argument to it's 2nd and third arugments. Valid comparisons are
encoded as strings, and are called,

- eq: true if the arguments are equal
- lt: true if the first argument is less than the second one
- lte: true if the first argument is less than or equal to the second one
- gt: true if the first argument is greater than the second one
- gte: true if the first argument is greater than or equal to the second one

e.g.
```
cmp("lt", load("/volume"), 11)
```

is true if the volume is less than 11, false otherwise.

## if

```
if(Expr, Expr, [Expr])
```

Produces the value of it's 2nd argument if it's first argument is
true, otherwise produces the value of it's third argument, or nothing
if it has no third argument.

e.g.
```
if(
    cmp("lt", load("/volume"), 11),
    load("/normal_amp"),
    load("/this_one_goes_to_11")
)
```

If "/volume" is less than 11 then the value is `"/normal_amp"`,
otherwise the value is `"/this_one_goes_to_11"`.

e.g.
```
if(cmp("eq", 11, load("/volume")), "huzzah!")
```

Produces `"huzzah!"` if `/volume` is `11`, otherwise nothing.

## cast

```
cast(Expr, Expr)
```

Attempt to cast the second argument to the type specified by the
first. Produce a value of the specified type, or an error if the cast
is not possible.

e.g.
```
cast("f32", load("/volume"))
```

Changes volume into a single precision float if possible.

## isa

```
isa(Expr, Expr)
```

Produce true if the 2nd argument is the type named by the first
argument, false otherwise.

e.g.
```
isa("f32", 10)
```

would produce false.

## eval

```
eval(Expr)
```

Compiles and executes the browser script program specified by it's
argument, or produces an error if the program is invalid.

e.g.
```
eval(load("[base]/program"))
```

Load and execute browser script from `[base]/program`.

## count

```
count(Expr)
```

Produces the count of events produced by expr since we started
execution of the pipeline.

e.g.
```
count(load("/volume"))
```

will increment every time volume changes.
