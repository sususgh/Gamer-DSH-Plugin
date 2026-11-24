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
