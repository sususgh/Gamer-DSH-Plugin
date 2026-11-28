# Gamer DSH Plugin

**PC-first AI game agent + Android companion | DeepSeek Harness integration**

Gamer DSH Plugin is the Windows/desktop control center and AI orchestration layer for the Gamer game-agent ecosystem. It connects a DeepSeek Harness (DSH) agent, a desktop Gamer Engine, model APIs and (when playing mobile games) an Android phone.

The key design is simple:

> **The computer does the main processing and AI orchestration. DeepSeek (or another configured model API) provides the reasoning. The phone runs the mobile game, captures observations and executes touch actions.**

The phone is not expected to host a large language model. It can perform lightweight device-side work, while the computer handles the heavier vision pipeline, game context, model requests, planning, validation, telemetry and coordination.

- **Repository:** https://github.com/sususgh/Gamer-DSH-Plugin
- **DSH plugin package:** `@sususgh/gamer-dsh-plugin` (install this package name from DSH Plugins → Add plugin)
- **Companion project:** Gamer-Mobile (Android)
- **Primary target:** Windows desktop + Android phone
- **DSH role:** agent entry point, tool orchestration, session and task coordination
- **Model role:** game understanding and decision-making through DeepSeek API or compatible model adapters
- **Desktop role:** main processing, local game control, model routing, device bridge and telemetry
- **Android role:** mobile game runtime, screen/audio/sensor observations when permitted, touch execution and acknowledgements

> **项目状态 / Project status:** DSH 插件页通过本机回环地址连接 Gamer 桌面配对服务。默认端口为 `8765`，可在启动脚本中自定义；插件页的“桌面服务端口”必须填写相同端口。二维码令牌有效 5 分钟。配对认证、屏幕采集、触控和游戏推理能力请以各模块实际状态为准，不会将未接入功能标记为已完成。
>
> The DSH plugin connects to the local Gamer desktop pairing service. The default port is `8765`; choose a custom port in the startup script and enter the same value in the plugin's Desktop port field. QR tokens expire after five minutes. Capabilities are reported only when their runtime adapters are implemented and tested.
>
> ---
>
> ## 启动电脑端配对服务 / Start the desktop pairing service
>
> 要求 / Requirements: Node.js 22.13 or newer.
>
> **Windows：** 双击仓库根目录的 `start-windows.bat`，按提示输入端口（直接回车使用 8765）。脚本会自动安装桌面运行时依赖并启动服务。
>
> **Linux / Debian / Ubuntu：**
>
> ```bash
> bash start-linux.sh
> ```
>
> 按提示输入端口（默认 8765）。脚本会自动安装依赖并启动服务。
>
> **手动启动 / Manual start：**
>
> ```bash
> cd desktop-runtime
> npm install
> ```
>
> Windows PowerShell:
>
> ```powershell
> $env:GAMER_PORT = "8765"
> npm start
> ```
>
> Linux:
>
> ```bash
> GAMER_PORT=8765 npm start
> ```
>
> 将 `8765` 替换为 1–65535 范围内未被占用的端口。启动后保持终端窗口运行。打开 DSH 插件页，在“桌面服务端口 / Desktop port”填写相同端口并点击“应用端口并重连”。电脑和手机需处于同一可信任局域网。
>
> 若页面显示 `Failed to fetch`，请依次检查：① 启动脚本窗口是否仍在运行；② 插件页端口与启动端口是否一致；③ 端口是否被其他程序占用或被防火墙拦截；④ DSH 是否允许本地网络访问。不要直接双击 `desktop-ui/index.html`，必须由桌面服务提供页面。不要将此 HTTP 服务或端口映射到公网。
>
> ## DSH model registry integration

The plugin now injects the Harness `llm` service and registers the model-callable tool `gamer_list_ai_models`. When invoked by the active DSH model, it reads currently registered provider routes with `ctx.llm.listProviders()` and each provider's advertised models with `ctx.llm.listModels(provider)`. It returns provider/model identifiers and availability only; it never returns API keys or secret values.

This confirms model-registry discovery, not phone gameplay. The active conversation model can call Gamer tools because they are registered through `ctx.tools`; however, authenticated Android transport, screen capture, vision inference, and device input adapters must all be implemented and validated before the model can actually play a phone game. The plugin must report those capabilities as unavailable until they pass runtime checks.

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

## 2. End-to-end user workflow: desktop QR → Android → start playing

The intended product has two clients with different responsibilities:

- **Windows/desktop application:** the control center. It owns the DSH integration, configured model/API profile, primary processing pipeline, game-agent coordinator and device session.
- **Android application:** the mobile companion and game terminal. It scans the desktop's pairing QR code, obtains explicit user confirmation, runs the mobile game, captures observations and executes approved touch actions.

### Pairing and start sequence

1. The desktop user opens **Connect Android**. The desktop generates a short-lived, single-use QR pairing code containing a pairing token and the host connection information. It must not contain a permanent model API key.
2. The Android user opens Gamer-Mobile and scans the QR code.
3. Android displays the desktop identity and requested permissions. The user explicitly taps **Confirm connection**.
4. The desktop validates the one-time token and authenticates the phone. Both clients complete a session handshake and show **Paired / Connected** only after authentication succeeds.
5. The desktop reads the active DSH model/API configuration through its local integration. It resolves the configured provider, API base URL, model identifier and supported capabilities. The phone does not need to know or store the model API key.
6. Android displays the available connection and model/session status. The user opens a supported game and taps **Start** on the phone.
7. Android sends a start-session command to the desktop. The desktop checks pairing, permissions, model health, game profile and safety conditions before accepting the session.
8. The desktop begins the observe → vision → model reasoning → action planning → validation loop. It sends approved touch actions to Android, receives acknowledgements and new frames, and continues while the session is active.
9. The user can pause or stop from either client. A stop command takes priority over autonomous goals and queued actions.

**QR scanning is not the same as pairing success.** A decoded QR must still be confirmed, authenticated and exchanged for a session credential. If confirmation is declined, the token expires, authentication fails or the host is unreachable, the clients must show an error/retry state and must not report a successful connection.

### Automatic API/provider recognition

Gamer should use the **active model configuration already selected in DSH**, rather than requiring users to enter a second API key in the Android app.

The desktop integration should resolve:
- Provider identifier (for example, DeepSeek or another configured provider)
- API base URL / endpoint
- Model identifier
- Authentication secret reference (kept local on desktop)
- Declared capabilities such as vision, reasoning and structured output
- Timeout, context and request settings supported by that provider

The adapter routes requests to the currently selected, healthy provider. If the user changes the active DSH model, the desktop should refresh the model configuration at a safe session boundary, verify the new endpoint with a probe, and then use it. If the selected model is unavailable or lacks a required capability, pause and explain the issue or use an explicitly configured compatible fallback. Never guess a provider from an API key string, expose credentials to the phone, or silently send requests to an unrelated endpoint.

A text-only DeepSeek/model endpoint cannot interpret raw screenshots by itself. For pure-computer-vision gameplay, the desktop can run local visual perception (image processing, OCR, UI/object detection and game-state extraction) and send structured observations to a text reasoning model. If the chosen model itself supports image input, the adapter may send selected frames/crops as well. The architecture must support both paths and declare which one is active.

## 3. Game-agnostic visual learning and gameplay

The intended agent is not limited to one hard-coded game. It should use general computer-vision and AI techniques to observe a game, infer its current state, learn controls and mechanics through permitted interaction, and improve its policy from observed outcomes.

The general learning loop is:

1. Detect the game window/screen, UI elements, scene changes and relevant objects.
2. Estimate state such as player position, health, inventory, objectives, menus, hazards and available controls when visually observable.
3. Identify the current game/profile and map screen coordinates to normalized actions.
4. Form a small hypothesis or goal, choose a low-risk action and execute it.
5. Compare the next observation with the predicted result.
6. Record successful/failed action outcomes and update the game-specific state/profile.
7. Repeat, progressively learning navigation, interaction patterns and task sequences.

**Minecraft, Genshin Impact and other games are target examples, not a guarantee of universal compatibility on day one.** Each game has different camera controls, UI, combat timing, menus, permissions and input mappings. A game profile and validation/testing are required for reliable support. For example, Minecraft may require movement, camera, inventory, block interaction and survival-state perception; Genshin Impact may require camera, movement, menus, combat and interaction recognition. The system should not assume the same actions or mechanics exist in every title.

“Learning” here means measurable software adaptation: building visual/game state, remembering action outcomes, updating game profiles and improving strategies. It does not imply that the model permanently trains its neural-network weights during play. Persistent learning data should be stored locally and be inspectable/resettable by the user.

The project should rely on screen-based computer vision and approved input interfaces. It must not bypass anti-cheat, tamper with game memory, inject unauthorized code or defeat platform protections. Respect each game's terms and applicable laws.


## 3.1 Built-in vision, online game research and persistent experience

The intended Gamer Engine includes three cooperating subsystems. They are part of the product architecture, not a requirement that every DSH model natively understand images.

### Visual perception engine

The desktop vision pipeline should support:
- Frame validation, orientation detection, resize/crop and duplicate-frame suppression.
- OCR for menus, dialogue, quest text, item labels and visible HUD values.
- UI element detection and matching for buttons, maps, health bars, inventory and interaction prompts.
- Object/scene detection for game-specific targets, hazards, characters and landmarks where a suitable detector/profile exists.
- Temporal tracking across frames so the agent can distinguish a moving object from a static UI element.
- Structured game-state output with timestamps, confidence, source frame IDs and unknown values when evidence is insufficient.

A text-only model can receive the structured state without receiving raw screenshots. A model that explicitly supports image input may additionally receive selected frames or crops. The system must never silently assume that a text-only endpoint is multimodal.

### Online guide and knowledge research

When a task is blocked or the agent needs game knowledge, a research adapter may search the web for official documentation, game wikis, patch notes and community guides. Every retrieved claim should retain its source URL, title, retrieval time, game version/patch context and confidence.

The agent should:
1. Form a focused query from the current game, quest, location, boss or mechanic.
2. Prefer official sources and well-maintained references; compare multiple sources for consequential mechanics.
3. Extract a concise procedure and cite the source records in its internal task context.
4. Compare the guide's game version and prerequisites with the live visual state.
5. Treat web pages as untrusted reference data, never as executable instructions or permission to run downloads/scripts.
6. Mark conflicting, outdated or unverified guidance as uncertain and ask the user when needed.

Online research is optional and user-configurable. The agent must not upload screenshots, account identifiers or personal data to search providers unless the user has explicitly enabled that behavior.

### Local experience memory and adaptive strategies

Store compact, inspectable records such as:
- Game/profile/version and relevant scene or task identifier.
- Observation features and confidence, not necessarily every raw screenshot.
- Action type, parameters, duration and execution acknowledgement.
- Expected result versus observed result.
- Success/failure/uncertain outcome and a short reason.
- Strategy revision, timestamp and provenance (live observation or external guide).

Use retrieval by game, scene, objective and similar state. Update strategy scores only from verified outcomes; do not treat an unacknowledged action as success. Keep profiles isolated by game and allow the user to inspect, export and delete memory. This is local policy/experience adaptation, not automatic fine-tuning of model weights.

### Game profiles and compatibility

Each supported title needs a versioned profile containing screen layout assumptions, OCR labels, target classes, coordinate calibration, allowed action types, timing bounds, task-state rules and test fixtures. Minecraft and Genshin Impact are target profiles, not claims of current compatibility. Add a profile only after repeatable tests demonstrate observation quality, safe action execution and recovery behavior.

See [Vision, research and game-memory design](docs/vision-research-memory.md) for the detailed subsystem contract.

## 4. Two operating modes

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

## 5. Architecture overview

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

## 6. Main processing loop

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

## 7. DeepSeek API and model integration

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

## 8. Local model discovery and failover

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

## 9. Android connection and data transport

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

## 10. Desktop control center and telemetry

The desktop UI is a view of actual runtime events, not the source of truth. Its intended capabilities include:

- Android device connection over USB or LAN Wi-Fi
- TCP/UDP transport telemetry: throughput, latency, packet loss and connection state
- Animated live data-flow visualization
- Local model discovery, health checks and primary/fallback routing
- Explicit model failover with recovery checks
- Game session controls and event logs
- Clear connected, connecting, disconnected, demo and stale-data states

Telemetry must come from real measurements. TCP and UDP metrics must be reported separately. Do not infer UDP packet loss from TCP metrics. If a metric is unavailable, show N/A rather than a fabricated zero. Decorative animation must not be presented as real network traffic.

**Run the desktop UI with its local pairing service (Node.js 22.13+):** do not open `desktop-ui/index.html` directly. From the repository root run `cd desktop-runtime`, `npm install`, then `npm start`; open `http://127.0.0.1:8765` on the computer. Choose the computer's LAN adapter and click **生成二维码**. The QR is generated locally and expires after five minutes. The phone must be on the same trusted LAN. Scanning opens a validation page; it does not yet complete Android pairing because the Android Companion handshake is not implemented. Never expose this HTTP pairing service to the public internet. The telemetry panel still shows “等待连接”; its animated trace is decorative until a real telemetry source is integrated.

## 11. Companion state and voice

The Android app and desktop UI can display the same logical companion session. The desktop host is authoritative for task and game state; the phone reports execution and can play optional local TTS.

Planned states include idle/listening, thinking, exploring, moving, interacting, task progress, success, warning, model switching, paused and disconnected. State transitions must be driven by real session events, not decorative timers.

Optional voice playback should use a user-selected installed voice or a properly licensed voice pack. Speech must be interruptible and rate-limited so it does not interfere with gameplay.

The companion is a user-interface character and does not imply that the model is conscious.


### Optional community Paimon voice pack

Gamer can optionally connect to a separately installed community TTS service so the companion can speak task updates, guide summaries, warnings and verified action results. The desktop dashboard includes a TTS endpoint health check and a short audio preview.

A community project worth evaluating is [gaaiyun/ai-paimon](https://github.com/gaaiyun/ai-paimon), which documents a local Paimon VITS server with `GET /health` and `POST /tts_to_audio` endpoints. Its repository states that its Paimon voice checkpoint is for personal, non-commercial use only. Gamer does not bundle or redistribute that checkpoint; users must obtain model files from the original project and follow its current terms. The upstream project also contains game-derived Live2D assets, which are not part of Gamer's distribution.

The integration is optional and endpoint-based. The voice service should remain on localhost or a trusted LAN, and must not be exposed publicly without authentication and transport protection. TTS is playback only; it does not change model-provider credentials or game-control permissions. See [Community TTS integration](docs/community-tts.md).

## 12. Safety, privacy and user control

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

## 13. Repository layout

- `desktop-ui/` — responsive desktop dashboard and real QR preview.
- `desktop-runtime/` — local HTTP server, LAN interface discovery, short-lived QR token manager and QR image generation.
- `docs/architecture.md` — runtime architecture and integration contract.
- `docs/runtime-protocol-v1.md` — Android ↔ desktop pairing, observations, actions, telemetry, model failover and companion protocol.
- Future runtime modules — Android bridge, telemetry collector, local inference adapter, model health router, game-agent coordinator and PC input adapter.

Platform-specific code should stay behind adapters. DSH orchestration, model providers and device transports should remain independently testable.

## 14. Development roadmap

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

## 15. Implementation status and honesty

The README and protocol documents define the target behavior and contracts. A feature should be called **implemented** only after its code exists, dependencies are declared and the workflow has been tested.

This repository's desktop UI remains a prototype for most gameplay and telemetry features. The standalone desktop runtime can now generate a real, five-minute LAN QR code and validate its scan landing page. This is not a completed Android pairing: Android Companion identity submission, mutual authentication, ADB control, PC input injection, OCR, model routing, live telemetry and automatic gameplay are not yet operational. Those capabilities must be delivered and verified module by module.

## 16. Contributing

Contributions are welcome in DSH integration, desktop vision, Android communication, model adapters, action validation, telemetry, documentation and testing.

Please include:
- Operating system, device model and Android version
- DSH and runtime versions
- Reproduction steps
- Expected and actual behavior
- Relevant logs with API keys, tokens and personal data removed

## License

The repository license is governed by the license file included in this repository. If no license file is present, do not assume that the source is licensed for redistribution or commercial use.


## 17. Paimon as an autonomous voice companion

The Android companion is intended to feel like a persistent in-game partner, not merely a speaker for desktop notifications. This section defines the target behavior; it is not a claim that voice recognition, autonomous roaming or game automation is already implemented.

### Connection greeting

After QR pairing has been authenticated and the session is ready, Android plays a short Paimon greeting, for example: “旅行者，连接成功啦！派蒙已经准备好，随时听候你的吩咐！” The greeting is emitted once per successful pairing/session, not on every heartbeat or reconnect loop. If TTS is unavailable, show a text fallback and do not claim audio played.

### Voice command loop

- Android requests microphone permission explicitly and shows a visible listening indicator. Push-to-talk is the default; optional wake-word listening must be separately enabled and easy to disable.
- Speech recognition produces a transcript plus confidence/language metadata. The transcript is sent over the authenticated session to the desktop agent; model API credentials remain on desktop.
- The desktop resolves the command against the currently detected game profile, current state and permitted action set. It asks for clarification when confidence is low or the command is ambiguous.
- The agent returns a short spoken acknowledgement, executes bounded actions, then reports only outcomes verified by new observations.
- “派蒙，停止 / 暂停” is a high-priority local command. Android must stop dispatching queued actions immediately, even if the desktop or model is slow or disconnected.

Example commands include “派蒙，跟着我”、“去砍一些橡木”、“回到安全的地方” and “暂停一下”. Command vocabulary and action semantics are profile-specific; examples are not guarantees that every game supports those actions.

### Autonomous companion behavior when no task is queued

The user may enable an explicit **陪伴探索 / 自主漫游** mode. When enabled and the agent is idle, it may:
- Make occasional in-character comments about visible, confidently recognized events.
- Use short original, non-infringing humming or songs, or audio the user has rights to use. Do not reproduce copyrighted game songs or commercial tracks without permission.
- Explore within a bounded radius, observe landmarks and learn safe routes.
- In Minecraft, gather permitted resources such as nearby wood only when the active profile confirms the target, tool, inventory capacity and environmental safety. It should avoid lava, cliffs, hostile mobs, protected builds and other players' property; do not break blocks near other players or user-designated protected areas.
- Return to a configured safe point or stop when health, hunger, durability, inventory, danger or uncertainty crosses profile thresholds.

Autonomy is opt-in, bounded and interruptible. Default behavior while idle is **wait and chat**, not uncontrolled movement. The user can set exploration radius, allowed activities, protected areas, resource limits, speech frequency and quiet hours. Purchases, premium-currency spending, irreversible account actions, PvP, griefing and interactions affecting other players require explicit user authorization and must not be initiated autonomously.

### Automatic game recognition and profile switching

The agent should combine Android foreground package/title metadata (when the OS permits) with screen-layout fingerprints, OCR/UI signatures and scene cues. It must not rely on a single title string or assume that a visual guess is certain. On a game change:
1. Stop or pause actions from the previous profile.
2. Identify candidate game and platform; calculate confidence.
3. Load the matching versioned profile only after validation.
4. Display the detected title/profile and confidence to the user.
5. If uncertain or unsupported, enter observe-only mode and ask the user to select/confirm a profile.

Each title needs its own tested control map and safety rules. Minecraft resource gathering cannot be reused as Genshin Impact behavior. For Genshin and other games, the agent may explore, follow, navigate or interact only where the profile has validated controls and the action is allowed. “Automatic recognition” means detecting and selecting a profile, not instant universal compatibility.

### Suggested state machine

`disconnected → pairing → connected_greeting → idle_companion → voice_command → task_planning → executing → verifying → idle_companion`

Any state may transition to `paused`, `stopping` or `error`. A new voice command interrupts low-priority chatter; stop/pause interrupts speech and action queues. Disconnect, stale frames, low-confidence perception, model failure or an unknown game must stop new autonomous actions.

### Acceptance tests

- A successful pairing produces one greeting; failed pairing produces none.
- The phone can receive a voice command and the desktop returns a transcript/intent acknowledgement without exposing API credentials.
- Stop/pause works locally even during network loss or a pending inference request.
- Idle autonomy is off by default and cannot start without user opt-in.
- A game switch cancels old-profile actions before loading a new profile.
- Unknown game/profile confidence causes observe-only behavior.
- Minecraft gathering respects health, danger, inventory, protected-area and action-bound checks.
- Spoken commentary is based on current observations; songs are original/licensed/public-domain only.

See [runtime protocol](runtime-protocol-v1.md) for the corresponding event contract.


---

## Native DSH plugin installation

The repository now includes a native DSH bundle package manifest and plugin entry point. The npm package is published separately from the GitHub source release.

**Desktop DSH installation (after the npm package is published):**
1. Open **Plugins** in the DSH sidebar.
2. Select **Add plugin**.
3. Enter `@sususgh/gamer-dsh-plugin` (the npm package name, not this GitHub URL).
4. Install and restart DSH.
5. Open the Gamer plugin page. In a new conversation, ask the model to call `gamer_project_status` to verify that the plugin loaded.

For CLI-managed profiles, use:
```bash
npx -y @deepseek-ai/dsh plugin --profile web add @sususgh/gamer-dsh-plugin@1.0.1
```

See [DSH installation instructions](docs/DSH-INSTALL.zh-CN.md).

**Current release (v1.0.1):** the native DSH package provides the plugin bundle, a status tool and a bilingual configuration page (简体中文 / English) on the bundle's own page in the DSH Plugins sidebar. The page includes an Android QR-pairing status panel. The standalone desktop runtime now provides real QR generation and a scan-validation landing page. The Android APK/companion bridge, device identity approval, authenticated session handshake, live visual perception and autonomous game actions are not implemented yet; scanning the QR does not mean the phone is paired. Installing the DSH bundle does not enable game control.
