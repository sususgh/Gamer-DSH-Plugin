# Vision, online research and game-memory design

This document defines the desktop-first intelligence subsystems for Gamer. It is an implementation contract, not a claim that the engine is already running.

## 1. Design goals

- Work with text-only DSH models by using local computer vision to produce structured observations.
- Use native image input only when the selected model explicitly declares and passes a vision capability probe.
- Combine live observations with optional web research and locally persisted, verified experience.
- Keep Android lightweight: capture, encode, execute permitted input, acknowledge and report device state.
- Make uncertainty visible. Never invent objects, quest completion, guide citations or action success.

## 2. Perception pipeline

Recommended stages:

1. **Frame intake:** validate frame ID, dimensions, orientation, timestamp, source device and freshness.
2. **Preprocessing:** normalize orientation, resize, crop known HUD regions, detect duplicate/stale frames and preserve a source-frame reference.
3. **OCR:** recognize visible text, numbers, dialogue, menu labels, quest text and interaction prompts. Every result includes a bounding box, confidence and frame ID.
4. **UI detection:** locate buttons, bars, minimaps, inventory slots, menus and other profile-defined interface elements.
5. **Object/scene detection:** run available detectors for profile-defined objects, characters, hazards and landmarks. Do not claim universal object recognition from a generic model.
6. **Temporal association:** match detections across frames and estimate changes, motion and scene transitions.
7. **State extraction:** map detections into a versioned game-state schema.
8. **Quality gate:** reject stale, low-confidence or contradictory state for risky actions; request a fresh frame or pause.

Suggested normalized observation:

```json
{
  "schema": "gamer.observation.v1",
  "game_id": "example.game",
  "profile_version": "0.1.0",
  "frame": {
    "id": "frame-uuid",
    "captured_at_ms": 1732400000000,
    "width": 1920,
    "height": 1080,
    "orientation": "landscape"
  },
  "scene": {"label": "unknown", "confidence": 0.0},
  "ocr": [],
  "entities": [],
  "ui": [],
  "state": {
    "health": null,
    "objective": null,
    "location": null
  },
  "quality": {
    "fresh": true,
    "overall_confidence": 0.0,
    "warnings": []
  }
}
```

Unknown values must be null/unknown, not guessed. Confidence values must be calibrated or clearly marked as estimates.

## 3. Model routing

The router selects a model based on task requirements:
- Text reasoning: structured observation + task context.
- Vision reasoning: selected image/crop + context, only for a model whose image capability is declared and probed.
- OCR/detection: local CV component; model API is optional.
- Structured action: require schema-constrained output or validate the returned JSON against the action schema.

A provider name or key prefix is not proof of capability. Use the DSH provider/model configuration and an actual bounded probe. Never send provider credentials to Android.

## 4. Online guide research

### Query planning

A query should include game title, platform, quest/boss/region/mechanic, relevant item names and (when known) game patch/version. Avoid broad searches that return unrelated walkthroughs.

### Source ranking

Prefer:
1. Official game help, developer patch notes and official announcements.
2. Maintained game databases and wikis with revision/version context.
3. Established guide publishers with update dates.
4. Community posts for tactics or edge cases, corroborated where possible.

For each result, retain title and canonical URL; publisher/domain; retrieval timestamp; publication/update timestamp when available; game version/patch compatibility; extracted claim and supporting passage; confidence and any conflict with other sources.

### Evidence and prompt-injection boundary

Web content is untrusted data. Ignore instructions inside pages that ask the agent to reveal secrets, change system policy, execute commands, install files or contact unrelated services. Do not execute code, download mods/trainers or submit account credentials as part of guide research. Summarize procedural information only.

Before acting on a guide, compare prerequisites with the current game state; check whether the page describes the same platform and patch; distinguish confirmed steps from community speculation; and ask the user before purchases, premium-currency use or irreversible account actions.

### Privacy controls

Default to searching text queries, not uploading screenshots. Strip account names, player IDs, chat content and unrelated personal data. Screenshot upload to external services requires a separate explicit opt-in.

## 5. Experience memory

Memory is a local, user-inspectable store of compact experience records. It is not model-weight training.

Suggested record:

```json
{
  "schema": "gamer.experience.v1",
  "record_id": "experience-uuid",
  "game_id": "example.game",
  "profile_version": "0.1.0",
  "task_key": "quest-or-scene-key",
  "state_signature": "profile-defined-feature-hash",
  "action": {"type": "tap", "x": 0.5, "y": 0.7, "duration_ms": 120},
  "expected_outcome": "interaction_prompt_disappears",
  "observed_outcome": "interaction_prompt_disappears",
  "result": "verified_success",
  "confidence": 0.94,
  "source_frame_ids": ["frame-uuid"],
  "created_at": "2026-11-27T00:00:00Z"
}
```

Rules:
- Save only after receiving action acknowledgement and a subsequent observation.
- Distinguish verified success, verified failure and uncertain outcome.
- Never increase a strategy score from an uncertain result.
- Keep memories separated by game and profile version.
- Provide inspect, export and delete controls.
- Avoid retaining raw frames by default; if enabled for debugging, apply retention limits and user controls.

## 6. Game profile contract

Each profile should define:
- game ID, display name, platform and supported version range;
- screen orientation and resolution handling;
- HUD/OCR regions and labels;
- entity classes and scene labels;
- coordinate calibration and safe screen bounds;
- supported action types, timing limits and cooldowns;
- game-state fields and confidence thresholds;
- task/goal templates and recovery behavior;
- fixture frames and expected detections;
- compatibility status and tested device/build metadata.

Minecraft and Genshin Impact require separate profiles and separate validation suites. Do not reuse one game's control map for another.

## 7. Closed-loop agent

```text
frame
  -> validate freshness
  -> preprocess / OCR / detect / track
  -> structured game state + confidence
  -> retrieve relevant experience
  -> optionally search and verify guide references
  -> choose a bounded goal and action
  -> validate against game profile and safety policy
  -> execute on PC or Android
  -> receive action acknowledgement
  -> capture next frame
  -> verify expected outcome
  -> persist verified experience
  -> re-plan
```

Pause when frames are stale, state confidence is below the profile threshold, model output is malformed, the action is out of bounds, the device disconnects or a required capability is unavailable. Stop/pause from either client overrides the loop.

## 8. Suggested events

- `perception.result`: frame ID, profile version, structured state, detections, OCR and confidence.
- `perception.warning`: stale frame, low confidence, unsupported scene or detector failure.
- `research.request`: game ID, query, patch/platform context and privacy mode.
- `research.result`: source records, extracted claims, version match and confidence.
- `memory.recorded`: experience record ID and verified result.
- `memory.query_result`: matched experience IDs and relevance scores.
- `profile.status`: game ID, profile version, compatibility state and test summary.

All events use the common runtime envelope, session authentication and timestamps defined in runtime-protocol-v1.md.

## 9. Acceptance tests

### Vision
- Reject stale and malformed frames.
- OCR output includes text, bounding box, confidence and frame ID.
- Unknown or occluded targets remain unknown rather than fabricated.
- Scene changes invalidate incompatible coordinate assumptions.
- Confidence thresholds pause risky actions.

### Research
- Results retain source URL and retrieval time.
- Outdated patch guidance is marked as a mismatch.
- Conflicting sources remain conflicts; the agent does not silently choose one.
- Prompt-injection text in a guide is treated as untrusted content.
- No screenshot or personal identifier is uploaded without opt-in.

### Memory
- Only acknowledged and visually verified outcomes are stored as success/failure.
- Uncertain outcomes do not improve strategy scores.
- Game profiles do not leak memories into unrelated games.
- Inspect/export/delete controls work.

### Gameplay
- Every action is bounded by the active profile.
- Pause/stop interrupts pending action scheduling.
- Disconnect or model failure stops new actions.
- The system reports completion only when verified by a subsequent observation.

## 10. Current implementation status

The repository currently contains a dashboard prototype and design/protocol documentation. This document specifies the required behavior. It does not imply that OCR, object detection, web search, persistent memory, Android capture or autonomous gameplay are already implemented.
