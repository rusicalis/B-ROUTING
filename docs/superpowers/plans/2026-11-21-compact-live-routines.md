# Compact live routines

User-authorized changes: replace separate unfinished-workout recovery cards with navigation within the active completion ledger. Arrow navigation skips completed exercise types and never awards credit. A skipped exercise remains reachable until completed. Timer expiry confirms a set; an image tap pauses, showing compact central resume and skip controls. The existing set timer also displays rest. Remove the separate rest card.

Default split: Monday/Thursday chest, triceps, abs; Tuesday/Friday back, biceps, abs; Wednesday/Saturday shoulders, legs, abs. Use one or two illustrated movements per target and fill the selected duration with sets and repetitions. Sunday repeats pike push-up 5, push-up 10, squat 15, then 30 seconds rest, until explicitly ended. Recommended compact alternatives remain selectable in Settings.

Normal / Hard / Extreme changes future doses and optional sets during the session. Completed credits, the current set's dose and elapsed time remain stable. Completed exercise types cannot reappear following an increase. The current intensity is visible; choices are mutually exclusive.

Implementation sequence:
1. Test and implement compact planning and live ledger helpers independently.
2. Integrate timer completion, incomplete-only navigation, central controls, rest timer, live intensity and endless Sunday.
3. Preserve the pending image-first, Settings relocation, black/white/red dark/light modes, AI BR icon, and native iPhone form fixes.
4. Verify pure tests and Chrome/WebKit mobile flows, including reload, out-of-order completion, intensity changes and endless rounds.
5. Review changes, update documentation, publish the authorized GitHub commit, verify Pages and package a ZIP.
