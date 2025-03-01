// src/components/dashboard/TasksWidget.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { collection, query, where, orderBy, limit, getDocs, updateDoc, doc, getDoc, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import Link from 'next/link';
import { 
  CheckCircleIcon, 
  ClockIcon, 
  ExclamationCircleIcon,
  ArrowRightCircleIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

interface TasksWidgetProps {
  size: 'small' | 'medium' | 'large';
}

interface Task {
  id: string;
  title: string;
  status: string;
  dueDate: any;
  priority: string;
  planId: string;
  groupId: string;
  planName?: string;
  groupName?: string;
  [key: string]: any;
}

export default function TasksWidget({ size }: TasksWidgetProps) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchTasks = async () => {
      if (!user) return;
      
      try {
        // Get user's assigned tasks that are not completed
        const tasksQuery = query(
          collection(db, 'tasks'),
          where('assignedTo', '==', user.uid),
          where('status', '!=', 'completed'),
          orderBy('status'),
          orderBy('dueDate'),
          limit(10)
        );
        
        const tasksSnapshot = await getDocs(tasksQuery);
        const tasksList = tasksSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Add additional data like plan name, group name
        })) as Task[];
        
        // For each task, fetch the plan name and group name
        const tasksWithDetails = await Promise.all(tasksList.map(async task => {
          try {
            // Get plan details
            const planDoc = await getDoc(doc(db, 'plans', task.planId));
            const planData = planDoc.exists() ? planDoc.data() : null;
            
            // Get group details
            const groupDoc = await getDoc(doc(db, 'groups', task.groupId));
            const groupData = groupDoc.exists() ? groupDoc.data() : null;
            
            return {
              ...task,
              planName: planData?.title || 'Unknown Plan',
              groupName: groupData?.name || 'Unknown Group'
            };
          } catch (error) {
            console.error('Error fetching task details:', error);
            return task;
          }
        }));
        
        setTasks(tasksWithDetails);
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTasks();
  }, [user]);
  
  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      // Update task status
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        status: newStatus,
        updatedAt: new Date()
      });
      
      // Update local state
      setTasks(prevTasks => prevTasks.map(task => 
        task.id === taskId 
          ? { ...task, status: newStatus } 
          : task
      ));
      
      // Record activity
      await addDoc(collection(db, 'activities'), {
        type: 'status_change',
        entityType: 'task',
        entityId: taskId,
        entityName: tasks.find(t => t.id === taskId)?.title || 'Task',
        userId: user?.uid,
        userName: user?.displayName,
        timestamp: new Date(),
        details: { 
          newStatus,
          previousStatus: tasks.find(t => t.id === taskId)?.status
        }
      });
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };
  
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
    
    // Format the date
    if (isToday) return 'Today';
    if (isTomorrow) return 'Tomorrow';
    
    return date.toLocaleDateString();
  };
  
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <ExclamationCircleIcon className="h-5 w-5 text-red-500" />;
      case 'medium':
        return <ExclamationCircleIcon className="h-5 w-5 text-yellow-500" />;
      case 'low':
        return <ExclamationCircleIcon className="h-5 w-5 text-green-500" />;
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
    <div className="h-full bg-white">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-medium">My Tasks</h3>
        <Link href="/tasks" className="text-sm text-blue-600 hover:text-blue-800">
          View All
        </Link>
      </div>
      
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <CheckCircleIcon className="h-12 w-12 mb-2" />
          <p>You have no pending tasks</p>
        </div>
      ) : (
        <div className="overflow-y-auto" style={{ maxHeight: size === 'small' ? '200px' : '300px' }}>
          <ul className="divide-y divide-gray-200">
            {tasks.map((task) => (
              <li key={task.id} className="py-3 flex flex-col">
                <div className="flex items-start justify-between">
                  <div className="flex items-start">
                    <div className="mr-2 mt-0.5">
                      {task.status === 'pending' ? (
                        <ClockIcon className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ClockIcon className="h-5 w-5 text-blue-500" />
                      )}
                    </div>
                    <div>
                      <Link href={`/plans/${task.planId}?task=${task.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600">
                        {task.title}
                      </Link>
                      <p className="text-xs text-gray-500">
                        {task.planName} • {task.groupName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getPriorityIcon(task.priority)}
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(task.dueDate)}
                    </span>
                  </div>
                </div>
                
                <div className="flex mt-2 pl-7">
                  {task.status === 'pending' ? (
                    <button
                      className="flex items-center text-xs text-blue-600 hover:text-blue-800"
                      onClick={() => updateTaskStatus(task.id, 'in-progress')}
                    >
                      <ArrowRightCircleIcon className="h-4 w-4 mr-1" />
                      Start Working
                    </button>
                  ) : (
                    <button
                      className="flex items-center text-xs text-green-600 hover:text-green-800"
                      onClick={() => updateTaskStatus(task.id, 'completed')}
                    >
                      <CheckIcon className="h-4 w-4 mr-1" />
                      Mark Complete
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}