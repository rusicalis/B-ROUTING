# Live duration controls

User request: remove the skip caption and make its black background a circle equal to the 48px resume circle. Keep its accessible name. Fix 30/40/50/60 minute selection during workouts; current code explicitly disables the picker while a session is active.

- Add regression coverage for touch selection while working, paused and resting, and matching circular controls in both modes at iPhone 13 mini width.
- Reconcile a new duration plan against stable completion IDs. Preserve completed exercises, the current dose/timer/phase, intensity and elapsed time. Modify only future doses/sets. Keep at least one set for each unfinished movement; never award credit to removed future sets.
- Rebuild the intensity baseline for the selected duration so later intensity changes cannot restore the previous duration. Persist and restore the selected target.
- Keep Sunday endless and protect the final feedback phase. A shorter target may be exceeded when protected completed/current work already exceeds it.
- Run pure and mobile browser regressions, publish the authorized GitHub update, verify Pages and create the release ZIP.
