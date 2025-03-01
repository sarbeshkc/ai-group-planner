'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import Button from '@/components/ui/Button';
import GroupChat from '@/components/chat/GroupChat';
import InvitationForm from '@/components/groups/InvitationForm';
import { Tab } from '@headlessui/react';
import { 
  UserGroupIcon, 
  DocumentTextIcon, 
  ClipboardDocumentListIcon 
} from '@heroicons/react/24/outline';

interface GroupPageProps {
  params: Promise<{ id: string }>;
}

export default function GroupDetailPage(props: GroupPageProps) {
  const params = use(props.params);
  // Access params.id safely
  const groupId = params.id;

  const [group, setGroup] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [showInviteForm, setShowInviteForm] = useState(false);

  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const fetchGroupDetails = async () => {
      if (!user) {
        router.push('/login');
        return;
      }
      
      try {
        // Fetch group data
        const groupDoc = await getDoc(doc(db, 'groups', groupId));
        
        if (!groupDoc.exists()) {
          setError('Group not found');
          setLoading(false);
          return;
        }
        
        const groupData = groupDoc.data();
        setGroup({ id: groupDoc.id, ...groupData });
        
        // Fetch group plans
        const plansQuery = query(
          collection(db, 'plans'),
          where('groupId', '==', groupId)
        );
        
        const plansSnapshot = await getDocs(plansQuery);
        const plansList: any[] = [];
        
        plansSnapshot.forEach((doc) => {
          plansList.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        setPlans(plansList);
        
        // Fetch group members
        const membersList: any[] = [];
        
        for (const memberId of groupData.members) {
          const memberDoc = await getDoc(doc(db, 'users', memberId));
          
          if (memberDoc.exists()) {
            membersList.push({
              id: memberDoc.id,
              ...memberDoc.data()
            });
          }
        }
        
        setMembers(membersList);
        
        // Fetch recent tasks for this group
        const tasksQuery = query(
          collection(db, 'tasks'),
          where('groupId', '==', groupId),
          where('status', '!=', 'completed')
        );
        
        const tasksSnapshot = await getDocs(tasksQuery);
        const tasksList: any[] = [];
        
        tasksSnapshot.forEach((doc) => {
          tasksList.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        setTasks(tasksList);
      } catch (err) {
        console.error('Error fetching group details:', err);
        setError('Failed to load group details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchGroupDetails();
  }, [groupId, user, router]);

  // Format date for display
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-4">
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-700">{error || 'Failed to load group'}</p>
          <Link href="/groups" className="mt-4 text-blue-600 hover:underline">
            Back to Groups
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">{group.name}</h1>
            <p className="text-gray-600 mb-4">{group.description}</p>
            
            <div className="flex items-center text-sm text-gray-500">
              <span>Created: {formatDate(group.createdAt)}</span>
              <span className="mx-2">•</span>
              <span>{members.length} member{members.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          
          <div className="mt-4 md:mt-0">
            <Link href={`/groups/${groupId}/new-plan`}>
              <Button leftIcon={<DocumentTextIcon className="w-5 h-5" />}>
                Create New AI Plan
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Tabbed Interface */}
      <div className="mb-8">
        <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
          <Tab.List className="flex space-x-1 rounded-xl bg-blue-50 p-1">
            <Tab
              className={({ selected }) =>
                `w-full rounded-lg py-2.5 text-sm font-medium leading-5 
                ${
                  selected
                    ? 'bg-white text-blue-700 shadow'
                    : 'text-blue-600 hover:bg-white/[0.12] hover:text-blue-700'
                }
                flex items-center justify-center`
              }
            >
              <DocumentTextIcon className="w-5 h-5 mr-2" />
              Plans
            </Tab>
            <Tab
              className={({ selected }) =>
                `w-full rounded-lg py-2.5 text-sm font-medium leading-5 
                ${
                  selected
                    ? 'bg-white text-blue-700 shadow'
                    : 'text-blue-600 hover:bg-white/[0.12] hover:text-blue-700'
                }
                flex items-center justify-center`
              }
            >
              <ClipboardDocumentListIcon className="w-5 h-5 mr-2" />
              Active Tasks
            </Tab>
            <Tab
              className={({ selected }) =>
                `w-full rounded-lg py-2.5 text-sm font-medium leading-5 
                ${
                  selected
                    ? 'bg-white text-blue-700 shadow'
                    : 'text-blue-600 hover:bg-white/[0.12] hover:text-blue-700'
                }
                flex items-center justify-center`
              }
            >
              <UserGroupIcon className="w-5 h-5 mr-2" />
              Members
            </Tab>
          </Tab.List>
          <Tab.Panels className="mt-6">
            {/* Plans Panel */}
            <Tab.Panel className="rounded-xl bg-white p-3 animate-fadeIn">
              {plans.length === 0 ? (
                <div className="bg-gray-50 p-8 rounded-lg text-center">
                  <h3 className="text-xl font-medium text-gray-700 mb-4">No plans yet</h3>
                  <p className="text-gray-500 mb-6">Create your first AI-generated plan for this group</p>
                  <Link href={`/groups/${groupId}/new-plan`}>
                    <Button>Create First Plan</Button>
                  </Link>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {plans.map((plan) => (
                    <Link href={`/plans/${plan.id}`} key={plan.id}>
                      <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow h-full flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-xl font-semibold">{plan.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            plan.status === 'active' ? 'bg-green-100 text-green-800' :
                            plan.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
                          </span>
                        </div>
                        
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
            </Tab.Panel>
            
            {/* Tasks Panel */}
            <Tab.Panel className="rounded-xl bg-white p-3 animate-fadeIn">
              {tasks.length === 0 ? (
                <div className="bg-gray-50 p-8 rounded-lg text-center">
                  <h3 className="text-xl font-medium text-gray-700 mb-4">No active tasks</h3>
                  <p className="text-gray-500 mb-6">All tasks have been completed or no plans have been created yet</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg overflow-hidden">
                  <ul className="divide-y divide-gray-200">
                    {tasks.map((task) => {
                      // Find the assigned user
                      const assignedUser = task.assignedTo ? 
                        members.find(member => member.id === task.assignedTo) : null;
                      
                      return (
                        <li key={task.id} className="p-4 hover:bg-gray-50">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                            <div className="mb-2 sm:mb-0">
                              <h4 className="text-lg font-medium">{task.title}</h4>
                              <p className="text-gray-600 text-sm">{task.description}</p>
                            </div>
                            <div className="flex items-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium mr-2 ${
                                task.priority === 'high' ? 'bg-red-100 text-red-800' :
                                task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {task.priority.toUpperCase()}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                task.status === 'pending' ? 'bg-gray-100 text-gray-800' :
                                task.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {task.status.replace('-', ' ').toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="mt-2 flex justify-between items-center text-sm text-gray-500">
                            <div>
                              {assignedUser ? (
                                <span>Assigned to: {assignedUser.displayName || 'Unknown User'}</span>
                              ) : (
                                <span>Unassigned</span>
                              )}
                            </div>
                            <div>
                              Due: {formatDate(task.dueDate)}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </Tab.Panel>
            
            {/* Members Panel */}
            <Tab.Panel className="rounded-xl bg-white p-3 animate-fadeIn">
              {group && group.createdBy === user?.uid && showInviteForm && (
                <div className="mb-6">
                  <InvitationForm 
                    groupId={groupId} 
                    groupName={group.name} 
                    onInvitationSent={() => setShowInviteForm(false)}
                  />
                </div>
              )}
              <div className="bg-white rounded-lg overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium">Group Members</h3>
                  {group && group.createdBy === user?.uid && (
                    <Button
                      onClick={() => setShowInviteForm(!showInviteForm)}
                      size="sm"
                    >
                      {showInviteForm ? 'Hide Invite Form' : 'Invite People'}
                    </Button>
                  )}
                </div>
                <ul className="divide-y divide-gray-200">
                  {members.map((member) => (
                    <li key={member.id} className="p-4 flex items-center">
                      <div className="flex-shrink-0 mr-3">
                        {member.photoURL ? (
                          <img
                            src={member.photoURL}
                            alt={member.displayName}
                            className="h-10 w-10 rounded-full"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-medium">
                              {member.displayName ? member.displayName[0].toUpperCase() : '?'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{member.displayName || 'Anonymous User'}</p>
                        <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                      {member.id === group.createdBy && (
                        <span className="ml-auto px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          Group Admin
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
      
      {/* Chat Component */}
      <GroupChat groupId={groupId} groupName={group.name} />
    </div>
  );
}