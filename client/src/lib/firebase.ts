import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// Firebase services - initialized after config is loaded
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let firebaseConfig: FirebaseConfig;

// Initialize Firebase with configuration from server
async function initializeFirebase(): Promise<void> {
  try {
    // Fetch Firebase configuration from server
    const response = await fetch('/api/firebase-config');
    
    if (!response.ok) {
      throw new Error(`Failed to load Firebase config: ${response.statusText}`);
    }
    
    firebaseConfig = await response.json();
    
    // Initialize Firebase
    app = initializeApp(firebaseConfig);
    
    // Initialize Firebase services
    auth = getAuth(app);
    db = getFirestore(app);
    
    // Using production Firebase for all development
    
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    throw error;
  }
}

// Initialize Firebase immediately
const firebaseInitPromise = initializeFirebase();

// Export function to ensure Firebase is initialized
export async function ensureFirebaseInitialized(): Promise<void> {
  await firebaseInitPromise;
}

// Export Firebase services (these will be undefined until initialization completes)
export { app, auth, db, firebaseConfig };

// Export lazy getters that wait for initialization
export const getFirebaseAuth = async (): Promise<Auth> => {
  await firebaseInitPromise;
  return auth;
};

export const getFirebaseDb = async (): Promise<Firestore> => {
  await firebaseInitPromise;
  return db;
};

export const getFirebaseApp = async (): Promise<FirebaseApp> => {
  await firebaseInitPromise;
  return app;
};