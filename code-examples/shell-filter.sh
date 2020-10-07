#! /bin/bash

cat <(
    netidx resolver list /bench | \
        while IFS='/' read -a pparts
        do
            echo "/bench/${pparts[2]}/over75|string|null"
        done
) \
<(
    netidx subscriber $(netidx resolver list /bench/ | grep "0$") | \
        while IFS='|' read path typ temp
        do
            IFS='/' read -a pparts <<< $path
            if ((temp > 10000)); then
                echo "/bench/${pparts[2]}/over75|string|$(date)"
            fi
        done
) | netidx publisher --bind 192.168.0.0/24 --spn publish/blackbird.ryu-oh.org@RYU-OH.ORG
