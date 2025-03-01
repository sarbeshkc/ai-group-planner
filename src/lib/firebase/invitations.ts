// src/lib/firebase/invitations.ts
import { 
    collection, 
    addDoc, 
    query, 
    where, 
    getDocs, 
    updateDoc, 
    doc, 
    serverTimestamp, 
    arrayUnion, 
    deleteDoc,
    getDoc
  } from 'firebase/firestore';
  import { db } from './config';
  import { notifyGroupInvite } from './notifications';
  
  // Send invitation to a user
  export const inviteUserToGroup = async (
    groupId: string,
    groupName: string,
    inviterUserId: string,
    inviterName: string,
    recipientEmail: string,
    role: 'admin' | 'member' | 'viewer' = 'member'
  ) => {
    try {
      // Create invitation document
      const invitationRef = await addDoc(collection(db, 'invitations'), {
        groupId,
        groupName,
        inviterUserId,
        inviterName,
        recipientEmail,
        role,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      
      // Try to find the user by email to send a notification
      const userQuery = query(
        collection(db, 'users'),
        where('email', '==', recipientEmail)
      );
      
      const userSnapshot = await getDocs(userQuery);
      
      if (!userSnapshot.empty) {
        // User exists, send them a notification
        const userData = userSnapshot.docs[0].data();
        const userId = userSnapshot.docs[0].id;
        
        await notifyGroupInvite(
          userId,
          groupId,
          groupName,
          inviterName
        );
      }
      
      // Optionally send email notification through a server function
      // ...
      
      return invitationRef.id;
    } catch (error) {
      console.error('Error sending invitation:', error);
      throw error;
    }
  };
  
  // Get all pending invitations for a user
  export const getUserInvitations = async (userEmail: string) => {
    try {
      const invitationsQuery = query(
        collection(db, 'invitations'),
        where('recipientEmail', '==', userEmail),
        where('status', '==', 'pending')
      );
      
      const snapshot = await getDocs(invitationsQuery);
      const invitations: any[] = [];
      
      snapshot.forEach(doc => {
        invitations.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return invitations;
    } catch (error) {
      console.error('Error getting user invitations:', error);
      throw error;
    }
  };
  
  // Accept an invitation
  export const acceptInvitation = async (invitationId: string, userId: string, userName: string) => {
    try {
      // Get the invitation
      const invitationDoc = await doc(db, 'invitations', invitationId);
      const invitationSnapshot = await getDoc(invitationDoc);
      
      if (!invitationSnapshot.exists()) {
        throw new Error('Invitation not found');
      }
      
      const invitation = invitationSnapshot.data();
      
      // Update the group by adding the user
      const groupDoc = doc(db, 'groups', invitation.groupId);
      await updateDoc(groupDoc, {
        members: arrayUnion(userId),
        // If using memberRoles object
        [`memberRoles.${userId}`]: invitation.role
      });
      
      // Update invitation status
      await updateDoc(invitationDoc, {
        status: 'accepted',
        acceptedAt: serverTimestamp(),
        acceptedByUserId: userId
      });
      
      // Create activity log
      await addDoc(collection(db, 'activities'), {
        type: 'join',
        entityType: 'group',
        entityId: invitation.groupId,
        entityName: invitation.groupName,
        userId,
        userName,
        timestamp: serverTimestamp(),
        details: { role: invitation.role }
      });
      
      return invitation.groupId;
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw error;
    }
  };
  
  // Decline an invitation
  export const declineInvitation = async (invitationId: string) => {
    try {
      const invitationDoc = doc(db, 'invitations', invitationId);
      
      // Update invitation status
      await updateDoc(invitationDoc, {
        status: 'declined',
        declinedAt: serverTimestamp()
      });
      
      // Optionally, you could delete it instead
      // await deleteDoc(invitationDoc);
      
      return true;
    } catch (error) {
      console.error('Error declining invitation:', error);
      throw error;
    }
  };