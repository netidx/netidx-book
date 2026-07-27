#!/usr/bin/env python3
"""Render a tmux `capture-pane -e` ANSI dump to a PNG via headless chromium.

The netidx TUI emits truecolor SGR only (38;2;r;g;b / 48;2;r;g;b), plus bold
and reset, so the mapping to CSS is exact -- no palette guessing.
"""
import html
import re
import subprocess
import sys
from pathlib import Path

SGR = re.compile(r"\x1b\[([0-9;]*)m")

# Terminal default when a cell carries no explicit colour.
DEFAULT_BG = "#002878"
DEFAULT_FG = "#cdd4e4"

FONT_PX = 15
LINE_H = 1.0  # box-drawing glyphs only tile at 1.0; extra leading dashes borders
LINE_PX = round(FONT_PX * LINE_H)
PAD = 22
RADIUS = 8


def parse(text):
    """-> list of rows, each a list of (style_key, string) runs."""
    rows = []
    # tmux carries SGR state across line boundaries -- a line may begin with no
    # escape at all and inherit the previous line's attributes. Keep the state
    # outside the loop or every panel loses its background.
    fg = bg = None
    bold = False
    for line in text.split("\n"):
        runs = []
        buf = []
        pos = 0

        def flush():
            if buf:
                runs.append(((fg, bg, bold), "".join(buf)))
                buf.clear()

        for m in SGR.finditer(line):
            buf.append(line[pos:m.start()])
            pos = m.end()
            params = [p for p in m.group(1).split(";") if p != ""] or ["0"]
            i = 0
            while i < len(params):
                p = int(params[i])
                if p == 0:
                    flush()
                    fg = bg = None
                    bold = False
                elif p == 1:
                    flush()
                    bold = True
                elif p == 22:
                    flush()
                    bold = False
                elif p == 38 and i + 4 < len(params) and params[i + 1] == "2":
                    flush()
                    fg = tuple(int(x) for x in params[i + 2:i + 5])
                    i += 4
                elif p == 48 and i + 4 < len(params) and params[i + 1] == "2":
                    flush()
                    bg = tuple(int(x) for x in params[i + 2:i + 5])
                    i += 4
                elif p == 39:
                    flush()
                    fg = None
                elif p == 49:
                    flush()
                    bg = None
                i += 1
        buf.append(line[pos:])
        flush()
        # carry the end-of-line style into the padding, so a panel that runs to
        # the right edge keeps its background
        rows.append((runs, (fg, bg, bold)))
    return rows


def span(style, s):
    fg, bg, bold = style
    st = []
    if fg:
        st.append("color:#%02x%02x%02x" % fg)
    if bg:
        st.append("background:#%02x%02x%02x" % bg)
    if bold:
        st.append("font-weight:700")
    esc = html.escape(s).replace(" ", "&#160;")
    # every run is a span, even unstyled: the CSS gives spans a full-line-height
    # box so backgrounds tile the character cell with no gaps between rows
    return f'<span style="{";".join(st)}">{esc}</span>'


def to_html(rows, cols):
    out = []
    for runs, end_style in rows:
        width = 0
        parts = []
        for style, s in runs:
            if not s:
                continue
            width += len(s)
            parts.append(span(style, s))
        # pad the row so every line paints the full width, in the style the line
        # ended in
        if width < cols:
            parts.append(span(end_style, " " * (cols - width)))
        out.append("".join(parts))
    body = "\n".join(out)
    return f"""<!doctype html><meta charset="utf-8"><style>
  html,body {{ margin:0; padding:0; background:transparent; }}
  .wrap {{ display:inline-block; padding:{PAD}px; }}
  pre {{
    margin:0; padding:{PAD}px;
    font-family:"DejaVu Sans Mono","Liberation Mono",monospace;
    font-size:{FONT_PX}px; line-height:{LINE_PX}px;
    background:{DEFAULT_BG}; color:{DEFAULT_FG};
    border-radius:{RADIUS}px;
    box-shadow:0 6px 22px rgba(0,0,0,.28);
    white-space:pre; letter-spacing:0;
  }}
  pre span {{
    display:inline-block; height:{LINE_PX}px; line-height:{LINE_PX}px;
    vertical-align:top;
  }}
</style><div class="wrap"><pre>{body}</pre></div>"""


def main():
    src, dst = Path(sys.argv[1]), Path(sys.argv[2])
    text = src.read_text(errors="replace").rstrip("\n")
    rows = parse(text)
    cols = max((sum(len(s) for _, s in runs) for runs, _ in rows), default=80)
    page = to_html(rows, cols)
    tmp = dst.with_suffix(".html").resolve()
    tmp.write_text(page)
    w = int(cols * FONT_PX * 0.6018) + PAD * 4 + 24
    h = len(rows) * LINE_PX + PAD * 4 + 24
    subprocess.run([
        "chromium", "--headless", "--disable-gpu", "--hide-scrollbars",
        "--default-background-color=00000000",
        "--force-device-scale-factor=2",
        f"--window-size={w},{h}",
        f"--screenshot={dst}", f"file://{tmp}",
    ], check=True, capture_output=True)
    tmp.unlink()
    print(f"{dst}  {cols}x{len(rows)} cells -> {w}x{h}css @2x")


if __name__ == "__main__":
    main()
