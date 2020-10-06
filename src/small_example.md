# A Small Example

Suppose we have a small daemon that we run on many computers on our
network, and it knows many things about them, and does many things. I
won't specifiy exactly what it does or everything it knows because
that's irrelevant to the example. However suppose one of the things it
knows is the current CPU temperature of the machine it's running on,
and we would like access to that data. We heard about this new netidx
thing, and we'd like to try it out on this small and not very
important case, what code do we need to add to our daemon, and what
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

        // listen on any unique address matching 192.168.0.0/16. If
        // our network was large and complex we might need to make
        // this a passed in configuration option, but lets assume it's
        // simple.
        let publisher = Publisher::new(cfg, auth, "192.168.0.0/16".parse()?).await?;

        // We're publishing stats about hardware here, so lets put it
        // in /hw/hostname/cpu-temp, that way we keep everything nice
        // and organized.
        let path = Path::from(format!("/hw/{}/cpu-temp", host));
        let cpu_temp = publisher.publish(path, Value::F64(current))?;
        Ok(HwPub {
            publisher,
            cpu_temp,
        })
    }

    pub async fn update(&self, current: f64) -> Result<()> {
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
