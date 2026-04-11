import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, FlatList, Text, StyleSheet, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { useRouter, useLocalSearchParams } from 'expo-router';

import ChatBubble, { Message } from '@/components/ChatBubble';
import MicButton from '@/components/MicButton';
import { callLLMReply, callLLMAnalyze, transcribeAudio, synthesizeSpeech, addFavorite, deleteFavoriteByText, summarizeSession } from '@/services/api';import {
  createLocalSession, getMessages, appendMessage,
  updateSessionPreview, LocalMessage, getFavoritedTexts, addFavoritedText, removeFavoritedText,
} from '@/services/localStore';

export default function ChatScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [recording, setRecording] = useState(false);
  const [statusText, setStatusText] = useState('Tap to speak');
  const [favoritedTexts, setFavoritedTexts] = useState<Set<string>>(new Set());

  const recordingRef = useRef<Audio.Recording | null>(null);
  const listRef = useRef<FlatList>(null);
  const sessionIdRef = useRef<string | null>(sessionId ?? null);
  const lastAiReplyRef = useRef<string>('');
  const lastAiAudioUriRef = useRef<string | null>(null);

  const initialScrollDoneRef = useRef(false);

  const scrollToBottom = useCallback((animated = true) => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated }), 100);
  }, []);

  const playUri = useCallback(async (uri: string) => {
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false });
      const { sound } = await Audio.Sound.createAsync({ uri });
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate(s => {
        if (s.isLoaded && s.didJustFinish) sound.unloadAsync();
      });
    } catch (e) { console.warn('playUri error', e); }
  }, []);

  const playTTS = useCallback(async (text: string) => {
    try {
      const uri = await synthesizeSpeech(text);
      lastAiAudioUriRef.current = uri;
      await playUri(uri);
    } catch (e) { console.warn('TTS error', e); }
  }, [playUri]);

  // Convert stored LocalMessage to display Message
  const toDisplayMsg = useCallback((m: LocalMessage, favSet: Set<string>): Message => {
    if (m.role === 'ai') {
      return { type: 'ai', text: m.text, onPlay: () => playTTS(m.text) };
    }

    // Only show replay button if audio is a remote URL (local paths may no longer exist)
    const hasPlayableAudio = m.audioUri?.startsWith('http://') || m.audioUri?.startsWith('https://');
    console.log('[toDisplayMsg] id:', m.id, 'audioUri:', m.audioUri?.slice(0, 60), 'hasPlayable:', hasPlayableAudio);

    return {
      type: 'userTurn',
      text: m.text,
      grammar: m.grammar ?? '',
      native: m.native ?? '',
      favorited: favSet.has(m.text),
      onReplay: hasPlayableAudio ? () => playUri(m.audioUri!) : undefined,
      onPlayNative: m.native ? () => playTTS(m.native!) : undefined,
      onFavorite: () => handleFavorite(m.text, m.grammar ?? '', m.native ?? '', m.audioUri ?? null, favSet.has(m.text)),
      onPolish: () => router.push({ pathname: '/polish', params: { text: m.text, ossKey: m.audioUri ?? '' } }),
    };
  }, [playTTS, playUri]);

  // Init: new session or resume
  useEffect(() => {
    if (sessionId) {
      // Resume existing session from local store — load favs to mark starred items
      Promise.all([getMessages(sessionId), getFavoritedTexts()]).then(([msgs, favSet]) => {
        initialScrollDoneRef.current = false;
        setMessages(msgs.map(m => toDisplayMsg(m, favSet)));
        const lastAi = [...msgs].reverse().find(m => m.role === 'ai');
        if (lastAi) lastAiReplyRef.current = lastAi.text;
      }).catch(e => console.warn('load history error', e));
    } else {
      // New session — show welcome, create session lazily on first message
      const welcome = "Hello! I'm your English speaking coach. Tell me about your day.";
      setMessages([{ type: 'ai', text: welcome, onPlay: () => playTTS(welcome) }]);
      lastAiReplyRef.current = welcome;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ensureSession = useCallback(async (): Promise<string> => {
    if (sessionIdRef.current) return sessionIdRef.current;
    const s = await createLocalSession();
    sessionIdRef.current = s.id;
    return s.id;
  }, []);

  const handleFavorite = useCallback(async (
    userText: string, grammar: string, native: string, userAudioUri: string | null,
    currentlyFavorited: boolean
  ) => {
    if (currentlyFavorited) {
      // Unfavorite
      setFavoritedTexts(prev => { const s = new Set(prev); s.delete(userText); return s; });
      await removeFavoritedText(userText);
      deleteFavoriteByText(userText).catch(e => console.warn('deleteFavoriteByText error', e));
    } else {
      // Favorite
      setFavoritedTexts(prev => new Set(prev).add(userText));
      try {
        // userAudioUri is the OSS URL if it starts with http, otherwise local path (no audio)
        const ossAudioUrl = userAudioUri?.startsWith('http') ? userAudioUri : undefined;
        await addFavorite({
          user_text: userText, grammar, native,
          ai_reply: lastAiReplyRef.current,
          user_audio_url: ossAudioUrl,
        });
        await addFavoritedText(userText);
      } catch (e) {
        console.warn('addFavorite error', e);
        setFavoritedTexts(prev => { const s = new Set(prev); s.delete(userText); return s; });
      }
    }
  }, [favoritedTexts]);

  const startRecording = useCallback(async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) { setStatusText('Microphone permission denied'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync({
        android: {
          extension: '.m4a', outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 16000, numberOfChannels: 1, bitRate: 64000,
        },
        ios: {
          extension: '.m4a', audioQuality: Audio.IOSAudioQuality.MEDIUM,
          sampleRate: 16000, numberOfChannels: 1, bitRate: 64000,
        },
        web: {},
      });
      await rec.startAsync();
      recordingRef.current = rec;
      setRecording(true);
      setStatusText('Listening… tap to stop');
    } catch (e) {
      console.warn('startRecording error', e);
      setStatusText('Failed to start recording');
    }
  }, []);

  const stopRecording = useCallback(async () => {
      setRecording(false);
      setStatusText('Transcribing…');

      try {
        const rec = recordingRef.current;
        recordingRef.current = null;
        if (!rec) { setStatusText('Tap to speak'); return; }

        const localUri = rec.getURI();
        await rec.stopAndUnloadAsync();
        if (!localUri) { setStatusText('Tap to speak'); return; }

        setMessages(prev => [...prev, { type: 'thinking' }]);

        // STT — wait for transcript first
        let transcript: string;
        let ossKey: string | undefined;
        try {
          const r = await transcribeAudio(localUri);
          transcript = r.transcript;
          ossKey = r.oss_url ?? r.oss_key;
          if (ossKey) console.log('[chat] oss_url received:', ossKey.slice(0, 80));
          else console.warn('[chat] no oss_url in STT response');
        } catch (e: any) {
          setMessages(prev => prev.filter(m => m.type !== 'thinking'));
          setMessages(prev => [...prev, { type: 'ai', text: `Transcription error: ${e.message}` }]);
          setStatusText('Tap to speak');
          return;
        }

        if (!transcript.trim()) {
          setMessages(prev => prev.filter(m => m.type !== 'thinking'));
          setStatusText('Tap to speak');
          return;
        }

        const capturedUri = localUri;
        const capturedOssUrl = ossKey;

        // STT done — immediately show user message with analyzing state + AI thinking bubble
        setMessages(prev => [
          ...prev.filter(m => m.type !== 'thinking'),
          {
            type: 'userTurn',
            text: transcript,
            grammar: '',
            native: '',
            analyzing: true,
            favorited: favoritedTexts.has(transcript),
            onReplay: capturedUri ? () => playUri(capturedUri) : undefined,
            onFavorite: () => handleFavorite(transcript, '', '', capturedOssUrl ?? capturedUri, favoritedTexts.has(transcript)),
            onPolish: () => router.push({ pathname: '/polish', params: { text: transcript, ossKey: capturedOssUrl ?? '' } }),
          },
          { type: 'thinking' },
        ]);
        scrollToBottom();
        setStatusText('Tap to speak');

        // Fire both LLM tasks in parallel
        const [replyResult, analyzeResult] = await Promise.allSettled([
          callLLMReply(transcript),
          callLLMAnalyze(transcript),
        ]);

        const aiReply = replyResult.status === 'fulfilled' ? replyResult.value.ai_reply : 'Sorry, I had trouble responding.';
        const grammar = analyzeResult.status === 'fulfilled' ? analyzeResult.value.grammar : '—';
        const native = analyzeResult.status === 'fulfilled' ? analyzeResult.value.native : '—';

        // Replace thinking bubble with AI reply, update user message with analysis
        setMessages(prev => {
          const withoutThinking = prev.filter(m => m.type !== 'thinking');
          return withoutThinking.map(m => {
            if (m.type === 'userTurn' && m.text === transcript && m.analyzing) {
              return {
                ...m,
                grammar,
                native,
                analyzing: false,
                onPlayNative: () => playTTS(native),
                onFavorite: () => handleFavorite(transcript, grammar, native, capturedOssUrl ?? capturedUri, favoritedTexts.has(transcript)),
                onPolish: () => router.push({ pathname: '/polish', params: { text: transcript, ossKey: capturedOssUrl ?? '' } }),
              };
            }
            return m;
          }).concat([
            { type: 'ai', text: aiReply, onPlay: () => playTTS(aiReply) },
          ]);
        });

        lastAiReplyRef.current = aiReply;
        scrollToBottom();
        playTTS(aiReply);

        // Persist to local store (background)
        ensureSession().then(async sid => {
          await appendMessage(sid, { role: 'user', text: transcript, grammar, native, audioUri: capturedOssUrl ?? capturedUri });
          await appendMessage(sid, { role: 'ai', text: aiReply });
          const allMsgs = await getMessages(sid);
          const userMsgs = allMsgs.filter(m => m.role === 'user');
          if (userMsgs.length === 1 || userMsgs.length % 3 === 0) {
            const context = userMsgs.map(m => m.text).join(' / ');
            summarizeSession(context).then(title => updateSessionPreview(sid, title))
              .catch(() => { if (userMsgs.length === 1) updateSessionPreview(sid, transcript.slice(0, 40)); });
          }
        }).catch(e => console.warn('[chat] persist error', e));

      } catch (e) {
        console.warn('stopRecording error', e);
        setStatusText('Tap to speak');
      }
    }, [ensureSession, playUri, playTTS, handleFavorite, favoritedTexts, scrollToBottom]);

  const toggleRecording = useCallback(() => {
    recording ? stopRecording() : startRecording();
  }, [recording, startRecording, stopRecording]);

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#080c14" />
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={s.logoRow}>
          <Text style={s.logoIcon}>◈</Text>
          <Text style={s.logoText}>SpeakAI</Text>
        </View>
        <View style={s.statusRow}>
          <View style={s.statusDot} />
          <Text style={s.statusLabel}>AI Ready</Text>
        </View>
      </View>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => <ChatBubble message={item} />}
        contentContainerStyle={s.chatContent}
        style={s.chat}
        onContentSizeChange={() => {
          if (!initialScrollDoneRef.current) {
            initialScrollDoneRef.current = true;
            scrollToBottom(false); // 初次加载历史，不用动画，直接跳到底部
          } else {
            scrollToBottom(true);
          }
        }}
      />
      <View style={s.inputArea}>
        <Text style={s.hint}>{statusText}</Text>
        <MicButton recording={recording} onPress={toggleRecording} />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#080c14' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,200,255,0.12)',
  },
  backBtn: { minWidth: 60 },
  backText: { color: '#00c8ff', fontSize: 16 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoIcon: { color: '#00c8ff', fontSize: 18 },
  logoText: { color: '#00c8ff', fontSize: 18, fontWeight: '600', letterSpacing: 1 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 60, justifyContent: 'flex-end' },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#00e5a0' },
  statusLabel: { color: '#5a7a99', fontSize: 12 },
  chat: { flex: 1 },
  chatContent: { paddingTop: 20, paddingBottom: 8 },
  inputArea: {
    alignItems: 'center', paddingVertical: 20,
    borderTopWidth: 1, borderTopColor: 'rgba(0,200,255,0.12)',
    gap: 10,
  },
  hint: { color: '#5a7a99', fontSize: 13, letterSpacing: 0.5 },
});
