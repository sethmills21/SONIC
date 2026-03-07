# Sonic CLI Demo
# Run: vhs assets/demo.tape

Output assets/demo.gif

Set Shell zsh
Set FontFamily "JetBrains Mono"
Set FontSize 15
Set Width 900
Set Height 550
Set Padding 16
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
Down
Sleep 400ms

# Switch tab and back
Tab
Sleep 1s
Tab
Sleep 800ms

# Cycle themes
Type "t"
Sleep 1s
Type "t"
Sleep 1s

# Search
Type "/"
Sleep 500ms
Type "lofi chill beats"
Sleep 300ms
Enter
Sleep 4s

# Play first result
Enter
Sleep 8s

# Switch visualizer
Type "v"
Sleep 3s
Type "v"
Sleep 3s

# Cycle theme during playback
Type "t"
Sleep 2.5s

# Quit
Type "q"
Sleep 500ms
