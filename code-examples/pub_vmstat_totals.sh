#! /bin/bash

BASE='/sys/vmstat'
declare -A TOTALS
declare -A HOSTS

netidx resolver list -w "${BASE}/**" | \
    grep -v --line-buffered "${BASE}/total/" | \
    sed -u -e 's/^/ADD|/' | \
    netidx subscriber | \
    while IFS='|' read -a input
    do
        IFS='/' path=(${input[0]})
        host=${path[-2]}
        field=${path[-1]}
        if ! test -z "$host" -o -z "$field"; then
            HOSTS[$host]="$host"
            TOTALS["$host/$field"]=${input[2]}
            T=0
            for h in ${HOSTS[@]}
            do
                ((T+=TOTALS["$h/$field"]))
            done
            echo "${BASE}/total/$field|${input[1]}|$T"
        fi
    done | netidx publisher --spn publish/${HOSTNAME}@RYU-OH.ORG --bind 192.168.0.0/24
