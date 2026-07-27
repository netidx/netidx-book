use anyhow::Result;
use netidx::{
    config::Config,
    path::Path,
    publisher::{Publisher, PublisherBuilder, Val, Value},
    resolver_client::DesiredAuth,
};

pub struct HwPub {
    publisher: Publisher,
    cpu_temp: Val,
}

impl HwPub {
    pub async fn new(host: &str, current: f64) -> Result<HwPub> {
        // load the site cluster config from the path in the
        // environment variable NETIDX_CFG, or from
        // the platform configuration directory's netidx/client.json if
        // the variable isn't specified, then from
        // ~/.config/netidx/client.json. Note this uses the cross
        // platform dirs library, so yes, it does something reasonable
        // on windows.
        let cfg = Config::load_default()?;

        // for this small service we don't need authentication
        let auth = DesiredAuth::Anonymous;

        // listen on any unique address matching 192.168.0.0/24. If
        // our network was large and complex we might need to make
        // this a passed in configuration option, but lets assume it's
        // simple.
        let publisher = PublisherBuilder::new(cfg)
            .desired_auth(auth)
            .bind_cfg(Some("192.168.0.0/24".parse()?))
            .build()
            .await?;

        // We're publishing stats about hardware here, so lets put it
        // in /hw/hostname/cpu-temp, that way we keep everything nice
        // and organized.
        let path = Path::from(format!("/hw/{}/cpu-temp", host));
        let cpu_temp = publisher.publish(path, Value::F64(current))?;

        // Wait for the publish operation to be sent to the resolver
        // server.
        publisher.flushed().await;
        Ok(HwPub { publisher, cpu_temp })
    }

    pub async fn update(&self, current: f64) {
        // start a new batch of updates. 
        let mut batch = self.publisher.start_batch();

        // queue the current cpu-temp in the batch
        self.cpu_temp.update(&mut batch, Value::F64(current));

        // send the updated value out to subscribers
        batch.commit(None).await
    }
}

pub fn main() {}
