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
