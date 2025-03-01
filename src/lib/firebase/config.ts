import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { 
  getFirestore, 
  connectFirestoreEmulator, 
  disableNetwork,
  enableNetwork
} from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCpzIAAkJ9RzauyRj5zQuKQOauMB6_k3q4",
  authDomain: "ai-group-planner.firebaseapp.com",
  projectId: "ai-group-planner",
  storageBucket: "ai-group-planner.appspot.com",
  messagingSenderId: "959910090888",
  appId: "1:959910090888:web:15def2350a1ffefab7273d",
  measurementId: "G-XZDKDLN2PF"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Handle ad-blockers by setting up error detection
const handleFirebaseError = (error: any) => {
  console.error('Firebase error:', error);
  
  if (
    error.code === 'failed-precondition' || 
    error.code === 'permission-denied' ||
    error.message?.includes('network error') ||
    error.name === 'FirebaseError'
  ) {
    console.warn('Firebase connection blocked. This might be caused by an ad-blocker or privacy extension.');
    
    // You could show a user-friendly message here
    if (typeof window !== 'undefined') {
      // Only show in browser environment
      const adBlockerMessage = document.getElementById('ad-blocker-message');
      if (adBlockerMessage) {
        adBlockerMessage.style.display = 'block';
      } else {
        // Create a floating message
        const messageDiv = document.createElement('div');
        messageDiv.id = 'ad-blocker-message';
        messageDiv.style.position = 'fixed';
        messageDiv.style.bottom = '20px';
        messageDiv.style.left = '20px';
        messageDiv.style.backgroundColor = '#f8d7da';
        messageDiv.style.color = '#721c24';
        messageDiv.style.padding = '10px 20px';
        messageDiv.style.borderRadius = '5px';
        messageDiv.style.zIndex = '9999';
        messageDiv.style.maxWidth = '400px';
        messageDiv.innerHTML = `
          <p><strong>Connection Issue Detected</strong></p>
          <p>It seems that your ad-blocker or privacy extension is preventing the app from connecting to its database.</p>
          <p>Please disable your ad-blocker or whitelist this site to use all features.</p>
          <button style="background: #721c24; color: white; border: none; padding: 5px 10px; border-radius: 3px; margin-top: 10px;">Dismiss</button>
        `;
        
        document.body.appendChild(messageDiv);
        
        const dismissButton = messageDiv.querySelector('button');
        if (dismissButton) {
          dismissButton.addEventListener('click', () => {
            messageDiv.style.display = 'none';
          });
        }
      }
    }
  }
};

// Set up error listeners
if (typeof window !== 'undefined') {
  // Only in browser environment
  // Using a simpler approach that doesn't rely on enableNetwork
  fetch(`https://${firebaseConfig.projectId}.firebaseio.com/.json`)
    .catch(handleFirebaseError);
}

// Use local emulators when running in development
if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
  // Auth emulator typically runs on port 9099
  connectAuthEmulator(auth, 'http://localhost:9099');
  
  // Firestore emulator typically runs on port 8080
  connectFirestoreEmulator(db, 'localhost', 8080);
  
  // Storage emulator typically runs on port 9199
  connectStorageEmulator(storage, 'localhost', 9199);
  
  console.log('Using Firebase emulators for local development');
}

export { app, auth, db, storage };