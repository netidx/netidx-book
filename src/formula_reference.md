# Types

Types correspond to the netidx value type, and are used in various
places in formulas. Type names are,

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

# constant

```
constant(type, value) -> Source
or
constant(null) -> Source
```

Creates a constant source that always has the specified type and
value. There is an addional special form used to produce null.

e.g.
```
# always 42
constant(u64, 42) 

# always "hello world"
constant(string, "hello world")
```

# load_var

```
load_var(name) -> Source
```

Creates a source that references an internal variable. The source will
update when the variable updates. If the variable does not exist, then
the source will be Null.

e.g.
```
# references the internal variable foo
load_var(foo)
```

# load_path

```
load_path(path) -> Source
```

Creates a source the subscribes to the specified netidx path and who's
value is the value of the subscription.

e.g.
```
load_path("/some/path/in/netidx")
```

# any

```
any(Source, ..., Source) -> Source
```

Creates a source who's value is the value of the first argument with
an update. consider the source defined by,

```
any(constant(u64, 42), load_path("/foo/bar"), load_path("/foo/baz"))
```

Initially it's value will be u64:42. If `"/foo/baz"` updates but
`"/foo/bar"` does not, then it's value will be the value of
`"/foo/baz"`. If both `"/foo/bar"` and `"/foo/baz"` update then it's
value will be the value of `"/foo/bar"`.

# all

```
all(Source, ..., Source) -> Source
```

Creates a source who's value is only defined if the values of all it's
arguments are equal. Consider,

```
all(constant(u64, 11), load_path("/volume"))
```

If `"/volume"` is not 11 then no matter how it changes all will not have
a value, however as soon as `"/volume"` goes to 11 then the value of all
will be u64:11.

# sum

```
sum(Source, ..., Source) -> Source
```

Creates a source who's value is the sum of the values of all it's
arguments, or an error if they don't have compatible types.

e.g.
```
sum(constant(u32, 1), constant(u32, 2), constant(u32, 5), load_path("/counter"))
```

# product

```
product(Source, ..., Source) -> Source
```

Creates a source who's value is the produt of the values of all it's
arguments, or an error if they don't have compatible types.

e.g. 
```
product(constant(u32, 2), constant(u32, 2))
```

# divide

```
divide(Source, Source, ..., Source) -> Source
```

Creates a source who's value is the value of the first argument
divided by the values of subsuquent arguments successively, or an
error if any argument has an incompatible type.

```
divide(load_path("/volume"), constant(u32, 2), load_path("/additional_divisor"))
```

First divides `"/volume"` by 2 and then divides it by
"/additional_divisor".

# mean

```
mean(Source) -> Source
```

Creates a source that computes the average of it's argument over time.

e.g.
```
mean(load_path("/volume"))
```

Would produce the average volume over the observed time period.

# min

```
min(Source, ..., Source) -> Source
```

Creates a source who's value is the value of it's smallest argument,
or an error if it's arguments are incompatible types.

e.g.
```
min(constant(u64, 42), load_path("/volume"))
```

produces the value of `"/volume"` if it is less than or equal to 42,
otherwise it produces 42.

# max

```
max(Source, ..., Source) -> Source
```

Creates a source who's value is the value of it's largest argument, or
an error if it's arguments are incompatible types.

e.g.
```
max(constant(u64, 5), load_path("/volume"))
```

produces the value of "/volume" if it is greater than or equal to 5,
otherwise it produces 5.

# and

```
and(Source, ..., Source) -> Source
```

Creates a source who's value is true if all it's arguments are true,
and false otherwise (including if any argument is not a boolean).

e.g.
```
and(load_path("/cake"), load_path("/diet"))
```

Would produce false.

# or

```
or(Source, ..., Source) -> Source
```

Creates a source who's value is true if any of it's arguments are
true.

e.g.
```
or(load_path("/cake"), load_path("/death"))
```

Would produce true.

# not

```
not(Source) -> Source
```

Creates a source who's value is false if it's argument is true, true
if it's argument is false, or error if it's argument is not a boolean.

e.g.
```
not(load_path("/solar/control/charging"))
```

true if the battery is not charging.

# cmp

```
cmp(Source, Source, Source) -> Source
```

Creates a source who's value is the result of performing the
comparison specified by it's first argument on it's second and third
arguments. The following comparisons are supported,

- eq: true if the arguments are equal
- lt: true if the first argument is less than the second one
- lte: true if the first argument is less than or equal to the second one
- gt: true if the first argument is greater than the second one
- gte: true if the first argument is greater than or equal to the second one

e.g.
```
cmp(constant(string, "lt"), load_path("/volume"), constant(u64, 11))
```

is true if the volumen is less than 11, false otherwise.

# if

```
if(Source, Source, Source) -> Source
```

Creates a source who's value is the value of it's second argument if
it's first argument is true, and it's third argument otherwise.

e.g.
```
if(
    cmp(constant(string, "lt"), load_path("/volume"), constant(u64, 11)),
    load_path("/normal_amp"),
    load_path("/this_one_goes_to_11")
)
```

if "/volume" is less than 11 then the value is `"/normal_amp"`,
otherwise the value is `"/this_one_goes_to_11"`.

# filter

```
filter(Source, Source) -> Source
```

Creates a source who's value is the value of the second argument if
the first argument is true, and nothing if it is false.

e.g.
```
filter(
    cmp(constant(string, "gte"), load_path("/volume"), constant(u64, 11)),
    load_path("/this_one_goes_to_11")
)
```

Produces `"/this_one_goes_to_11"` if volume is 11 or higher, otherwise
nothing. Is it even worth listening to an amp that doesn't go to 11?

# cast

```
cast(Source, Source) -> Source
```

Creates a source who's value is the value of it's second argument
changed into the type specified by it's first argument, or an error if
the transformation is not possible.

e.g.
```
cast(constant(string, "f32"), load_path("/volume"))
```

Changes volume into a single precision float if possible.

