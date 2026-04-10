import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export type Message =
  | { type: 'userTurn'; text: string; grammar: string; native: string; favorited?: boolean; onReplay?: () => void; onPlayNative?: () => void; onFavorite?: () => Promise<void> | void; onPolish?: () => void }
  | { type: 'ai'; text: string; onPlay?: () => void }
  | { type: 'thinking' };

interface Props { message: Message }

export default function ChatBubble({ message }: Props) {
  if (message.type === 'thinking') {
    return (
      <View style={styles.aiRow}>
        <View style={styles.avatar}><Text style={styles.avatarText}>AI</Text></View>
        <View style={[styles.aiBubble, { opacity: 0.6 }]}>
          <Text style={styles.mutedText}>Thinking…</Text>
        </View>
      </View>
    );
  }

  if (message.type === 'ai') {
    return (
      <View style={styles.aiRow}>
        <View style={styles.avatar}><Text style={styles.avatarText}>AI</Text></View>
        <View style={styles.aiBubble}>
          <Text style={styles.aiText}>{message.text}</Text>
          <TouchableOpacity onPress={message.onPlay} style={styles.playBtn}>
            <Text style={styles.playIcon}>🔊</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (message.type === 'userTurn') {
    const [favorited, setFavorited] = useState(message.favorited ?? false);

    const handleFavPress = async () => {
      const next = !favorited;
      setFavorited(next);
      try {
        await message.onFavorite?.();
      } catch (_) {
        setFavorited(!next); // revert on error
      }
    };

    return (
      <View style={styles.userRow}>
        <View style={styles.userCard}>
          {/* Speech line */}
          <View style={styles.speechRow}>
            <Text style={styles.userText}>{message.text}</Text>
            <TouchableOpacity onPress={message.onReplay} style={styles.playBtn} disabled={!message.onReplay}>
              <Text style={[styles.playIcon, !message.onReplay && { opacity: 0.3 }]}>🔊</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleFavPress} style={styles.playBtn}>
              <Text style={[styles.playIcon, favorited && styles.favoritedIcon]}>
                {favorited ? '⭐' : '☆'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Grammar */}
          <View style={styles.feedbackRow}>
            <Text style={styles.feedbackIcon}>✦</Text>
            <Text style={styles.correctionText} numberOfLines={0}>
              <Text style={styles.label}>Grammar: </Text>{message.grammar}
            </Text>
          </View>

          {/* More natural */}
          <View style={styles.feedbackRow}>
            <Text style={styles.feedbackIcon}>◆</Text>
            <View style={{ flex: 1 }}>
              <TouchableOpacity onPress={message.onPolish} activeOpacity={0.7}>
                <Text style={styles.nativeText} numberOfLines={0}>
                  <Text style={styles.label}>More natural: </Text>
                  <Text style={styles.nativeText}>{message.native}</Text>
                  <Text style={styles.polishHint}> ›</Text>
                </Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                <TouchableOpacity onPress={message.onPlayNative} style={styles.playBtn}>
                  <Text style={styles.playIcon}>🔊</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={message.onPolish} style={[styles.playBtn, styles.polishBtn]}>
                  <Text style={styles.polishBtnText}>Polish ✦</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return null;
}

const C = {
  aiBubble: '#0d1e30',
  userBubble: '#0a1f35',
  accent2: '#7b5ea7',
  text: '#e2eaf4',
  muted: '#5a7a99',
  green: '#6ee7b7',
  yellow: '#fcd34d',
  border: 'rgba(0,200,255,0.12)',
  purpleBorder: 'rgba(123,94,167,0.25)',
  divider: 'rgba(123,94,167,0.2)',
};

const styles = StyleSheet.create({
  aiRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginBottom: 16, paddingHorizontal: 16,
  },
  userRow: {
    alignItems: 'flex-end',
    marginBottom: 16, paddingHorizontal: 16,
  },
  avatar: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: C.accent2,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10, flexShrink: 0,
  },
  avatarText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  aiBubble: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.aiBubble,
    borderWidth: 1, borderColor: 'rgba(0,200,255,0.15)',
    borderRadius: 14, padding: 12, gap: 8,
  },
  aiText: { flex: 1, color: C.text, fontSize: 15, lineHeight: 22 },
  mutedText: { color: C.muted, fontSize: 15 },

  // User card — single bubble with speech + feedback
  userCard: {
    backgroundColor: C.userBubble,
    borderWidth: 1, borderColor: C.purpleBorder,
    borderRadius: 14, padding: 12,
    width: '92%',
  },
  speechRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8,
  },
  userText: { flex: 1, color: C.text, fontSize: 15, lineHeight: 22 },
  divider: {
    height: 1, backgroundColor: C.divider, marginBottom: 8,
  },
  feedbackRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 6,
  },
  feedbackIcon: { color: C.muted, fontSize: 10, marginTop: 4, flexShrink: 0 },
  correctionText: { flex: 1, color: C.green, fontSize: 13, lineHeight: 20, flexWrap: 'wrap' },
  nativeText: { flex: 1, color: C.yellow, fontSize: 13, lineHeight: 20, flexWrap: 'wrap' },
  label: { fontWeight: '700' },
  polishHint: { color: '#00c8ff', fontSize: 13 },
  polishBtn: {
    backgroundColor: 'rgba(0,200,255,0.08)',
    borderColor: 'rgba(0,200,255,0.3)',
  },
  polishBtnText: { color: '#00c8ff', fontSize: 12 },
  playBtn: {
    borderWidth: 1, borderColor: C.border,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    flexShrink: 0,
  },
  playIcon: { fontSize: 14 },
  favoritedIcon: { color: '#fcd34d' },
});
