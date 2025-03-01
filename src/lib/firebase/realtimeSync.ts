// src/lib/firebase/realtimeSync.ts
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from './config';

// Set up real-time listening for a specific document
export const subscribeToDocument = <T>(
  collection: string,
  documentId: string,
  callback: (data: T) => void
) => {
  const docRef = doc(db, collection, documentId);
  
  // Return the unsubscribe function
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: documentId, ...snapshot.data() } as unknown as T);
    }
  });
};

// Update a document with optimistic concurrency control
export const updateDocumentSafely = async (
  collection: string,
  documentId: string,
  updates: Record<string, any>,
  lastUpdated?: Date
) => {
  const docRef = doc(db, collection, documentId);
  
  // If lastUpdated is provided, add a condition to prevent overwriting newer changes
  if (lastUpdated) {
    // Get the current document
    const snapshot = await docRef.get();
    const data = snapshot.data();
    
    // Compare timestamps and only update if the document hasn't been changed since lastUpdated
    if (data?.updatedAt && new Date(data.updatedAt.toDate()) > lastUpdated) {
      throw new Error('Document has been modified by another user. Please refresh and try again.');
    }
  }
  
  // Update the document with the new data and update timestamp
  return updateDoc(docRef, {
    ...updates,
    updatedAt: new Date()
  });
};