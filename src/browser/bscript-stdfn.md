The standard bscript functions reference. These functions are
available in all systems using bscript (currently the browser and the
container server).

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

# all

```
all(Expr, ..., Expr)
```

All produces the value of it's first argument if the values of all
it's arguments are equal.

```
all(11, load("/volume"))
```

Will produce 11 only when `/volume` is 11.

# and

```
and(Expr, ..., Expr)
```

Produces true if all of it's arguments are true, otherwise false.

e.g.
```
and(load("/cake"), load("/diet"))
```

Would produce false.

# any

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

# array
```
array(Expr, Expr, ...)
[ Expr, Expr, ... ]
```

Construct an array from the values of the specified expressions. If
any of the expressions update, a new array will be constructed with
the updated values and the array function will update.

```
[ load("/foo"), load("/bar") ]
```

Construct a pair from the values of "/foo" and "/bar", update the pair
whenever either of those values changes.

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

# call

```
call(rpc: Expr, Expr, ..., Expr)
```

Call the netidx rpc specified by the first argument, passing the
specified keyword arguments, and producing the return value of the
call. Keyword arguments are encoded as pairs of a name followed by a
value.

e.g.
```
set(
  "sessionid",
  call(
    "/solar/archive/session", 
    "start", "-10d", 
    "speed", "unlimited", 
    "play_after", "2s"
  )
)
```

call `/solar/archive/session` with arguments to replay the last 10
days, starting 2 seconds after the call finishes, at unlimited speed,
and store the resulting session id in the variable sessionid.

# cast

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

# cmp

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

# contains

```
contains(sub: Expr, string: Expr)
```

contains is true if it's arguments are both strings, and it's first
argument is a substring of it's second argument.

e.g
```
contains("bar", "foobarbaz")
```

is true

# count

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

# divide

```
divide(Expr, Expr, ..., Expr)
```

Divides it's first argument by it's subsuquent arguments.

```
divide(load("/volume"), 2, load("/additional_divisor"))
```

First divides `"/volume"` by 2 and then divides it by
"/additional_divisor".

# do

```
do(Expr, ..., Expr)
{ Expr; ...; Expr }
```

Do evaluates to the value of it's final argument, all other arguments
are evaluated for side effect. Each do block aside from the toplevel
one introduces a new lexical scope, let variables defined in such a
scope are not visible outside it.

e.g.
```
{
    let foo <- "Hello world!";
    store("/tmp/foo", foo);
    foo
}
```

evaluates to "Hello world!", but also sets the variable "foo", and
stores it's value to "/tmp/foo".

# ends_with

```
ends_with(Expr, Expr)
```

ends_with is true if both it's arguments are strings, and the second
argument ends with the first argument.

e.g.
```
ends_with("foo", "metasyntacticfoo")
ends_with("hello", "hello world")
```

The first ends_with is true, and the second one is false

# eval

```
eval(Expr)
```

Compiles and executes the browser script program specified by it's
argument, or produces an error if the program is invalid. This will
produce a node event graph that keeps running until the text of the
code fed to eval changes, which will cause the new program to be
evaluated. As such, once eval is successful for a specific program,
that program will not be semantically distinguisible from bscript that
is part of a view definition or in a container cell.

e.g.
```
eval(load("[base]/program"))
```

Load and execute browser script from `[base]/program`.

# filter_err
```
filter_err(Expr)
```

Filters out errors in expr. This is equivelent to
`filter(not(isa("error")), expr)`, but is more concise.

```
filter_err(load("/foo"))
```

get the non error values of `/foo`

# filter

```
filter(predicate: Expr, Expr)
```

filter evaluates to it's second argument if it's first argument
evaluates to true, otherwise it does not pass any events. Note: When
the predicate transitions from false to true then filter will
immediatly evaluate to the last value of it's second argument that it
saw.

e.g.
```
filter(load("[enabled]"), load("[thing]"))
```

Passes on updates to "[thing]" only if "[enabled]" is true

# get

```
get(var: Expr)
var
```

Produce the value of the variable specified by var, or an error if var
is not a valid variable name. The second form is syntactic sugar that
translates into `get("var")`.

# if

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

# index
```
index(array: Expr, index: Expr)
```

returns the zero based indexed element from the specified
array. Returns an error if it's first argument isn't an array, or if
the index is out of bounds.

```
index([1, 2, 5], 2) => 5
```

# isa

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

# is_error

```
is_error(Expr)
```

is_error evaluates to true if it's argument evaluates to an error.

e.g.
```
do(
    set("val", load("/tmp/thing")),
    if(is_error(val), "#REF", val)
)
```

if load("/tmp/thing") fails then evaluate to "#REF" otherwise to the
value of load("/tmp/thing").

# load

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

# max

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

# mean

```
mean(Expr)
```

Computes the average of it's argument over time.

e.g.
```
mean(load("/volume"))
```

Produce the average volume over the observed time period.

# min

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

# not

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

# once
```
once(Expr)
```

Returns the value of expr one time. Ignores subsuquent updates.

```
let foo <- once(filter_err(load("/foo")))
```

Save a snapshot of the first non error value of `/foo`.

# or

```
or(Expr, ..., Expr)
```

Produces true if any of it's arguments is true, otherwise false.

e.g.
```
or(load("/cake"), load("/death"))
```

Would produce true.

# product

```
product(Expr, ..., Expr)
```

Produces the product of it's arguments.

e.g. 
```
product(2, 2)
```

# replace

```
replace(pat: Expr, replacement: Expr, val: Expr)
```

assuming all it's arguments are strings then replace evaluates to val
with all instances of pat replaced with replacement.

e.g.
```
replace("foo", "bar", "foobarbaz")
```

evaluates to "barbarbaz"

# sample

```
sample(Expr, Expr)
```

Produces the value of it's second argument when it's first argument
updates.

e.g.
```
sample(load("[base]/timestamp"), load("[base]/voltage"))
```

Produces `[base]/voltage` whenever `[base]/timestamp` updates.

# set

```
set(name: Expr, val: Expr)
name <- val
```

Store the value of val in the variable specified by name. Return
nothing, or an error if name is not a valid variable name. Set will
set the variable defined in the lexical scope closest to it. If the
variable is not defined yet, then set will set it in the global
scope. The second form is a more consise syntax for the first, however
it is less powerful, as name must be a literal name and may not be an
expression.

e.g.
```
set("volume", cast("f32", event()))
```

# starts_with

```
starts_with(pat: Expr, val: Expr)
```

evaluates to true if both it's arguments are strings, and the second
argument starts with the first.

e.g.
```
starts_with("Hello", "Hello World!")
```

evaluates to true

# store

```
store(path: Expr, val: Expr)
```

store writes val to the specified path assuming it is valid. Store
does not evaluate to anything (in the future it may evaluate to the
result of the store).

A new write will be initiated each time the value of either argument
changes. For example, if the path changes to a new valid path, then
the most recent val will be written immediatly to that new path.

e.g.
```
store("/tmp/thing", 42)
```

write 42 to /tmp/thing

# let

```
let(name: Expr, val: Expr)
let name <- val
```

Let is does the same thing as set except that it always sets the
variable in it's own lexical scope. If no variable is defined in it's
lexical scope, then it will define it there. If the variable is
defined in a parent scope, let will cause it to be masked in the
current scope and it's children.

e.g.
```
{
    let v <- 42;
    {
        let v <- 43;
        v
    }; # evals to 43
    v
} # evals to 42
```

# string_concat

```
string_concat(Expr, ..., Expr)
```

Concatinate all arguments.

e.g.

```
string_concat(load("/foo"), load("/bar"), "baz")
```

is the same as writing `"[load("/foo")][load("/bar")]baz"`. And in
fact string interpolations are just syntactic sugar for this function.

# string_join

```
string_join(sep: Expr, ..., Expr)
```

Concatinate all arguments from 2 ... n using the first argument as a
separator.

e.g.

```
string_join("/", base, "foo", "bar")
```

is the same a writing `"[base]/foo/bar"`

# strip_prefix

```
strip_prefix(pfx: Expr, val: Expr)
```

assuming both it's arguments are strings, then strip_prefix evaluates
to val with pfx removed from the beginning.

e.g.
```
strip_prefix("Hello ", "Hello World!")
```

evaluates to "World!"

# strip_suffix

```
strip_suffix(sfx: Expr, val: Expr)
```

assuming both it's arguments are strings, then strip_suffix evaluates
to val with sfx removed from the end.

e.g.
```
strip_suffix(" World!", "Hello World!")
```

evaluates to "Hello"

# sum

```
sum(Expr, ..., Expr)
```

Produces the sum of it's arguments.

e.g.
```
sum(load("/offset"), load("/random"))
```

sums `/offset` and `/random`

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

# trim_end

```
trim_end(Expr)
```

if it's argument is a string, then trim_end evaluates to it's argument
with trailing whitespace removed.

e.g
```
trim_end("123456   ")
```

evaluates to "123456"

# trim

```
trim(Expr)
```

if it's argument is a string, then trim evalutes to it's argument with
both leading and trailing whitespace removed.

e.g.
```
trim(" aaaaaaaaahhhg  ")
```

evaluates to "aaaaaaaaahhhg"

# trim_start

```
trim_start(Expr)
```

if it's argument is a string, then trim_start evaluates to it's argument
with leading whitespace removed.

e.g
```
trim_start("   123456")
```

evaluates to "123456"

# uniq

```
uniq(Expr)
```

Produces the value of it's argument only if that value is different
from the previous one.

e.g.
```
uniq(load("[stock_base]/ibm/last"))
```

Would produce an event only when the last trade price of IBM changes.
