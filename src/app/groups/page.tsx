// src/app/groups/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import Button from '@/components/ui/Button';

interface Group {
  id: string;
  name: string;
  description: string;
  members: string[];
  createdBy: string;
  createdAt: any;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchGroups = async () => {
      if (!user) return;

      try {
        const q = query(
          collection(db, 'groups'),
          where('members', 'array-contains', user.uid)
        );
        
        const querySnapshot = await getDocs(q);
        const groupsList: Group[] = [];
        
        querySnapshot.forEach((doc) => {
          groupsList.push({
            id: doc.id,
            ...doc.data(),
          } as Group);
        });
        
        setGroups(groupsList);
      } catch (error) {
        console.error('Error fetching groups:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Your Groups</h1>
        <Link href="/groups/new">
          <Button>Create New Group</Button>
        </Link>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <h3 className="text-xl font-medium text-gray-700 mb-4">No groups yet</h3>
          <p className="text-gray-500 mb-6">Create your first group to start planning together</p>
          <Link href="/groups/new">
            <Button>Create Your First Group</Button>
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <Link href={`/groups/${group.id}`} key={group.id}>
              <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <h2 className="text-xl font-semibold mb-2">{group.name}</h2>
                <p className="text-gray-600 line-clamp-2 mb-4">{group.description}</p>
                <div className="text-sm text-gray-500">
                  {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}