#!/bin/bash
# render-all.sh [dir] -- re-render every .ansi under dir to a sibling .png.
#
# The .ansi files are the source; PNGs are build output. Run this after a
# capture session, or any time the rendering constants in ansirender.py change.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
root=${1:-$here/../src/screens}
n=0
while IFS= read -r -d '' a; do
    "$here/ansirender.py" "$a" "${a%.ansi}.png" >/dev/null
    n=$((n + 1))
    printf '\r  rendered %s' "$n"
done < <(find "$root" -name '*.ansi' -print0 | sort -z)
printf '\r  rendered %s file(s) under %s\n' "$n" "$root"
