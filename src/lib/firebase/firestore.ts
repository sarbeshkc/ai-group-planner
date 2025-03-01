import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    DocumentData,
    QueryConstraint,
    serverTimestamp,
    addDoc
  } from 'firebase/firestore';
  import { db } from './config';
  
  // Generic function to get a document by ID
  export const getDocumentById = async <T>(
    collectionName: string,
    id: string
  ): Promise<T | null> => {
    try {
      const docRef = doc(db, collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as T;
      } else {
        return null;
      }
    } catch (error) {
      console.error(`Error getting document from ${collectionName}:`, error);
      throw error;
    }
  };
  
  // Generic function to get multiple documents with optional query constraints
  export const getDocuments = async <T>(
    collectionName: string,
    constraints: QueryConstraint[] = []
  ): Promise<T[]> => {
    try {
      const collectionRef = collection(db, collectionName);
      const q = query(collectionRef, ...constraints);
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    } catch (error) {
      console.error(`Error getting documents from ${collectionName}:`, error);
      throw error;
    }
  };
  
  // Create a document with auto-generated ID
  export const createDocument = async <T extends DocumentData>(
    collectionName: string,
    data: T
  ): Promise<string> => {
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      return docRef.id;
    } catch (error) {
      console.error(`Error creating document in ${collectionName}:`, error);
      throw error;
    }
  };
  
  // Create a document with specified ID
  export const createDocumentWithId = async <T extends DocumentData>(
    collectionName: string,
    id: string,
    data: T
  ): Promise<void> => {
    try {
      const docRef = doc(db, collectionName, id);
      await setDoc(docRef, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error(`Error creating document in ${collectionName}:`, error);
      throw error;
    }
  };
  
  // Update a document
  export const updateDocument = async <T extends DocumentData>(
    collectionName: string,
    id: string,
    data: Partial<T>
  ): Promise<void> => {
    try {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error(`Error updating document in ${collectionName}:`, error);
      throw error;
    }
  };
  
  // Delete a document
  export const deleteDocument = async (
    collectionName: string,
    id: string
  ): Promise<void> => {
    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting document in ${collectionName}:`, error);
      throw error;
    }
  };
  
  // Create query constraints for common queries
  export const createQueryConstraints = {
    where: (field: string, operator: any, value: any) => where(field, operator, value),
    orderBy: (field: string, direction: 'asc' | 'desc' = 'asc') => orderBy(field, direction),
    limit: (n: number) => limit(n),
  };