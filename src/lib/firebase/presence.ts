// src/lib/firebase/presence.ts
import { ref, onDisconnect, onValue, set, serverTimestamp } from 'firebase/database';
import { getDatabase } from 'firebase/database';
import { app } from './config';

// Initialize Realtime Database
const rtdb = getDatabase(app);

// Set up user presence monitoring
export const setupPresence = (userId: string) => {
  // Create references
  const userStatusRef = ref(rtdb, `/status/${userId}`);
  const isOfflineForDatabase = {
    state: 'offline',
    lastChanged: serverTimestamp(),
  };
  const isOnlineForDatabase = {
    state: 'online',
    lastChanged: serverTimestamp(),
  };

  // Create a reference to the special '.info/connected' path
  const connectedRef = ref(rtdb, '.info/connected');
  
  // When the connection state changes, update the database
  onValue(connectedRef, (snapshot) => {
    if (snapshot.val() === false) {
      return;
    }

    // When we disconnect, update the database
    onDisconnect(userStatusRef)
      .set(isOfflineForDatabase)
      .then(() => {
        // Update to online when connected
        set(userStatusRef, isOnlineForDatabase);
      });
  });

  return userStatusRef;
};

// Listen for presence changes of users in a group
export const subscribeToGroupPresence = (groupId: string, callback: (data: any) => void) => {
  const groupStatusRef = ref(rtdb, `/groups/${groupId}/members`);
  
  return onValue(groupStatusRef, (snapshot) => {
    callback(snapshot.val());
  });
};