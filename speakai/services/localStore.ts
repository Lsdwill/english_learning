/**
 * Local storage for conversations and messages using AsyncStorage.
 * Server is only used for favorites (cloud sync).
 *
 * Data model:
 *   sessions: LocalSession[]  — stored under key 'sessions'
 *   messages:{id}: LocalMessage[]  — stored under key 'messages:{sessionId}'
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LocalSession {
  id: string;          // uuid
  created_at: string;  // ISO string
  preview: string;     // first user message text
}

export interface LocalMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  grammar?: string;
  native?: string;
  audioUri?: string;   // local file URI (TTS) or OSS URL (user recording)
  created_at: string;
}

const SESSIONS_KEY = 'speakai:sessions';
const msgKey = (sid: string) => `speakai:messages:${sid}`;

// ── Sessions ──────────────────────────────────────────────

export async function getSessions(): Promise<LocalSession[]> {
  const raw = await AsyncStorage.getItem(SESSIONS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function createLocalSession(): Promise<LocalSession> {
  const session: LocalSession = {
    id: uuid(),
    created_at: new Date().toISOString(),
    preview: '',
  };
  const sessions = await getSessions();
  sessions.unshift(session);
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  return session;
}

export async function updateSessionPreview(id: string, preview: string): Promise<void> {
  const sessions = await getSessions();
  const s = sessions.find(s => s.id === id);
  if (s) {
    s.preview = preview;
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  }
}

export async function deleteSession(id: string): Promise<void> {
  const sessions = await getSessions();
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.filter(s => s.id !== id)));
  await AsyncStorage.removeItem(msgKey(id));
}

// ── Messages ──────────────────────────────────────────────

export async function getMessages(sessionId: string): Promise<LocalMessage[]> {
  const raw = await AsyncStorage.getItem(msgKey(sessionId));
  return raw ? JSON.parse(raw) : [];
}

export async function appendMessage(sessionId: string, msg: Omit<LocalMessage, 'id' | 'created_at'>): Promise<LocalMessage> {
  const full: LocalMessage = { ...msg, id: uuid(), created_at: new Date().toISOString() };
  const msgs = await getMessages(sessionId);
  msgs.push(full);
  await AsyncStorage.setItem(msgKey(sessionId), JSON.stringify(msgs));
  return full;
}

/** Update audioUri for a message (e.g. after OSS upload completes) */
export async function updateMessageAudio(sessionId: string, msgId: string, audioUri: string): Promise<void> {
  const msgs = await getMessages(sessionId);
  const m = msgs.find(m => m.id === msgId);
  if (m) {
    m.audioUri = audioUri;
    await AsyncStorage.setItem(msgKey(sessionId), JSON.stringify(msgs));
  }
}

// ── Utils ─────────────────────────────────────────────────

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ── Favorited texts cache (local) ─────────────────────────
const FAVORITED_KEY = 'speakai:favorited_texts';

export async function getFavoritedTexts(): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(FAVORITED_KEY);
  return new Set(raw ? JSON.parse(raw) : []);
}

export async function addFavoritedText(text: string): Promise<void> {
  const set = await getFavoritedTexts();
  set.add(text);
  await AsyncStorage.setItem(FAVORITED_KEY, JSON.stringify([...set]));
}

export async function removeFavoritedText(text: string): Promise<void> {
  const set = await getFavoritedTexts();
  set.delete(text);
  await AsyncStorage.setItem(FAVORITED_KEY, JSON.stringify([...set]));
}

// ── Auth token persistence ────────────────────────────────
const TOKEN_KEY = 'speakai:auth_token';

export async function saveAuthToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function loadAuthToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function clearAuthToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}
