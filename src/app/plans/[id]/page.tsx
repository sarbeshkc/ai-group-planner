// src/app/plans/[id]/page.tsx
'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import Button from '@/components/ui/Button';
import Link from 'next/link';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate: any;
  assignedTo: string;
}

interface Plan {
  id: string;
  title: string;
  description: string;
  groupId: string;
  startDate: any;
  endDate: any;
  objectives: string[];
  status: string;
  createdBy: string;
}

export default function PlanDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const fetchPlanAndTasks = async () => {
      if (!user) return;
      
      try {
        // Fetch the plan
        const planDoc = await getDoc(doc(db, 'plans', params.id));
        
        if (!planDoc.exists()) {
          setError('Plan not found');
          setLoading(false);
          return;
        }
        
        const planData = { id: planDoc.id, ...planDoc.data() } as Plan;
        setPlan(planData);
        
        // Fetch group name
        const groupDoc = await getDoc(doc(db, 'groups', planData.groupId));
        if (groupDoc.exists()) {
          setGroupName(groupDoc.data().name);
        }
        
        // Fetch tasks
        const tasksQuery = query(
          collection(db, 'tasks'),
          where('planId', '==', params.id)
        );
        
        const taskDocs = await getDocs(tasksQuery);
        const tasksList: Task[] = [];
        
        taskDocs.forEach((doc) => {
          tasksList.push({
            id: doc.id,
            ...doc.data()
          } as Task);
        });
        
        setTasks(tasksList);
      } catch (err: any) {
        console.error('Error fetching plan:', err);
        setError(err.message || 'Failed to load plan details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPlanAndTasks();
  }, [params.id, user]);

  const updateTaskStatus = async (taskId: string, newStatus: 'pending' | 'in-progress' | 'completed') => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), {
        status: newStatus
      });
      
      // Update local state
      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ));
    } catch (err) {
      console.error('Error updating task:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-4">
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-700">{error || 'Failed to load plan'}</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => router.push('/plans')}
          >
            Back to Plans
          </Button>
        </div>
      </div>
    );
  }

  // Format dates for display
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <div className="mb-6">
        <Link href={`/groups/${plan.groupId}`} className="text-blue-600 hover:underline">
          ← Back to {groupName}
        </Link>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-3xl font-bold">{plan.title}</h1>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            plan.status === 'active' ? 'bg-green-100 text-green-800' :
            plan.status === 'completed' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
          </span>
        </div>
        
        <p className="text-gray-600 mb-6">{plan.description}</p>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-500">Start Date</p>
            <p className="font-medium">{formatDate(plan.startDate)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">End Date</p>
            <p className="font-medium">{formatDate(plan.endDate)}</p>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Objectives</h3>
          <ul className="list-disc pl-5 space-y-1">
            {plan.objectives.map((objective, index) => (
              <li key={index} className="text-gray-700">{objective}</li>
            ))}
          </ul>
        </div>
      </div>
      
      <div>
        <h2 className="text-2xl font-bold mb-4">Tasks</h2>
        
        {tasks.length === 0 ? (
          <div className="bg-gray-50 p-6 rounded-lg text-center">
            <p className="text-gray-500">No tasks found for this plan.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div key={task.id} className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-semibold">{task.title}</h3>
                  <div className="flex space-x-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      task.priority === 'high' ? 'bg-red-100 text-red-800' :
                      task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {task.priority.toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      task.status === 'completed' ? 'bg-green-100 text-green-800' :
                      task.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {task.status.replace('-', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
                
                <p className="text-gray-600 mt-2">{task.description}</p>
                
                <div className="mt-3 flex justify-between items-center">
                  <p className="text-sm text-gray-500">
                    Due: {formatDate(task.dueDate)}
                  </p>
                  
                  <div className="flex space-x-2">
                    {task.status !== 'pending' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => updateTaskStatus(task.id, 'pending')}
                      >
                        Mark Pending
                      </Button>
                    )}
                    
                    {task.status !== 'in-progress' && (
                      <Button 
                        size="sm" 
                        variant={task.status === 'completed' ? 'outline' : 'primary'}
                        onClick={() => updateTaskStatus(task.id, 'in-progress')}
                      >
                        Mark In Progress
                      </Button>
                    )}
                    
                    {task.status !== 'completed' && (
                      <Button 
                        size="sm" 
                        variant="primary"
                        onClick={() => updateTaskStatus(task.id, 'completed')}
                      >
                        Mark Complete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}