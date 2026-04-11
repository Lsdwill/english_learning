import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { explainWord, saveVocabulary } from '@/services/api';

interface Props {
  word: string;
  visible: boolean;
  onClose: () => void;
}

export default function VocabularyModal({ word, visible, onClose }: Props) {
  const [editWord, setEditWord] = useState(word);
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [example, setExample] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const lookup = (w: string) => {
    if (!w.trim()) return;
    setSaved(false);
    setError('');
    setExplanation('');
    setExample('');
    setLoading(true);
    explainWord(w.trim())
      .then(r => { setExplanation(r.explanation); setExample(r.example); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!visible || !word) return;
    setEditWord(word);
    lookup(word);
  }, [visible, word]);

  const handleSave = async () => {
    if (saved) return;
    try {
      await saveVocabulary({ word: editWord.trim(), explanation, example });
      setSaved(true);
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={m.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={m.card} activeOpacity={1} onPress={() => {}}>
          {/* Editable word input */}
          <View style={m.inputRow}>
            <TextInput
              style={m.wordInput}
              value={editWord}
              onChangeText={setEditWord}
              placeholder="Word or phrase…"
              placeholderTextColor="#5a7a99"
              returnKeyType="search"
              onSubmitEditing={() => lookup(editWord)}
            />
            <TouchableOpacity style={m.lookupBtn} onPress={() => lookup(editWord)} disabled={loading}>
              <Text style={m.lookupBtnText}>Look up</Text>
            </TouchableOpacity>
          </View>

          <View style={m.divider} />

          {loading ? (
            <ActivityIndicator color="#00c8ff" style={{ marginVertical: 20 }} />
          ) : error ? (
            <Text style={m.error}>{error}</Text>
          ) : explanation ? (
            <>
              <Text style={m.explanation}>{explanation}</Text>
              {example ? <Text style={m.example}>e.g. {example}</Text> : null}
            </>
          ) : null}

          <View style={m.btnRow}>
            <TouchableOpacity style={m.closeBtn} onPress={onClose}>
              <Text style={m.closeBtnText}>Close</Text>
            </TouchableOpacity>
            {!loading && !error && explanation ? (
              <TouchableOpacity
                style={[m.saveBtn, saved && m.saveBtnSaved]}
                onPress={handleSave}
                disabled={saved}
              >
                <Text style={m.saveBtnText}>{saved ? 'Saved ⭐' : 'Save ☆'}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const m = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  card: {
    width: '100%', backgroundColor: '#0d1e30',
    borderWidth: 1, borderColor: 'rgba(0,200,255,0.2)',
    borderRadius: 16, padding: 20, gap: 12,
  },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  wordInput: {
    flex: 1, color: '#00c8ff', fontSize: 17, fontWeight: '700',
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,200,255,0.3)',
    paddingVertical: 4,
  },
  lookupBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: 'rgba(0,200,255,0.1)',
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,200,255,0.3)',
  },
  lookupBtnText: { color: '#00c8ff', fontSize: 13, fontWeight: '600' },
  divider: { height: 1, backgroundColor: 'rgba(0,200,255,0.12)' },
  explanation: { color: '#e2eaf4', fontSize: 15, lineHeight: 24 },
  example: { color: '#fcd34d', fontSize: 13, lineHeight: 20, fontStyle: 'italic' },
  error: { color: '#ff9f7f', fontSize: 13 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  closeBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  closeBtnText: { color: '#5a7a99', fontSize: 14 },
  saveBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: 'rgba(0,200,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(0,200,255,0.3)',
    alignItems: 'center',
  },
  saveBtnSaved: { backgroundColor: 'rgba(252,211,77,0.1)', borderColor: '#fcd34d' },
  saveBtnText: { color: '#00c8ff', fontSize: 14, fontWeight: '600' },
});
