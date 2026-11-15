# Illustrated Guides Implementation Plan

**Goal:** Replace the rejected3D trainer with illustrated, timed follow-along movements; no real-person videos.
**Architecture:** Curated local start/target illustrations plus the original GIF references. A lightweight DOM/canvas viewer follows a pure timing function driven by the existing workout clock. No skeletal posing or generated intermediate joints.
**Tech Stack:** Vanilla JS, Canvas2D, HTML/CSS, SVG/WebP and MIT omggif1.0.10.
**Spec:** ../specs/2026-11-14-illustrated-guides.md

1. Map40 motions and inspect their start/target poses. Preserve attribution and licenses; use explicit diagrams for unsupported hand-anchored band movements.
2. Implement the timing/viewer boundary, frame decoding, stage controls, stable pause, side changes, disposal and image-failure fallback. Remove active3D/video assets and update the cache.
3. Verify phone/WebKit, all40 media, no3D/video requests, GIF freeze/resume, source failure and offline behavior. Re-run session/progression checks, review screenshots, publish and verify live.
