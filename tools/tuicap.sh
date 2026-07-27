#!/bin/bash
# tuicap.sh -- drive the netidx TUI in tmux and capture settled ANSI frames.
#
# Frames are captured as ANSI text (tmux capture-pane -e), not images. Render
# them with ansirender.py. Keeping the .ansi files means the whole book's
# screenshots can be re-rendered later -- different font, theme, or size --
# without another lab run.
#
#   tuicap.sh start <cols> <rows> <cmd...>   launch the TUI in a tmux session
#   tuicap.sh key   <tmux send-keys args>    send input
#   tuicap.sh shot  <out.ansi>               settle, then capture
#   tuicap.sh text                           dump current screen, no escapes
#   tuicap.sh stop
#
# A remote target works the same way -- start with an ssh command:
#   tuicap.sh start 100 30 "ssh resolver-hq 'TERM=xterm-256color netidx admin'"
set -u
S=${TUICAP_SESSION:-tuicap}
# poll interval and how many identical polls mean "settled"
IVL=${TUICAP_INTERVAL:-0.15}
STABLE=${TUICAP_STABLE:-2}
MAXPOLL=${TUICAP_MAXPOLL:-80}

case "${1:-}" in
start)
    shift
    cols=$1 rows=$2
    shift 2
    tmux kill-session -t "$S" 2>/dev/null
    tmux new-session -d -s "$S" -x "$cols" -y "$rows" "$*"
    ;;
key)
    shift
    tmux send-keys -t "$S" "$@"
    ;;
shot)
    out=$2
    prev="" same=0 i=0
    while [ $i -lt "$MAXPOLL" ]; do
        cur=$(tmux capture-pane -t "$S" -p -e)
        if [ "$cur" = "$prev" ]; then
            same=$((same + 1))
        else
            same=0
        fi
        [ $same -ge "$STABLE" ] && break
        prev="$cur"
        sleep "$IVL"
        i=$((i + 1))
    done
    mkdir -p "$(dirname "$out")"
    tmux capture-pane -t "$S" -p -e >"$out"
    if [ $i -ge "$MAXPOLL" ]; then
        printf 'WARNING %s never settled after %s polls -- animation?\n' "$out" "$i" >&2
    fi
    printf 'captured %-44s %5s bytes  (%s polls)\n' "$out" "$(wc -c <"$out")" "$i"
    ;;
text)
    tmux capture-pane -t "$S" -p
    ;;
stop)
    tmux kill-session -t "$S" 2>/dev/null
    ;;
*)
    sed -n '2,22p' "$0"
    exit 2
    ;;
esac
