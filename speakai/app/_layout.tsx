import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { VocabularyProvider } from '@/context/VocabularyContext';
import { configureGoogleSignin } from '@/services/auth';
import { setAuthToken } from '@/services/api';
import { loadAuthToken } from '@/services/localStore';

configureGoogleSignin();

export default function RootLayout() {
  useEffect(() => {
    loadAuthToken().then(token => {
      if (token) setAuthToken(token);
    });
  }, []);

  return (
    <SafeAreaProvider>
      <VocabularyProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </VocabularyProvider>
    </SafeAreaProvider>
  );
}
