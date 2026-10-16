# Sonic CLI Demo
# Run from the repo root: vhs assets/demo.tape
# Tip: set "volume": 0 in ~/.config/sonic/store.json while recording.

Output assets/demo.gif

Set Shell zsh
Set FontFamily "Menlo"
Set FontSize 15
Set Width 1000
Set Height 820
Set Padding 20
Set Framerate 15
Set TypingSpeed 50ms
Set Theme "Catppuccin Mocha"

# Launch sonic
Type "node ./bin/sonic.js"
Enter
Sleep 2.5s

# Browse the picker
Down
Sleep 400ms
Down
Sleep 400ms
Up
Sleep 500ms

# Peek at sessions and back
Tab
Sleep 1.2s
Tab
Sleep 800ms

# Quick pick: synthwave
Type "8"
Sleep 8s

# Play the first mix
Enter
Sleep 10s

# Visualizers
Type "v"
Sleep 2.5s
Type "v"
Sleep 2.5s
Type "v"
Sleep 2.5s
Type "v"
Sleep 2.5s

# Themes
Type "t"
Sleep 2s
Type "t"
Sleep 2s
Type "v"
Sleep 2s

# Quit
Type "q"
Sleep 500ms
