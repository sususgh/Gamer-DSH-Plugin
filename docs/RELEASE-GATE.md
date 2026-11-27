# Release gate

## Current release classification

**Status: NOT READY FOR a stable v1.0.0 release.**

The repository currently contains a desktop UI prototype and architecture/protocol documentation. The UI explicitly reports that pairing, device transport, model routing, vision, research and persistent memory runtimes are not connected. A successful static UI check is not evidence that the game agent works.

## Required evidence before stable release

- [ ] DSH plugin manifest and a tested DSH extension/entry-point contract.
- [ ] Working desktop runtime with authenticated DSH model configuration access.
- [ ] Working model adapter with capability discovery, health probes, timeouts and safe fallback.
- [ ] Working Android companion application and documented installable build.
- [ ] End-to-end QR pairing with expiring, single-use tokens and explicit user consent.
- [ ] Real screen capture and input execution with local emergency stop.
- [ ] At least one game profile validated repeatedly on supported devices/builds.
- [ ] Integration tests for disconnect, stale frames, model failure, pause and stop.
- [ ] Reproducible Windows installer/package and checksums.
- [ ] Security review: no API keys in QR codes, Android app, logs or release artifacts.
- [ ] Third-party voice model provenance and license recorded; no voice weights redistributed without permission.
- [ ] CI green on the exact commit being tagged.

## Release policy

- CI may package the current desktop UI as a **prototype artifact** for review.
- Do not label that artifact as a playable plugin or stable release.
- Create the stable GitHub Release only after every required item above has evidence attached to the release checklist.
- Use a version tag only for the exact tested commit. Prefer signed tags and publish checksums for all binaries.
