use anyhow::Result;
use netidx::{
    config::Config,
    path::Path,
    publisher::{Publisher, Val, Value},
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
        // dirs::config_dir()/netidx/client.json if the environment
        // variable isn't specified, or from ~/.netidx.json if the
        // previous file isn't present. Note this uses the cross
        // platform dirs library, so yes, it does something reasonable
        // on windows.
        let cfg = Config::load_default()?;

        // for this small service we don't need authentication
        let auth = DesiredAuth::Anonymous;

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
