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

Initially it's value will be u64:42. If "/foo/baz" updates but
"/foo/bar" does not, then it's value will be the value of
"/foo/baz". If both "/foo/bar" and "/foo/baz" update then it's value
will be the value of "/foo/bar".

# all

```
all(Source, ..., Source) -> Source
```

Creates a source who's value is only defined if the values of all it's
arguments are equal. Consider,

```
all(constant(u64, 11), load_path("/volume"))
```

If "/volume" is not 11 then no matter how it changes all will not have
a value, however as soon as "/volume" goes to 11 then the value of all
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

First divides "/volume" by 2 and then divides it by
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

produces the value of "/volume" if it is less than or equal to 42,
otherwise it produces 42.

# max

Creates a source who's value is the value of it's largest argument, or
an error if it's arguments are incompatible types.

e.g.
```
max(constant(u64, 5), load_path("/volume"))
```

produces the value of "/volume" if it is greater than or equal to 5,
otherwise it produces 5.

