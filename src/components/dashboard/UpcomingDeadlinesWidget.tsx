'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import Link from 'next/link';
import { 
  CalendarIcon, 
  ExclamationCircleIcon 
} from '@heroicons/react/24/outline';

interface UpcomingDeadlinesWidgetProps {
  size: 'small' | 'medium' | 'large';
}

interface Deadline {
  id: string;
  title: string;
  dueDate: any;
  priority: 'high' | 'medium' | 'low';
  entityType: 'task' | 'plan';
  entityId: string;
  planId?: string;
  planName?: string;
  groupName?: string;
}

export default function UpcomingDeadlinesWidget({ size }: UpcomingDeadlinesWidgetProps) {
  const { user } = useAuth();
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchDeadlines = async () => {
      if (!user) return;
      
      try {
        // Get upcoming task deadlines assigned to the user
        const tasksQuery = query(
          collection(db, 'tasks'),
          where('assignedTo', '==', user.uid),
          where('status', '!=', 'completed'),
          orderBy('dueDate'),
          limit(5)
        );
        
        // Get upcoming plan deadlines
        const plansQuery = query(
          collection(db, 'plans'),
          where('createdBy', '==', user.uid),
          where('status', '!=', 'completed'),
          orderBy('endDate'),
          limit(5)
        );
        
        const [tasksSnapshot, plansSnapshot] = await Promise.all([
          getDocs(tasksQuery),
          getDocs(plansQuery)
        ]);
        
        // Process task deadlines
        const taskDeadlines: Deadline[] = [];
        for (const docSnapshot of tasksSnapshot.docs) {
          const taskData = docSnapshot.data();
          
          // Skip tasks without due dates
          if (!taskData.dueDate) continue;
          
          // Get plan and group details
          let planName = 'Unknown Plan';
          let groupName = 'Unknown Group';
          
          try {
            if (taskData.planId) {
              const planDocRef = doc(db, 'plans', taskData.planId);
              const planDocSnapshot = await getDoc(planDocRef);
              if (planDocSnapshot.exists()) {
                const planData = planDocSnapshot.data();
                planName = planData.title || 'Unknown Plan';
                
                if (planData.groupId) {
                  const groupDocRef = doc(db, 'groups', planData.groupId);
                  const groupDocSnapshot = await getDoc(groupDocRef);
                  if (groupDocSnapshot.exists()) {
                    const groupData = groupDocSnapshot.data();
                    groupName = groupData.name || 'Unknown Group';
                  }
                }
              }
            }
          } catch (error) {
            console.error('Error fetching plan/group details:', error);
          }
          
          taskDeadlines.push({
            id: docSnapshot.id,
            title: taskData.title,
            dueDate: taskData.dueDate,
            priority: taskData.priority || 'medium',
            entityType: 'task',
            entityId: docSnapshot.id,
            planId: taskData.planId,
            planName,
            groupName
          });
        }
        
        // Process plan deadlines
        const planDeadlines: Deadline[] = [];
        for (const docSnapshot of plansSnapshot.docs) {
          const planData = docSnapshot.data();
          
          // Skip plans without end dates
          if (!planData.endDate) continue;
          
          // Get group details
          let groupName = 'Unknown Group';
          
          try {
            if (planData.groupId) {
              const groupDocRef = doc(db, 'groups', planData.groupId);
              const groupDocSnapshot = await getDoc(groupDocRef);
              if (groupDocSnapshot.exists()) {
                const groupData = groupDocSnapshot.data();
                groupName = groupData.name || 'Unknown Group';
              }
            }
          } catch (error) {
            console.error('Error fetching group details:', error);
          }
          
          planDeadlines.push({
            id: docSnapshot.id,
            title: planData.title,
            dueDate: planData.endDate,
            priority: 'medium', // Plans don't have priority, default to medium
            entityType: 'plan',
            entityId: docSnapshot.id,
            groupName
          });
        }
        
        // Combine and sort deadlines by due date
        const allDeadlines = [...taskDeadlines, ...planDeadlines].sort((a, b) => {
          const dateA = a.dueDate?.toDate ? a.dueDate.toDate() : new Date(a.dueDate);
          const dateB = b.dueDate?.toDate ? b.dueDate.toDate() : new Date(b.dueDate);
          return dateA - dateB;
        });
        
        setDeadlines(allDeadlines.slice(0, 5)); // Limit to 5 deadlines
      } catch (error) {
        console.error('Error fetching deadlines:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDeadlines();
  }, [user]);
  
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'No due date';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
    // Check if the date is today
    const today = new Date();
    const isToday = date.getDate() === today.getDate() &&
                    date.getMonth() === today.getMonth() &&
                    date.getFullYear() === today.getFullYear();
    
    // Check if the date is tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = date.getDate() === tomorrow.getDate() &&
                        date.getMonth() === tomorrow.getMonth() &&
                        date.getFullYear() === tomorrow.getFullYear();
    
    // Check if the date is within the next 7 days
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const isThisWeek = date <= nextWeek;
    
    // Calculate days remaining
    const daysRemaining = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // Format the date
    if (isToday) return 'Today';
    if (isTomorrow) return 'Tomorrow';
    if (isThisWeek) return `In ${daysRemaining} days`;
    
    // For dates further in the future
    return date.toLocaleDateString();
  };
  
  const getDeadlineColor = (deadline: Deadline) => {
    // Get timestamp
    const date = deadline.dueDate?.toDate ? deadline.dueDate.toDate() : new Date(deadline.dueDate);
    const today = new Date();
    
    // Calculate days remaining
    const daysRemaining = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // Past due
    if (daysRemaining < 0) {
      return 'bg-red-100 text-red-800';
    }
    
    // Due today
    if (daysRemaining === 0) {
      return 'bg-orange-100 text-orange-800';
    }
    
    // Due tomorrow
    if (daysRemaining === 1) {
      return 'bg-yellow-100 text-yellow-800';
    }
    
    // Due within a week
    if (daysRemaining <= 7) {
      return 'bg-blue-100 text-blue-800';
    }
    
    // Due later
    return 'bg-green-100 text-green-800';
  };
  
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <ExclamationCircleIcon className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <ExclamationCircleIcon className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <ExclamationCircleIcon className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Upcoming Deadlines</h3>
        <CalendarIcon className="h-5 w-5 text-gray-400" />
      </div>
      
      {deadlines.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <CalendarIcon className="h-12 w-12 mb-2" />
          <p>No upcoming deadlines</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deadlines.map((deadline) => (
            <Link
              key={`${deadline.entityType}-${deadline.id}`}
              href={
                deadline.entityType === 'task' && deadline.planId
                  ? `/plans/${deadline.planId}?task=${deadline.id}`
                  : `/plans/${deadline.id}`
              }
              className="block p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900">{deadline.title}</p>
                  <p className="text-xs text-gray-500">
                    {deadline.entityType === 'task' ? deadline.planName : 'Plan'} • {deadline.groupName}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {deadline.entityType === 'task' && getPriorityIcon(deadline.priority)}
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getDeadlineColor(deadline)}`}>
                    {formatDate(deadline.dueDate)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}