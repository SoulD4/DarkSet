import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Só inicializa quando as variáveis de ambiente estão presentes
// (evita crash durante pre-render do Next.js sem .env configurado)
const getApp = (): FirebaseApp => {
  if (getApps().length > 0) return getApps()[0];
  if (!firebaseConfig.apiKey) {
    // Durante build sem .env: retorna app vazio para não quebrar imports
    return initializeApp({ apiKey: 'placeholder', projectId: 'placeholder', appId: 'placeholder' });
  }
  return initializeApp(firebaseConfig);
};

const app      = getApp();
const auth     = getAuth(app);
const db       = getFirestore(app);
const provider = new GoogleAuthProvider();

export { app, auth, db, provider };
