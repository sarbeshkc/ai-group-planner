import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCpzIAAkJ9RzauyRj5zQuKQOauMB6_k3q4",
  authDomain: "ai-group-planner.firebaseapp.com",
  projectId: "ai-group-planner",
  storageBucket: "ai-group-planner.appspot.com", // Corrected this
  messagingSenderId: "959910090888",
  appId: "1:959910090888:web:15def2350a1ffefab7273d",
  measurementId: "G-XZDKDLN2PF"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Initialize Analytics conditionally (only in browser environment)
let analytics = null;
if (typeof window !== 'undefined') {
  // We're in the browser
  isSupported().then(supported => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { app, auth, db, storage, analytics };