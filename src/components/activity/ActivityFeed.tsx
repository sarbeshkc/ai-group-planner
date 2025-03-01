// src/components/activity/ActivityFeed.tsx
'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  type: 'create' | 'update' | 'delete' | 'comment' | 'status_change';
  entityType: 'group' | 'plan' | 'task' | 'message';
  entityId: string;
  entityName: string;
  userId: string;
  userName: string;
  timestamp: any;
  details?: any;
}

interface ActivityFeedProps {
  groupId?: string;
  userId?: string;
  limit?: number;
}

export default function ActivityFeed({ groupId, userId, limit: itemLimit = 10 }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Build the query based on provided filters
    let activityQuery = query(
      collection(db, 'activities'),
      orderBy('timestamp', 'desc'),
      limit(itemLimit)
    );
    
    // Filter by group if specified
    if (groupId) {
      activityQuery = query(
        activityQuery,
        where('groupId', '==', groupId)
      );
    }
    
    // Filter by user if specified
    if (userId) {
      activityQuery = query(
        activityQuery,
        where('userId', '==', userId)
      );
    }
    
    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(activityQuery, (snapshot) => {
      const activityList: Activity[] = [];
      snapshot.forEach(doc => {
        activityList.push({ id: doc.id, ...doc.data() } as Activity);
      });
      setActivities(activityList);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [groupId, userId, itemLimit]);

  // Helper function to render activity description
  const getActivityDescription = (activity: Activity) => {
    switch (activity.type) {
      case 'create':
        return `created a new ${activity.entityType}: ${activity.entityName}`;
      case 'update':
        return `updated the ${activity.entityType}: ${activity.entityName}`;
      case 'delete':
        return `deleted the ${activity.entityType}: ${activity.entityName}`;
      case 'comment':
        return `commented on ${activity.entityType}: ${activity.entityName}`;
      case 'status_change':
        return `changed the status of ${activity.entityType}: ${activity.entityName} to ${activity.details?.newStatus}`;
      default:
        return `interacted with ${activity.entityType}: ${activity.entityName}`;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="border-b border-gray-200 px-4 py-3 bg-gray-50">
        <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
      </div>
      
      {activities.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          No recent activity to display.
        </div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {activities.map(activity => (
            <li key={activity.id} className="px-4 py-3 hover:bg-gray-50">
              <div className="flex space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-medium">
                      {activity.userName ? activity.userName[0].toUpperCase() : '?'}
                    </span>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.userName}
                  </p>
                  <p className="text-sm text-gray-500">
                    {getActivityDescription(activity)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDistanceToNow(activity.timestamp.toDate(), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}