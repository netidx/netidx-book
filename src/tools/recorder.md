# Recorder

The recorder (currently available on Unix) subscribes to a set of paths defined by globs and
writes their values to a compact binary archive on disk. The same
process can serve replay sessions over netidx — multiple
simultaneous clients, each at their own start time, playback speed,
and position. A single recorder may record only, replay only, or do
both at once; recording and playback are decoupled so they don't
interfere except through the underlying disk and CPU.

For very high-volume namespaces the recorder shards across multiple
processes. Each shard is responsible for a disjoint slice of the
globbed path set. Shards coordinate via the netidx cluster protocol;
playback waits until every shard has joined before serving sessions
(recording itself starts immediately).

## Args

- `-c, --config <path>` — path to the recorder config file.
- `-e, --example` — print an example config and exit. The example
  is the canonical reference for the schema — `netidx record -e`
  always reflects the version of netidx you have installed.

## Configuration

The config is a single JSON object. A current example
(`netidx record -e`):

```
{
  "archive_directory": "/foo/bar",
  "archive_cmds": {
    "list": [
      "cmd_to_list_dates_in_archive",
      ["-s", "{shard}"]
    ],
    "get": [
      "cmd_to_fetch_file_from_archive",
      ["-s", "{shard}"]
    ],
    "put": [
      "cmd_to_put_file_into_archive",
      ["-s", "{shard}"]
    ]
  },
  "netidx_config": null,
  "desired_auth": null,
  "record": {
    "poll_interval": { "secs": 5, "nanos": 0 },
    "image_frequency": 67108864,
    "flush_frequency": 65534,
    "flush_interval": { "secs": 30, "nanos": 0 },
    "rotate_interval": { "Interval": { "secs": 86400, "nanos": 0 } },
    "shards": {
      "0": {
        "spec": ["/tmp/**"],
        "slack": 100
      }
    }
  },
  "publish": {
    "base": "/archive",
    "bind": null,
    "max_sessions": 512,
    "max_sessions_per_client": 64,
    "oneshot_data_limit": 104857600,
    "cluster_shards": 0,
    "cluster": "cluster"
  }
}
```

### Top-level

- `archive_directory` — root directory containing one subdirectory per shard.
  Within each shard directory, the file currently being written is `current`;
  rotated files are named with the RFC 3339 timestamp at which they ended.
- `archive_cmds` — shell hooks invoked at archive lifecycle events
  (optional; omit to disable). The value of each hook is a pair
  `[command, args]`. The literal string `{shard}` in any arg is
  substituted with the shard name at invocation time.
  - `list` — list available historical files. Output is unioned with
    the local files in `archive_directory` to form the set the
    replay engine can serve.
  - `get` — fetch a named historical file into `archive_directory`
    before access (e.g. pull from cold storage).
  - `put` — invoked after the current file has rotated; typically
    used to ship it to long-term storage.
- `netidx_config` — optional path to a non-default netidx
  `client.json`.
- `desired_auth` — optional auth mechanism override.
- `record` — recording config (omit to run a playback-only
  recorder).
- `publish` — playback config (omit to run a record-only recorder).

### `record`

- `poll_interval` — how often to poll the resolver for changes to
  the glob set. Default 5 s. Set to `null` to disable polling.
- `image_frequency` — every N bytes of data, write a full image of
  every current value (even unchanged ones). Larger archive but
  faster seek. Default 64 MiB. `null` disables images — seeks then
  have to read everything before the target point.
- `flush_frequency` — flush after this many filesystem pages.
  Default 65534. Bounds your worst-case data loss on a crash; the
  recorder uses two-phase commits so a partial flush won't corrupt
  the file.
- `flush_interval` — additionally flush every N seconds even if the
  page threshold isn't reached. Default 30 s.
- `rotate_interval` — when to roll the `current` file into a
  timestamped one. Tagged enum:
  - `{"Interval": {"secs": 86400, "nanos": 0}}` — rotate every N
    seconds (the example: daily).
  - `{"Size": N}` — rotate once `current` reaches N bytes.
  - `"Never"` — never rotate. Default if omitted: `Interval(1 day)`.
- `shards` — map from shard name to per-shard config. The keys are
  free-form strings used in the `{shard}` substitution above and in
  the cluster protocol. The value is a `RecordShardConfig`:
  - `spec` — the globs this shard records. **MUST** be disjoint from
    other shards' specs. An empty spec means "the shard exists but
    its recorder task is dormant" (you can still log to it
    programmatically via the `ArchiveCollectionWriter`).
  - Any of the global `poll_interval` / `image_frequency` /
    `flush_frequency` / `flush_interval` / `rotate_interval` keys
    may be repeated here to override the top-level defaults for
    this shard only.
  - `slack` — how many batches of channel slack between the
    subscriber and the recorder task. Higher uses more memory but
    smooths over slow-disk pushback. Default 100.

### `publish`

- `base` — base path under which the playback API publishes.
- `bind` — `BindCfg` for the recorder's publisher; omit to use the
  client config default.
- `max_sessions`, `max_sessions_per_client` — caps on concurrent
  replay sessions. Defaults 512 / 64.
- `oneshot_data_limit` — maximum bytes a `oneshot` RPC may return
  in one call. Default 100 MiB.
- `cluster_shards` — number of *other* recorder processes expected in this
  playback cluster (0 for a single-process recorder). Playback is blocked
  until that many peers have joined.
- `cluster` — netidx subpath of `<base>` under which shards
  rendezvous. Default `cluster`. Override when running multiple
  recorder clusters under the same `base`.

## Using Playback Sessions

When the recorder is running with `publish` configured, it
publishes some cluster information plus a handful of control RPCs
under `publish.base`:

- `<base>/session` — create a new replay session (described below).
- `<base>/oneshot` — bounded historical pull, returns inline data.
- `<base>/reindex` — rebuild indexes for the archive files.
- `<base>/remap-rescan` — re-evaluate the recording globs against
  the resolver (used to pick up newly published paths).
- `<base>/reopen` — close and re-open the underlying archive files
  (useful after an external `archive_cmds.get` populated a file).

The `record-client` subcommands (described below) drive most of
these in one step; you can also call them directly via
`netidx subscriber CALL|…` or any RPC-aware client.

### Creating a Session

Writing `null` to `<base>/session` creates a new session with
defaults and returns its id:

```
$ netidx subscriber <<EOF
WRITE|/solar/archive/session|null|null
EOF
/solar/archive/session|string|ef93a9dce21f40c49f5888e64964f93f
```

The new session shows up at `<base>/<session-id>/` with two
subdirectories — `control` (writable knobs) and `data` (the
replayed values).

```
$ netidx resolver list /solar/archive/ef93a9dce21f40c49f5888e64964f93f/*
/solar/archive/ef93a9dce21f40c49f5888e64964f93f/data
/solar/archive/ef93a9dce21f40c49f5888e64964f93f/cluster
/solar/archive/ef93a9dce21f40c49f5888e64964f93f/control
```

Pass arguments to `session` to set knobs at creation time:

```
$ netidx subscriber <<EOF
CALL|/solar/archive/session|start="-3d",speed=2
EOF
CALLED|/solar/archive/session|"ef93a9dce21f40c49f5888e64964f93f"
```

`netidx record-client session --base /solar/archive [--pos <ts>]`
is a convenience wrapper that does the same thing.

### Playback Controls

Each session publishes five controls under `control/`:

- `start` — when playback begins. A timestamp, `Unbounded` (use the
  archive's first record), or a relative offset like `-3d`. The
  offset format is `[+-]N[yMdhms]`.
- `end` — when playback stops. Same format as `start`. An
  `Unbounded` or future `end` means "switch to tail mode when you
  catch up": new updates replay as they arrive.
- `pos` — current playback position. Reads back as a timestamp;
  writes accept a timestamp, a relative offset, or `[+-]1..128`
  (number of batches forward or back).
- `speed` — playback rate, as a fraction of real time, or
  `Unlimited`. Approximate; timing on computers is hard.
- `state` — `play`, `pause`, or `tail`. Writes drive transitions.

Each control is itself a small published tree with documentation
fields; the actual readable/writable value is at
`<base>/<session-id>/control/<control>/current`.

### Data

Once a session is set up, replayed values appear under
`<base>/<session-id>/data/`. Every path that ever existed in the
archive is published from the start. Paths that didn't have a value
at the current `pos` are published as `null` — there's no way to
distinguish "not yet recorded" from a value that was intentionally
`null`. When playback runs, the recorder reproduces the recorded
update timing and batch boundaries.

### Deleting a Session

Stop subscribing to anything in the session and the recorder will
garbage-collect it.

## `record-client`

`netidx record-client` is a separate subcommand for working with
archive files and driving a running recorder.

- `record-client compress <file>...` — produce a zstd-compressed
  archive. `--window <n>` controls how many batches compress in
  parallel (default 2); `--keep` retains the input file.
- `record-client compressed <file>` — exit 0 if the file is already
  compressed, 1 otherwise. Useful in shell pipelines.
- `record-client dump <file>` — print the archive's contents to
  stdout. `--metadata-only` skips the data records;
  `--check-index` validates the index against the data.
- `record-client index <file>` — (re)build the index for an
  uncompressed archive. `--keep` retains the original alongside
  the indexed copy.
- `record-client verify <file>` — confirm the archive can be read
  end-to-end without errors. Useful before shipping a file to
  long-term storage.
- `record-client oneshot --base <publish-base> [--start ts]
  [--end ts] [-f glob]...` — bounded historical pull, capped by
  `publish.oneshot_data_limit`. Returns all values in the time
  range matching the filter, then exits.
- `record-client session --base <publish-base> [--pos ts]` —
  create and drive a playback session interactively. Equivalent
  to writing `null` to `<base>/session` and then attaching to the
  resulting subtree.

Both `oneshot` and `session` take the usual client flags
(`-c`, `-a`, `--spn`, `--upn`, `--identity`).
