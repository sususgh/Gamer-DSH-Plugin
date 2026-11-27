# Paimon voice companion and autonomous gameplay specification

This document defines the intended phone-first companion experience: greeting after pairing, voice commands, idle conversation/singing, bounded autonomous exploration and automatic game-profile recognition. It is a specification, not a claim that these runtime modules are already implemented.


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
