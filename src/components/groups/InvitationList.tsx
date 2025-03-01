'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { getUserInvitations, acceptInvitation, declineInvitation } from '@/lib/firebase/invitations';
import { useRouter } from 'next/navigation';
import { UserGroupIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function InvitationList() {
  const { user } = useAuth();
  const router = useRouter();
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvitations = async () => {
      if (!user || !user.email) return;
      
      try {
        const userInvitations = await getUserInvitations(user.email);
        setInvitations(userInvitations);
      } catch (err) {
        console.error('Error fetching invitations:', err);
        setError('Failed to load invitations');
      } finally {
        setLoading(false);
      }
    };

    fetchInvitations();
  }, [user]);

  const handleAcceptInvitation = async (invitationId: string) => {
    if (!user) return;
    
    try {
      setLoading(true);
      const groupId = await acceptInvitation(invitationId, user.uid, user.displayName || 'User');
      
      // Remove the invitation from the list
      setInvitations(invitations.filter(inv => inv.id !== invitationId));
      
      // Show success message and redirect to the group
      alert('You have successfully joined the group!');
      router.push(`/groups/${groupId}`);
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError('Failed to accept invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    try {
      setLoading(true);
      await declineInvitation(invitationId);
      
      // Remove the invitation from the list
      setInvitations(invitations.filter(inv => inv.id !== invitationId));
    } catch (err) {
      console.error('Error declining invitation:', err);
      setError('Failed to decline invitation');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md text-red-700">
        {error}
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="text-center p-6 bg-gray-50 rounded-lg">
        <UserGroupIcon className="h-12 w-12 mx-auto text-gray-400" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">No pending invitations</h3>
        <p className="mt-1 text-sm text-gray-500">You don't have any pending group invitations.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Group Invitations</h2>
        <p className="text-sm text-gray-500">You have {invitations.length} pending invitation(s)</p>
      </div>
      <ul className="divide-y divide-gray-200">
        {invitations.map((invitation) => (
          <li key={invitation.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{invitation.groupName}</h3>
                <p className="text-sm text-gray-500">
                  Invited by {invitation.inviterName} as a {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {invitation.createdAt ? new Date(invitation.createdAt.toDate()).toLocaleDateString() : 'Recently'}
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleAcceptInvitation(invitation.id)}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  disabled={loading}
                >
                  <CheckIcon className="h-4 w-4 mr-1" />
                  Accept
                </button>
                <button
                  onClick={() => handleDeclineInvitation(invitation.id)}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  <XMarkIcon className="h-4 w-4 mr-1" />
                  Decline
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
} 