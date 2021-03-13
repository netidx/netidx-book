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

- Args that apply to both recording and playback
  - `--archive <file>`: required by both modes of operation, the name
    of the file to record the data into or play it back from. If an
    existing archive is specified and recording is requested then the
    data will be appended to that archive.
  - `--shards <n>`: optional, The number of recorder shards to
    expect. If you want to record/playback a huge namespace, or one
    that updates a lot, it may not be possible to use just one
    computer. The recorder supports sharding across an arbitrary
    number of processes for both recording and playback. n is the
    number of shards that are expected in a given
    cluster. recording/playback will not begin until all the shards
    have appeared and synced with each other. default 1.
  - `-f, --foreground`: don't daemonize
- Args that apply to recording
  - `--spec <glob>`: required by recording, enables recording if
    specified, may be specified multiple times, a glob describing what
    to archive. If multiple globs are specified and they overlap, the
    overlapped items will only be archived once.
  - `--flush-frequency <pages>`: optional, How much data to write before
    flushing to disk in pages, where a page is a filesystem page,
    however large that is on your system. default 65534. This is the
    maximum amount of data you will probably lose in a power outage,
    system crash, or program crash. The recorder uses two phase commits
    to the archive file to ensure that partially written data does not
    corrupt the file.
  - `--flush-interval <seconds>`: optional, How long in seconds to wait
    before flushing data to disk even if `flush-frequency` pages was not
    yet written. 0 to disable, default 30.
  - `--image-frequency <bytes>`: optional, How often, in bytes, to write a full
    image of every current value, even if it did not update. Writing
    images increases the file size, but makes seeking to an arbitrary
    position in the archive much faster. 0 to disable images, in which
    case a seek back will read all the data before the requested
    position, default 64MiB.
  - `--poll-interval <seconds>`: optional, How often, in seconds, to
    poll the resolver server for changes to the specified glob set. 0
    never poll, default 5.
- Args that apply to playback
  - `--publish-base <path>`: required for playback, enables playback
    if specified, the path where playback sessions will be published.
  - `--bind <spec>`: required for playback, a specification describing
    the network interface to bind to. See
    [publisher](./publisher_tool.md) for details.
  - `--spn <service-principal>`: optional, required for kerberos, the
    service princial to publish as.
  - `--max-sessions <n>`: optional, How many total client sessions to allow at
    any given time. When a session is no longer used, it will be
    garbage collected. default 256.
  - `--max-sessions-per-client <n>`: optional, The maximum number of
    sessions a single client is allowed to have. default 64.

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
netidx subscriber /archive/session
/solar/archive/session|none|Null
WRITE|/solar/archive/session|string|null
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
netidx subscriber \
    /solar/archive/session \
    /solar/archive/session/start/val \
    /solar/archive/session/speed/val
/solar/archive/session|none|Null
/solar/archive/session/start/val|string|Unbounded
/solar/archive/session/speed/val|f64|1
WRITE|/solar/archive/session/start/val|string|-3d
WRITE|/solar/archive/session/speed/val|f32|2
WRITE|/solar/archive/session|string|null
/archive/session|string|ef93a9dce21f40c49f5888e64964f93f
```

First we are told the defaults, as a result of subscribing to the
rpc's arguments, then we write our desired values and finally call the
rpc. Now our new session would be setup to start 3 days ago, and
playback at 2x speed.

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
recorder will delete it within about 30 seconds. At the moment there
is no other way to delete a session, but that's a feature that would
be easy to add if it was needed.

## Example

To record and publish the archive of the data generated by my solar
installation I use the following command.

```
netidx record \
    --archive ~/solar \
    --spec '/solar/{control,stats,settings}/**' \
    --bind 192.168.0.0/24 \
    --spn publish/blackbird.ryu-oh.org@RYU-OH.ORG \
    --publish-base /solar/archive
```
