# Activation

Activation is a process manager for netidx somewhat like systemd or
dbus activation. It's core function is to install a default publisher
at configured trigger paths, and then start a process whenever someone
tries to subscribe to anything under the trigger path. Publishers for
many kinds of services can thus be started on demand, and can shut
down when no one is using them. This can save resources, and it can
also simplify starting up all the "moving parts" of a complex service.

A convenient way to run netidx on a server or workstation is to configure its
applications, including the resolver, as activation units and let the
platform's netidx service start the supervisor. This provides one control
surface, consistent environment variables and logs, and platform process
containment. The service integrates with systemd on Linux and launchd on
macOS; Windows uses a per-user logon task and a windowless supervisor.

## Units

Each managed process is configured with a unit file. Unit files live
in a directory and must have the `.unit` suffix; anything else in the
directory is ignored. The default search order is
the platform user configuration directory first, then
`/etc/netidx/activation` on Unix. Windows has no system-wide fallback. The
user-specific directory takes precedence when present.

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
  - `uid`: On Unix, the numeric user id to run the process as. Defaults to
    the supervisor's uid.
  - `gid`: On Unix, the numeric group id to run the process as. Defaults to
    the supervisor's gid. Windows rejects units that specify `uid` or `gid`.
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

## Reload and shutdown

On Unix, `SIGHUP` reloads the unit directory. On every platform the local
activation control endpoint provides the same reload operation. The admin
TUI reloads after it adds, edits, or removes a unit. The lower-level
`netidx admin component activation add|remove` commands only edit the unit
files; reload or restart the supervisor separately when using them. A reload
starts newly added `OnStart` units and stops units that were removed. Editing
an existing unit does not restart its running process; the new configuration
applies the next time that process starts.

On Unix, `SIGQUIT`, `SIGINT`, or `SIGTERM` shuts down the supervisor; on
Windows, Ctrl-C or Ctrl-Break does so in foreground mode. Managed processes
first receive the platform's graceful shutdown signal (SIGTERM on Unix, a
named shutdown event on Windows). Processes still running after 30 seconds are
forcibly terminated. Windows also puts children in a Job Object so they are
terminated if the supervisor exits unexpectedly.

## Args

- `-f, --foreground`: remain attached to the terminal. On Windows, omitting it
  delegates to the sibling `netidx-activation.exe` background executable.
- `-a, --auth`: auth mechanism — `anonymous`, `local`, `krb5`, or
  `tls`. Defaults to whatever the client config's `default_auth`
  is (so a workstation install rarely needs this).
- `-b, --bind`: bind address.
- `-c, --config`: path to the netidx client config
- `--pid-file`: Unix-only pid file; default none.
- `--spn`: the spn of the activation server. only relevant if auth =
  krb5
- `--identity`: TLS identity (for `-a tls`); defaults to the client
  config's `default_identity`.
- `-u, --units`: the path to the directory containing unit files. Defaults to
  the platform user config directory, with `/etc/netidx/activation` as the
  Unix system fallback.
- `--upn`: the upn to use when connecting to the resolver, only valid
  if auth = krb5. default the current user.
