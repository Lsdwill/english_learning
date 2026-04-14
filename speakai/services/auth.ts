import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { SERVER_URL } from './api';

const WEB_CLIENT_ID = '125081880513-0g9iqff1eou2u44um74m2pmenf68n089.apps.googleusercontent.com';

export function configureGoogleSignin() {
  GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
}

export interface AuthUser {
  userId: number;
  email: string;
  name: string;
  avatar: string;
  token: string;
}

export async function signInWithGoogle(): Promise<AuthUser> {
  await GoogleSignin.hasPlayServices();
  const userInfo = await GoogleSignin.signIn();
  const idToken = userInfo.data?.idToken;
  if (!idToken) throw new Error('No idToken from Google');

  const res = await fetch(`${SERVER_URL}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) throw new Error(`Auth error ${res.status}`);
  const { token, user } = await res.json();
  return { ...user, token };
}

export async function signOut() {
  await GoogleSignin.signOut();
}
