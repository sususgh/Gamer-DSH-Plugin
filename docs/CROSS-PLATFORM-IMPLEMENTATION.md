# Gamer cross-platform runtime implementation plan

## Scope accepted
- Desktop targets: Windows and Linux.
- Mobile target: Android.
- Interaction: screen perception plus keyboard/mouse/touch automation.
- DSH remains the model/orchestration entry point. Model credentials stay on the desktop host.

## Runtime boundaries
1. DSH plugin: configuration discovery, task/session orchestration and user-facing status.
2. Desktop host: authenticated pairing, model adapters, screen capture, local CV/OCR, PC input adapters, action policy and telemetry.
3. Android companion (separate Android project): QR scan, explicit consent, Android Keystore identity, MediaProjection capture, AccessibilityService/touch execution where permitted, WebSocket control and acknowledgements.
4. Game profiles: per-game resolution, UI anchors, coordinate transforms, action allow-list and tested capability matrix.

## Pairing protocol requirements
- QR carries protocol, desktop instance ID, LAN endpoint and a random one-use token only.
- Android must display host identity and requested permissions before consent.
- Exchange device public key and prove possession; derive a session key; rotate credentials on unpair.
- Use authenticated WebSocket messages with session ID, monotonic sequence, replay protection and heartbeat.
- QR decode or HTTP landing-page open is not a successful pairing.
- Never send DSH provider secrets or API keys to Android.

## Engine milestones
- E0 safety gate and action schema (implemented as a policy primitive; not a device driver).
- E1 PC capture adapters: Windows Graphics Capture / DXGI and Linux PipeWire/X11 capture.
- E2 PC input adapters: SendInput on Windows and permitted uinput/desktop automation on Linux.
- E3 Android capture and touch bridge with explicit OS permissions.
- E4 perception pipeline: OCR, UI detection, object tracking, state extraction and confidence scores.
- E5 model adapters and structured action planning; validate every action locally before execution.
- E6 game profiles, replayable fixtures and per-game acceptance reports.

## Safety invariants
- Agent starts stopped. Arming requires an authenticated paired device and explicit input permission.
- Stop/pause from either client preempts queued actions.
- Action coordinates are normalized and range-checked; durations are bounded.
- No arbitrary shell, process injection, memory editing, anti-cheat bypass or credential exposure.
- Capture is visibly indicated and limited to the selected game/window with user consent.

## Acceptance matrix
- QR generation, expiration, revocation, replay rejection and LAN reachability.
- Android consent, identity proof, session-key establishment, reconnect and unpair.
- PC capture/input on each supported OS.
- Android capture/input on supported Android versions and OEM permission flows.
- Per-game perception/action tests with recorded fixtures and measured success rates.
- CI: syntax checks, unit tests, integration tests, dependency audit and packaged install smoke tests.

This file is a roadmap and contract, not evidence that the unimplemented adapters above are available.
