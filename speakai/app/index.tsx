import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { signInWithGoogle, signOut, type AuthUser } from '@/services/auth';
import { setAuthToken } from '@/services/api';
import { saveAuthToken, clearAuthToken } from '@/services/localStore';

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    try {
      const authUser = await signInWithGoogle();
      setAuthToken(authUser.token);
      await saveAuthToken(authUser.token);
      setUser(authUser);
    } catch (e: any) {
      Alert.alert('Login failed', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#080c14" />

      <View style={s.header}>
        <Text style={s.logo}>◈ SpeakAI</Text>
        <Text style={s.sub}>Your AI English Coach</Text>
        {user ? (
          <View style={s.userRow}>
            <Text style={s.userName}>{user.name}</Text>
            <TouchableOpacity onPress={() => { signOut(); setAuthToken(null); clearAuthToken(); setUser(null); }}>
              <Text style={s.signOut}>Sign out</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[s.googleBtn, loading && { opacity: 0.6 }]} onPress={handleLogin} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.googleBtnText}>🔑 Sign in with Google</Text>
            }
          </TouchableOpacity>
        )}
      </View>

      <View style={s.cards}>
        <EntryCard icon="🎙️" title="Start Conversation" desc="Practice speaking with AI feedback" accent="#00c8ff" onPress={() => router.push('/chat')} />
        <EntryCard icon="🕘" title="History" desc="Review your past conversations" accent="#7b5ea7" onPress={() => router.push('/history')} />
        <EntryCard icon="⭐" title="Favorites" desc="Saved expressions and corrections" accent="#fcd34d" onPress={() => router.push('/favorites')} />
      </View>
    </SafeAreaView>
  );
}

function EntryCard({ icon, title, desc, accent, onPress }: { icon: string; title: string; desc: string; accent: string; onPress: () => void }) {
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
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  userName: { color: '#00c8ff', fontSize: 14 },
  signOut: { color: '#5a7a99', fontSize: 13, textDecorationLine: 'underline' },
  googleBtn: { marginTop: 16, backgroundColor: '#1a73e8', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24 },
  googleBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  cards: { paddingHorizontal: 24, gap: 14 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#0d1e30', borderWidth: 1, borderRadius: 16, padding: 18 },
  iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardIcon: { fontSize: 22 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardDesc: { color: '#5a7a99', fontSize: 13, marginTop: 2 },
  arrow: { fontSize: 24, fontWeight: '300' },
});
