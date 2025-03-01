'use client';

import { useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { inviteUserToGroup } from '@/lib/firebase/invitations';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface InvitationFormProps {
  groupId: string;
  groupName: string;
  onInvitationSent?: () => void;
}

export default function InvitationForm({ groupId, groupName, onInvitationSent }: InvitationFormProps) {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [pendingEmails, setPendingEmails] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const addEmailToPending = () => {
    // Basic email validation
    if (!email || !email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address');
      return;
    }

    if (pendingEmails.includes(email)) {
      setError('This email has already been added');
      return;
    }

    setPendingEmails([...pendingEmails, email]);
    setEmail('');
    setError(null);
  };

  const removeEmail = (emailToRemove: string) => {
    setPendingEmails(pendingEmails.filter(e => e !== emailToRemove));
  };

  const handleSendInvitations = async () => {
    if (!user) return;
    
    if (pendingEmails.length === 0) {
      setError('Please add at least one email address');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Get current user's display name
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : null;
      const userName = userData?.displayName || user.displayName || 'Group Member';

      // Send invitations to all pending emails
      const invitationPromises = pendingEmails.map(email => 
        inviteUserToGroup(groupId, groupName, user.uid, userName, email, role)
      );

      await Promise.all(invitationPromises);

      // Clear pending emails and show success message
      setPendingEmails([]);
      setSuccessMessage(`Invitations sent successfully to ${pendingEmails.length} recipient${pendingEmails.length > 1 ? 's' : ''}`);
      
      // Call callback if provided
      if (onInvitationSent) {
        onInvitationSent();
      }
    } catch (err) {
      console.error('Error sending invitations:', err);
      setError('Failed to send invitations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-medium mb-4">Invite People to {groupName}</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md border border-red-200">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md border border-green-200">
          {successMessage}
        </div>
      )}
      
      <div className="mb-4">
        <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
          Invite as
        </label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value as any)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="admin">Admin (can manage plans and members)</option>
          <option value="member">Member (can create and edit plans)</option>
          <option value="viewer">Viewer (read-only access)</option>
        </select>
      </div>
      
      <div className="mb-4">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email Address
        </label>
        <div className="flex">
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email address"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={addEmailToPending}
            className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {pendingEmails.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Recipients ({pendingEmails.length})
          </label>
          <div className="flex flex-wrap gap-2">
            {pendingEmails.map((pendingEmail) => (
              <div 
                key={pendingEmail} 
                className="flex items-center bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm"
              >
                <span className="mr-1">{pendingEmail}</span>
                <button
                  type="button"
                  onClick={() => removeEmail(pendingEmail)}
                  className="text-blue-500 hover:text-blue-700"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSendInvitations}
          disabled={isLoading || pendingEmails.length === 0}
          className={`
            px-4 py-2 rounded-md text-sm font-medium
            ${isLoading || pendingEmails.length === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
            }
          `}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Sending...
            </>
          ) : (
            `Send ${pendingEmails.length} Invitation${pendingEmails.length !== 1 ? 's' : ''}`
          )}
        </button>
      </div>
    </div>
  );
}