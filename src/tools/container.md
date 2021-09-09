# Container

The container is a persistent store for netidx values, a bit like a
pasteboard, or a nosql database. At startup it reads and publishes all
the data in it's database, and then waits for user interaction. When
an authorized user writes to one of it's published values it updates
that value in the database, and then updates the published value for
subscribers. To allow creation of new values it installs a default
publisher at one or more user chosen roots. If an authorized user
subscribes to a path that isn't in the database, then it will add a
new empty value to the database at that path. The user can then write
whatever value they wish to the new path, and it will persist in the
database.

As well as storing values, cells can be bscript formulas. In that case
instead of storing the cell value in the database the formula text is
stored, and the published value will be whatever the formula evaluates
to. An additional bscript expression can be added to a formula cell to
define what happens when it is written to, so a formula cell can form
a proper lens. The entire bscript api is supported, except for the
browser specific functions confirm, and navigate. There are two
additional functions specific to the container. ref and rel. ref
refers to a path that must be hosted by the same container, in
exchange for this restriction it's quite a bit faster than load. rel
takes advantage of the fact that trees can often be seen as tables to
allow you to get the path of a cell by offset to current cell. For
example rel(-1) gets the path of the cell in the same row, but 1
column to the left. rel(1) goes 1 column to the right. rel(-1, 0) gets
the path to the cell in the same column but 1 row up.

Because bscript is an incremental language it automatically recomputes
the value of a formula when something it depends on changes. Using the
helpers to create "sheets" you can create something a lot like a
google sheet or cloud excel sheet, multiple users can edit and view it
concurrently while keeping a consistent view. With a little browser
bscript you can even make it look like a spreadsheet.

Probably more interesting than replicating a cloud sheet is that you
aren't limited to "spreadsheet like things", you can use bscript
formulas to e.g. select and project data from elsewhere in netidx,
combine it with local data and compute interesting things. However the
most important difference of all is that unlike a spreadsheet the
things you compute in a container sheet are not locked into some gui,
they are available to be consumed by any authorized subscriber on the
network, just like anything else in netidx.

## Administration

### Args

- `--compress`: enable zstd compression
- `--compress-level <0-9>`: set the zstd compression level
- `--db`: the path to the db
- `--api-path <path>`: where to publish the rpc interface and db stats
- `--bind <spec>`: the ip specification to bind to
- `--spn <spn>`: the kerberos service principal name to publish as
- `--cache-size <bytes>`: the database cache size in bytes, default 1 gigabyte
- `--timeout <seconds>`: the time after which a slow subscriber will be disconnected 0 for no timeout
- `--sparse`: don't even advertise paths in the db

### A Note About Memory Use

There were some lies in the introduction. If you're a seasoned
sysadmin or DBA you might have cringed when you read "reads and
publishes all the data in it's database". From the point of view of
the casual user that is what happens, but the reality is more complex,
and a lot more efficient. The container does scan the database at
startup, but it doesn't immediately publish anything except
formulas. Instead it advertises all of the paths it has, which is a
middle way between just becoming a default publisher, and a full
publish. It tells the resolver server every path it could publish, but
doesn't actually publish any of them until right before a subscriber
asks for one. That means that it doesn't keep any of the data in the
database in memory unless there is a client subscribed to it, and as
soon as no client is subscribed it stops publishing and evicts the
data from memory (though the db layer may cache it for a while). You
can even turn off advertisements if you want to publish a truly huge
data set. Though, in that case the user is going to have to know the
name of the data they want, there will be no way to browse it, or
search it, only data that someone is subscribed to will even show up
in the resolver server.

## RPCs

The container has an extensive rpc api, and that is the only way to do
many things e.g. make a cell a formula, or add a root. Under it's
api-path it also publishes information about it's status, such as
whether the background database is currently busy, and how many write
transactions are queued.

### add-root

```
add-root(path)
```

Adds `path` as a root. This will cause the container to become a
default publisher for the subtree rooted at `path`. At least 1 root
must be added before the container will do anything. Roots can be
completely disjoint, however it is an error to add a root under an
existing root. It is not an error to add a new root above existing
roots, but for tidiness you should probably remove the child roots
after adding the parent.

e.g.
```
add-root("/solar/gui");
add-root("/tmp");
```

would make the container responsible for /tmp, and /solar/gui

### remove-root

```
remove-root(path)
```

Removes `path` as a root. This will cause the container to stop being
a default publisher for the subtree rooted at `path`. If the root you
are removing has no parent root, then all the data under it will also
be removed.

### lock-subtree

```
lock-subtree(path)
```

By default the container creates a free for all environment, any
authorized user can subscribe to any path they like that is under a
root and it will be created if it doesn't exist. This mode of
operation has it's uses, but sometimes it just creates unnecessary
chaos. lock-subtree turns off automatic creation by the default
publisher under the specified subtree. In a locked subtree, only paths
that already exist in the database, or are explicitly specified in RPC
calls can be created.

The lock is hierarchical, the lock state flows down the tree, so
you can express more complex situations if you need to. For example consider,

```
path      locked
----      ------
/tmp      true
/tmp/ffa  false
```

Everything under /tmp is locked, so you can't accidentally create e.g.
/tmp/foo, but everything under /tmp/ffa is unlocked, so it is once
again a free for all. Later we could lock /tmp/ffa/important-thing and
that would again be not a free for all. You get to the above table by
making two rpc calls.

e.g.
```
lock-subtree(/tmp)
unlock-subtree(/tmp/ffa)
```

### unlock-subtree

```
unlock-subtree(path)
```

See lock-subtree. unlock-subtree either removes a subtree completely
from being locked, or marks a subtree as locally unlocked.

### set-data

```
set-data(path, value)
```

Make the specified cell(s) plain data, and optionally set their
value(s). path and value may be specified multiple times and doing so
will cause multiple paths to be set. value is optional, and if
omitted, cells will be set to null. If any of the specified cells are
formula cells, they will be converted to data cells and the formulas
will be deleted. If any of the specified cells do not exist in the
database they will be added, regardless of the locked state of their
subtree.

e.g.
```
set-data(
    path=string:/tmp/the-cake,
    value=bool:false, 
    path=string:/tmp/is-a-lie,
    value=bool:true
)
```

### set-formula

```
set-formula(path, formula, on-write)
```

Make the specified cell(s) formula cells. If they are currently data
cells, delete the data and convert them to formula cells. If they
don't currently exist create them regardless of the locked state of
their subtree.

path may be specified multiple times to operate on multiple cells in
one call. formula, and on-write may be specified zero or more
times. If formula and/or on write are not specified they will be set
to null.

after `set-formula` has been called for a cell, the formula text and
the on-write formula text will be published under `path/.formula` and
`path/.on-write`. The formula and the on-write formula may be edited
by writing to those paths as well as by calling this rpc.

e.g.
```
set-formula(
    path=string:/tmp/sheet/00/01,
    path=string:/tmp/sheet/01/01,
    path=string:/tmp/sheet/02/01,
    path=string:/tmp/sheet/03/01,
    formula=string:sum(ref(rel(-1))\, 1)
)
```

set the first 4 rows of the second column of /tmp/sheet to be the
formula `sum(ref(rel(-1)), 1)`, which will add 1 to the corresponding
cell in the first column.

### delete

```
delete(path)
```

remove the specified path(s) from the database, whether data or
formula, and stop publishing them. Any current subscribers will be
unsubscribed. If the subtree isn't locked, durable subscribers may
readd the path(s) by immediately resubscribing (but the data is gone).

### delete-subtree

```
delete-subtree(path)
```

remove all the data and formulas under the specified paths(s). There
is no way to undo this, so you may want to restrict access to
administrators.

### create-sheet

```
create-sheet(path, rows, columns, max-rows, max-columns, lock)
```

This is a helper function to create a "spreadsheet like sheet" at the
specified path. It will create a tree structure that will render as a
table in the browser with numbered rows and columns,
e.g. /tmp/sheet/001/01 for row 1 column 1. rows is the initial number
of rows, and columns is the initial number of columns. max-rows and
max-columns are optional, and are used to set the string width of the
number components, if they aren't specified they will be computed from
rows and columns. While it is possible to exceed these values in a
sheet, as tree size is only limited by memory and disk space, the
sorting will be wrong if you do. lock is optional, default true, if
true the subtree of the table will be automatically locked.

e.g.
```
create-sheet(path=string:/tmp/sheet,rows=u64:1000000,columns=u64:10)
```

Would pre create a pretty large sheet. This will take a while and will
use some disk space, so you may want to use add-sheet-rows and/or
add-sheet-columns to fill in as you go. In case know we only need 10
columns, but we might need up to 1 million rows then we could do,

e.g.
```
create-sheet(
    path=string:/tmp/sheet,
    rows=u64:1000,
    columns=u64:10,
    max-rows=u64:1000000
)
```

and then we can `add-sheet-rows` in batches of 1k or more up to 1m.

### add-sheet-rows

```
add-sheet-rows(path, rows)
```

add rows to a previously created sheet

### add-sheet-columns

```
add-sheet-columns(path, columns)
```

add columns to a previously created sheet

### delete-sheet-rows

```
delete-sheet-rows(path, rows)
```

remove the specified number of rows from the end of sheet. If you want
to delete a specific row you can just just `delete-subtree`.

### delete-sheet-columns

```
delete-sheet-columns(path, columns)
```

remove the specified number of columns from the end of sheet

### create-table

```
create-table(path, row, column, lock)
```

Helper function to create a tree structure that will render in the
browser as a table, and will have the specified row(s) and
column(s). row and column must be specified one or more times.

e.g.
```
create-table(
    path=string:/tmp/table,
    row=string:01,
    row=string:02,
    row=string:03
    column=string:widget,
    column=string:implemented
)
```

will create a table with two columns "widget" and "implemented" and
three rows "01", "02", and "03".

### add-table-rows

```
add-table-rows(path, row)
```

add the row(s) to the specified table.

### add-table-columns

```
add-table-columns(path, column)
```

add the column(s) to the specified table.

### delete-table-rows

```
delete-table-rows(path, row)
```

delete the specified row(s) from the table

### delete-table-columns

```
delete-table-columns(path, column)
```

delete the specified column(s) from the table
