# Check Button

The check button has the same BScript properties and controlled-state
semantics as a [Toggle Button](./toggle_button.md), but GTK renders it as a
checkbox instead of a push button:

- **Value** controls whether it is checked.
- **On Change** receives the user's requested Boolean state through `event()`.
- **Label** and **Image** control the content displayed beside the checkbox.

As with the toggle button, the event handler should update whatever drives
**Value**; clicking the control does not permanently override that expression.
