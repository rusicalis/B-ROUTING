# Compact Settings layout follow-up

Remove the Settings heading and shortcut row above workout configuration. Remove decorative region symbols; retain text buttons. Place the apply action after the region/variant controls with an explicit gap.

Normalize task time and notification to equal 120×44px visible frames, with a 12px gap. Use the existing native controls as transparent, clipped interaction layers so iOS native face dimensions cannot resize or overlap the visible boxes. Display stored time in compact 24-hour HH:mm form. Preserve native picking, keyboard focus, changes, saving, modes and data.

Verify 320/375px in Chromium/WebKit, all routine selector modes, theme switching, saving and reload. Add a hostile oversized-native-control case that verifies clipping and hit areas. Publish the authorized GitHub release and ZIP after checks.
