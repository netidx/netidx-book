# Integration Into an Existing System

Suppose we have a small daemon that we run on many computers on our
network, and it knows many things about them, and does many things. I
won't specify exactly what it does or everything it knows because
that's irrelevant to the example. However suppose one of the things it
knows is the current CPU temperature of the machine it's running on,
and we would like access to that data. We heard about this new netidx
thing, and we'd like to try it out on this small and not very
important case. What code do we need to add to our daemon, and what
options do we have for using the data?

We can modify our Cargo.toml to include netidx, and then add a small
self contained module, publisher.rs

``` rust
use anyhow::Result;
use netidx::{
    config::Config,
    path::Path,
    publisher::{Publisher, Val, Value},
    resolver::Auth,
};

#[derive(Clone)]
pub struct HwPub {
    publisher: Publisher,
    cpu_temp: Val,
}

impl HwPub {
    pub async fn new(host: &str, current: f64) -> Result<HwPub> {
        // load the site cluster config from the path in the
        // environment variable NETIDX_CFG, or from
        // dirs::config_dir()/netidx.json if the environment variable
        // isn't specified, or from ~/.netidx.json if the previous
        // file isn't present. Note this uses the cross platform dirs
        // library, so yes, it does something reasonable on windows.
        let cfg = Config::load_default()?;

        // for this small service we don't need authentication
        let auth = Auth::Anonymous;

        // listen on any unique address matching 192.168.0.0/24. If
        // our network was large and complex we might need to make
        // this a passed in configuration option, but lets assume it's
        // simple.
        let publisher = Publisher::new(cfg, auth, "192.168.0.0/24".parse()?).await?;

        // We're publishing stats about hardware here, so lets put it
        // in /hw/hostname/cpu-temp, that way we keep everything nice
        // and organized.
        let path = Path::from(format!("/hw/{}/cpu-temp", host));
        let cpu_temp = publisher.publish(path, Value::F64(current))?;
        // flush our publish request to the resolver server. Nothing
        // happens until you do this.
        publisher.flush(None).await?;
        Ok(HwPub {
            publisher,
            cpu_temp,
        })
    }

    pub async fn update(&self, current: f64) {
        // update the current cpu-temp
        self.cpu_temp.update(Value::F64(current));

        // flush the updated values out to subscribers
        self.publisher.flush(None).await
    }
}
```

Now all we would need to do is create a HwPub on startup, and call
HwPub::update whenever we learn about a new cpu temperature value. Of
course we also need to deploy a resolver server, and distribute a
cluster config to each machine that needs one, that will be covered in
the administration section.

## Using the Data We Just Published

So now that we have our data in netidx, what are our options for
consuming it? The first option, and often a very good one for a lot of
applications is the shell. The netidx command line tools are designed
to make this interaction easy, here's an example of how we might use
the data.

``` bash
#! /bin/bash

netidx subscriber $(netidx resolver list '/hw/*/cpu-temp') | \
while IFS='|' read path typ temp; do
    IFS='/' pparts=($path)
    if ((temp > 75)); then
        echo "host: ${pparts[2]} cpu tmp is too high: ${temp}"
    fi
done
```

Of course we can hook any logic we want into this, the shell is a very
powerful tool after all. For example one thing we might want do is
modify this script slightly, filter the entries with cpu temps that
are too high, and then publish the temperature and the timestamp when
it was observed.

``` bash
#! /bin/bash

netidx subscriber $(netidx resolver list '/hw/*/cpu-temp') | \
while IFS='|' read path typ temp; do
    IFS='/' pparts=($path)
    if ((temp > 75)); then
        echo "/hw/${pparts[2]}/overtemp-ts|string|$(date)"
        echo "/hw/${pparts[2]}/overtemp|f64|$temp"
    fi
done | \
netidx publisher --bind 192.168.0.0/24
```

Now we've done something very interesting, we took some data out of
netidx, did a computation on it, and published the result into the
same namespace. We can now subscribe to e.g. `/hw/krusty/overtemp-ts`
and we will know when that machine last went over temperature. To a
user looking at this namespace in the browser (more on that later)
there is no indication that the over temp data comes from a separate
process, on a separate machine, written by a separate person. It all
just fits together seamlessly as if it was one application.

There is actually a problem here, in that, the above code will not do
quite what you might want it to do. Someone might, for example, want
to write the following additional script.

``` bash
#! /bin/bash

netidx subscriber $(netidx resolver list '/hw/*/overtemp-ts') | \
while IFS='|' read path typ temp; do
    IFS='/' pparts=($path)
    ring-very-loud-alarm ${pparts[2]}
done
```

To ring a very loud alarm when an over temp event is detected. This
would in fact work, it just would not be as timely as the author might
expect. The reason is that the subscriber practices linear backoff
when it's instructed to subscribe to a path that doesn't exist. This
is a good practice, in general it reduces the cost of mistakes on the
entire system, but in this case it could result in getting the alarm
minutes, hours, or longer after you should. The good news is there is
a simple solution, we just need to publish all the paths from the
start, but fill them will null until the event actually happens (and
change the above code to ignore the null). That way the subscription
will be successful right away, and the alarm will sound immediately
after the event is detected. So lets change the code ...

``` bash
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
    done | netidx publisher --bind 192.168.0.0/24
```

So first we list all the machines in /hw and publish null for
overtemp-ts and overtemp for each one, and then using cat and the
magic of process substitution we append to that the real time list of
actual over temp events.

## Or Maybe Shell is Not Your Jam

It's entirely possible that thinking about the above solution makes
you shiver and reinforces for you that nothing should ever be written
in shell. In that case it's perfectly possible to do the same thing in
rust.

``` rust
use anyhow::Result;
use futures::{channel::mpsc::channel, prelude::* };
use netidx::{
    config::Config,
    path::Path,
    publisher::{self, Publisher, Value},
    resolver::Auth,
    subscriber::{self, Event, SubId, Subscriber},
};
use chrono::prelude::*;
use std::collections::HashMap;

#[tokio::main]
pub async fn main() -> Result<()> {
    let config = Config::load_default()?;
    let auth = Auth::Anonymous;
    let subscriber = Subscriber::new(config.clone(), auth.clone())?;
    let publisher = Publisher::new(config, auth, "192.168.0.0/24".parse()?).await?;
    let (tx_current, mut rx_current) = channel(3);
    struct Temp {
        _current: subscriber::Dval, // we need to hang onto this reference
        timestamp: publisher::Val,
        temperature: publisher::Val,
    }
    let temps = subscriber
        .resolver()
        .list(Path::from("/hw"))
        .await?
        .drain(..)
        .filter_map(|path| path.split('/').nth(2).map(String::from))
        .map(|host| {
            let current = subscriber
                .durable_subscribe(Path::from(format!("/hw/{}/cpu-temp", host)));
            current.updates(true, tx_current.clone());
            let timestamp = publisher
                .publish(Path::from(format!("/hw/{}/overtemp-ts", host)), Value::Null)?;
            let temperature = publisher
                .publish(Path::from(format!("/hw/{}/overtemp", host)), Value::Null)?;
            Ok((current.id(), Temp { _current: current, timestamp, temperature }))
        })
        .collect::<Result<HashMap<SubId, Temp>>>()?;
    publisher.flush(None).await;
    while let Some(mut batch) = rx_current.next().await {
        for (id, ev) in batch.drain(..) {
            match ev {
                Event::Unsubscribed => (), // Subscriber will resubscribe automatically
                Event::Update(v) => {
                    if let Ok(temp) = v.cast_to::<f64>() {
                        if temp > 75. {
                            let tr = &temps[&id];
                            tr.timestamp.update(Value::DateTime(Utc::now()));
                            tr.temperature.update(Value::F64(temp));
                        }
                    }
                }
            }
        }
        publisher.flush(None).await
    }
    Ok(())
}
```

This does almost exactly the same thing as the shell script, the only
semantic difference being that it sends an actual DateTime value for
the timestamp instead of a string, which would certainly make life
easier for anyone using this data, not to mention it's more
efficient. There is a little more setup and book keeping, but at 62
lines it's hardly a massive program (and it's nearly 20% use
statements).

## But I Just Want to Look at My Data

Up to now we've covered using the data in various kinds of programs,
but what if you just want to look at it. For that you have two
choices, you can write a custom tool that presents your data exactly
the way you want, or you can use the netidx browser. A custom tool
will always give you more control, but the browser is designed to be
pretty flexible, and it allows you to get to an ok looking solution
really fast. In the case of the data we've been discussing in this
chapter, you get something pretty nice to look at without doing
anything at all.

![The Browser rendering a table](small-example-table.png)

So what's going on here, how did we get a nice looking table out of a
tree? When asked to navigate to a path the browser looks for two kinds
of regular structures, and will draw something appropriate based on
it's findings. One kind is a tree where the 1st level children
themselves have a regular set of children. By regular I mean, with the
same name. In the example we have

```
/hw/um01-ta07-09/cpu-temp
/hw/um01-ta07-09/overtemp-ts
/hw/um01-ta07-09/overtemp
```

But all the 1st level nodes have the same children, so the pattern is,

```
/hw/${host}/cpu-temp
/hw/${host}/overtemp-ts
/hw/${host}/overtemp
```

The browser discovers that regularity, and elects to make a row for
each $host, and a column for each child of $host. In our case, the
data is perfectly regular, and so we end up with a fully populated
table with 3 columns, and a row for each host.

While it's nice to have perfect regularity is not a requirement. By
default in order to be included as a column in the table a 2nd level
child must be shared by at least 50% of the 1st level children (50% of
the rows must have that column). However it is possible to manually
configure which columns the browser should draw, what order they
appear in, and even which (if any) should be the default sort
column. One can do this using the browser's built in view editor (or
by editing some json), and one can publish the result into netidx such
that the browser will automatically use your view definition when the
user navigates to a specific place in the tree. There is more that can
be done with views but that's for another chapter.

In the case where the browser does not find this 2 level regularity,
for example if the current level nodes don't have any children, then
it will draw a table with 1 column (the value) and a row for each
node. This is called vector mode. 

If you're worried that this pattern recognition is expensive in cpu,
bandwidth, and round trips, don't be. The resolver server pre computes
tables, so it's just one call for the browser to retrieve that
information for a given location.

## Wrapping Up

In this chapter we saw how we could add a bit of code to an existing
system to expose some of it's data to netidx, and then get quite a bit
of functionality out of that for not much work. I'd like to point out
that all of the components we saw need not have been written by one
person. In fact the people who write them didn't need to talk to each
other in advance (or ever). Having worked in a large organization
where netidx was deployed I found that it's often the case that
someone publishes some interesting data, and then later on other
people see it, do things with it, and publish those things, and after
a while a very compelling application appears almost by magic. Of
course once that happens it's often necessary to get those people
together and talk about how to streamline their design, support the
user base, etc, but that's a really good problem to have because it
means value has been created. Many administrators deploying netidx
might be tempted to lock it completely down so that only "production"
applications are allowed to publish. It's important to think carefully
about how to make sure production applications are always available,
but even still we always included a place in the namespace where
anyone could publish anything.

In the next chapter I'll focus on an application written from scratch
to use netidx as it's primary means of communication and control, and
the browser as it's primary user interface.
