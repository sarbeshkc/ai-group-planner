// src/app/groups/[id]/new-plan/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import PlanForm from '@/components/forms/PlanForm';
import PlanGenerationMethod from '@/components/ui/PlanGenerationMethod';
import { use } from 'react';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function NewPlanPage(props: PageProps) {
  const { params } = props;
  const { id } = use(params);
  
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Determine the plan generation method based on environment variables
  const forceLocalModel = process.env.NEXT_PUBLIC_FORCE_LOCAL_MODEL === 'true';
  const disableExternalAI = process.env.NEXT_PUBLIC_DISABLE_EXTERNAL_AI === 'true';
  const forceAIModels = process.env.NEXT_PUBLIC_FORCE_AI_MODELS === 'true';
  const planMethod = forceAIModels ? 'ai' : (forceLocalModel || disableExternalAI ? 'rule-based' : 'ai');
  
  const router = useRouter();
  const { user } = useAuth();
  
  useEffect(() => {
    const fetchGroupDetails = async () => {
      if (!user) {
        router.push('/login');
        return;
      }
      
      try {
        const groupDoc = await getDoc(doc(db, 'groups', id));
        
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
  }, [id, user, router]);
  
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
        <Link href={`/groups/${id}`} className="text-blue-600 hover:underline">
          ← Back to {groupName}
        </Link>
      </div>
      
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-center">Create Plan for {groupName}</h1>
        <PlanGenerationMethod method={planMethod} />
      </div>
      
      <p className="text-center text-gray-600 mb-8">
        {planMethod === 'ai' 
          ? 'Our AI will generate a complete plan with tasks based on your input' 
          : 'Tasks will be generated using rule-based planning'}
      </p>
      
      <PlanForm groupId={id} />
    </div>
  );
}