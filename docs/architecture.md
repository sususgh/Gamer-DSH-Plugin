# Runtime architecture and integration contract

## Components

### 1. Android device bridge
- USB: ADB transport, device enumeration, screen stream and input adapter.
- Wi-Fi: authenticated LAN-only connection; never expose the ADB/debug port to the public internet.
- Publish device state, frame timestamps, action acknowledgements and transport errors.

### 2. Telemetry collector
Collect measurements from the actual bridge and inference transport:
- TCP connection state, RTT/latency, bytes sent/received, reconnect count.
- UDP datagram rate, bytes sent/received, sequence gaps and measured loss.
- Sampling timestamp and measurement source.
Do not infer UDP loss from TCP metrics. If the transport does not expose a metric, display “N/A”, not a fabricated zero.

Suggested event shape:
```json
{
  "type": "telemetry",
  "timestamp": "2026-01-01T00:00:00Z",
  "transport": "tcp",
  "state": "connected",
  "rtt_ms": 18.4,
  "tx_bytes_per_sec": 12000,
  "rx_bytes_per_sec": 84000,
  "packet_loss_pct": null
}
```

### 3. Local model registry and health router
Each model adapter reports:
- id, display name, provider/runtime, task capabilities (vision, reasoning, action)
- endpoint/process state, load latency, last successful probe
- health state: unknown, healthy, degraded, unavailable

Health is not just “process exists”. Require a bounded inference probe. For screenshot perception, verify vision capability and use a representative image input.

Failover triggers:
- connection refused / process exit
- request timeout
- repeated 5xx or runtime errors
- malformed or schema-invalid action response
- capability mismatch for the current task

Do not switch on one transient slow response alone; use configurable thresholds and a cooldown. Probe fallback before activating it. If every candidate fails, pause automation and show a clear error with a manual retry action.

### 4. Game-agent coordinator
Pipeline:
1. Receive approved Android frame.
2. Select a healthy vision-capable model for perception.
3. Build structured state.
4. Select a reasoning/action model with compatible capabilities.
5. Validate action schema and bounds.
6. Send touch action to Android bridge.
7. Wait for acknowledgement and next frame.
8. Record latency and outcome.

### 5. Desktop UI
The dashboard is a view of runtime events, not the source of truth. The UI must show:
- disconnected / connecting / connected device state
- TCP and UDP separately
- real sample timestamps and stale-data warnings
- active model, task capabilities, health and fallback history
- explicit “demo” labels for simulated preview data

## Security and user control
- Bind local control endpoints to loopback by default.
- Require explicit user approval for screen capture and accessibility control.
- Never store API keys in frontend source or logs.
- Keep an immediate stop control available.
- Restrict Wi-Fi device communication to the user's LAN and authenticated pairing.

## Desktop-generated QR pairing and session control

The desktop control center generates a short-lived, single-use QR pairing token. The QR contains host/session bootstrap information only; it must never contain a DeepSeek key or other permanent API secret. Android scans it, displays the desktop identity and permissions, and waits for the user to confirm. The desktop authenticates the request and establishes a session before either side displays Paired/Connected.

After pairing, the desktop resolves the active provider/model configuration from DSH. It uses the configured provider ID, endpoint, model ID, capabilities and local secret reference. Android receives safe provider/model status for display, never the API credential. Provider selection must come from DSH configuration, not guessing based on key text.

The Android Start button sends a game-session start request to the desktop coordinator. The desktop validates pairing, permissions, model health, vision/reasoning capability, game profile and emergency-stop readiness. It then starts the AI loop and returns an accepted/rejected result. Pause and stop from either client take priority over agent actions.

## Computer-vision learning and game profiles

The intended gameplay approach is screen-based computer vision plus model reasoning and closed-loop action learning. The desktop engine observes frames, detects relevant UI/objects/text, estimates game state, proposes a small action, executes it through the PC or Android adapter, and compares the next frame with the expected outcome. It records action outcomes and updates a local game profile/strategy memory.

Support for Minecraft, Genshin Impact and other games is a target, not an assertion that every game works automatically. Each title needs tested visual recognition, coordinate calibration, control mapping, game-state profile and acceptance tests. The system should not assume that one game's controls or mechanics apply to another.

Learning means adapting local state, profiles and strategies from observed outcomes; it does not mean model weights are automatically fine-tuned during play. Use permitted screen capture and input interfaces only. Do not bypass anti-cheat or tamper with protected game processes.
