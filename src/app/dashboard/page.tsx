'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { signOut } from '@/lib/firebase/auth';

export default function DashboardPage() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If not loading and no user, redirect to login
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
          <p className="mt-4 text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is not logged in and we're not loading, don't show anything
  // (the useEffect will redirect to login)
  if (!user) {
    return null;
  }

  return (
    <div className="py-10">
      <header>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-gray-900">Dashboard</h1>
        </div>
      </header>
      <main>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Welcome Card */}
              <Card className="col-span-full">
                <CardHeader>
                  <CardTitle>Welcome, {userData?.displayName || user.displayName || 'User'}!</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    This is your planning dashboard. Get started by creating a group or a new plan.
                  </p>
                  <div className="mt-4 flex space-x-4">
                    <Button 
                      variant="primary" 
                      onClick={() => router.push('/groups/new')}
                    >
                      Create Group
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleSignOut}
                    >
                      Sign Out
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats Cards */}
              <Card>
                <CardHeader>
                  <CardTitle>Your Groups</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">0</div>
                  <p className="text-gray-600">Active groups</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Your Plans</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">0</div>
                  <p className="text-gray-600">Active plans</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Your Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">0</div>
                  <p className="text-gray-600">Pending tasks</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}