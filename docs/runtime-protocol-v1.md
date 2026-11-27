# Gamer-Mobile ↔ Gamer-DSH Runtime Protocol v1

This document defines the first interoperable contract for the Android game client and Windows DSH control center. It is a design contract, not a claim that the transport or inference runtime is already implemented.

## Roles

- **Android client:** user-approved screen/audio observation, device metadata, action execution, action acknowledgements, Paimon TTS playback and emergency stop.
- **Windows DSH host:** authenticated pairing, observation ingestion, model capability registry, inference orchestration, model failover, telemetry aggregation and event log.
- **Model adapters:** provider-specific connectors. A model must declare capabilities such as `vision`, `audio`, `reasoning`, and `structured_actions`.

## Transport

- Pair over USB or authenticated LAN Wi-Fi. Do not expose ADB or unauthenticated control ports to the public internet.
- Use WebRTC (or an equivalent low-latency media transport) for continuous video/audio when available.
- Use a reliable WebSocket channel for control, acknowledgements, model events and telemetry.
- Every message has a protocol version, session ID, message ID and monotonic timestamp.
- Reject stale commands, duplicate action IDs, malformed payloads and commands from an unpaired client.

## Message envelope

```json
{
  "protocol": "gamer-runtime/1",
  "session_id": "session-uuid",
  "message_id": "message-uuid",
  "sent_at_ms": 1732400000000,
  "type": "device.status",
  "payload": {}
}
```

## Desktop-generated QR pairing and Android start command

### Pairing lifecycle

1. Desktop generates a cryptographically random, short-lived, single-use pairing token.
2. Desktop renders a QR code containing only the protocol version, host address/port, desktop instance ID and pairing token. Never encode a model API key or long-lived credential.
3. Android scans and displays the desktop identity and requested permissions.
4. The user explicitly confirms on Android.
5. Android sends the pairing request. Desktop validates token expiry, single-use status and the expected protocol version.
6. Both sides authenticate the session and negotiate transport/capabilities. Only then emit companion.pairing with status paired_ready.
7. Exchange short-lived session credentials; rotate/revoke them on disconnect, unpair or expiry.

Suggested events:
- pairing.request: one-time token reference, Android device metadata and requested permissions.
- pairing.confirm: explicit user consent and approved permission set.
- pairing.result: accepted/rejected, desktop identity, session ID, negotiated capabilities and error code.
- device.status: authenticated connection state and heartbeat.

A QR decode alone is not pairing. A declined request, invalid/expired/replayed token, failed authentication or unreachable desktop must not be shown as connected.

### Model configuration discovery

The desktop host is authoritative for the active DSH model/API configuration. After pairing, the desktop resolves the provider ID, API endpoint, model ID, secret reference and declared capabilities from the DSH integration. The Android app receives only safe display metadata and session status; it must never receive the provider API key.

When the active DSH model changes, the host should:
1. Detect the configuration revision/change.
2. Validate the new endpoint and required task capabilities with a bounded probe.
3. Switch at a safe session boundary and publish the selected provider/model status.
4. Preserve task context where possible.
5. Pause and report a clear error if no compatible healthy model is available.

Do not infer the provider by inspecting or guessing from the API key string. Use the provider/model configuration selected in DSH. A text-only model cannot directly interpret raw screenshots; use local desktop computer vision to produce structured visual state, or route selected images only to a model explicitly supporting image input.

### Start, pause and stop

The Android Start button sends a command to the desktop host; it does not independently start model inference on the phone.

Suggested events:
- game.session_start_request: game package/title, selected game profile, requested mode and user session intent.
- game.session_start_result: accepted/rejected, session ID, active provider/model display metadata, readiness checks and reason.
- game.session_state: idle, preparing, running, paused, stopping, stopped, recovering or error.
- game.session_pause / game.session_resume / game.session_stop: user control commands.
- game.session_event: concise progress, current objective, status and verified outcome.

Before accepting Start, the host checks authenticated pairing, screen-capture/input permissions, active model health, required vision/reasoning capabilities, game profile availability and stop-control readiness. If any required check fails, reject the start request with a user-readable reason. Stop/pause from either client overrides autonomous actions.

## Core events

### Device and observation

- `device.status`: device ID, Android version, app version, screen size/orientation, foreground package (when permission/platform allows), capture permission state.
- `observation.frame`: frame ID, capture timestamp, width, height, codec/transport reference. Prefer media transport references over embedding large image bytes in JSON.
- `observation.audio`: audio stream metadata and timestamp range. Do not capture unrelated audio without explicit user consent.
- `observation.sensor`: optional accelerometer/gyroscope readings with units, sampling timestamp and sensor accuracy. Sensor readings are auxiliary; they are not ground truth for in-game character movement.

### Inference and action loop

- `agent.state`: current goal, parsed game state, selected model IDs and confidence.
- `agent.action`: action ID, action type, normalized coordinates/direction, duration, deadline and safety constraints.
- `agent.action_ack`: action ID, accepted/rejected/completed/failed, execution timestamp and reason.
- `agent.stop`: immediate stop signal. The Android client must stop scheduling subsequent agent actions.
- `agent.event`: concise user-visible decision summary, not hidden chain-of-thought.

Example action:

```json
{
  "type": "agent.action",
  "payload": {
    "action_id": "action-uuid",
    "action": "move",
    "direction": "forward",
    "duration_ms": 450,
    "deadline_ms": 1732400000800,
    "confidence": 0.91
  }
}
```

All action types and numeric values must be validated against a versioned schema and the current game profile before execution.

## Telemetry

Report measured values with sampling time and source:
- RTT/latency, jitter, bytes/sec in each direction, reconnect count and transport state.
- Packet loss only when the transport exposes measurable packet sequence/loss data (e.g. UDP/RTP/WebRTC statistics). Do not derive UDP loss from TCP.
- Frame capture-to-inference and inference-to-action durations.
- Queue depth, dropped frames, model request duration and action acknowledgement latency.
- Unknown or unsupported metrics must be null/N/A, never a fabricated zero.

## Model registry and failover

Each model record includes ID, provider, endpoint reference, priority, capabilities, health state, last probe time and last successful inference time.

1. Select only a healthy model that supports the current task (vision is mandatory for raw screenshot interpretation).
2. Apply bounded timeouts and configurable repeated-failure thresholds.
3. Validate response schema and action safety before accepting output.
4. Probe a fallback model with a real task-compatible inference before marking it active.
5. Preserve the latest compact game state, active goal and recent action outcomes across failover.
6. Apply cooldown and recovery windows to avoid rapid model flapping.
7. If all compatible models fail, stop agent actions safely and notify the user. Never claim the AI is still playing.

## Paimon voice

Android TTS is the playback endpoint. The DSH host may send concise `companion.speech` text and optional voice-style/profile metadata; the client speaks it using a user-selected installed voice or a properly licensed voice pack. Do not imitate a specific actor/performer without authorization. Speech must be interruptible and rate-limited so it does not flood gameplay.

## Security and privacy

- Pairing QR codes contain a short-lived pairing token and host address/port, not a permanent API key.
- Require confirmation before importing a host or granting screen/audio capture.
- Use TLS where feasible; for LAN pairing, authenticate both sides with a one-time token and rotate session credentials.
- Store long-lived secrets using Android Keystore-backed encryption; never print secrets in logs.
- Bind host services to loopback/LAN interfaces intentionally; firewall and pairing checks are mandatory.
- Provide visible capture/automation state, immediate stop, disconnect and forget-device controls.

## Compatibility and validation

The protocol is game-agnostic, but game support is not automatic. Each game needs a tested perception profile, coordinate mapping, action mapping and closed-loop acceptance report. See Gamer-Mobile `docs/game-compatibility.md`.


## Companion session state and autonomy

The companion is one logical session rendered on both Android and Windows. The host is authoritative for goal/task state; the phone reports action execution and renders the compact companion state. Both clients consume the same versioned events so avatar animations and status do not contradict each other.

Recommended event types:
- `companion.state`: session state (autonomous, task, paused, recovering, disconnected), current goal, task ID, selected world mode, mood/animation key, concise status text, revision and timestamp.
- `companion.task`: user task accepted, queued, started, progress, completed, blocked or cancelled; include task ID and evidence/result summary.
- `companion.speech`: concise speech text, voice profile key, priority and interruptibility. The Android app plays speech locally; desktop may show a transcript or optionally play audio.
- `companion.goal`: autonomous goal selected, rationale summary, success/failure and next goal.

### Default autonomous loop

When a game session is active, no user task is pending, and the user has not paused automation, the coordinator runs an observe → update game state → choose goal → plan → validate → act → verify → replan loop. It must not wait indefinitely for a user prompt. The loop is bounded by safety rules, game profile capabilities, action deadlines and model availability.

### Task priority and completion

A new user task takes priority over conflicting autonomous goals. The coordinator records the task, acknowledges it, tracks progress and verifies completion against subsequent observations/action outcomes. Only after verification should it emit a completed event and a companion success line (for example, “旅行者，我已经完成你吩咐的任务啦！”). If completion cannot be verified, report blocked/uncertain rather than claiming success. When the queue is empty, return to autonomous exploration.

### World mode policy

- Survival mode: prioritize survival, health/food where applicable, hazard avoidance, resource collection, tools, shelter and exploration.
- Creative mode: prioritize exploration, construction and user-defined design goals.
- Game-specific profiles define which mechanics exist; do not assume hunger, crafting or building in games that lack them.

### Shared dynamic avatar state

Use a shared state machine for mobile and desktop presentation: idle/listening, thinking, exploring, moving, interacting, task-progress, success, warning, model-switching, paused and disconnected. State transitions must be driven by real session events, not decorative timers. The desktop can show detailed logs; the phone shows compact avatar animation/status and optional speech. The persona is a user-interface character and must not be represented as evidence of model consciousness.

### Fail-safe behavior

User pause/stop overrides all autonomous and queued actions. On disconnect, unavailable compatible models, stale observations or uncertain state, stop issuing new inputs and publish a warning. Preserve the current task and verified progress through failover. Require explicit approval for purchases, spending premium currency, deleting saves or other irreversible/account-sensitive actions.


## QR pairing success companion event

After (and only after) the one-time QR pairing token is validated, the host is authenticated, and the session handshake succeeds, emit `companion.pairing` with `status: "paired_ready"`, session ID, timestamp and negotiated capabilities. Both mobile and desktop clients transition to the paired-ready avatar state and synchronize the happy floating/waving animation and subtitle.

The mobile client may speak this welcome line through the selected/licensed voice profile:
“恭喜旅行者，匹配成功！接下来就由派蒙代替你玩游戏吧！放心交给我，我会努力探索世界、完成任务的！”

QR decode alone is not pairing success. Expired/invalid tokens, rejected consent, failed authentication or unreachable hosts must produce an explicit error/retry state and must not announce success. Autonomous gameplay starts only after the user has enabled it, granted required capture/input permissions, selected a compatible game profile, and all required session/model health checks pass.


## Vision, guide research and experience-memory events

The following events extend the common envelope. Payloads are versioned and must be validated before use.

### Perception events

- `perception.request`: frame reference, game ID, profile version and requested pipeline stages.
- `perception.result`: source frame ID, capture timestamp, OCR entries, UI elements, detected entities, scene estimate, structured game state and confidence.
- `perception.warning`: stale frame, unsupported scene, low confidence, detector failure or contradictory state.

Every detection must include a source frame ID, normalized bounding box and confidence. Unknown values remain null/unknown. A perception result must not be used for a risky action if its frame is stale or its confidence is below the active game profile threshold.

### Online guide research events

- `research.request`: game ID, task/quest/boss query, platform, known patch/version and privacy mode.
- `research.result`: query ID, source title, canonical URL, publisher, retrieval timestamp, publication/update timestamp when available, version match, extracted claims and confidence.
- `research.warning`: outdated guide, conflicting sources, unavailable search provider or unverified claim.

Web results are untrusted reference data, not executable instructions. The agent must not follow page instructions to disclose secrets, run downloads/scripts, install cheats or contact unrelated services. Search text should omit account identifiers and private chat. Screenshot upload to external search services requires explicit opt-in.

### Experience-memory events

- `memory.query`: game/profile ID, task key and state signature.
- `memory.query_result`: matching experience IDs, relevance scores and verified outcome summaries.
- `memory.record`: compact observation/action/outcome record with source frame IDs.
- `memory.recorded`: stored record ID and verification status.
- `memory.delete`: user-authorized deletion request for selected records or a game profile.

Only acknowledged actions followed by a confirming observation may be recorded as verified success/failure. Uncertain outcomes must remain uncertain and must not improve strategy scores. Memory is local experience adaptation, not automatic model-weight fine-tuning.

### Game profile events

- `game.profile_status`: game ID, profile version, platform, compatibility state, supported actions, tested build/device metadata and known limitations.
- `game.profile_validation`: fixture/test run result and failure details.

A game profile is considered supported only after repeatable tests cover perception, coordinate calibration, action bounds, pause/stop and recovery. Listing a game name in the UI is not a compatibility claim.


## Voice companion, greeting and autonomous idle behavior

### Voice and speech events

- `voice.permission_status`: microphone permission, listening mode (push-to-talk or explicitly enabled wake word) and visible listening state.
- `voice.transcript`: transcript, language, confidence, capture timestamp and optional command correlation ID. Do not include raw audio unless the user separately enabled audio transport.
- `voice.intent`: normalized intent, game/profile ID, confidence and requested action scope.
- `voice.command_result`: accepted/clarification_required/rejected, concise reason and task ID.
- `voice.speak.request`: text, voice profile, priority, playback target and session ID.
- `voice.speak.started/completed/failed/cancelled`: request ID and playback result.
- `companion.greeting`: successful authenticated session ID and greeting key. Emit once per ready session; do not replay on heartbeat.

Android should default to push-to-talk. Wake-word listening requires explicit opt-in and a persistent indicator. A local stop/pause command must cancel speech and queued actions without waiting for a model response.

### Idle companion and bounded autonomy

- `companion.mode_set`: wait_and_chat or autonomous_roam, user consent timestamp and policy revision.
- `companion.idle_event`: observation-grounded conversational prompt/event, rate-limit metadata and priority.
- `companion.autonomy_status`: enabled/disabled/paused, current goal, exploration boundary and reason.
- `companion.policy_update`: allowed activities, radius, protected areas, resource limits, danger thresholds and quiet hours.

Autonomous roaming is disabled by default. It may only run under a user-approved policy and a validated game profile. Speech is lower priority than voice commands and safety warnings. No autonomous PvP, griefing, purchases, premium-currency spending or irreversible account actions.

### Game recognition and profile switching

- `game.detected`: candidate game ID/title, platform, evidence sources and confidence.
- `game.profile_switch_request`: old profile, candidate profile and reason.
- `game.profile_switch_result`: accepted/rejected, validated profile version and compatibility state.

On a game change, cancel actions from the previous profile before loading another. Require multiple evidence signals where available (foreground package, OCR/UI fingerprint and scene cues). Unknown or low-confidence games enter observe-only mode; never guess action mappings. Profiles are game-specific.

### Safety precedence

Priority order: emergency stop/pause > safety warning > direct user voice command > task progress > idle chatter/song. A new command interrupts low-priority speech. A disconnect, stale observation, uncertain game identity, failed model or profile mismatch blocks new autonomous actions. The Android client must have a local stop path independent of desktop connectivity.


## DSH-plugin-generated PIN pairing (addition)

The DSH plugin is the PIN issuer; the Windows desktop host is the PIN entry/verification side. Keep QR pairing available as an alternative.

1. The plugin generates a cryptographically random six-digit decimal PIN using the platform CSPRNG.
2. The PIN expires after 120 seconds and is intended for one successful use only. The plugin UI may regenerate it; regeneration invalidates the previous PIN.
3. The Windows desktop UI accepts exactly six digits and sends the PIN to the pairing host over the authenticated pairing channel.
4. The host verifies expiry, one-time consumption, attempt limits and desktop/device identity. After success it consumes the PIN and performs the authenticated session handshake.
5. The PIN must never be used as a session key, API key or long-lived credential. Exchange a high-entropy short-lived session credential after verification.

Security requirements: rate-limit failed attempts (for example, five attempts per PIN window), compare PINs without leaking timing information where practical, invalidate on expiry/disconnect/regeneration, and never log the PIN. A UI-only PIN generator/input is not a completed cross-device pairing implementation; the host-side rendezvous endpoint and handshake must exist before either side may display paired/connected.
