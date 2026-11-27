# Gamer DSH Plugin

**PC-first AI game agent + Android companion | DeepSeek Harness integration**

Gamer DSH Plugin is the Windows/desktop control center and AI orchestration layer for the Gamer game-agent ecosystem. It connects a DeepSeek Harness (DSH) agent, a desktop Gamer Engine, model APIs and (when playing mobile games) an Android phone.

The key design is simple:

> **The computer does the main processing and AI orchestration. DeepSeek (or another configured model API) provides the reasoning. The phone runs the mobile game, captures observations and executes touch actions.**

The phone is not expected to host a large language model. It can perform lightweight device-side work, while the computer handles the heavier vision pipeline, game context, model requests, planning, validation, telemetry and coordination.

- **Repository:** https://github.com/sususgh/Gamer-DSH-Plugin
- **Companion project:** Gamer-Mobile (Android)
- **Primary target:** Windows desktop + Android phone
- **DSH role:** agent entry point, tool orchestration, session and task coordination
- **Model role:** game understanding and decision-making through DeepSeek API or compatible model adapters
- **Desktop role:** main processing, local game control, model routing, device bridge and telemetry
- **Android role:** mobile game runtime, screen/audio/sensor observations when permitted, touch execution and acknowledgements

> **Project status:** This repository is being bootstrapped. The first desktop UI shell is a visual prototype. Network values, model health and device status are not real until their runtime adapters are connected and tested. This README describes the intended architecture and integration contract; it does not claim that every planned feature is already implemented.

---

## 1. What the project does

Gamer is designed to let an AI agent play supported games through a closed feedback loop:

1. Observe the game screen or an allowed game-state signal.
2. Process the observation and extract useful visual/state information.
3. Give the relevant context to a vision-capable and/or reasoning-capable model.
4. Receive a structured decision from the model.
5. Validate the decision locally before execution.
6. Send the action to the computer game or paired Android phone.
7. Receive execution acknowledgement and capture the next observation.
8. Verify the result, update game context and plan the next action.

The system is intended for both PC games and Android mobile games. The location where the game runs is separate from the location where the main AI processing runs.

## 2. Two operating modes

### Mode A — AI plays a PC game

The game runs on the desktop computer.

- The desktop capture adapter obtains screenshots or selected game-window regions.
- Local vision adapters preprocess frames and, where supported, perform OCR/UI/object recognition.
- The DSH agent and Gamer coordinator maintain the task, game context and recent action history.
- The model adapter sends the necessary observation and context to DeepSeek API or another configured model.
- The model returns a proposed decision or structured action.
- The desktop action adapter validates and executes supported keyboard, mouse, controller or game-specific input.
- The engine captures the next frame and verifies whether the expected state change occurred.

In this mode, the computer runs both the game and the main processing pipeline. An Android phone is optional.

### Mode B — AI plays an Android mobile game

The game runs on the Android phone. **The computer remains the primary AI workstation.**

**Android phone — device-side responsibilities**
- Run the actual mobile game.
- Capture the game screen or provide permitted observation data.
- Send frames/metadata to the paired computer.
- Execute approved tap, swipe, press, release and other supported touch actions.
- Return action acknowledgements, device state and timestamps.
- Optionally perform lightweight work such as image encoding, basic checks and sensor sampling.
- Display companion status and play optional local TTS audio when enabled.

**Desktop computer — main processing responsibilities**
- Receive and validate observations from the phone.
- Perform the heavier image preprocessing, OCR, UI recognition and visual-state aggregation supported by installed modules.
- Maintain game objectives, current state, recent observations and action history.
- Select an appropriate model based on capabilities and health.
- Call the configured DeepSeek API for AI reasoning and decision-making.
- Convert model output into a constrained action plan and validate coordinates, action types, durations and deadlines.
- Send the approved action to the phone.
- Receive the phone's acknowledgement and the next observation.
- Verify the result, update telemetry and decide whether to continue, re-plan or pause.

**Important distinction:** DeepSeek API is the reasoning service; it is not the machine that captures the phone screen or physically touches the game. The computer runs the local Gamer Engine and communicates with the API. The phone runs the game and performs device input. The phone may process a small amount of data locally, but the main workload is designed to stay on the computer.

The data split is configurable. Not every frame must be uploaded to a model API: local preprocessing can reduce image size and send only the relevant frame, crop, extracted state and context required for a decision.

## 3. Architecture overview

```text
                         User
                          |
                          v
                DeepSeek Harness (DSH)
               Plugin / Agent / Tool Layer
                          |
                  Task and tool control
                          |
                          v
                 Desktop Gamer Engine
       +------------------+-------------------+
       |                  |                   |
       v                  v                   v
  Vision & State      Game Context       Session / Task
  Processing          and History         Coordinator
       |                  |                   |
       +------------------+-------------------+
                          |
                          v
                 Model Capability Router
                          |
                          v
                  Model API Adapter
              DeepSeek / compatible APIs
                          |
                  structured decision
                          |
                          v
                Action Planner & Validator
                          |
                 Execution Action Router
                     /            \
                    /              \
          PC Game Adapter       Android Bridge
                |               USB / ADB / LAN
                v                    |
          Desktop Game               v
                               Android Gamer-Mobile
                               +------------------+
                               | Mobile Game      |
                               | Screen Capture   |
                               | Touch Execution  |
                               | Action ACK       |
                               +------------------+
                                      |
                         observations / results
                                      |
                                      +----> Desktop Engine
```

The DSH plugin coordinates the agent and tools. The desktop engine is the main runtime and processing center. Model adapters provide reasoning. PC and Android adapters connect the runtime to the actual game device.

## 4. Main processing loop

The intended loop is:

1. **Observe** — capture a PC game frame or receive an Android frame.
2. **Preprocess** — crop, resize, encode and extract available UI/text/state signals locally.
3. **Update context** — combine the observation with the current objective, previous state and recent action outcomes.
4. **Select model** — choose a healthy model whose declared capabilities match the task.
5. **Reason** — send the relevant observation/context to the model API and request a structured decision.
6. **Validate** — check the schema, action type, coordinates, duration, deadline and game-profile constraints.
7. **Execute** — run the action through the PC adapter or send it to the paired Android device.
8. **Acknowledge** — wait for a matching action acknowledgement or report a timeout/failure.
9. **Verify** — obtain a fresh observation and determine whether the action had the expected effect.
10. **Re-plan** — continue, recover, pause or request user input based on the verified result.

Prefer short, verifiable actions over long blind action sequences. When observations are stale, the model is unavailable or the state is uncertain, stop issuing new inputs until the system recovers.

## 5. DeepSeek API and model integration

The model provider is separated from game control so that the project is not locked to a single vendor.

Planned adapter responsibilities:
- Configure API base URL, model identifier and authentication key.
- Integrate DeepSeek API as the initial provider.
- Support compatible OpenAI-style API endpoints through provider adapters where their request/response capabilities match.
- Declare model capabilities such as `vision`, `reasoning`, `audio` and `structured_actions`.
- Send only the observation and context required for the current task.
- Parse model output into a strict internal action schema.
- Handle request timeouts, rate limits, connection errors and malformed responses.
- Keep provider credentials on the desktop side; never embed a long-lived API key in the Android app or frontend source.

A model response is a **proposal**, not an unrestricted command. The desktop engine must validate it before any action is executed.

### Vision capability matters

A text-only model cannot independently interpret a raw screenshot. Screenshot-based gameplay requires a vision-capable model or a local vision pipeline that converts the image into structured state before a text model is called. The model router must check capability compatibility rather than assuming every model can process images.

### Example configuration contract

This is an illustrative configuration shape, not a claim that the current UI or runtime already implements these exact fields:

```yaml
gamer:
  model:
    provider: deepseek
    base_url: ${DEEPSEEK_BASE_URL}
    api_key_env: DEEPSEEK_API_KEY
    model: ${DEEPSEEK_MODEL}
    timeout_seconds: 60

  desktop:
    vision_enabled: true
    max_action_duration_ms: 1500

  android:
    transport: adb
    require_pairing: true
    require_action_ack: true

  safety:
    max_actions_per_batch: 3
    pause_on_uncertain_state: true
    require_confirmation_for_sensitive_actions: true
```

Store secrets in environment variables or a local secret manager. Never commit API keys, access tokens or device credentials.

## 6. Local model discovery and failover

The desktop control center is intended to discover configured local model endpoints, check their health and route tasks to a compatible model.

Failover policy:

1. Discover configured local model endpoints and declared capabilities.
2. Run a bounded health check and a small inference probe.
3. Select the highest-priority healthy model that supports the requested task.
4. On timeout, connection failure, repeated server/runtime errors or invalid structured output, mark the active model degraded according to configurable thresholds.
5. Probe the fallback with a real task-compatible inference before declaring it active.
6. Preserve compact task context and recent verified action outcomes where possible.
7. Re-check the preferred model and switch back only after a stable recovery window.
8. If all compatible models fail, pause automation and show a clear error. Never claim the AI is still playing when inference has stopped.

A running process alone does not prove that a model is healthy. For screenshot understanding, the health check must verify vision capability using a representative image input.

## 7. Android connection and data transport

The desktop and Android app require explicit, authenticated pairing.

Planned transports:
- **USB / ADB:** useful for development, debugging, screen capture and direct device control.
- **LAN Wi-Fi:** useful when the phone and computer share a trusted local network.
- **WebRTC or equivalent media transport:** suitable for low-latency continuous video/audio where available.
- **Reliable WebSocket channel:** suitable for control messages, action acknowledgements, model events and telemetry.

The runtime protocol defines versioned messages for:
- Device status and pairing
- Screen frame and observation metadata
- Optional audio/sensor observations with explicit permission
- Model/task state
- Action request and action acknowledgement
- Stop, pause, disconnect and heartbeat
- Telemetry and error events
- Companion state and optional speech

Each message should carry a protocol version, session ID, message ID and timestamp. Reject stale commands, duplicate action IDs, malformed payloads and messages from unpaired clients.

Do not expose ADB or unauthenticated control ports to the public internet.

See [Gamer-Mobile ↔ Gamer-DSH Runtime Protocol v1](docs/runtime-protocol-v1.md).

## 8. Desktop control center and telemetry

The desktop UI is a view of actual runtime events, not the source of truth. Its intended capabilities include:

- Android device connection over USB or LAN Wi-Fi
- TCP/UDP transport telemetry: throughput, latency, packet loss and connection state
- Animated live data-flow visualization
- Local model discovery, health checks and primary/fallback routing
- Explicit model failover with recovery checks
- Game session controls and event logs
- Clear connected, connecting, disconnected, demo and stale-data states

Telemetry must come from real measurements. TCP and UDP metrics must be reported separately. Do not infer UDP packet loss from TCP metrics. If a metric is unavailable, show N/A rather than a fabricated zero. Decorative animation must not be presented as real network traffic.

Open `desktop-ui/index.html` in a modern browser to inspect the current UI prototype. Its telemetry panel intentionally shows “等待连接”; the animated trace is decorative until a real telemetry source is integrated.

## 9. Companion state and voice

The Android app and desktop UI can display the same logical companion session. The desktop host is authoritative for task and game state; the phone reports execution and can play optional local TTS.

Planned states include idle/listening, thinking, exploring, moving, interacting, task progress, success, warning, model switching, paused and disconnected. State transitions must be driven by real session events, not decorative timers.

Optional voice playback should use a user-selected installed voice or a properly licensed voice pack. Speech must be interruptible and rate-limited so it does not interfere with gameplay.

The companion is a user-interface character and does not imply that the model is conscious.

## 10. Safety, privacy and user control

- Keep screenshots, game state and device data on the user's computer by default.
- Send only the minimum context needed to the selected model API.
- Keep model API keys on the desktop; redact secrets from logs.
- Require explicit user approval for screen capture, audio capture and accessibility/input control.
- Pair devices explicitly and authenticate both sides.
- Bind local control endpoints to loopback by default; expose LAN access only intentionally.
- Validate action type, coordinate bounds, duration, deadline and batch size.
- Provide an immediate stop/pause control.
- Stop issuing actions on disconnect, stale observations, unavailable models or uncertain state.
- Require explicit approval for purchases, premium-currency spending, save deletion or other irreversible/account-sensitive actions.
- Respect game terms, anti-cheat rules and applicable laws. Do not bypass anti-cheat, access controls or platform protections.

## 11. Repository layout

- `desktop-ui/` — responsive desktop dashboard prototype.
- `docs/architecture.md` — runtime architecture and integration contract.
- `docs/runtime-protocol-v1.md` — Android ↔ desktop pairing, observations, actions, telemetry, model failover and companion protocol.
- Future runtime modules — Android bridge, telemetry collector, local inference adapter, model health router, game-agent coordinator and PC input adapter.

Platform-specific code should stay behind adapters. DSH orchestration, model providers and device transports should remain independently testable.

## 12. Development roadmap

### Phase 1 — Foundation
- Establish the DSH plugin entry point and package structure.
- Define shared types for observations, actions, results and errors.
- Add local configuration validation and secure secret handling.

### Phase 2 — Desktop AI loop
- Implement desktop screen capture and a minimal vision pipeline.
- Integrate the DeepSeek model adapter.
- Implement structured action parsing, validation and a safe PC input adapter.
- Demonstrate observe → reason → act → verify in a controlled test game.

### Phase 3 — Android companion
- Implement authenticated phone pairing.
- Add Android screen capture and observation transfer.
- Add touch execution and action acknowledgements.
- Demonstrate mobile gameplay with the game running on Android and the main AI processing on the computer.

### Phase 4 — Reliability
- Add reconnect handling, timeouts, cancellation and recovery.
- Optimize image transfer, request frequency, token usage and latency.
- Add diagnostics and reproducible test cases.

### Phase 5 — Compatibility
- Add more game input adapters and model providers.
- Improve UI recognition and game-specific state adapters.
- Publish tested releases with clear compatibility notes.

## 13. Implementation status and honesty

The README and protocol documents define the target behavior and contracts. A feature should be called **implemented** only after its code exists, dependencies are declared and the workflow has been tested.

This repository's current UI shell is a visual prototype. The presence of architecture documentation does not mean Android pairing, ADB control, PC input injection, OCR, model routing, live telemetry or automatic gameplay are already operational. Those capabilities must be delivered and verified module by module.

## 14. Contributing

Contributions are welcome in DSH integration, desktop vision, Android communication, model adapters, action validation, telemetry, documentation and testing.

Please include:
- Operating system, device model and Android version
- DSH and runtime versions
- Reproduction steps
- Expected and actual behavior
- Relevant logs with API keys, tokens and personal data removed

## License

The repository license is governed by the license file included in this repository. If no license file is present, do not assume that the source is licensed for redistribution or commercial use.
