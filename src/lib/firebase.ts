import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth'
import type { Firestore } from 'firebase/firestore'
import { firebaseConfig } from '../firebase.config'

const env = import.meta.env

const config = {
  apiKey: env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
}

export const firebaseEnabled = Boolean(config.apiKey && config.projectId && config.appId)

let app: FirebaseApp | null = null
let auth: Auth | null = null
let dbPromise: Promise<Firestore> | null = null

if (firebaseEnabled) {
  app = initializeApp(config)
  auth = getAuth(app)
}

export function getDb(): Promise<Firestore> {
  const configured = app
  if (!configured) throw new Error('Firebase not configured')
  dbPromise ??= import('firebase/firestore').then(m => m.getFirestore(configured))
  return dbPromise
}

export function getFirebaseAuth(): Auth {
  if (!auth) throw new Error('Firebase not configured')
  return auth
}

export function currentUser(): User | null {
  return auth?.currentUser ?? null
}

export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider()
  const res = await signInWithPopup(getFirebaseAuth(), provider)
  return res.user
}

export async function signOutUser(): Promise<void> {
  await fbSignOut(getFirebaseAuth())
}

export function onUserChanged(cb: (user: User | null) => void): () => void {
  if (!auth) return () => {}
  return onAuthStateChanged(auth, cb)
}
