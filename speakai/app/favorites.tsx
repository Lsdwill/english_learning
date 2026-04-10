import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getFavorites, deleteFavorite, Favorite } from '@/services/api';

export default function FavoritesScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    getFavorites()
      .then(setItems)
      .catch(e => console.warn(e))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = useCallback((id: number) => {
    Alert.alert('Remove', 'Remove this favorite?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: () => {
          deleteFavorite(id)
            .then(() => setItems(prev => prev.filter(f => f.id !== id)))
            .catch(e => console.warn(e));
        },
      },
    ]);
  }, []);

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

      {loading ? (
        <ActivityIndicator color="#00c8ff" style={{ marginTop: 40 }} />
      ) : items.length === 0 ? (
        <Text style={s.empty}>No favorites yet{'\n'}Tap ⭐ during a conversation to save</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => (
            <View style={s.card}>
              {/* User said */}
              <Text style={s.userText}>{item.user_text}</Text>

              {item.native ? (
                <View style={s.row}>
                  <Text style={s.label}>More natural</Text>
                  <Text style={s.nativeText}>{item.native}</Text>
                </View>
              ) : null}

              {item.grammar ? (
                <View style={s.row}>
                  <Text style={s.label}>Grammar</Text>
                  <Text style={s.grammarText}>{item.grammar}</Text>
                </View>
              ) : null}

              {item.ai_reply ? (
                <View style={[s.row, s.aiReplyRow]}>
                  <Text style={s.aiLabel}>AI replied</Text>
                  <Text style={s.aiReplyText}>{item.ai_reply}</Text>
                </View>
              ) : null}

              <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(item.id)}>
                <Text style={s.deleteText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
        />
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
  empty: { color: '#5a7a99', textAlign: 'center', marginTop: 60, fontSize: 15, lineHeight: 24 },
  card: {
    backgroundColor: '#0d1e30',
    borderWidth: 1, borderColor: 'rgba(123,94,167,0.25)',
    borderRadius: 14, padding: 14, gap: 8,
  },
  userText: { color: '#e2eaf4', fontSize: 15, fontWeight: '500', lineHeight: 22 },
  row: { gap: 2 },
  label: { color: '#5a7a99', fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  nativeText: { color: '#fcd34d', fontSize: 13, lineHeight: 20 },
  grammarText: { color: '#6ee7b7', fontSize: 13, lineHeight: 20 },
  aiReplyRow: {
    borderTopWidth: 1, borderTopColor: 'rgba(0,200,255,0.08)',
    paddingTop: 8, marginTop: 2,
  },
  aiLabel: { color: '#5a7a99', fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  aiReplyText: { color: '#a0b8d0', fontSize: 13, lineHeight: 20 },
  deleteBtn: {
    position: 'absolute', top: 12, right: 12,
    width: 24, height: 24, alignItems: 'center', justifyContent: 'center',
  },
  deleteText: { color: '#5a7a99', fontSize: 14 },
});
