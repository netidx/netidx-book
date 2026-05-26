# Stress Test Tool

The stress test tool is mostly for debug and development of netidx
itself. It has four subcommands, all under `netidx stress`:

- `publisher` — publish a `rows × cols` table of values and update
  every cell on a timer. Used to drive load on a resolver or a
  subscriber.
- `subscriber` — subscribe to every value published by `stress
  publisher` and print throughput statistics to stdout.
- `channel_publisher` — publish a channel and serve every connecting
  subscriber a steady stream of batches.
- `channel_subscriber` — subscribe to a channel and report throughput
  (or, with `--latency`, round-trip latency).

## `stress publisher`

```
netidx stress publisher [--base /bench] [--delay 100] [<rows>] [<cols>]
```

Publishes `<rows> × <cols>` paths under `<base>` named
`<base>/<row>/<col>`. Defaults: `rows=100`, `cols=10`, `delay=100`
(milliseconds between full batch updates), `base=/bench`. Every
batch increments each cell so subscribers see a constant stream of
updates.

Standard client flags also apply: `-c, --config`, `-a, --auth`,
`-b, --bind`, `--spn`, `--upn`, `--identity`.

```
# 1000 rows × 10 cols, one update per second, published under
# /local/bench on a local-auth resolver:
netidx stress publisher --base /local/bench --delay 1000 1000 10
```

## `stress subscriber`

```
netidx stress subscriber [--base /bench]
```

Subscribes to every value matching `<base>/*/*` published by a
`stress publisher` and reports throughput. Pair it with a publisher
on the same `--base`.

## `stress channel_publisher` / `stress channel_subscriber`

These use the netidx-protocols channel abstraction rather than
plain pub/sub. Defaults to `--base /local/channel/bench`. The
subscriber takes one positional argument — the batch size (default
100) — and `--delay` (ms between batches). Pass `--latency` to
measure round-trip latency instead of throughput.

```
# Throughput test: publisher in one shell, subscriber in another
netidx stress channel_publisher --base /local/channel/bench
netidx stress channel_subscriber --base /local/channel/bench

# Latency test
netidx stress channel_subscriber --base /local/channel/bench --latency
```
