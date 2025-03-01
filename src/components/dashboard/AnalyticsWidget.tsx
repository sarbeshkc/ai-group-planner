// src/components/dashboard/AnalyticsWidget.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  RadialLinearScale,
  Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  RadialLinearScale,
  Filler
);

interface AnalyticsWidgetProps {
  size: 'small' | 'medium' | 'large';
}

export default function AnalyticsWidget({ size }: AnalyticsWidgetProps) {
  const { user } = useAuth();
  const [selectedView, setSelectedView] = useState<'tasks' | 'plans' | 'activity'>('tasks');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    tasksByStatus: { completed: 0, 'in-progress': 0, pending: 0 },
    tasksByPriority: { high: 0, medium: 0, low: 0 },
    planCompletion: [] as { plan: string, completion: number }[],
    activityOverTime: [] as { date: string, count: number }[]
  });
  
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      if (!user) return;
      
      setLoading(true);
      
      try {
        // Get user's tasks
        const tasksQuery = query(
          collection(db, 'tasks'),
          where('assignedTo', '==', user.uid)
        );
        
        const tasksSnapshot = await getDocs(tasksQuery);
        const tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Calculate task status distribution
        const tasksByStatus = {
          completed: tasks.filter(task => task.status === 'completed').length,
          'in-progress': tasks.filter(task => task.status === 'in-progress').length,
          pending: tasks.filter(task => task.status === 'pending').length
        };
        
        // Calculate task priority distribution
        const tasksByPriority = {
          high: tasks.filter(task => task.priority === 'high').length,
          medium: tasks.filter(task => task.priority === 'medium').length,
          low: tasks.filter(task => task.priority === 'low').length
        };
        
        // Get user's plans
        const plansQuery = query(
          collection(db, 'plans'),
          where('createdBy', '==', user.uid)
        );
        
        const plansSnapshot = await getDocs(plansQuery);
        const plans = plansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Calculate plan completion percentages
        const planCompletion = await Promise.all(plans.map(async plan => {
          // Get tasks for this plan
          const planTasksQuery = query(
            collection(db, 'tasks'),
            where('planId', '==', plan.id)
          );
          
          const planTasksSnapshot = await getDocs(planTasksQuery);
          const planTasks = planTasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          const totalTasks = planTasks.length;
          const completedTasks = planTasks.filter(task => task.status === 'completed').length;
          
          return {
            plan: plan.title,
            completion: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
          };
        }));
        
        // Get activity over time (last 7 days)
        const activityQuery = query(
          collection(db, 'activities'),
          where('userId', '==', user.uid)
        );
        
        const activitySnapshot = await getDocs(activityQuery);
        const activities = activitySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Group activities by date
        const activityByDate = activities.reduce((acc, activity) => {
          const date = new Date(activity.timestamp.toDate()).toISOString().split('T')[0];
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        // Get the last 7 days
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          return date.toISOString().split('T')[0];
        }).reverse();
        
        const activityOverTime = last7Days.map(date => ({
          date,
          count: activityByDate[date] || 0
        }));
        
        setStats({
          tasksByStatus,
          tasksByPriority,
          planCompletion,
          activityOverTime
        });
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalyticsData();
  }, [user]);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Charts configuration data
  const taskStatusData = {
    labels: ['Completed', 'In Progress', 'Pending'],
    datasets: [
      {
        data: [stats.tasksByStatus.completed, stats.tasksByStatus['in-progress'], stats.tasksByStatus.pending],
        backgroundColor: ['#10B981', '#3B82F6', '#9CA3AF'],
        borderWidth: 0,
      },
    ],
  };
  
  const taskPriorityData = {
    labels: ['High', 'Medium', 'Low'],
    datasets: [
      {
        label: 'Tasks by Priority',
        data: [stats.tasksByPriority.high, stats.tasksByPriority.medium, stats.tasksByPriority.low],
        backgroundColor: ['#EF4444', '#F59E0B', '#10B981'],
      },
    ],
  };
  
  const planCompletionData = {
    labels: stats.planCompletion.map(p => p.plan),
    datasets: [
      {
        label: 'Completion %',
        data: stats.planCompletion.map(p => p.completion),
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: '#3B82F6',
        borderWidth: 1,
      },
    ],
  };
  
  const activityData = {
    labels: stats.activityOverTime.map(a => a.date.split('-').slice(1).join('/')),
    datasets: [
      {
        label: 'Activities',
        data: stats.activityOverTime.map(a => a.count),
        fill: true,
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: '#3B82F6',
        tension: 0.4,
      },
    ],
  };
  
  return (
    <div className="h-full bg-white p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Analytics</h3>
        
        <div className="flex space-x-2">
          <button
            className={`px-3 py-1 text-sm rounded-md ${selectedView === 'tasks' ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-100'}`}
            onClick={() => setSelectedView('tasks')}
          >
            Tasks
          </button>
          <button
            className={`px-3 py-1 text-sm rounded-md ${selectedView === 'plans' ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-100'}`}
            onClick={() => setSelectedView('plans')}
          >
            Plans
          </button>
          <button
            className={`px-3 py-1 text-sm rounded-md ${selectedView === 'activity' ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-100'}`}
            onClick={() => setSelectedView('activity')}
          >
            Activity
          </button>
        </div>
      </div>
      
      <div className="h-64">
        {selectedView === 'tasks' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2 text-center">Task Status</h4>
              <Doughnut 
                data={taskStatusData} 
                options={{ 
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                    }
                  }
                }} 
              />
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2 text-center">Task Priority</h4>
              <Bar 
                data={taskPriorityData} 
                options={{ 
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        precision: 0
                      }
                    }
                  }
                }} 
              />
            </div>
          </div>
        )}
        
        {selectedView === 'plans' && (
          <div className="h-full">
            <h4 className="text-sm font-medium text-gray-500 mb-2 text-center">Plan Completion</h4>
            {stats.planCompletion.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                No plan data available
              </div>
            ) : (
              <Bar 
                data={planCompletionData} 
                options={{ 
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                      title: {
                        display: true,
                        text: 'Completion %'
                      }
                    }
                  }
                }} 
              />
            )}
          </div>
        )}
        
        {selectedView === 'activity' && (
          <div className="h-full">
            <h4 className="text-sm font-medium text-gray-500 mb-2 text-center">Activity Over Time</h4>
            <Line 
              data={activityData} 
              options={{ 
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      precision: 0
                    }
                  }
                }
              }} 
            />
          </div>
        )}
      </div>
    </div>
  );
}