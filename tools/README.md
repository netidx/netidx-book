# Screenshot tooling

Automated capture of `netidx admin` TUI screens for the book. Replaces
hand-driving Spectacle, which does not scale past a handful of images.

## Pipeline

    TUI in tmux  --capture-pane -e-->  .ansi  --ansirender.py-->  .png

Frames are captured as **ANSI text**, not images, and the `.ansi` files are
kept in the repo beside the PNGs. They are ~4KB each, diff cleanly, and can be
re-rendered at any time with a different font, size, or theme without
re-running the lab. Treat the `.ansi` as the source and the `.png` as build
output.

## Capture

```bash
tools/tuicap.sh start 100 30 "TERM=xterm-256color netidx admin"
tools/tuicap.sh shot src/screens/resolver/01-welcome.ansi
tools/tuicap.sh key Enter
tools/tuicap.sh shot src/screens/resolver/02-role-menu.ansi
tools/tuicap.sh stop
```

Against a lab VM, make the command an ssh invocation:

```bash
tools/tuicap.sh start 100 30 "ssh resolver-hq 'TERM=xterm-256color netidx admin'"
```

`shot` polls until two consecutive captures are identical before saving, so
async discovery and animated progress modals settle instead of being caught
mid-frame. It warns rather than hanging if a screen never settles — that means
something is animating and the shot needs a different moment.

`tuicap.sh text` dumps the current screen with no escapes, which is the quick
way to assert on wording in a script.

## Render

```bash
tools/ansirender.py src/screens/resolver/01-welcome.ansi \
                    src/screens/resolver/01-welcome.png
```

Renders at `--force-device-scale-factor=2`, so a 100x30 screen becomes roughly
2000x1360 and stays crisp on high-DPI displays.

Geometry and styling are constants at the top of `ansirender.py`: `FONT_PX`,
`LINE_H`, `PAD`, `RADIUS`, and the `DEFAULT_FG`/`DEFAULT_BG` used for cells
that carry no explicit colour. Change them and re-render everything.

## Why it renders correctly

Two things are easy to get wrong and are handled explicitly:

- **tmux carries SGR state across line boundaries.** A captured line may begin
  with no escape at all and inherit the previous line's attributes. Resetting
  per line makes every panel lose its background.
- **Span backgrounds only paint the text box**, not the line box, which leaves
  stripes between rows. Every run is emitted as a span with an explicit
  full-line-height box so cells tile.

The TUI's theme (`netidx-tools/src/admin/tui/theme.rs`) emits truecolor SGR
only — `38;2;r;g;b` / `48;2;r;g;b` — plus bold and reset. There is no 256-colour
palette to guess at, so the PNG is an exact reproduction of the theme.

## Requirements

`tmux`, `python3`, and `chromium` (headless). No Python packages needed.
