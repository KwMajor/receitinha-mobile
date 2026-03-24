import { initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// O Firebase Settings com as variáveis de ambiente devem ser configurados no arquivo app.json ("extra").
// Substitua os valores indicados abaixo pelas chaves reais encontradas no seu Console do Firebase:
//
// 1. Acesse o Console do Firebase (https://console.firebase.google.com/)
// 2. Vá em Configurações do Projeto (ícone de engrenagem)
// 3. Procure a seção "Seus apps" (escolha o app web) e copie o objeto de configuração

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || Constants.expoConfig?.extra?.firebaseApiKey || 'SUA_API_KEY_AQUI',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || Constants.expoConfig?.extra?.firebaseAuthDomain || 'SEU_AUTH_DOMAIN_AQUI',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || Constants.expoConfig?.extra?.firebaseProjectId || 'SEU_PROJECT_ID_AQUI',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || Constants.expoConfig?.extra?.firebaseStorageBucket || 'SEU_STORAGE_BUCKET_AQUI',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || Constants.expoConfig?.extra?.firebaseMessagingSenderId || 'SEU_MESSAGING_SENDER_ID_AQUI',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || Constants.expoConfig?.extra?.firebaseAppId || 'SEU_APP_ID_AQUI'
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa e exporta os serviços
export const auth = (() => {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error: any) {
    // Em hot reload o auth pode ja estar inicializado
    if (error?.code === 'auth/already-initialized') {
      return getAuth(app);
    }
    throw error;
  }
})();
export const db = getFirestore(app);
export const storage = getStorage(app);
