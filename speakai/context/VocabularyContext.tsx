import React, { createContext, useContext, useState, useCallback } from 'react';
import VocabularyModal from '@/components/VocabularyModal';

interface VocabularyContextValue {
  openVocabulary: (word: string) => void;
}

const VocabularyContext = createContext<VocabularyContextValue>({ openVocabulary: () => {} });

export function useVocabulary() {
  return useContext(VocabularyContext);
}

export function VocabularyProvider({ children }: { children: React.ReactNode }) {
  const [word, setWord] = useState('');
  const [visible, setVisible] = useState(false);

  const openVocabulary = useCallback((w: string) => {
    setWord(w);
    setVisible(true);
  }, []);

  return (
    <VocabularyContext.Provider value={{ openVocabulary }}>
      {children}
      <VocabularyModal word={word} visible={visible} onClose={() => setVisible(false)} />
    </VocabularyContext.Provider>
  );
}
