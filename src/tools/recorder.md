# Recorder

The recorder allows you to subscribe to a set of paths defined by one
or more globs and write down their values in a file with a compact
binary format. Moreover, at the same time it can make the contents of
an archive available for playback by multiple simultaneous client
sessions, each with a potentially different start time, playback
speed, end time, and position.

It's possible to set up a recorder to both record data and play it
back at the same time, or only record, or only play back. It is not
possible to set up one recorder to record, and another to play back
the same file, however recording and playback are careful not to
interfere with each other, so the only limitation should be the
underlying IO device and the number of processor cores available.

## Args

- `--example`: optional, print an example configuration file
- `--config`: required, path to the recorder config file

## Configuration

e.g.

```
{
  "archive_directory": "/foo/bar",
  "archive_cmds": {
    "list": [
      "cmd_to_list_dates_in_archive",
      []
    ],
    "get": [
      "cmd_to_fetch_file_from_archive",
      []
    ],
    "put": [
      "cmd_to_put_file_into_archive",
      []
    ]
  },
  "netidx_config": null,
  "desired_auth": null,
  "record": {
    "spec": [
      "/tmp/**"
    ],
    "poll_interval": {
      "secs": 5,
      "nanos": 0
    },
    "image_frequency": 67108864,
    "flush_frequency": 65534,
    "flush_interval": {
      "secs": 30,
      "nanos": 0
    },
    "rotate_interval": {
      "secs": 86400,
      "nanos": 0
    }
  },
  "publish": {
    "base": "/archive",
    "bind": null,
    "max_sessions": 512,
    "max_sessions_per_client": 64,
    "shards": 0
  }
}
```

- `archive_directory`: The directory where archive files will be
  written. The archive currently being written is `current` and
  previous rotated files are named the rfc3339 timestamp when they
  ended.
- `archive_commands`: These are shell hooks that are run when various
  events happen
  - `list`: Shell hook to list available historical archive
    files. This will be combined with the set of timestamped files in
    `archive_directory` to form the full set of available archive
    files.
  - `get`: Shell hook that is run before an archive file needs to be
    accessed. It will be accessed just after this command
    returns. This can, for example, move the file into place after
    fetching it from long term storage. It is passed the name of the
    file the archiver would like, which will be in the union of the
    local files and the set returned by list.
  - `pub`: Shell hook that is run just after the current file is
    rotated. Could, for example, back the newly rotated file up, or
    move it to long term storage.
- `netidx_config`: Optional path to the netidx config. Omit to use the default.
- `desired_auth`: Optional desired authentication mechanism. Omit to use the default.
- `record`: Section of the config used to record, omit to only play back.
  - `spec`: a list of globs describing what to record. If multiple
    globs are specified and they overlap, the overlapped items will
    only be archived once.
  - `poll_interval`: How often, in seconds, to poll the resolver
    server for changes to the specified glob set. 0 never poll,
    if omitted, the default is 5 seconds.
  - `image_frequency`: How often, in bytes, to write a full image of
    every current value, even if it did not update. Writing images
    increases the file size, but makes seeking to an arbitrary
    position in the archive much faster. 0 to disable images, in which
    case a seek back will read all the data before the requested
    position, default 64MiB.
  - `flush_frequency`: How much data to write before flushing to disk,
    in pages, where a page is a filesystem page. default 65534. This
    is the maximum amount of data you will probably lose in a power
    outage, system crash, or program crash. The recorder uses two
    phase commits to the archive file to ensure that partially written
    data does not corrupt the file.
  - `flush_interval`: How long in seconds to wait before flushing data
    to disk even if `flush_frequency` pages was not yet written. 0 to
    disable, default if omitted 30 seconds.
  - `rotate_interval`: How long in seconds to wait before rotating the
    current archive file. Default if omitted, never rotate.
- `publish`: Section of the config file to enable publishing
  - `base`: The base path to publish at
  - `bind`: The bind config to use. Omit to use the default.
  - `max_sessions`: The maximum total number of replay sessions
    concurrently in progress.
  - `max_sessions_per_client`: The maximum number of replay sessions
    in progress for any single client.
  - `shards`: The number of recorder shards to expect. If you want to
    record/playback a huge namespace, or one that updates a lot, it
    may not be possible to use just one computer. The recorder
    supports sharding across an arbitrary number of processes for both
    recording and playback. n is the number of shards that are
    expected in a given cluster. playback will not be avaliable until
    all the shards have appeared and synced with each other, however
    recording will begin immediatly. default if omitted 0 (meaning
    just one recorder).

## Using Playback Sessions

When initially started for playback or mixed operation the recorder
publishes only some cluster information, and a netidx rpc called
`session` under the `publish-base`. Calling the session rpc will
create a new session, and return the session id. Then it will publish
the actual playback session under `publish-base/session-id`. A
playback session consists of two sub directories, `control` contains
readable/writable values that control the session, and `data` contains
the actual data.

### Creating a New Session

It's simple to call a netidx rpc with command line tools, the browser,
or programatically. To create a new playback session with default
values just write `null` to `publish-base/session`. e.g.

```
netidx subscriber <<EOF
WRITE|/solar/archive/session|string|null
EOF
/solar/archive/session|string|ef93a9dce21f40c49f5888e64964f93f
```

We just created a new playback session called
ef93a9dce21f40c49f5888e64964f93f, we can see that the recorder
published some new things there,

```
$ netidx resolver list /solar/archive/ef93a9dce21f40c49f5888e64964f93f/*
/solar/archive/ef93a9dce21f40c49f5888e64964f93f/data
/solar/archive/ef93a9dce21f40c49f5888e64964f93f/cluster
/solar/archive/ef93a9dce21f40c49f5888e64964f93f/control
```

If we want to pass some arguments to the rpc so our session will be
setup how we like by default we can do that as well, e.g.

```
netidx subscriber <<EOF
CALL|/solar/archive/session|start="-3d",speed=2
EOF
CALLED|/archive/session|"ef93a9dce21f40c49f5888e64964f93f"
```

Now our new session would be setup to start 3 days ago, and playback
at 2x speed.

### Playback Controls

Once we've created a new session the recorder publishes some controls
under the control directory. The five controls both tell you the state
of the playback session, and allow you to control it. They are,

- `start`: The timestamp you want playback to start at, or Unbounded
  for the beginning of the archive. This will always display
  Unbounded, or a timestamp, but it in addition to those two values it
  accepts writes in the form of offsets from the current time,
  e.g. -3d would set the start to 3 days ago. It accepts offsets
  [+-]N[yMdhms] where N is a number. y - years, M - months, d - days,
  h - hours, m - minutes, s - seconds.
- `end`: Just like start except that Unbounded, or a time in the
  future means that when playback reaches the end of the archive it
  will switch mode to tail. In tail mode it will just repeat data as
  it comes in. In the case that end is in the future, but not
  unbounded, it will stop when the future time is reached.
- `pos`: The current position, always displayed as a timestamp unless
  there is no data in the archive. Pos accepts writes in the form of
  timestamps, offsets from the current time (like start and end), and
  [+-]1-128 batches. e.g. -10 would seek back exactly 10 update
  batches, +100 would seek forward exactly 100 update batches.
- `speed`: The playback speed as a fraction of real time, or
  Unlimited. In the case of Unlimited the archive is played as fast as
  it can be read, encoded, and sent. Otherwise the recorder tries to
  play back the archive at aproximately the specified fraction of real
  time. This will not be perfect, because timing things on computers
  is hard, but it tries to come close.
- `state`: this is either play, pause or tail, and it accepts writes
  of any state and will change to the requested state if possible.

Since the controls also include a small amount of documentation meant
to render as a table, the actual value that you read from/write to is
`publish-base/session-id/control/name-of-control/current`.

### Data

Once the session is set up the data, whatever it may be, appears under
`publish-base/data`. Every path that ever appears in the archive is
published from the beginning, however, if at the current `pos` that
path didn't have a value, then it will be set to `null`. This is a
slightly unfortunate compromise, as it's not possible to tell the
difference between a path that wasn't available, and one that was
intentionally set to null. When you start the playback values will be
updated as they were recorded, including replicating the observed
batching.

### Deleting a Playback Session

Simply stop subscribing to any value or control in the session and the
recorder will garbage collect it.
