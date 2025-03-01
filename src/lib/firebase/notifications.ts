// src/lib/firebase/notifications.ts
import { collection, addDoc, query, where, orderBy, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';

export type NotificationType = 
  | 'task_assigned' 
  | 'task_updated'
  | 'task_completed'
  | 'plan_created'
  | 'plan_updated'
  | 'comment_added'
  | 'mention'
  | 'group_invite'
  | 'deadline_approaching';

export interface Notification {
  id: string;
  type: NotificationType;
  userId: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: any;
  metadata?: Record<string, any>;
}

// Create a new notification
export const createNotification = async (
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string,
  metadata?: Record<string, any>
) => {
  try {
    const notificationData = {
      userId,
      type,
      title,
      message,
      link,
      read: false,
      createdAt: serverTimestamp(),
      metadata
    };
    
    const docRef = await addDoc(collection(db, 'notifications'), notificationData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Get unread notifications for a user
export const getUnreadNotifications = async (userId: string) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Notification[];
  } catch (error) {
    console.error('Error getting unread notifications:', error);
    throw error;
  }
};

// Get all notifications for a user
export const getAllNotifications = async (userId: string, limit = 50) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limit)
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Notification[];
  } catch (error) {
    console.error('Error getting all notifications:', error);
    throw error;
  }
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId: string) => {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true,
      readAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (userId: string) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );
    
    const snapshot = await getDocs(q);
    
    const batch = db.batch();
    
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        read: true,
        readAt: serverTimestamp()
      });
    });
    
    await batch.commit();
    
    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

// Generate task notifications
export const notifyTaskAssigned = async (taskId: string, taskTitle: string, assigneeId: string, assignerName: string) => {
  return createNotification(
    assigneeId,
    'task_assigned',
    'New Task Assigned',
    `${assignerName} assigned you a new task: ${taskTitle}`,
    `/tasks/${taskId}`,
    { taskId, assignerName }
  );
};

export const notifyTaskUpdated = async (taskId: string, taskTitle: string, assigneeId: string, updaterName: string) => {
  return createNotification(
    assigneeId,
    'task_updated',
    'Task Updated',
    `${updaterName} updated the task: ${taskTitle}`,
    `/tasks/${taskId}`,
    { taskId, updaterName }
  );
};

export const notifyTaskCompleted = async (taskId: string, taskTitle: string, creatorId: string, completerName: string) => {
  return createNotification(
    creatorId,
    'task_completed',
    'Task Completed',
    `${completerName} completed the task: ${taskTitle}`,
    `/tasks/${taskId}`,
    { taskId, completerName }
  );
};

export const notifyDeadlineApproaching = async (
  userId: string, 
  taskId: string, 
  taskTitle: string, 
  daysRemaining: number
) => {
  return createNotification(
    userId,
    'deadline_approaching',
    'Deadline Approaching',
    `Task "${taskTitle}" is due in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`,
    `/tasks/${taskId}`,
    { taskId, daysRemaining }
  );
};