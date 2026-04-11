import React, { useRef } from 'react';
import { TextInput, StyleProp, TextStyle, Vibration } from 'react-native';
import { useVocabulary } from '@/context/VocabularyContext';

interface Props {
  children: string;
  style?: StyleProp<TextStyle>;
}

/**
 * Drop-in replacement for read-only Text that supports native selection.
 * When the user holds a selection still for 500ms, vibrates and opens
 * the global vocabulary modal with the selected word/phrase.
 */
export default function SelectableText({ children, style }: Props) {
  const { openVocabulary } = useVocabulary();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSelectionChange = (e: { nativeEvent: { selection: { start: number; end: number } } }) => {
    const { start, end } = e.nativeEvent.selection;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (end > start) {
      timerRef.current = setTimeout(() => {
        const selected = children.slice(start, end).trim();
        if (selected) {
          Vibration.vibrate(40);
          openVocabulary(selected);
        }
      }, 500);
    }
  };

  return (
    <TextInput
      value={children}
      style={[{ padding: 0, backgroundColor: 'transparent' }, style]}
      editable
      multiline
      scrollEnabled={false}
      showSoftInputOnFocus={false}
      onChangeText={() => {}}
      onSelectionChange={handleSelectionChange}
    />
  );
}
