use anyhow::Result;
use chrono::prelude::*;
use futures::{
    channel::mpsc::{channel, Sender},
    prelude::*,
};
use netidx::{
    chars::Chars,
    config::Config,
    path::Path,
    pool::Pooled,
    publisher::{self, Publisher, Value},
    resolver::{Auth, ChangeTracker, Glob, GlobSet},
    subscriber::{self, Event, SubId, Subscriber, UpdatesFlags},
};
use std::{
    collections::{HashMap, HashSet},
    iter,
    sync::{Arc, Mutex},
    time::Duration,
};
use tokio::{task, time};

struct Temp {
    // we need to hang onto this reference to keep the subscription alive
    _current: subscriber::Dval, 
    timestamp: publisher::Val,
    temperature: publisher::Val,
}

async fn watch_hosts(
    subscriber: Subscriber,
    publisher: Publisher,
    tx_current: Sender<Pooled<Vec<(SubId, Event)>>>,
    temps: Arc<Mutex<HashMap<SubId, Temp>>>,
) -> Result<()> {
    // we keep track of all the hosts we've already seen, so we don't
    // publish an overtemp record for any host more than once.
    let mut all_hosts = HashSet::new();
    // we will talk directly to the resolver server cluster. The
    // ChangeTracker will allow us to efficiently ask if anything new
    // has been published under the /hw subtree. If anything has, then
    // we will list everything in that subtree that matches the glob
    // /hw/*/cpu-temp.
    let resolver = subscriber.resolver();
    let mut ct = ChangeTracker::new(Path::from("/hw"));
    let pat = GlobSet::new(true, iter::once(Glob::new(Chars::from("/hw/*/cpu-temp"))?))?;
    loop {
        if resolver.check_changed(&mut ct).await? {
            let mut batches = resolver.list_matching(&pat).await?;
            for mut batch in batches.drain(..) {
                for path in batch.drain(..) {
                    if let Some(host) = path.split('/').nth(2).map(String::from) {
                        if !all_hosts.contains(&host) {
                            // lock the temps table now to ensure the
                            // main loop can't see an update for an
                            // entry that isn't there yet.
                            let mut temps = temps.lock().unwrap();
                            // subscribe and register to receive updates
                            let current = subscriber.durable_subscribe(path.clone());
                            current.updates(
                                UpdatesFlags::BEGIN_WITH_LAST,
                                tx_current.clone(),
                            );
                            // publish the overtemp records, both with
                            // initial values of Null
                            let timestamp = publisher.publish(
                                Path::from(format!("/hw/{}/overtemp-ts", host)),
                                Value::Null,
                            )?;
                            let temperature = publisher.publish(
                                Path::from(format!("/hw/{}/overtemp", host)),
                                Value::Null,
                            )?;
                            // record that we've seen the host, and
                            // add the published overtemp record to
                            // the temps table.
                            all_hosts.insert(host);
                            temps.insert(
                                current.id(),
                                Temp { _current: current, timestamp, temperature },
                            );
                        }
                    }
                }
            }
        }
        // flush anything new we've published to the resolver server
        publisher.flush(None).await;
        // wait 1 second before polling the resolver server again
        time::sleep(Duration::from_secs(1)).await
    }
}

#[tokio::main]
pub async fn main() -> Result<()> {
    // load the default netidx config
    let config = Config::load_default()?;
    let auth = Auth::Krb5 {upn: None, spn: Some("publish/blackbird.ryu-oh.org@RYU-OH.ORG".into())};
    // setup subscriber and publisher
    let subscriber = Subscriber::new(config.clone(), auth.clone())?;
    let publisher = Publisher::new(config, auth, "192.168.0.0/24".parse()?).await?;
    let (tx_current, mut rx_current) = channel(3);
    // this is where we'll store our published overtemp record for each host
    let temps: Arc<Mutex<HashMap<SubId, Temp>>> = Arc::new(Mutex::new(HashMap::new()));
    // start an async task to watch for new hosts publishing cpu-temp records
    task::spawn(watch_hosts(
        subscriber.clone(),
        publisher.clone(),
        tx_current.clone(),
        temps.clone(),
    ));
    while let Some(mut batch) = rx_current.next().await {
        {
            let temps = temps.lock().unwrap();
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
        } // release the lock before we do any async operations
        publisher.flush(None).await
    }
    Ok(())
}
