import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#080c14" />

      <View style={s.header}>
        <Text style={s.logo}>◈ SpeakAI</Text>
        <Text style={s.sub}>Your AI English Coach</Text>
      </View>

      <View style={s.cards}>
        <EntryCard
          icon="🎙️"
          title="Start Conversation"
          desc="Practice speaking with AI feedback"
          accent="#00c8ff"
          onPress={() => router.push('/chat')}
        />
        <EntryCard
          icon="🕘"
          title="History"
          desc="Review your past conversations"
          accent="#7b5ea7"
          onPress={() => router.push('/history')}
        />
        <EntryCard
          icon="⭐"
          title="Favorites"
          desc="Saved expressions and corrections"
          accent="#fcd34d"
          onPress={() => router.push('/favorites')}
        />
      </View>
    </SafeAreaView>
  );
}

function EntryCard({
  icon, title, desc, accent, onPress,
}: {
  icon: string; title: string; desc: string; accent: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[s.card, { borderColor: accent + '33' }]} onPress={onPress} activeOpacity={0.75}>
      <View style={[s.iconBox, { backgroundColor: accent + '1a' }]}>
        <Text style={s.cardIcon}>{icon}</Text>
      </View>
      <View style={s.cardText}>
        <Text style={[s.cardTitle, { color: accent }]}>{title}</Text>
        <Text style={s.cardDesc}>{desc}</Text>
      </View>
      <Text style={[s.arrow, { color: accent }]}>›</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#080c14' },
  header: { alignItems: 'center', paddingTop: 60, paddingBottom: 48 },
  logo: { color: '#00c8ff', fontSize: 28, fontWeight: '700', letterSpacing: 2 },
  sub: { color: '#5a7a99', fontSize: 14, marginTop: 8, letterSpacing: 0.5 },
  cards: { paddingHorizontal: 24, gap: 14 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#0d1e30',
    borderWidth: 1, borderRadius: 16,
    padding: 18,
  },
  iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardIcon: { fontSize: 22 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardDesc: { color: '#5a7a99', fontSize: 13, marginTop: 2 },
  arrow: { fontSize: 24, fontWeight: '300' },
});
