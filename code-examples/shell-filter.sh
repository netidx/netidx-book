#! /bin/bash

declare -A HOSTS
netidx resolver list -w '/hw/*/cpu-temp' | \
    sed -u -e 's/^/ADD|/' | \
    netidx subscriber | \
    while IFS='|' read path typ temp
    do
        IFS='/' pparts=($path)
        temp=$(sed -e 's/\.[0-9]*//' <<< "$temp") # strip the fractional part, if any
        host=${pparts[2]}
        if ((temp > 75)); then
            echo "/hw/${host}/overtemp-ts|string|$(date)"
            echo "/hw/${host}/overtemp|f64|$temp"
        elif test "${HOSTS[$host]}" != "$host"; then
            HOSTS[$host]=$host
            echo "/hw/${host}/overtemp-ts|null"
            echo "/hw/${host}/overtemp|null"
        fi
    done | \
        netidx publisher \
           --bind 192.168.0.0/24 \
           --spn publish/blackbird.ryu-oh.org@RYU-OH.ORG
