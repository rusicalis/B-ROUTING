# Exercise media notices

## Original illustrated GIF references

The application restores illustrated GIF references from the media source already used by the user-provided1.5.3 application: https://github.com/hasaneyldrm/exercises-dataset . The application references the original remote URLs; it does not bundle or relicense those GIF files. Required visible attribution: © Gym visual — https://gymvisual.com/ . The mirror's MIT license covers its code/data structure, not the exercise media. Media rights and reuse remain subject to the rights holder's terms: https://gymvisual.com/content/3-terms-and-conditions-of-use . See the upstream LICENSE and NOTICE.md for the media exception.

## Additional anatomical preview references

Exact matching anatomical animations are remotely referenced from Gymvisual public product preview URLs using https://wsrv.nl/ as a browser-compatible animated-image proxy. Original product and image URLs are retained per record in exercise-media-data.mjs. Watermarks are preserved. The proxy is an external dependency and availability is not guaranteed. No vendor GIFs are bundled, sold, re-licensed or represented as open-license media. These references remain subject to the rights holder's terms linked above, including any required permission/license for reuse.

The active library uses only matched equipment illustrations. Unavailable legacy/requested-goal entries have explicit text-only status; new automatic/custom selection excludes them. Old blue static illustrations and their runtime references have been removed.

## GIF decoder

vendor/omggif.mjs: omggif1.0.10, Copyright Dean McNamee2013, MIT license. Full license is preserved in the file header. Source: https://github.com/deanm/omggif . An ES-module export is appended; the decoder is otherwise unmodified. Only one decoded frame buffer is retained per displayed GIF.

Real-person photos/videos, video embeds and runtime3D models are not used.
