# Optional community Paimon TTS integration

## Purpose

The desktop companion can optionally speak task status, navigation hints, guide summaries, warnings and verified action outcomes using a separately installed community-made Paimon voice model.

This is an optional speech-output adapter. It does not replace the DSH language model and it does not grant additional game-control permissions.

## Community model reference

- [gaaiyun/ai-paimon](https://github.com/gaaiyun/ai-paimon): documents a Paimon VITS TTS server and a local voice assistant.
- [RVC-Boss/GPT-SoVITS](https://github.com/RVC-Boss/GPT-SoVITS): an open-source TTS/voice-conversion training and inference framework.

The ai-paimon repository documents:
- Local VITS service default port 8020.
- `GET /health` health endpoint.
- `POST /tts_to_audio` request with `{"text":"...","length_scale":1.0}`, returning WAV audio.
- A Paimon voice checkpoint that its README marks for personal, non-commercial use only.

Gamer does not copy, mirror, commit or redistribute third-party voice checkpoints, datasets, extracted game audio or Live2D assets. Users must obtain any weights from the original project and follow the current model and dataset terms. A project's MIT code license does not automatically license its trained weights, datasets, character rights or voice likeness.

## Desktop dashboard

The optional voice panel allows the user to:
1. Enter a local TTS base URL (default `http://127.0.0.1:8020`).
2. Call `GET /health` and require `status=ok` plus `loaded=true`.
3. Enter a short test sentence.
4. Call `POST /tts_to_audio` with JSON `text` and `length_scale`.
5. Play the returned WAV audio in the browser.

The endpoint URL is stored in browser local storage. No model weights or API keys are stored in this setting.

## Runtime integration

The future desktop runtime should expose a typed speech adapter:
- `speak(text, voice_profile, priority)`
- `stop_speech()`
- `get_voice_health()`

Recommended speech events:
- `voice.speak.request`: text, profile ID, priority, session ID.
- `voice.speak.started`: request ID and playback target.
- `voice.speak.completed`: request ID and duration.
- `voice.speak.failed`: request ID and sanitized error.
- `voice.speak.cancelled`: request ID and reason.

Speech must be interruptible. During gameplay, prioritize urgent warnings over routine narration, rate-limit repeated status lines, and never speak unverified claims as facts. Android playback may be local to the phone or relayed from the desktop according to the user's device preference.

## Network and privacy

- Bind the TTS server to loopback by default.
- If LAN access is required, use a trusted network and add authentication and TLS through a protected gateway.
- Do not expose an unauthenticated TTS endpoint to the public internet.
- Do not send game screenshots, player IDs or unrelated personal data to the TTS service.
- Avoid logging full speech text when it may contain private information.

## Browser limitations

When the dashboard is served over HTTPS, browsers may block requests to an insecure HTTP endpoint. CORS must also be configured by the TTS server for the dashboard's exact origin. Prefer a desktop-local proxy or serve both components from a secure local origin rather than enabling wildcard CORS.

## Current implementation status

The dashboard currently contains an optional endpoint field, health-check button and WAV preview request for the documented ai-paimon API shape. The complete desktop agent-to-TTS event bridge and Android playback routing are future runtime work. The voice checkpoint itself is not included in this repository.
