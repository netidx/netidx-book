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
    _current: subscriber::Dval, // we need to hang onto this reference
    timestamp: publisher::Val,
    temperature: publisher::Val,
}

async fn watch_hosts(
    subscriber: Subscriber,
    publisher: Publisher,
    tx_current: Sender<Pooled<Vec<(SubId, Event)>>>,
    temps: Arc<Mutex<HashMap<SubId, Temp>>>,
) -> Result<()> {
    let mut ct = ChangeTracker::new(Path::from("/hw"));
    let mut all_hosts = HashSet::new();
    let resolver = subscriber.resolver();
    let pat = GlobSet::new(true, iter::once(Glob::new(Chars::from("/hw/*/cpu-temp"))?))?;
    loop {
        if resolver.check_changed(&mut ct).await? {
            let mut batches = resolver.list_matching(&pat).await?;
            for mut batch in batches.drain(..) {
                for path in batch.drain(..) {
                    if let Some(host) = path.split('/').nth(2).map(String::from) {
                        if !all_hosts.contains(&host) {
                            let current = subscriber.durable_subscribe(path.clone());
                            current.updates(
                                UpdatesFlags::BEGIN_WITH_LAST,
                                tx_current.clone(),
                            );
                            let timestamp = publisher.publish(
                                Path::from(format!("/hw/{}/overtemp-ts", host)),
                                Value::Null,
                            )?;
                            let temperature = publisher.publish(
                                Path::from(format!("/hw/{}/overtemp", host)),
                                Value::Null,
                            )?;
                            all_hosts.insert(host);
                            temps.lock().unwrap().insert(
                                current.id(),
                                Temp { _current: current, timestamp, temperature },
                            );
                        }
                    }
                }
            }
        }
        publisher.flush(None).await;
        time::sleep(Duration::from_secs(1)).await
    }
}

#[tokio::main]
pub async fn main() -> Result<()> {
    let config = Config::load_default()?;
    let auth = Auth::Anonymous;
    let subscriber = Subscriber::new(config.clone(), auth.clone())?;
    let publisher = Publisher::new(config, auth, "192.168.0.0/24".parse()?).await?;
    let (tx_current, mut rx_current) = channel(3);
    let mut temps: Arc<Mutex<HashMap<SubId, Temp>>> =
        Arc::new(Mutex::new(HashMap::new()));
    // start an async task to watch for new hosts publishing cpu-temp records
    task::spawn(watch_hosts(
        subscriber.clone(),
        publisher.clone(),
        tx_current.clone(),
        temps.clone(),
    ));
    while let Some(mut batch) = rx_current.next().await {
        let mut temps = temps.lock().unwrap();
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
