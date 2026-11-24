# Gamer DSH Plugin

Windows desktop control center for the Gamer-Mobile Android game agent.

## Product direction

A fantasy-inspired, original desktop UI (not copied from Genshin Impact artwork) with:
- Android device connection over USB or LAN Wi-Fi
- TCP/UDP transport telemetry: throughput, latency, packet loss and connection state
- Animated live data-flow visualization
- Local model discovery, health checks and primary/fallback routing
- Explicit model failover with recovery checks
- Game session controls and event logs

## Current status

This repository is being bootstrapped. The first UI shell is a **visual prototype**. Network values and model status are not real until the transport and inference adapters are connected. The interface labels disconnected/demo states honestly; it does not claim a phone, model, or network is connected.

## Architecture

- `desktop-ui/`: responsive dashboard prototype
- `docs/architecture.md`: runtime and integration contract
- Future runtime services: Android bridge (ADB/USB/Wi-Fi), telemetry collector, local inference adapter, model health router, game-agent coordinator.

## Model failover policy

1. Discover configured local model endpoints and capabilities.
2. Run a lightweight health check and a small inference probe.
3. Select the highest-priority healthy model that supports the requested task.
4. On timeout, connection failure, invalid output, or repeated inference errors, mark the active model degraded and try the next healthy candidate.
5. Confirm the fallback with a real inference probe before declaring it active.
6. Periodically re-check the preferred model and switch back only after a configurable stable recovery window.
7. Preserve task context where possible; never silently claim success if all models fail.

A vision-capable model is required for screenshot understanding. A text-only reasoning model cannot independently interpret raw game screenshots.

## Development

Open `desktop-ui/index.html` in a modern browser to inspect the UI prototype. Its telemetry panel intentionally shows “等待连接”; the animated trace is decorative until a real telemetry source is integrated.

See [docs/architecture.md](docs/architecture.md).


## Runtime protocol

See [Gamer-Mobile ↔ Gamer-DSH Runtime Protocol v1](docs/runtime-protocol-v1.md) for the pairing, observation, action, telemetry, model failover and companion voice contract.
