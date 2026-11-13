# Home training 2.0

User request: keep the existing Korean routine/to-do app shell, replace exercises with equipment-free bodyweight and one 12 kg kettlebell, select body regions, improve movement previews, advance after completed routines, upload to rusicalis/B-ROUTING.

Implementation decisions: preserve existing localStorage key and tasks/history/settings. Provide eight region filters (full body plus seven regions), three curated routine variants, custom exercise selection, and a persistent progression track per selection. Each completion proposes the next bounded level; hard sessions retain their level and painful sessions step back. No advancement from a to-do checkbox, preview, partial or duplicate completion. One progression credit per track per local calendar day. First routine remains stable across days; changing body regions uses a separate track.

Use a locally bundled Three.js studio with articulated, animated exercise poses, active muscle colors, front/side/back views, drag rotation, speed/pause and step scrub. All exercises carry specific text cues; the stylized figure is an illustrative guide, not motion capture. No copied third-party videos or paid assets. WebGL failure retains written step guides and workout operation. Browser-local data and GitHub Pages remain the hosting model.

Approaches considered: remote GIF/video (fragile offline/licensing); licensed motion-capture assets (requires supplied rights/budget); local procedural 3D (selected as implementation decision: offline, coherent, interactive, with explicit illustration limitations).

Verification: engine invariants and progression/migration unit tests, mobile/desktop browser exercise flow including pause/rest/completion/reload, offline service-worker caching, GitHub main upload and Pages deployment status. Deliver a source ZIP and Korean release notes.
