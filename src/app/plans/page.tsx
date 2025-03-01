// src/app/plans/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import Button from '@/components/ui/Button';

interface Plan {
  id: string;
  title: string;
  description: string;
  groupId: string;
  groupName?: string;
  startDate: any;
  endDate: any;
  status: string;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchPlans = async () => {
      if (!user) return;

      try {
        // First get user's groups
        const groupsQuery = query(
          collection(db, 'groups'),
          where('members', 'array-contains', user.uid)
        );
        
        const groupsSnapshot = await getDocs(groupsQuery);
        const groupIds: string[] = [];
        const groupNames = new Map<string, string>();
        
        groupsSnapshot.forEach((doc) => {
          groupIds.push(doc.id);
          groupNames.set(doc.id, doc.data().name);
        });
        
        if (groupIds.length === 0) {
          setLoading(false);
          return;
        }
        
        // Then get plans for those groups
        const plansQuery = query(
          collection(db, 'plans'),
          where('groupId', 'in', groupIds)
        );
        
        const plansSnapshot = await getDocs(plansQuery);
        const plansList: Plan[] = [];
        
        plansSnapshot.forEach((doc) => {
          const planData = doc.data();
          plansList.push({
            id: doc.id,
            ...planData,
            groupName: groupNames.get(planData.groupId)
          } as Plan);
        });
        
        setPlans(plansList);
      } catch (error) {
        console.error('Error fetching plans:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Format date for display
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Your Plans</h1>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <h3 className="text-xl font-medium text-gray-700 mb-4">No plans yet</h3>
          <p className="text-gray-500 mb-6">Join or create a group to start planning</p>
          <Link href="/groups">
            <Button>View Your Groups</Button>
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Link href={`/plans/${plan.id}`} key={plan.id}>
              <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow h-full flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-xl font-semibold">{plan.title}</h2>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    plan.status === 'active' ? 'bg-green-100 text-green-800' :
                    plan.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
                  </span>
                </div>
                
                <p className="text-gray-500 text-sm mb-2">Group: {plan.groupName}</p>
                <p className="text-gray-600 line-clamp-2 mb-4 flex-grow">{plan.description}</p>
                
                <div className="flex justify-between text-sm text-gray-500 mt-auto pt-4 border-t border-gray-100">
                  <span>Start: {formatDate(plan.startDate)}</span>
                  <span>End: {formatDate(plan.endDate)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}