import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Alert,
  StyleSheet, StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import SelectableText from '@/components/SelectableText';
import {
  getFavorites, deleteFavorite,
  getPolishFavorites, deletePolishFavorite,
  getVocabulary, deleteVocabulary,
  synthesizeSpeech, getOssAudioCached,
  Favorite, PolishFavorite, VocabularyItem,
} from '@/services/api';

type Tab = 'expressions' | 'polish' | 'vocabulary';

export default function FavoritesScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('expressions');
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const [favItems, setFavItems] = useState<Favorite[]>([]);
  const [loadingFav, setLoadingFav] = useState(true);

  const [polishItems, setPolishItems] = useState<PolishFavorite[]>([]);
  const [loadingPolish, setLoadingPolish] = useState(false);

  const [vocabItems, setVocabItems] = useState<VocabularyItem[]>([]);
  const [loadingVocab, setLoadingVocab] = useState(false);

  useEffect(() => {
    getFavorites()
      .then(setFavItems)
      .catch(e => console.warn(e))
      .finally(() => setLoadingFav(false));
  }, []);

  useEffect(() => {
    if (tab === 'polish' && polishItems.length === 0) {
      setLoadingPolish(true);
      getPolishFavorites()
        .then(setPolishItems)
        .catch(e => console.warn(e))
        .finally(() => setLoadingPolish(false));
    }
    if (tab === 'vocabulary' && vocabItems.length === 0) {
      setLoadingVocab(true);
      getVocabulary()
        .then(setVocabItems)
        .catch(e => console.warn(e))
        .finally(() => setLoadingVocab(false));
    }
  }, [tab]);

  // Stop any playing sound before unmount
  useEffect(() => {
    return () => { soundRef.current?.unloadAsync().catch(() => {}); };
  }, []);

  const playUri = useCallback(async (uri: string, key: string) => {
    try {
      // Stop current if same key (toggle off)
      if (playingId === key) {
        await soundRef.current?.stopAsync();
        await soundRef.current?.unloadAsync();
        soundRef.current = null;
        setPlayingId(null);
        return;
      }
      // Stop previous
      await soundRef.current?.stopAsync().catch(() => {});
      await soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;

      setPlayingId(key);
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false });
      const { sound } = await Audio.Sound.createAsync({ uri });
      soundRef.current = sound;
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate(s => {
        if (s.isLoaded && s.didJustFinish) {
          sound.unloadAsync();
          soundRef.current = null;
          setPlayingId(null);
        }
      });
    } catch (e) { console.warn('playUri error', e); setPlayingId(null); }
  }, [playingId]);

  // Play user OSS audio (cached locally by URL)
  const playUserAudio = useCallback(async (url: string, id: string) => {
    try {
      const localUri = await getOssAudioCached(url);
      await playUri(localUri, `user-${id}`);
    } catch (e) { console.warn('playUserAudio error', e); }
  }, [playUri]);

  // Play AI TTS (uses existing synthesizeSpeech cache)
  const playAiTTS = useCallback(async (text: string, id: string) => {
    try {
      const uri = await synthesizeSpeech(text);
      await playUri(uri, `ai-${id}`);
    } catch (e) { console.warn('playAiTTS error', e); }
  }, [playUri]);

  const handleDeleteFav = useCallback((item: Favorite) => {
    Alert.alert('Delete', 'Remove this expression?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteFavorite(item.id);
          setFavItems(prev => prev.filter(f => f.id !== item.id));
        },
      },
    ]);
  }, []);

  const handleDeletePolish = useCallback((item: PolishFavorite) => {
    Alert.alert('Delete', 'Remove this polish record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deletePolishFavorite(item.id);
          setPolishItems(prev => prev.filter(p => p.id !== item.id));
        },
      },
    ]);
  }, []);

  const handleDeleteVocab = useCallback((item: VocabularyItem) => {
    Alert.alert('Delete', 'Remove this vocabulary item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteVocabulary(item.id);
          setVocabItems(prev => prev.filter(v => v.id !== item.id));
        },
      },
    ]);
  }, []);

  const formatDate = (s: string) => {
    const d = new Date(s);
    return d.toLocaleString('en-US', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const PlayBtn = ({ id, label }: { id: string; label: string }) => (
    <View style={[s.playBtn, playingId === id && s.playBtnActive]}>
      <Text style={s.playBtnText}>{playingId === id ? '⏹' : label}</Text>
    </View>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#080c14" />

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Favorites</Text>
        <View style={{ minWidth: 60 }} />
      </View>

      <View style={s.tabBar}>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'expressions' && s.tabBtnActive]}
          onPress={() => setTab('expressions')}
        >
          <Text style={[s.tabText, tab === 'expressions' && s.tabTextActive]}>Expressions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'polish' && s.tabBtnActive]}
          onPress={() => setTab('polish')}
        >
          <Text style={[s.tabText, tab === 'polish' && s.tabTextActive]}>Polish</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'vocabulary' && s.tabBtnActive]}
          onPress={() => setTab('vocabulary')}
        >
          <Text style={[s.tabText, tab === 'vocabulary' && s.tabTextActive]}>Vocabulary 📖</Text>
        </TouchableOpacity>
      </View>

      {/* ── Expressions tab ── */}
      {tab === 'expressions' && (
        loadingFav ? (
          <ActivityIndicator color="#00c8ff" style={{ marginTop: 40 }} />
        ) : favItems.length === 0 ? (
          <Text style={s.empty}>No saved expressions yet</Text>
        ) : (
          <FlatList
            data={favItems}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={s.card}
                onLongPress={() => handleDeleteFav(item)}
                delayLongPress={400}
                activeOpacity={0.9}
              >
                {/* User text row: text + user voice replay */}
                <View style={s.rowBetween}>
                  <SelectableText style={[s.userText, { flex: 1 }]}>{item.user_text}</SelectableText>
                  {item.user_audio_url ? (
                    <TouchableOpacity onPress={() => playUserAudio(item.user_audio_url!, String(item.id))}>
                      <PlayBtn id={`user-${item.id}`} label="🎙️" />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {item.grammar ? <Text style={s.grammarText}>📝 {item.grammar}</Text> : null}
                {item.native ? <Text style={s.nativeText}>💬 {item.native}</Text> : null}

                {item.ai_reply ? (
                  <>
                    <View style={s.divider} />
                    {/* AI reply + TTS button */}
                    <View style={s.rowBetween}>
                      <SelectableText style={[s.aiReply, { flex: 1 }]}>{item.ai_reply!}</SelectableText>
                      <TouchableOpacity onPress={() => playAiTTS(item.ai_reply!, String(item.id))}>
                        <PlayBtn id={`ai-${item.id}`} label="🔊" />
                      </TouchableOpacity>
                    </View>
                  </>
                ) : null}

                <Text style={s.cardDate}>{formatDate(item.created_at)}</Text>
              </TouchableOpacity>
            )}
          />
        )
      )}

      {/* ── Polish tab ── */}
      {tab === 'polish' && (
        loadingPolish ? (
          <ActivityIndicator color="#00c8ff" style={{ marginTop: 40 }} />
        ) : polishItems.length === 0 ? (
          <Text style={s.empty}>No polish records yet</Text>
        ) : (
          <FlatList
            data={polishItems}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={s.polishCard}
                onLongPress={() => handleDeletePolish(item)}
                delayLongPress={400}
                activeOpacity={0.9}
              >
                <View style={s.polishModeRow}>
                  <View style={[s.modeBadge, item.mode === 'business' ? s.modeBadgeBiz : s.modeBadgeCasual]}>
                    <Text style={[s.modeBadgeText, item.mode === 'business' ? s.modeBadgeTextBiz : s.modeBadgeTextCasual]}>
                      {item.mode === 'business' ? '💼 Business' : '💬 Casual'}
                    </Text>
                  </View>
                  <Text style={s.cardDate}>{formatDate(item.created_at)}</Text>
                </View>

                {/* Original + user voice replay */}
                <View style={s.rowBetween}>
                  <Text style={[s.polishOriginal, { flex: 1 }]}>{item.original}</Text>
                  {item.user_oss_key ? (
                    <TouchableOpacity onPress={() => playUserAudio(item.user_oss_key!, `polish-user-${item.id}`)}>
                      <PlayBtn id={`polish-user-${item.id}`} label="🎙️" />
                    </TouchableOpacity>
                  ) : null}
                </View>

                <View style={s.polishDivider} />

                {/* Polished + TTS */}
                <View style={s.rowBetween}>
                  <SelectableText style={[s.polishResult, { flex: 1 }]}>{item.polished}</SelectableText>
                  <TouchableOpacity onPress={() => playAiTTS(item.polished, `polish-ai-${item.id}`)}>
                    <PlayBtn id={`polish-ai-${item.id}`} label="🔊" />
                  </TouchableOpacity>
                </View>

                {item.explanation ? <Text style={s.polishExplanation}>💡 {item.explanation}</Text> : null}
              </TouchableOpacity>
            )}
          />
        )
      )}
      {/* ── Vocabulary tab ── */}
      {tab === 'vocabulary' && (
        loadingVocab ? (
          <ActivityIndicator color="#00c8ff" style={{ marginTop: 40 }} />
        ) : vocabItems.length === 0 ? (
          <Text style={s.empty}>No vocabulary saved yet</Text>
        ) : (
          <FlatList
            data={vocabItems}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={s.vocabCard}
                onLongPress={() => handleDeleteVocab(item)}
                delayLongPress={400}
                activeOpacity={0.9}
              >
                <SelectableText style={s.vocabWord}>{item.word}</SelectableText>
                <SelectableText style={s.vocabExplanation}>{item.explanation}</SelectableText>
                {item.example ? <Text style={s.vocabExample}>e.g. {item.example}</Text> : null}
                <Text style={s.cardDate}>{formatDate(item.created_at)}</Text>
              </TouchableOpacity>
            )}
          />
        )
      )}
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
  title: { color: '#e2eaf4', fontSize: 17, fontWeight: '600' },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,200,255,0.12)',
  },
  tabBtn: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: '#00c8ff' },
  tabText: { color: '#5a7a99', fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#00c8ff' },
  empty: { color: '#5a7a99', textAlign: 'center', marginTop: 60, fontSize: 15 },
  cardDate: { color: '#5a7a99', fontSize: 11, marginTop: 4 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  playBtn: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,200,255,0.25)',
    backgroundColor: 'rgba(0,200,255,0.06)',
  },
  playBtnActive: { borderColor: '#00c8ff', backgroundColor: 'rgba(0,200,255,0.15)' },
  playBtnText: { fontSize: 14 },
  // Expression cards
  card: {
    backgroundColor: '#0d1e30',
    borderWidth: 1, borderColor: 'rgba(252,211,77,0.2)',
    borderRadius: 14, padding: 14, gap: 6,
  },
  userText: { color: '#e2eaf4', fontSize: 15, fontWeight: '600', lineHeight: 22 },
  grammarText: { color: '#ff9f7f', fontSize: 13, lineHeight: 20 },
  nativeText: { color: '#fcd34d', fontSize: 13, lineHeight: 20 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 4 },
  aiReply: { color: '#a0c4d8', fontSize: 13, lineHeight: 20 },
  // Polish cards
  polishCard: {
    backgroundColor: '#0d1e30',
    borderWidth: 1, borderColor: 'rgba(0,200,255,0.15)',
    borderRadius: 14, padding: 14, gap: 8,
  },
  polishModeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modeBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  modeBadgeCasual: { backgroundColor: 'rgba(0,200,255,0.08)', borderColor: 'rgba(0,200,255,0.3)' },
  modeBadgeBiz: { backgroundColor: 'rgba(167,139,250,0.08)', borderColor: 'rgba(167,139,250,0.3)' },
  modeBadgeText: { fontSize: 11, fontWeight: '600' },
  modeBadgeTextCasual: { color: '#00c8ff' },
  modeBadgeTextBiz: { color: '#a78bfa' },
  polishOriginal: { color: '#5a7a99', fontSize: 13, lineHeight: 20 },
  polishDivider: { height: 1, backgroundColor: 'rgba(0,200,255,0.08)' },
  polishResult: { color: '#e2eaf4', fontSize: 15, lineHeight: 22, fontWeight: '500' },
  polishExplanation: { color: '#5a7a99', fontSize: 12, lineHeight: 18 },
  // Vocabulary cards
  vocabCard: {
    backgroundColor: '#0d1e30',
    borderWidth: 1, borderColor: 'rgba(0,200,255,0.15)',
    borderRadius: 14, padding: 14, gap: 6,
  },
  vocabWord: { color: '#00c8ff', fontSize: 17, fontWeight: '700' },
  vocabExplanation: { color: '#e2eaf4', fontSize: 13, lineHeight: 20 },
  vocabExample: { color: '#fcd34d', fontSize: 12, lineHeight: 18, fontStyle: 'italic' },
});
