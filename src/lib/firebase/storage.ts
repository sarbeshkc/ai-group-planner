// src/lib/firebase/storage.ts
import { ref, uploadBytesResumable, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { collection, addDoc, serverTimestamp, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { storage, db } from './config';

export interface FileMetadata {
  id: string;
  name: string;
  path: string;
  type: string;
  size: number;
  url: string;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: any;
  entityType: 'group' | 'plan' | 'task';
  entityId: string;
}

// Upload a file and store its metadata
export const uploadFile = async (
  file: File,
  entityType: 'group' | 'plan' | 'task',
  entityId: string,
  userId: string,
  userName: string,
  onProgress?: (progress: number) => void
): Promise<FileMetadata> => {
  try {
    // Create a reference to the file in Firebase Storage
    const path = `${entityType}s/${entityId}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, path);
    
    // Upload the file
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    // Return a promise that resolves when the upload is complete
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Report upload progress if a callback was provided
          if (onProgress) {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress(progress);
          }
        },
        (error) => {
          // Handle upload errors
          console.error('Error uploading file:', error);
          reject(error);
        },
        async () => {
          // Upload completed successfully
          try {
            // Get the download URL
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            
            // Store metadata in Firestore
            const fileData = {
              name: file.name,
              path,
              type: file.type,
              size: file.size,
              url,
              uploadedBy: userId,
              uploadedByName: userName,
              uploadedAt: serverTimestamp(),
              entityType,
              entityId
            };
            
            const docRef = await addDoc(collection(db, 'files'), fileData);
            
            // Create activity record
            await addDoc(collection(db, 'activities'), {
              type: 'upload',
              entityType,
              entityId,
              entityName: file.name,
              userId,
              userName,
              timestamp: serverTimestamp(),
              details: { fileId: docRef.id, fileType: file.type }
            });
            
            // Resolve with file metadata including the document ID
            resolve({
              id: docRef.id,
              ...fileData,
              // Fix timestamp for immediate use
              uploadedAt: new Date()
            } as FileMetadata);
          } catch (error) {
            console.error('Error saving file metadata:', error);
            reject(error);
          }
        }
      );
    });
  } catch (error) {
    console.error('Error in uploadFile:', error);
    throw error;
  }
};

// Get files for an entity
export const getEntityFiles = async (
  entityType: 'group' | 'plan' | 'task',
  entityId: string
): Promise<FileMetadata[]> => {
  try {
    const q = query(
      collection(db, 'files'),
      where('entityType', '==', entityType),
      where('entityId', '==', entityId)
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FileMetadata[];
  } catch (error) {
    console.error('Error getting entity files:', error);
    throw error;
  }
};

// Delete a file
export const deleteFile = async (fileId: string, userId: string): Promise<boolean> => {
  try {
    // Get file metadata
    const fileDoc = await getDoc(doc(db, 'files', fileId));
    
    if (!fileDoc.exists()) {
      throw new Error('File not found');
    }
    
    const fileData = fileDoc.data() as FileMetadata;
    
    // Check if user has permission (file uploader or with admin role)
    if (fileData.uploadedBy !== userId) {
      // For more complex permission checks, you would verify group/plan admin status here
      // For now, we simply check if the user is the one who uploaded the file
      throw new Error('Permission denied');
    }
    
    // Delete the file from Storage
    const storageRef = ref(storage, fileData.path);
    await deleteObject(storageRef);
    
    // Delete metadata from Firestore
    await deleteDoc(doc(db, 'files', fileId));
    
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

