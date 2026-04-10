# SpeakAI — React Native (Expo)

## Setup

```bash
cd speakai
npm install
npm install -D babel-plugin-module-resolver
```

Replace `YOUR_NEW_API_KEY_HERE` in `constants/config.ts` with your DashScope API key.

## Run

```bash
npx expo start
# then press 'a' for Android emulator, or scan QR with Expo Go
```

## Build for Google Play

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android
```

## Architecture

| Service | Model | Protocol |
|---------|-------|----------|
| STT | paraformer-realtime-v2 | WebSocket (PCM stream) |
| TTS | cosyvoice-v2 (longanyang voice) | WebSocket (MP3 chunks) |
| LLM | qwen-turbo | REST (OpenAI-compatible) |

## Notes

- STT streams PCM audio in real-time via WebSocket; interim results shown above mic button
- TTS receives base64 MP3 chunks, writes to cache, plays via expo-av
- The web version in `english-speaking/` is kept as a reference
