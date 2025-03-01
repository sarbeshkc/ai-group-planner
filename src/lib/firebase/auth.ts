import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut as firebaseSignOut,
    updateProfile,
    sendPasswordResetEmail,
    User,
    UserCredential
  } from 'firebase/auth';
  import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
  import { auth, db } from './config';
  
  // Register a new user
  export const registerUser = async (
    email: string, 
    password: string, 
    displayName: string
  ): Promise<UserCredential> => {
    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update user profile with display name
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName });
        
        // Create user document in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          email,
          displayName,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          role: 'user',
        });
      }
      
      return userCredential;
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  };
  
  // Sign in existing user
  export const signIn = async (
    email: string, 
    password: string
  ): Promise<UserCredential> => {
    try {
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };
  
  // Sign out user
  export const signOut = async (): Promise<void> => {
    try {
      return await firebaseSignOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };
  
  // Send password reset email
  export const resetPassword = async (email: string): Promise<void> => {
    try {
      return await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  };