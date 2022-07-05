# Radio Button

![Radio Button](./widget-radio-button.png)

Radio buttons allow another way of selecting between a set of
options. Radio buttons are grouped together, and within each group
only one radio button may be active at a time. Radio buttons have 4
bscript properties,

- Label: The text shown to the right of the radio button.
- Image: The image shown to the right of the radio button. This uses
  the same format as the image widget's spec property. If both image
  and text are present then both will be shown.
- Group: The name of the group this radio button belongs to. Only one
  button in each group may be active at any one time. If the user
  selects a new button in a group then current active button will
  toggle off and the new one will toggle on.
- On Toggled: `event()` called from this expression will yield `true`
  or `false` when the radio button toggles.

![Editor](./editor-radio-button.png)
