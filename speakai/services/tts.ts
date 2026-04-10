/**
 * TTS Service
 *
 * Strategy:
 * 1. If a proxy server URL is configured, use it (POST → returns MP3, play with expo-av)
 * 2. Fallback: expo-speech (device native TTS, no API needed)
 *
 * To use CosyVoice, run the proxy server in /speakai-proxy and set PROXY_URL in config.
 */
import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import { CONFIG } from '@/constants/config';

export async function synthesizeSpeech(text: string): Promise<void> {
  // If proxy is configured, use CosyVoice via proxy
  if (CONFIG.ttsProxyUrl) {
    try {
      await synthesizeViaProxy(text);
      return;
    } catch (e) {
      console.warn('Proxy TTS failed, falling back to device TTS:', e);
    }
  }

  // Fallback: device native TTS
  await speakNative(text);
}

async function synthesizeViaProxy(text: string): Promise<void> {
  const res = await fetch(CONFIG.ttsProxyUrl!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice: CONFIG.ttsVoice, model: CONFIG.ttsModel }),
  });

  if (!res.ok) throw new Error(`Proxy TTS error: ${res.status}`);

  const blob = await res.blob();
  // Save to cache and play
  const reader = new FileReader();
  const base64 = await new Promise<string>((resolve, reject) => {
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // strip data:audio/mp3;base64,
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const path = `${FileSystem.cacheDirectory}tts_${Date.now()}.mp3`;
  await FileSystem.writeAsStringAsync(path, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false });
  const { sound } = await Audio.Sound.createAsync({ uri: path });
  await sound.playAsync();
  sound.setOnPlaybackStatusUpdate((s) => {
    if (s.isLoaded && s.didJustFinish) sound.unloadAsync();
  });
}

function speakNative(text: string): Promise<void> {
  return new Promise((resolve) => {
    Speech.speak(text, {
      language: 'en-US',
      rate: 0.9,
      onDone: resolve,
      onError: resolve, // resolve anyway so app doesn't hang
    });
  });
}
