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
