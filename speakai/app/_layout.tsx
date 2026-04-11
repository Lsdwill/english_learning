import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { VocabularyProvider } from '@/context/VocabularyContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <VocabularyProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </VocabularyProvider>
    </SafeAreaProvider>
  );
}
