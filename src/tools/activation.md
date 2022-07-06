# Activation

Activation is a process manager for netidx somewhat like systemd or
dbus activation. It's core function is to install a default publisher
at configured trigger paths, and then start a process whenever someone
tries to subscribe to anything under the trigger path. Publishers for
many kinds of services can thus be started on demand, and can shut
down when no one is using them. This can save resources, and it can
also simplify starting up all the "moving parts" of a complex service.

In fact a convenient way to run netidx on both a server or a
workstation is to configure all your netidx applications, including
the resolver server, as activation units, and then start the
activation server on startup with systemd. There are a number of
benefits to this, including, single command start/stop of everything
netidx, unified logs, unified setting of environment variables like
RUST_LOG, and resource control via cgroups.

## Units

Each managed process is configured with a unit file. Unit files are
placed in a directory, by default `/etc/netidx/activation` or
`~/.config/netidx/activation`. The user specific directory will take
prescidence if it exists.

Here is an example activation unit triggered on access to any path
under `/local/music`

``` json
{
  "trigger": {
    "OnAccess": [
      "/local/music"
    ]
  },
  "process": {
    "exe": "/home/eric/.cargo/bin/demoscene",
    "args": [
      "--base",
      "/local/music",
      "--library",
      "/home/eric/mus"
    ]
  }
}
```

Many optional fields exist, here is a list of all possible options and
their function.

- `trigger`: either OnAccess followed by a list of paths, or OnStart.
  - `OnAccess` will start the process whenever a subscriber tries to
    subscribe to any path under one of the trigger paths. Once the
    process starts the activation server will remove the default
    publisher from the trigger paths. If the unit's process dies, the
    activation server will readd the default publishers to the trigger
    paths, but it will only start the process again if a subscriber
    tries to access one of the trigger paths. So unused services can
    shut down and will stay shut down until someone wants them.
    
    It is an error for multiple units to have overlapping triggers.
  - `OnStart` will start the process when the activation server starts,
    and if it dies will restart it according to the restart directive
    of the process config.
- `process`: The process config defines what to start, and gives options
  to control it's environment and how it should be restarted if it
  stops.
  - `exe`: The path to the executable to start. This is the only
    required field of the process config. The specified file must
    exist and must be executable when the unit is loaded otherwise
    loading the unit will fail.
  - `args`: A list of arguments to the executable. default [].
  - `working_directory`: Path to the directory where the executable will
    be started. default the working directory of the activation
    server.
  - `uid`: The numeric user id to run the process as. default the uid of
    the activation server.
  - `gid`: The numeric group id to run the process as. default the gid
    of the activation server.
  - `restart`: Yes, No, or RateLimited with an f64 number of seconds
    delay. Default `"RateLimited": 1.`.
  - `stdin`: The path to the file, pipe, etc that
    will be set as the processes stdin. default, inherited from the
    activation server.
  - `stdout`: The path to the file, pipe, etc that will be set as the
    processes stdout. default, inherited from the activation server.
  - `stderr`: The path to the file, pipe, etc that will be set as the
    processes stderr. default, inherited from the activation server.
  - `environment`: either Inherit followed by a list of environment
    mappings to be overridden or replace followed by the full list of
    environment mappings. e.g.
    ```json
    "Inherit": {
      "PATH": "/bin:/usr/bin",
      "TERM": "xterm",
      ...
    }
    ```

## Signals

Sending `SIGHUP` to the running activation server will cause it to
reread it's unit directory. This may trigger processes (for example a
newly added OnStart process) to start up immediatly. If unit files are
removed, their corresponding processes will be stopped upon unit
directory reread. If process config properties are changed for an
existing unit, any running process will NOT be restarted, however new
configuration directives will take effect if the process dies and is
triggered. For example if args is changed for a unit that is running,
and it later dies and is triggered again it will be started with the
new args.

On receiving `SIGQUIT`, `SIGINT`, or `SIGTERM`, the activation server
will stop all the processes it is managing before shutting down
itself. Managed processes are first sent `SIGTERM`, but if they don't
shut down within 30 seconds they are killed with `SIGKILL`.

## Args

- `-f, --foreground`: don't daemonize
- `-a, --auth`: auth mechanism. either anonymous, local, or
  krb5. default krb5.
- `-b, --bind`: bind address.
- `-c, --config`: path to the netidx client config
- `--pid-file`: path to the pid file you want the activation server to
  write. default no pid file.
- `--spn`: the spn of the activation server. only relevant if auth =
  krb5
- `-u, --units`: the path to the directory containing unit
  files. default `/etc/netidx/activation` or
  `~/.config/netidx/activation`
- `--upn`: the upn to use when connecting to the resolver, only valid
  if auth = krb5. default the current user.
