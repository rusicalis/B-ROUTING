# User Presets Implementation Plan

**Goal:** Apply the user's week as reusable presets with duration fitting, gentle progression, uniform anatomical illustrated previews and screen-on protection.
**Architecture:** Pure preset templates/step builder/time estimator feed the existing session state machine. A separate wake-lock controller owns browser lifecycle and race handling. Curated illustrated-loop references use the existing Canvas2D decoder.
**Tech Stack:** Vanilla JS/ES modules, localStorage, Canvas2D/omggif, Screen Wake Lock API, Node tests and Playwright Chrome/WebKit.
**Spec:** ../specs/2026-11-17-user-presets.md

1. Add wake-lock lifecycle tests, implement a dependency-injected controller, integrate setting/status and app lifecycle.
2. Add exercise metadata and pure preset tests: original goals, honest30minute fitting, monotonic duration/volume, gradual progression, unilateral dose, circuit order and30/60second rests. Implement templates, step builder, estimator and migration/track keys.
3. Add preset/duration/edit/save controls and run the same step list in the workout clock. Keep original goals visible when scaled. Map active previews to anatomical illustrated sources and verify them visually, with source notes for any equipment difference.
4. Verify units and mobile/browser flows, image failures/cache, wake-lock acceptance/rejection/races, saved presets and existing records. Review final change, update version/docs, publish and verify live; package ZIP and user guide.
