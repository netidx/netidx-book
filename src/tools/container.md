# Container

The container is a persistent store for netidx values — a bit like a
pasteboard, or a NoSQL database. At startup it scans its database and
*advertises* every path it owns so subscribers can discover them.
When a subscriber actually asks for a path, the container publishes
that value and serves updates; once the last subscriber disconnects
it stops publishing and drops the value from memory (though the
underlying sled page cache may keep it warm for a while). When an
authorised user writes to a published value the new value is
persisted to the database and pushed to other subscribers.

The container installs a *default publisher* at one or more
user-chosen roots so that subscribing to a path that doesn't exist
yet creates an empty entry — write to it and the value persists. That
default-publisher behaviour can be turned off per subtree with
`lock-subtree` when free-form creation isn't what you want.

> **A note on formula cells**: earlier versions of the container
> exposed a reactive formula engine built on `bscript`. That engine
> has been removed. The on-disk representation still has a `Formula`
> variant alongside `Data` (so old databases load), but cells with a
> stored formula are served as plain values — the formula text is
> kept verbatim and never evaluated. There is no `set-formula` RPC
> any more, and no `ref` / `rel` / spreadsheet recalculation. A
> graphix-based replacement may land in a future release; the
> intermediate state is documented here so nobody hunts for an
> evaluator that isn't there.

## Administration

### Args

- `--db <path>` — path to the sled database file.
- `--api-path <path>` — netidx path under which the container
  publishes its RPC interface and db stats.
- `-b, --bind <spec>` — bind address (e.g. `local`, `192.168.0.0/16`,
  `127.0.0.1:5000`).
- `-a, --auth <mechanism>` — `anonymous`, `local`, `krb5`, or `tls`.
- `-c, --config <path>` — alternate client config.
- `--identity <name>` — TLS identity (uses `default_identity` when
  omitted).
- `--spn <spn>` / `--upn <upn>` — Kerberos service / user principal
  names.
- `--cache-size <bytes>` — sled page cache size (defaults to
  whatever sled uses when unset).
- `--timeout <seconds>` — drop slow subscribers that haven't
  consumed an update in this many seconds; `0` disables the timeout.
- `--max_clients <n>` — maximum simultaneous subscribers; default 768.
- `--slack <batches>` — publisher slack (max queued batches per
  client); default 3.
- `--sparse` — don't even advertise paths; subscribers must already
  know the names they want. Use this for very large databases where
  the resolver-side advertise traffic would itself be a problem.
- `--compress` — *reserved*; currently a no-op because the sled
  version in use conflicts with the zstd dependency the dictionary
  flow needs. Left in the CLI so the flag stays stable for the day
  it lands.

### A Note About Memory Use

The intro glosses over how cold the container actually is at rest.
The container *scans* its database at startup but doesn't publish
anything yet; it just *advertises* the paths to the resolver. That
middle ground — tell the resolver "I have these names" without
actually owning the bytes — means a container with millions of paths
costs almost no resident memory until subscribers arrive. As soon as
a subscription lands the container publishes the path, holds the
value in memory for as long as the subscription is active, and drops
it again once it goes idle.

`--sparse` skips the advertise step entirely. That trades discovery
(no `netidx resolver list` or browser tree-walking) for being able to
serve truly enormous datasets that a network of subscribers picks
through by name.

## RPCs

The container's RPC interface is the only way to do several things:
add or remove roots, lock subtrees, create the sheet/table helpers,
and so on. The RPCs are published under the configured `--api-path`,
alongside a small set of status values (db busy state, pending write
count, etc).

### add-root

```
add-root(path)
```

Adds `path` as a root. The container becomes a default publisher for
the subtree rooted there, so subscriptions to non-existent paths
under it auto-create entries. At least one root must be added before
the container does anything. Roots can be disjoint, but a root may
not be added underneath an existing root. Adding a root *above*
existing roots is allowed; you'll typically remove the now-redundant
child roots after.

```
add-root("/solar/gui");
add-root("/tmp");
```

### remove-root

```
remove-root(path)
```

Removes `path` as a root. The container stops being a default
publisher for the subtree. If the removed root had no parent root,
all data under it is also deleted.

### lock-subtree

```
lock-subtree(path)
```

Disable default-publisher creation under `path`. In a locked subtree,
only paths that already exist or are added by RPC can show up; ad-hoc
subscriptions to new paths fail rather than creating empty entries.

The lock state is hierarchical:

```
path      locked
----      ------
/tmp      true
/tmp/ffa  false
```

Locking `/tmp` and then `unlock-subtree("/tmp/ffa")` produces the
above: `/tmp` is locked, `/tmp/ffa` is once again a free-for-all.

### unlock-subtree

```
unlock-subtree(path)
```

The inverse of `lock-subtree`. Either removes a subtree's lock entry,
or marks an inner subtree as locally unlocked under a locked parent.

### set-data

```
set-data(path, value)
```

Set one or more cells to plain data values. `path` and `value` may be
specified multiple times to set multiple cells in one call. `value`
is optional and defaults to `null`. Cells that don't exist are
created regardless of their subtree's lock state.

```
set-data(
    path=string:/tmp/the-cake,
    value=bool:false,
    path=string:/tmp/is-a-lie,
    value=bool:true
)
```

### delete

```
delete(path)
```

Remove one or more paths from the database and stop publishing them.
Current subscribers are unsubscribed. If the subtree isn't locked,
durable subscribers may immediately re-add the path by resubscribing
(but the prior data is gone).

### delete-subtree

```
delete-subtree(path)
```

Remove everything under the specified path(s). No undo. Worth
restricting to administrators.

### create-sheet

```
create-sheet(path, rows, columns, max-rows, max-columns, lock)
```

Helper that pre-creates a tree structured like a numbered
spreadsheet at `path` — `/<path>/<row>/<col>`, with row/col indices
zero-padded so they sort correctly. `rows` and `columns` are the
initial extents. `max-rows` / `max-columns` (optional) tune the
padding width; if you exceed them later the cells still work but
the sort order goes wrong. `lock` defaults to true.

```
create-sheet(path=string:/tmp/sheet, rows=u64:1000000, columns=u64:10)
```

Pre-creating a million-row sheet takes some time and disk; for big
sheets it's often better to start small and grow with
`add-sheet-rows` / `add-sheet-columns`. Use `max-rows` to reserve
enough digits up front:

```
create-sheet(
    path=string:/tmp/sheet,
    rows=u64:1000,
    columns=u64:10,
    max-rows=u64:1000000
)
```

### add-sheet-rows / add-sheet-columns / delete-sheet-rows / delete-sheet-columns

```
add-sheet-rows(path, rows)
add-sheet-columns(path, columns)
delete-sheet-rows(path, rows)
delete-sheet-columns(path, columns)
```

Grow or shrink a previously-created sheet by the given count. Deletes
remove from the end of the sheet; to delete a specific row by index,
use `delete-subtree` directly on that row's path.

### create-table

```
create-table(path, row, column, lock)
```

Helper that creates a tree structured as a named table — `row` and
`column` are repeatable label arguments and become the row/column
names. Renders in the browser as a table.

```
create-table(
    path=string:/tmp/table,
    row=string:01,
    row=string:02,
    row=string:03,
    column=string:widget,
    column=string:implemented
)
```

### add-table-rows / add-table-columns / delete-table-rows / delete-table-columns

```
add-table-rows(path, row)
add-table-columns(path, column)
delete-table-rows(path, row)
delete-table-columns(path, column)
```

Add or remove the named rows/columns from a table created with
`create-table`. Row and column arguments are repeatable.
