#! /bin/bash

BASE="/sys/vmstat/$HOSTNAME"

vmstat -n 1 | \
    while read running \
               blocked \
               swapped \
               free \
               buf \
               cache \
               swap_in \
               swap_out \
               blocks_in \
               blocks_out \
               interrupts \
               context_switches \
               user \
               system \
               idle \
               waitio \
               stolen
    do
        echo "${BASE}/running|z32|${running}"
        echo "${BASE}/blocked|z32|${blocked}"
        echo "${BASE}/swapped|z32|${swapped}"
        echo "${BASE}/free|u64|${free}"
        echo "${BASE}/buf|u64|${buf}"
        echo "${BASE}/cache|u64|${cache}"
        echo "${BASE}/swap_in|z32|${swap_in}"
        echo "${BASE}/swap_out|z32|${swap_out}"
        echo "${BASE}/blocks_in|z32|${blocks_in}"
        echo "${BASE}/blocks_out|z32|${blocks_out}"
        echo "${BASE}/interrupts|z32|${interrupts}"
        echo "${BASE}/context_switches|z32|${context_switches}"
        echo "${BASE}/user|z32|${user}"
        echo "${BASE}/system|z32|${system}"
        echo "${BASE}/idle|z32|${idle}"
        echo "${BASE}/waitio|z32|${waitio}"
        echo "${BASE}/stolen|z32|${stolen}"
    done | \
    netidx publisher --spn publish/${HOSTNAME}@RYU-OH.ORG --bind 192.168.0.0/24
