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
still used by command line tools). Full source code
[here](https://github.com/estokes/solar).

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
/solar/control/charging (to control whether we are charging the
batteries), /solar/control/load (to control whether the inverter is on
or off), and /solar/control/reset (to trigger a controller
reset). These values will all be boolean, and they will be valid for
both read and write. Here is the full code of the control section,

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

A view definition can be published to the special value .view in a
given directory (e.g. /solar/.view) so it will automatically render
whenever the browser visits that directory, that's what we've done
here. In fact we have our view definition in a file solar.view, and
we're publishing it with the following shell script,

``` bash
netidx publisher -b 192.168.0.0/24 --spn svc/host@REALM <<EOF
/solar/.view|string|$(cat ~/solar.view)
EOF

```

This need not be on the same machine as the control program, as long
as the user running the command has permission to publish under /solar
it will work.

Building the view in the first place can be done using design mode in
the browser, the view can then be saved to a file or written directly
to a netidx path.

![Browser Design Mode](browser-design-mode.png)

Design mode can be activated at any time with the toggle button in the
upper left corner, to the left of save. It splits the window
vertically into two panes, the gui on the right, and the view
definition on the left. The view definition is visualized as a tree of
widgets, with parents higher in the tree containing children, and each
widget having a type. Notice that we've selected a toggle widget in
the tree, and we can see that widget is highlighted blue in the gui,
as we move the selection, the highlight will move, such that we always
know what part of the actual gui we are changing. From a static
picture it's not possible to see this, however the gui is fully
functional in every way while design mode is activated, it isn't some
"special" mode, what you see is exactly what you will get. This
extends to changes, as we make changes the gui will reflect them
immediatly, of course if we don't like a change we can simply press
the undo button in the tool bar above the widget tree. 

Now lets take a look at the bottom part of the view definition pane,
we see the details of the widget we've selected, the toggle button. We
see there are some layout properties hidden by an expander, every
drawable widget has those, so lets leave them for later. Every widget
that does something in the browser has one or more sources, and one or
more sinks. Sources are where data comes in, and sinks are where data
goes out. Sources are defined in a little domain specific language
called the formula language, which will be specified in detail
later. Sinks use the same syntax but have a different set of
functions.

Our toggle has two sources, and one sink. The enabled source just
determines if the toggle is interactable, and in our case it's set to
a function constant(bool, true), which always evaluates to
Value::True. The other source, just called source, determines whether
the toggle displays as on or off, and this one is set to
load_path("/solar/control/charging"), which is a function that
subscribes to the netidx path it's given and updates when the path
updates. This ties the state of the toggle to the value of
/solar/control/charging, when that value changes the toggle state
changes. When the user clicks the toggle, either true or false is
written to the sink which is defined as
confirm(store_path("/solar/control/charging")). So what does this do?
Well, store_path pretty obviously creates a sink that writes whatever
value it receives to the specified path, confirm is more complex. It
takes a sink as an argument, and returns a sink that asks the user to
confirm every value it receives. If the user says yes, then it passes
the value on to the passed in sink, in this case to load_path,
otherwise it drops the value.

There are many other useful formulas, and the goal is to make building
simple guis like this dead easy, the majority of the work should be
the layout, and moderatly complex guis should be possible. While this
system is already pretty useful it is still under heavy development,
and is by no means finished.
