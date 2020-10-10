# A Complete System

In the last chapter we added netidx publishing of one data point to an
existing system, and then explored what we could do with the data. In
this chapter we're going to look at a system designed from scratch to
use netidx as it's primary means of communication and control.

The system we're going to look at is the control program of an off the
grid solar generator. This is a medium sized system, meant to provide
backup power in the event of a long outage, as well as power to any
110vac appliance (up to 20 amps). It consists of a Morningstar
Prostart MPPT charge controller, 4 100 Watt solar panels, 4 lithium
ion batteries arranged in series/parallel to make a 24 volt nominal
200 ah battery pack (about 4.8 Kwh of total storage), and a 3000 Watt
inverter. As the power is quite reliable where I live I often use it
to charge my plug in hybrid car. The Prostar MPPT controller has a
serial port over which it talks modbus, and I've connected a raspberry
pi 3 running bog standard raspbian to that port using a usb to serial
adapter. The pi, called "solar", is connected to my wifi network and
is joined to my samba ADS domain.

The control program, then, is more or less a simple translation layer
between the modbus interface of the Prostar and netidx. This system
has been around for a long time, predating having netidx working as an
open source system (the closed version goes back over a decade, but
for various reasons it will likely never be released), as such there
is a vestigal web gui, and a local control socket interface (which is
still used by command line tools). Full source code here,
[solar](https://github.com/estokes/solar).

The main loop takes commands from either the command socket, or the
netidx publisher, and sends them via modbus to the charge controller, e.g.

``` rust
    loop {
        let msg = select_biased! {
            _ = tick.next() => ToMainLoop::Tick,
            m = receiver.next() => match m {
                None => break,
                Some(m) => m
            }
        };
        debug!("run_server: {:?}", msg);
        match msg {
            ToMainLoop::FromClient(msg, mut reply) => match msg {
                FromClient::SetCharging(b) => {
                    send_reply(mb.write_coil(ps::Coil::ChargeDisconnect, !b).await, reply)
                        .await
                }
                FromClient::SetLoad(b) => {
                    send_reply(mb.write_coil(ps::Coil::LoadDisconnect, !b).await, reply)
                        .await
                }
                FromClient::ResetController => {
                    send_reply(mb.write_coil(ps::Coil::ResetControl, true).await, reply)
                        .await
                }
                FromClient::LogRotated => {
                    log = log_fatal!(
                        open_log(&config).await,
                        "failed to open log {}",
                        break
                    );
                    send_reply(Ok(()), reply).await
                }
                FromClient::TailStats => tailing.push(reply),
                ...
```

A message is either a timer Tick, on which we send out (and log)
updated stats, or an actual command, which we handle individually. The
publisher module is fed a new stats record read from modbus on each
timer tick. e.g.

``` rust
    fn update(&self, st: &Stats) {
        use chrono::prelude::*;
        self.timestamp
            .update_changed(Value::DateTime(DateTime::<Utc>::from(st.timestamp)));
        self.software_version.update_changed(Value::V32(st.software_version as u32));
        self.battery_voltage_settings_multiplier
            .update(Value::V32(st.battery_voltage_settings_multiplier as u32));
        self.supply_3v3.update_changed(Value::F32(st.supply_3v3.get::<volt>()));
        self.supply_12v.update_changed(Value::F32(st.supply_12v.get::<volt>()));
        self.supply_5v.update_changed(Value::F32(st.supply_5v.get::<volt>()));
        self.gate_drive_voltage
            .update_changed(Value::F32(st.gate_drive_voltage.get::<volt>()));
        self.battery_terminal_voltage
            .update_changed(Value::F32(st.battery_terminal_voltage.get::<volt>()));
    ...
```

These are all published under /solar/stats, there are a lot of them,
so I won't show them all here, you can read the full source if you're
curious. Essentially it's an infinite loop of read stats from modbus,
log to a file, update netidx, flush netidx, loop.

## What About Control

The above handles distributing the stats perfectly well, but for
control we need some way to send commands from the subscriber back to
the publisher, and that's where writes come in. If you've read the api
documentation you might have noticed,

```rust
pub fn write(&self, v: Value)
```

Continuing with the metaphor of exporting variables to a cross machine
global namespace, it fits perfectly well to imagine that we can write
to those variables as well as read from them, publisher willing.

Our program is going to publish three values for control,
/solar/control/charging, /solar/control/load, and
/solar/control/reset. These values will all be boolean, and they will
be valid for both read and write. Here is the full code of the control
section,

```rust
struct PublishedControl {
    charging: Val,
    load: Val,
    reset: Val,
}

impl PublishedControl {
    fn new(publisher: &Publisher, base: &Path) -> Result<Self> {
        Ok(PublishedControl {
            charging: publisher.publish(base.append("charging"), Value::Null)?,
            load: publisher.publish(base.append("load"), Value::Null)?,
            reset: publisher.publish(base.append("reset"), Value::Null)?,
        })
    }

    fn update(&self, st: &Stats) {
        self.charging.update_changed(match st.charge_state {
            ChargeState::Disconnect | ChargeState::Fault => Value::False,
            ChargeState::UnknownState(_)
            | ChargeState::Absorption
            | ChargeState::BulkMPPT
            | ChargeState::Equalize
            | ChargeState::Fixed
            | ChargeState::Float
            | ChargeState::Night
            | ChargeState::NightCheck
            | ChargeState::Start
            | ChargeState::Slave => Value::True,
        });
        self.load.update_changed(match st.load_state {
            LoadState::Disconnect | LoadState::Fault | LoadState::LVD => Value::False,
            LoadState::LVDWarning
            | LoadState::Normal
            | LoadState::NormalOff
            | LoadState::NotUsed
            | LoadState::Override
            | LoadState::Start
            | LoadState::Unknown(_) => Value::True,
        });
    }

    fn register_writable(&self, channel: fmpsc::Sender<Pooled<Vec<WriteRequest>>>) {
        self.charging.writes(channel.clone());
        self.load.writes(channel.clone());
        self.reset.writes(channel.clone());
    }

    fn process_writes(&self, mut batch: Pooled<Vec<WriteRequest>>) -> Vec<FromClient> {
        batch
            .drain(..)
            .filter_map(|r| {
                if r.id == self.charging.id() {
                    Some(FromClient::SetCharging(bool!(r)))
                } else if r.id == self.load.id() {
                    Some(FromClient::SetLoad(bool!(r)))
                } else if r.id == self.reset.id() {
                    Some(FromClient::ResetController)
                } else {
                    let m = format!("control id {:?} not recognized", r.id);
                    warn!("{}", &m);
                    if let Some(reply) = r.send_result {
                        reply.send(Value::Error(Chars::from(m)));
                    }
                    None
                }
            })
            .collect()
    }
}
```

In process_writes we translate each WriteRequest that is targeted at
one of the published controls into a FromClient message that the main
loop will act on. So from the main loop's perspective it doesn't
matter if a command came from netidx, or a command line tool. Note
that it isn't necessary to do any authorization here, the publisher
library has already checked that the resolver server granted the user
making these writes permission to do them.

For the basic day to day use case, that's all we need on the server
side. The entire daemon uses 6.5 MB or ram, and almost no cpu, it
could certianly run on a smaller device, though we depend on tokio,
which means we at least need a real OS under us (for now).

The kerberos configuration for this service is also quite simple,
there is a service principal called svc_solar in samba ADS, and solar
has a keytab installed for it, as well as a cron job that renews it's
TGT every couple of hours. Depending on which OS and KDC you are using
there are different ways you might do this, but that's pretty far out
of our scope.

## Building a Custom GUI With Views

What we have is fine as far as it goes, we can view our stats in
vector mode in the browser, and we can write to the controls using the
command line subscriber. For scripting it's great, but when I want to
turn on the inverter on so I can charge the lawn mower, typing
commands at my phone is not ideal, I'd like a gui. This is where
custom browser views come in, here is the finished product,

![Solar GUI](solar-gui.png)
