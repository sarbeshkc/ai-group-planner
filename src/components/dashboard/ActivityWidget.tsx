'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface Activity {
  id: string;
  type: string;
  entityType: 'group' | 'plan' | 'task' | 'comment';
  entityId: string;
  entityName: string;
  userId: string;
  userName: string;
  timestamp: any;
  details?: any;
}

interface ActivityWidgetProps {
  size: 'small' | 'medium' | 'large';
}

export default function ActivityWidget({ size }: ActivityWidgetProps) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'mine' | 'team'>('all');
  
  useEffect(() => {
    const fetchActivities = async () => {
      if (!user) return;
      
      try {
        // Define the query based on the selected filter
        let activityQuery;
        
        if (filter === 'mine') {
          // Only activities performed by the current user
          activityQuery = query(
            collection(db, 'activities'),
            where('userId', '==', user.uid),
            orderBy('timestamp', 'desc'),
            limit(size === 'large' ? 20 : 10)
          );
        } else if (filter === 'team') {
          // Activities from teams/groups the user is a member of
          // This would require a more complex query in a real implementation
          // For now, we're just using a simplified version
          activityQuery = query(
            collection(db, 'activities'),
            where('userId', '!=', user.uid),
            orderBy('userId'),
            orderBy('timestamp', 'desc'),
            limit(size === 'large' ? 20 : 10)
          );
        } else {
          // All activities (both user's and team's)
          activityQuery = query(
            collection(db, 'activities'),
            orderBy('timestamp', 'desc'),
            limit(size === 'large' ? 20 : 10)
          );
        }
        
        const snapshot = await getDocs(activityQuery);
        const activityList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Activity[];
        
        setActivities(activityList);
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchActivities();
  }, [user, filter, size]);
  
  // Helper function to get the activity description
  const getActivityDescription = (activity: Activity) => {
    switch (activity.type) {
      case 'create':
        return `created a new ${activity.entityType} "${activity.entityName}"`;
      case 'update':
        return `updated the ${activity.entityType} "${activity.entityName}"`;
      case 'delete':
        return `deleted the ${activity.entityType} "${activity.entityName}"`;
      case 'join':
        return `joined the ${activity.entityType} "${activity.entityName}"`;
      case 'comment_added':
        return `commented on ${activity.entityType} "${activity.entityName}"`;
      case 'status_change':
        return `changed the status of ${activity.entityType} "${activity.entityName}" to ${activity.details?.newStatus || 'a new status'}`;
      case 'task_assigned':
        return `was assigned task "${activity.entityName}"`;
      case 'task_completed':
        return `completed task "${activity.entityName}"`;
      case 'upload':
        return `uploaded a file to ${activity.entityType} "${activity.entityName}"`;
      default:
        return `interacted with ${activity.entityType} "${activity.entityName}"`;
    }
  };
  
  // Helper function to get the activity link
  const getActivityLink = (activity: Activity) => {
    switch (activity.entityType) {
      case 'group':
        return `/groups/${activity.entityId}`;
      case 'plan':
        return `/plans/${activity.entityId}`;
      case 'task':
        return `/tasks/${activity.entityId}`;
      default:
        return '#';
    }
  };
  
  // Helper function to get activity icon
  const getActivityIcon = (activity: Activity) => {
    switch (activity.type) {
      case 'create':
        return (
          <div className="p-1 rounded-full bg-green-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'update':
        return (
          <div className="p-1 rounded-full bg-yellow-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </div>
        );
      case 'delete':
        return (
          <div className="p-1 rounded-full bg-red-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'join':
        return (
          <div className="p-1 rounded-full bg-purple-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
            </svg>
          </div>
        );
      case 'comment_added':
        return (
          <div className="p-1 rounded-full bg-blue-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'status_change':
        return (
          <div className="p-1 rounded-full bg-indigo-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'task_assigned':
      case 'task_completed':
        return (
          <div className="p-1 rounded-full bg-green-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'upload':
        return (
          <div className="p-1 rounded-full bg-pink-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-pink-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="p-1 rounded-full bg-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </div>
        );
    }
  };
  
  if (loading) {
    return (
      <div className="h-full flex justify-center items-center bg-white p-4 rounded-lg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="h-full bg-white p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Activity Feed</h3>
        
        <div className="flex space-x-1 bg-gray-100 rounded-md p-0.5">
          <button
            className={`px-3 py-1 text-xs rounded-md ${filter === 'all' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`px-3 py-1 text-xs rounded-md ${filter === 'mine' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setFilter('mine')}
          >
            My Activity
          </button>
          <button
            className={`px-3 py-1 text-xs rounded-md ${filter === 'team' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setFilter('team')}
          >
            Team
          </button>
        </div>
      </div>
      
      <div 
        className="space-y-3 overflow-y-auto" 
        style={{ maxHeight: size === 'small' ? '200px' : size === 'medium' ? '300px' : '400px' }}
      >
        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No activity to display</p>
          </div>
        ) : (
          activities.map((activity) => (
            <Link
              key={activity.id}
              href={getActivityLink(activity)}
              className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-600">
                  {activity.userName ? activity.userName[0].toUpperCase() : '?'}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">{activity.userName}</span>
                  {' '}
                  {getActivityDescription(activity)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {activity.timestamp && formatDistanceToNow(activity.timestamp.toDate(), { addSuffix: true })}
                </p>
              </div>
              {getActivityIcon(activity)}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}