import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Alert,
  StyleSheet, StatusBar, ActivityIndicator, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  getSessions, getMessages, deleteSession, updateSessionPreview,
  LocalSession, LocalMessage,
} from '@/services/localStore';

export default function HistoryScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<LocalSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, LocalMessage[]>>({});

  // Rename modal state
  const [renaming, setRenaming] = useState<LocalSession | null>(null);
  const [renameText, setRenameText] = useState('');

  useEffect(() => {
    getSessions()
      .then(setSessions)
      .catch(e => console.warn(e))
      .finally(() => setLoading(false));
  }, []);

  const toggleSession = useCallback(async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!detail[id]) {
      const msgs = await getMessages(id).catch(() => []);
      setDetail(prev => ({ ...prev, [id]: msgs }));
    }
  }, [expanded, detail]);

  const handleLongPress = useCallback((item: LocalSession) => {
    Alert.alert(
      item.preview || 'Conversation',
      'What would you like to do?',
      [
        {
          text: 'Rename',
          onPress: () => { setRenaming(item); setRenameText(item.preview || ''); },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Delete', 'Delete this conversation?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                  await deleteSession(item.id);
                  setSessions(prev => prev.filter(s => s.id !== item.id));
                  if (expanded === item.id) setExpanded(null);
                },
              },
            ]);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [expanded]);

  const confirmRename = useCallback(async () => {
    if (!renaming) return;
    const trimmed = renameText.trim();
    if (!trimmed) { setRenaming(null); return; }
    await updateSessionPreview(renaming.id, trimmed);
    setSessions(prev => prev.map(s => s.id === renaming.id ? { ...s, preview: trimmed } : s));
    setRenaming(null);
  }, [renaming, renameText]);

  const formatDate = (s: string) => {
    const d = new Date(s);
    return d.toLocaleString('en-US', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#080c14" />

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>History</Text>
        <View style={{ minWidth: 60 }} />
      </View>

      {loading ? (
        <ActivityIndicator color="#00c8ff" style={{ marginTop: 40 }} />
      ) : sessions.length === 0 ? (
        <Text style={s.empty}>No conversations yet</Text>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => (
            <View style={s.card}>
              <TouchableOpacity
                style={s.cardHeader}
                onPress={() => toggleSession(item.id)}
                onLongPress={() => handleLongPress(item)}
                delayLongPress={400}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle} numberOfLines={1}>
                    {item.preview || 'New Conversation'}
                  </Text>
                  <Text style={s.cardDate}>{formatDate(item.created_at)}</Text>
                </View>
                <Text style={[s.chevron, expanded === item.id && s.chevronOpen]}>›</Text>
              </TouchableOpacity>

              {expanded === item.id && (
                <View style={s.messages}>
                  {(detail[item.id] ?? []).map(msg => (
                    <View key={msg.id} style={[s.msgRow, msg.role === 'ai' ? s.aiRow : s.userRow]}>
                      <View style={[s.bubble, msg.role === 'ai' ? s.aiBubble : s.userBubble]}>
                        <Text style={s.msgText}>{msg.text}</Text>
                        {msg.native ? (
                          <Text style={s.nativeText}>↳ {msg.native}</Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                  <TouchableOpacity
                    style={s.continueBtn}
                    onPress={() => router.push({ pathname: '/chat', params: { sessionId: item.id } })}
                  >
                    <Text style={s.continueBtnText}>Continue conversation ›</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}

      {/* Rename modal */}
      <Modal visible={!!renaming} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Rename</Text>
            <TextInput
              style={s.input}
              value={renameText}
              onChangeText={setRenameText}
              autoFocus
              placeholderTextColor="#5a7a99"
              placeholder="Enter title…"
              selectionColor="#00c8ff"
            />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalBtn} onPress={() => setRenaming(null)}>
                <Text style={s.modalBtnCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, s.modalBtnConfirm]} onPress={confirmRename}>
                <Text style={s.modalBtnConfirmText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  empty: { color: '#5a7a99', textAlign: 'center', marginTop: 60, fontSize: 15 },
  card: {
    backgroundColor: '#0d1e30',
    borderWidth: 1, borderColor: 'rgba(123,94,167,0.25)',
    borderRadius: 14, overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, gap: 8,
  },
  cardTitle: { color: '#e2eaf4', fontSize: 15, fontWeight: '600' },
  cardDate: { color: '#5a7a99', fontSize: 11, marginTop: 3 },
  chevron: { color: '#7b5ea7', fontSize: 22 },
  chevronOpen: { transform: [{ rotate: '90deg' }] },
  messages: { borderTopWidth: 1, borderTopColor: 'rgba(0,200,255,0.08)', padding: 12, gap: 8 },
  msgRow: { flexDirection: 'row' },
  aiRow: { justifyContent: 'flex-start' },
  userRow: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '85%', borderRadius: 12, padding: 10 },
  aiBubble: { backgroundColor: '#0a1525', borderWidth: 1, borderColor: 'rgba(0,200,255,0.12)' },
  userBubble: { backgroundColor: '#0a1f35', borderWidth: 1, borderColor: 'rgba(123,94,167,0.25)' },
  msgText: { color: '#e2eaf4', fontSize: 13, lineHeight: 20 },
  nativeText: { color: '#fcd34d', fontSize: 12, marginTop: 4 },
  continueBtn: {
    marginTop: 10, alignSelf: 'flex-end',
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: 'rgba(0,200,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(0,200,255,0.25)',
    borderRadius: 10,
  },
  continueBtnText: { color: '#00c8ff', fontSize: 13, fontWeight: '600' },
  // Modal
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center',
  },
  modal: {
    backgroundColor: '#0d1520', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(0,200,255,0.2)',
    padding: 24, width: '80%', gap: 16,
  },
  modalTitle: { color: '#e2eaf4', fontSize: 16, fontWeight: '600' },
  input: {
    backgroundColor: '#0a1f35',
    borderWidth: 1, borderColor: 'rgba(0,200,255,0.2)',
    borderRadius: 10, padding: 12,
    color: '#e2eaf4', fontSize: 15,
  },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  modalBtnCancel: { color: '#5a7a99', fontSize: 14 },
  modalBtnConfirm: { backgroundColor: 'rgba(0,200,255,0.12)', borderWidth: 1, borderColor: 'rgba(0,200,255,0.3)' },
  modalBtnConfirmText: { color: '#00c8ff', fontSize: 14, fontWeight: '600' },
});
