import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { polishText, synthesizeSpeech } from '@/services/api';
import { Audio } from 'expo-av';

type Mode = 'casual' | 'business';

export default function PolishScreen() {
  const router = useRouter();
  const { text } = useLocalSearchParams<{ text: string }>();

  const [mode, setMode] = useState<Mode>('casual');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ result: string; explanation: string } | null>(null);
  const [error, setError] = useState('');

  const handlePolish = useCallback(async (selectedMode: Mode) => {
    if (!text) return;
    setMode(selectedMode);
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const r = await polishText(text, selectedMode);
      setResult(r);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [text]);

  const playTTS = useCallback(async (t: string) => {
    try {
      const uri = await synthesizeSpeech(t);
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false });
      const { sound } = await Audio.Sound.createAsync({ uri });
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate(s => {
        if (s.isLoaded && s.didJustFinish) sound.unloadAsync();
      });
    } catch (e) { console.warn('TTS error', e); }
  }, []);

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#080c14" />

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Polish</Text>
        <View style={{ minWidth: 60 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* Original */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>ORIGINAL</Text>
          <View style={s.originalBox}>
            <Text style={s.originalText}>{text}</Text>
          </View>
        </View>

        {/* Mode selector */}
        <View style={s.modeRow}>
          <TouchableOpacity
            style={[s.modeBtn, mode === 'casual' && s.modeBtnActive]}
            onPress={() => handlePolish('casual')}
          >
            <Text style={[s.modeBtnText, mode === 'casual' && s.modeBtnTextActive]}>
              💬 Casual
            </Text>
            <Text style={s.modeDesc}>Friendly & natural</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.modeBtn, mode === 'business' && s.modeBtnActiveBiz]}
            onPress={() => handlePolish('business')}
          >
            <Text style={[s.modeBtnText, mode === 'business' && s.modeBtnTextActiveBiz]}>
              💼 Business
            </Text>
            <Text style={s.modeDesc}>Professional & formal</Text>
          </TouchableOpacity>
        </View>

        {/* Result */}
        {loading && (
          <ActivityIndicator color="#00c8ff" style={{ marginTop: 32 }} />
        )}

        {error ? (
          <Text style={s.errorText}>{error}</Text>
        ) : null}

        {result && !loading && (
          <View style={s.resultSection}>
            <Text style={s.sectionLabel}>POLISHED</Text>
            <View style={[s.resultBox, mode === 'business' ? s.resultBoxBiz : s.resultBoxCasual]}>
              <Text style={[s.resultText, mode === 'business' ? s.resultTextBiz : s.resultTextCasual]}>
                {result.result}
              </Text>
              <TouchableOpacity
                style={s.playBtn}
                onPress={() => playTTS(result.result)}
              >
                <Text style={s.playIcon}>🔊</Text>
              </TouchableOpacity>
            </View>

            <View style={s.explanationBox}>
              <Text style={s.explanationIcon}>💡</Text>
              <Text style={s.explanationText}>{result.explanation}</Text>
            </View>
          </View>
        )}

        {/* Prompt to select mode if no result yet */}
        {!result && !loading && !error && (
          <Text style={s.hint}>Select a mode above to polish your sentence</Text>
        )}
      </ScrollView>
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
  content: { padding: 20, gap: 20 },
  section: { gap: 8 },
  sectionLabel: {
    color: '#5a7a99', fontSize: 11, fontWeight: '600',
    letterSpacing: 1, textTransform: 'uppercase',
  },
  originalBox: {
    backgroundColor: '#0a1f35',
    borderWidth: 1, borderColor: 'rgba(123,94,167,0.25)',
    borderRadius: 12, padding: 14,
  },
  originalText: { color: '#e2eaf4', fontSize: 15, lineHeight: 22 },
  modeRow: { flexDirection: 'row', gap: 12 },
  modeBtn: {
    flex: 1, padding: 16, borderRadius: 14,
    backgroundColor: '#0d1520',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', gap: 4,
  },
  modeBtnActive: {
    borderColor: '#00c8ff',
    backgroundColor: 'rgba(0,200,255,0.08)',
  },
  modeBtnActiveBiz: {
    borderColor: '#a78bfa',
    backgroundColor: 'rgba(167,139,250,0.08)',
  },
  modeBtnText: { color: '#5a7a99', fontSize: 15, fontWeight: '600' },
  modeBtnTextActive: { color: '#00c8ff' },
  modeBtnTextActiveBiz: { color: '#a78bfa' },
  modeDesc: { color: '#5a7a99', fontSize: 11 },
  resultSection: { gap: 12 },
  resultBox: {
    borderWidth: 1, borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
  },
  resultBoxCasual: {
    backgroundColor: 'rgba(0,200,255,0.06)',
    borderColor: 'rgba(0,200,255,0.25)',
  },
  resultBoxBiz: {
    backgroundColor: 'rgba(167,139,250,0.06)',
    borderColor: 'rgba(167,139,250,0.25)',
  },
  resultText: { flex: 1, fontSize: 16, lineHeight: 24, fontWeight: '500' },
  resultTextCasual: { color: '#e2eaf4' },
  resultTextBiz: { color: '#e2eaf4' },
  playBtn: {
    borderWidth: 1, borderColor: 'rgba(0,200,255,0.2)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  playIcon: { fontSize: 14 },
  explanationBox: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10, padding: 12,
  },
  explanationIcon: { fontSize: 14 },
  explanationText: { flex: 1, color: '#5a7a99', fontSize: 13, lineHeight: 20 },
  errorText: { color: '#ff6b6b', textAlign: 'center', marginTop: 20 },
  hint: { color: '#5a7a99', textAlign: 'center', marginTop: 32, fontSize: 14 },
});
