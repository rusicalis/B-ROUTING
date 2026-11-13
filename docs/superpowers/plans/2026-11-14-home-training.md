# Home training implementation plan

> **For agentic workers:** Use superpowers:executing-plans inline. Steps use checkbox syntax.

**Goal:** Ship the requested home exercise revision to the existing GitHub repository.
**Architecture:** Keep task app functions; isolate pure workout engine and local 3D studio, connect with workout UI/state machine.
**Tech Stack:** Buildless HTML/CSS/ES modules, locally vendored Three.js, Node test runner, Playwright for verification.
**Spec:** ../specs/2026-11-14-home-training-design.md

## Global constraints
- Bodyweight without equipment or a single 12 kg kettlebell only.
- Preserve localStorage key burning-routine-local-v150 and existing task/history/theme data.
- Preserve five navigation tabs and static GitHub Pages compatibility.

## Review focus
- Legacy band/custom records must migrate to supported exercises without erasing tasks.
- Duplicate completion/reload must never award another progression credit.
- Region changes and intensity adjustments cannot alter an active workout silently.
- Interrupted/background workouts must not claim actual completion from timers alone.
- Offline or unavailable WebGL must retain text guides and usable workout controls.

### Task 1: Exercise and progression engine
Files: workout-engine.mjs; tests/workout-engine.test.mjs.
- [ ] Write failing tests for equipment, selected regions, routine variants, bounded advancement, duplicate/partial completion, independent tracks and migration.
- [ ] Run node --test, confirm expected failure, implement and rerun.

### Task 2: Workout UI and studio
Files: app.js, index.html, style.css, workout.css, motion-studio.js, vendor/three.module.min.js.
- [ ] Replace external GIF catalogue with curated engine; preserve existing task functions.
- [ ] Implement region/variant selection, custom routine, per-set confirmation and end feedback.
- [ ] Implement all exercise pose families, camera and playback controls, text fallback.
- [ ] Verify real desktop/mobile browser flows, all exercise previews, reload, partial/duplicate completion and old data.

### Task 3: Offline, delivery and publication
Files: service-worker.js, .github/workflows/pages.yml, README.md, CHANGELOG.md.
- [ ] Version and precache every local dependency, retain compatible notification behavior.
- [ ] Run full tests and syntax checks; review final diff.
- [ ] Upload to main using connected GitHub tools, confirm remote tree and Pages status.
- [ ] Package deliverables in the task outputs directory.
