'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import Link from 'next/link';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

interface Plan {
  id: string;
  title: string;
  description: string;
  startDate: any;
  endDate: any;
  status: string;
  groupId: string;
  groupName?: string;
  progress?: number;
}

interface PlansWidgetProps {
  size: 'small' | 'medium' | 'large';
}

export default function PlansWidget({ size }: PlansWidgetProps) {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchPlans = async () => {
      if (!user) return;
      
      try {
        // Get user's groups
        const groupsQuery = query(
          collection(db, 'groups'),
          where('members', 'array-contains', user.uid)
        );
        
        const groupsSnapshot = await getDocs(groupsQuery);
        const groupIds = groupsSnapshot.docs.map(doc => doc.id);
        const groupNames = new Map(
          groupsSnapshot.docs.map(doc => [doc.id, doc.data().name])
        );
        
        if (groupIds.length === 0) {
          setLoading(false);
          return;
        }
        
        // Get plans for those groups
        const plansQuery = query(
          collection(db, 'plans'),
          where('groupId', 'in', groupIds),
          orderBy('endDate'),
          limit(5)
        );
        
        const plansSnapshot = await getDocs(plansQuery);
        const plansList: Plan[] = [];
        
        // Process each plan
        for (const doc of plansSnapshot.docs) {
          const planData = doc.data();
          
          // Get plan progress by checking task completion status
          const tasksQuery = query(
            collection(db, 'tasks'),
            where('planId', '==', doc.id)
          );
          
          const tasksSnapshot = await getDocs(tasksQuery);
          const totalTasks = tasksSnapshot.size;
          const completedTasks = tasksSnapshot.docs.filter(
            taskDoc => taskDoc.data().status === 'completed'
          ).length;
          
          const progress = totalTasks > 0 
            ? Math.round((completedTasks / totalTasks) * 100) 
            : 0;
          
          plansList.push({
            id: doc.id,
            ...planData,
            groupName: groupNames.get(planData.groupId) || 'Unknown Group',
            progress
          } as Plan);
        }
        
        setPlans(plansList);
      } catch (error) {
        console.error('Error fetching plans:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPlans();
  }, [user]);
  
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'archived':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getProgressColor = (progress: number) => {
    if (progress >= 75) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 25) return 'bg-yellow-500';
    return 'bg-gray-500';
  };
  
  if (loading) {
    return (
      <div className="h-full flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="h-full bg-white p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Recent Plans</h3>
        <Link 
          href="/plans" 
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
        >
          View all
          <ArrowRightIcon className="ml-1 h-4 w-4" />
        </Link>
      </div>
      
      {plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p>No plans available</p>
          <Link 
            href="/groups" 
            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
          >
            Join or create a group
          </Link>
        </div>
      ) : (
        <div className="space-y-4 overflow-y-auto" style={{ 
          maxHeight: size === 'small' ? '200px' : size === 'medium' ? '300px' : '400px' 
        }}>
          {plans.map((plan) => (
            <Link 
              href={`/plans/${plan.id}`} 
              key={plan.id}
              className="block p-4 border border-gray-200 rounded-lg transition hover:shadow-md hover:border-gray-300"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-medium text-gray-900">{plan.title}</h4>
                  <p className="text-sm text-gray-500 mb-1">{plan.groupName}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(plan.status)}`}>
                  {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                <div 
                  className={`h-2.5 rounded-full ${getProgressColor(plan.progress || 0)}`} 
                  style={{ width: `${plan.progress || 0}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>{plan.progress || 0}% complete</span>
                <span>
                  {formatDate(plan.startDate)} - {formatDate(plan.endDate)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}