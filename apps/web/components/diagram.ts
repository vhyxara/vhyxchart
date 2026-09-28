// How VhyxChart turns text into motion, validated with @vhyxchart/core parse().
export const PIPELINE = `flowchart LR
  write[Write text] --> parse[Parse]
  parse --> layout[Layout]
  layout --> play[Play in the browser]
  layout --> svg[Animated SVG]
  svg --> github([GitHub README])

scenario From text to motion
  write -> parse : .vhyx
  parse is done
  parse -> layout
  layout is done
  layout -> play, layout -> svg
  play is active
  svg -> github : commit
  github is done`;
