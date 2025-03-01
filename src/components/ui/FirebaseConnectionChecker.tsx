'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export default function FirebaseConnectionChecker() {
  const [hasConnectionIssue, setHasConnectionIssue] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Try to make a simple Firestore query
    const checkConnection = async () => {
      try {
        // Try to get a single document from any collection
        // This is just to test connectivity
        const testQuery = query(collection(db, 'users'), limit(1));
        await getDocs(testQuery);
        // If we reach here, connection is good
        setHasConnectionIssue(false);
      } catch (error) {
        console.warn('Firebase connection issue detected:', error);
        setHasConnectionIssue(true);
      }
    };

    checkConnection();

    // Check periodically
    const interval = setInterval(checkConnection, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, []);

  if (!hasConnectionIssue || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-5 left-5 z-50 max-w-md bg-red-50 text-red-800 p-4 rounded-lg shadow-lg border border-red-200">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium">Connection Issue Detected</h3>
          <div className="mt-2 text-sm">
            <p>It seems that your ad-blocker or privacy extension is preventing the app from connecting to its database.</p>
            <p className="mt-1">Please disable your ad-blocker or whitelist this site to use all features.</p>
          </div>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="inline-flex rounded-md bg-red-50 px-2.5 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}