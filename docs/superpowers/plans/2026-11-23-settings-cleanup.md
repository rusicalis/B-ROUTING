# Settings cleanup and routine selection

Requested: checkbox-style dark/light selection with panel inset; one compact card for screen awake and notification actions; remove storage and guide-source Settings cards and explanatory copy; add space below task titles and put time/notification side by side at 375px and 320px.

The routine bug has two paths: active-session guards reject selection and reset its UI, while Settings renders the active execution plan instead of the selected configuration. Settings must render the selected configuration independently. Selecting a preset explicitly chooses preset mode. Selections update the title and full exercise list immediately and persist across reloads. Selecting a next routine pauses active work but does not erase it. Explicitly applying the selected routine archives an incomplete session without completion credit and opens the new preview; never silently discard pending final feedback. Keep workout GIF attribution and essential form cues; remove only the guide-source Settings card.

- Reproduce selection and mobile Settings regressions with browser tests before changes.
- Implement Settings-only render of selected plans, consistent routine/preset handlers and explicit apply transition.
- Consolidate Settings markup and style the native inputs for a compact, nonoverlapping row.
- Update the existing form-layout checks to the newly requested single row, verify active-session credits, saved presets, modes, reload and 320/375px in Chrome/WebKit.
- Run pure and exercise regressions, review, publish the authorized GitHub update, verify Pages and package the release.
