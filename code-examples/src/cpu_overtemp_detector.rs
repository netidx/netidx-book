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
    publisher.flush(None).await?;
    while let Some(mut batch) = rx_current.next().await {
        for (id, ev) in batch.drain(..) {
            match ev {
                Event::Unsubscribed => (), // Subscriber will resubscribe automatically
                Event::Update(v) => {
                    if let Some(temp) = v.cast_f64() {
                        if temp > 75. {
                            let tr = &temps[&id];
                            tr.timestamp.update(Value::DateTime(Utc::now()));
                            tr.temperature.update(Value::F64(temp));
                        }
                    }
                }
            }
        }
        publisher.flush(None).await?
    }
    Ok(())
}
