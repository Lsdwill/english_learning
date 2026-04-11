import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';

export const SERVER_URL = 'http://192.168.1.8:3000';

export interface LLMResult {
  ai_reply: string;
  grammar: string;
  native: string;
}

export async function callLLM(text: string): Promise<LLMResult> {
  const res = await fetch(`${SERVER_URL}/llm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`LLM error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function callLLMReply(text: string): Promise<{ ai_reply: string }> {
  const res = await fetch(`${SERVER_URL}/llm/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`LLM reply error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function callLLMAnalyze(text: string): Promise<{ grammar: string; native: string }> {
  const res = await fetch(`${SERVER_URL}/llm/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`LLM analyze error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function transcribeAudio(localUri: string): Promise<{ transcript: string; oss_key?: string; oss_url?: string }> {
  const form = new FormData();
  form.append('audio', { uri: localUri, name: 'audio.m4a', type: 'audio/m4a' } as any);
  const res = await fetch(`${SERVER_URL}/stt`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`STT error ${res.status}: ${await res.text()}`);
  return res.json(); // { transcript, oss_key }
}

// ── TTS with local cache ───────────────────────────────────
// Cache key = SHA-256 of text, stored as tts_<hash>.mp3 in cacheDirectory
export async function synthesizeSpeech(text: string): Promise<string> {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256, text
  );
  const cached = `${FileSystem.cacheDirectory}tts_${hash}.mp3`;

  const info = await FileSystem.getInfoAsync(cached);
  if (info.exists) {
    console.log('[TTS] cache hit:', hash.slice(0, 8));
    return cached;
  }

  console.log('[TTS] cache miss, fetching from server');
  const result = await FileSystem.downloadAsync(
    `${SERVER_URL}/tts?text=${encodeURIComponent(text)}`, cached
  );
  if (result.status !== 200) {
    // Clean up failed download
    await FileSystem.deleteAsync(cached, { idempotent: true });
    throw new Error(`TTS error ${result.status}`);
  }
  return result.uri;
}

/** Polish a sentence in casual or business style */
export async function polishText(text: string, mode: 'casual' | 'business'): Promise<{ result: string; explanation: string }> {
  const res = await fetch(`${SERVER_URL}/polish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, mode }),
  });
  if (!res.ok) throw new Error(`Polish error ${res.status}`);
  return res.json();
}

/** Generate a short title for a conversation from the first user message */
export async function summarizeSession(text: string): Promise<string> {
  try {
    const res = await fetch(`${SERVER_URL}/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return text.slice(0, 40);
    return (await res.json()).title ?? text.slice(0, 40);
  } catch {
    return text.slice(0, 40);
  }
}

/** Get a short-lived signed URL for an OSS audio key (for replay) */
export async function getOssAudioUrl(ossKey: string): Promise<string> {  const res = await fetch(`${SERVER_URL}/audio-url?key=${encodeURIComponent(ossKey)}`);
  if (!res.ok) throw new Error(`getOssAudioUrl error ${res.status}`);
  return (await res.json()).url;
}


export async function createSession(): Promise<number> {
  const res = await fetch(`${SERVER_URL}/sessions`, { method: 'POST' });
  if (!res.ok) throw new Error(`createSession error ${res.status}`);
  return (await res.json()).session_id;
}

export async function getSessions(): Promise<SessionSummary[]> {
  const res = await fetch(`${SERVER_URL}/sessions`);
  if (!res.ok) throw new Error(`getSessions error ${res.status}`);
  return res.json();
}

export async function getSessionMessages(sessionId: number): Promise<DBMessage[]> {
  const res = await fetch(`${SERVER_URL}/sessions/${sessionId}`);
  if (!res.ok) throw new Error(`getSessionMessages error ${res.status}`);
  return res.json();
}

// ── Messages ──────────────────────────────────────────────
export async function saveMessage(params: {
  session_id: number; role: 'user' | 'ai';
  text: string; grammar?: string; native?: string; oss_key?: string;
}): Promise<void> {
  await fetch(`${SERVER_URL}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
}

// ── Favorites ─────────────────────────────────────────────
export async function addFavorite(params: {
  user_text: string; grammar?: string; native?: string; ai_reply?: string; user_audio_url?: string;
}): Promise<{ id: number; updated: boolean }> {
  const res = await fetch(`${SERVER_URL}/favorites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`addFavorite error ${res.status}`);
  return res.json();
}

export async function getFavorites(): Promise<Favorite[]> {
  const res = await fetch(`${SERVER_URL}/favorites`);
  if (!res.ok) throw new Error(`getFavorites error ${res.status}`);
  return res.json();
}

export async function deleteFavorite(id: number): Promise<void> {
  await fetch(`${SERVER_URL}/favorites/${id}`, { method: 'DELETE' });
}

export async function deleteFavoriteByText(userText: string): Promise<void> {
  await fetch(`${SERVER_URL}/favorites/by-text`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_text: userText }),
  });
}

// ── Types ─────────────────────────────────────────────────
export interface SessionSummary { id: number; created_at: string; message_count: number }
export interface DBMessage {
  id: number; session_id: number; role: 'user' | 'ai';
  text: string; grammar: string | null; native: string | null;
  oss_key: string | null; created_at: string;
}
export interface Favorite {
  id: number; user_text: string;
  grammar: string | null; native: string | null; ai_reply: string | null;
  user_audio_url: string | null;
  created_at: string;
}

export interface PolishFavorite {
  id: number;
  original: string;
  polished: string;
  explanation: string | null;
  mode: 'casual' | 'business';
  user_oss_key: string | null;
  created_at: string;
}

/**
 * Get a playable local URI for an OSS key or a full signed URL.
 * Cache: downloads to cacheDirectory as oss_<hash>.m4a, reuses on subsequent calls.
 */
export async function getOssAudioCached(ossKeyOrUrl: string): Promise<string> {
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, ossKeyOrUrl);
  const cached = `${FileSystem.cacheDirectory}oss_${hash}.m4a`;
  const info = await FileSystem.getInfoAsync(cached);
  if (info.exists) return cached;

  // If it's already a full URL (http/https), download directly; otherwise get signed URL first
  const downloadUrl = ossKeyOrUrl.startsWith('http')
    ? ossKeyOrUrl
    : await getOssAudioUrl(ossKeyOrUrl);

  const result = await FileSystem.downloadAsync(downloadUrl, cached);
  if (result.status !== 200) {
    await FileSystem.deleteAsync(cached, { idempotent: true });
    throw new Error(`OSS download error ${result.status}`);
  }
  return result.uri;
}

export async function savePolishFavorite(params: {
  original: string; polished: string; explanation?: string; mode: 'casual' | 'business'; user_oss_key?: string;
}): Promise<{ id: number }> {
  const res = await fetch(`${SERVER_URL}/polish-favorites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`savePolishFavorite error ${res.status}`);
  return res.json();
}

export async function getPolishFavorites(): Promise<PolishFavorite[]> {
  const res = await fetch(`${SERVER_URL}/polish-favorites`);
  if (!res.ok) throw new Error(`getPolishFavorites error ${res.status}`);
  return res.json();
}

export async function deletePolishFavorite(id: number): Promise<void> {
  await fetch(`${SERVER_URL}/polish-favorites/${id}`, { method: 'DELETE' });
}

// ── Vocabulary ────────────────────────────────────────────
export interface VocabularyItem {
  id: number;
  word: string;
  explanation: string;
  example: string | null;
  created_at: string;
}

export async function explainWord(word: string): Promise<{ explanation: string; example: string }> {
  const res = await fetch(`${SERVER_URL}/vocabulary/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word }),
  });
  if (!res.ok) throw new Error(`explainWord error ${res.status}`);
  return res.json();
}

export async function saveVocabulary(params: {
  word: string; explanation: string; example?: string;
}): Promise<{ id: number }> {
  const res = await fetch(`${SERVER_URL}/vocabulary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`saveVocabulary error ${res.status}`);
  return res.json();
}

export async function getVocabulary(): Promise<VocabularyItem[]> {
  const res = await fetch(`${SERVER_URL}/vocabulary`);
  if (!res.ok) throw new Error(`getVocabulary error ${res.status}`);
  return res.json();
}

export async function deleteVocabulary(id: number): Promise<void> {
  await fetch(`${SERVER_URL}/vocabulary/${id}`, { method: 'DELETE' });
}
