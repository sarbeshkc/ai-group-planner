// src/app/groups/[id]/new-plan/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import PlanForm from '@/components/forms/PlanForm';

export default function NewPlanPage({ params }: { params: { id: string } }) {
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const router = useRouter();
  const { user } = useAuth();
  
  useEffect(() => {
    const fetchGroupDetails = async () => {
      if (!user) {
        router.push('/login');
        return;
      }
      
      try {
        const groupDoc = await getDoc(doc(db, 'groups', params.id));
        
        if (!groupDoc.exists()) {
          setError('Group not found');
          setLoading(false);
          return;
        }
        
        const groupData = groupDoc.data();
        
        // Check if user is a member of this group
        if (!groupData.members.includes(user.uid)) {
          setError('You are not a member of this group');
          setLoading(false);
          return;
        }
        
        setGroupName(groupData.name);
      } catch (err) {
        console.error('Error fetching group:', err);
        setError('Failed to load group details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchGroupDetails();
  }, [params.id, user, router]);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-4">
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-700">{error}</p>
          <Link href="/groups" className="mt-4 text-blue-600 hover:underline">
            Back to Groups
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="mb-6">
        <Link href={`/groups/${params.id}`} className="text-blue-600 hover:underline">
          ← Back to {groupName}
        </Link>
      </div>
      
      <h1 className="text-3xl font-bold mb-6 text-center">Create Plan for {groupName}</h1>
      <p className="text-center text-gray-600 mb-8">
        Our AI will generate a complete plan with tasks based on your input
      </p>
      
      <PlanForm groupId={params.id} />
    </div>
  );
}