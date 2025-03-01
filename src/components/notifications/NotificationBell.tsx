// src/components/notifications/NotificationBell.tsx
'use client';

import { useState, useEffect, Fragment } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Popover, Transition } from '@headlessui/react';
import { BellIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { getUnreadNotifications, markNotificationAsRead, markAllNotificationsAsRead, Notification } from '@/lib/firebase/notifications';
import Link from 'next/link';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!user) return;
    
    // Set up real-time listener for new notifications
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('read', '==', false),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      
      setNotifications(notificationsData);
      setUnreadCount(notificationsData.length);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [user]);
  
  const handleMarkAsRead = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    try {
      await markNotificationAsRead(notificationId);
      
      // Update local state
      setNotifications(prev => prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true } 
          : notification
      ));
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };
  
  const handleMarkAllAsRead = async () => {
    if (!user) return;
    
    try {
      await markAllNotificationsAsRead(user.uid);
      
      // Update local state
      setNotifications(prev => prev.map(notification => ({ 
        ...notification, 
        read: true 
      })));
      
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };
  
  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_assigned':
        return (
          <div className="p-1 rounded-full bg-blue-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'task_completed':
        return (
          <div className="p-1 rounded-full bg-green-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'deadline_approaching':
        return (
          <div className="p-1 rounded-full bg-yellow-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'group_invite':
        return (
          <div className="p-1 rounded-full bg-purple-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="p-1 rounded-full bg-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
        );
    }
  };
  
  if (!user) return null;
  
  return (
    <Popover className="relative">
      {({ open }) => (
        <>
          <Popover.Button
            className={`
              ${open ? 'text-gray-900' : 'text-gray-500'}
              group inline-flex items-center rounded-md p-2 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500
            `}
          >
            <BellIcon
              className={`
                ${open ? 'text-gray-600' : 'text-gray-400'}
                h-6 w-6 group-hover:text-gray-500
              `}
              aria-hidden="true"
            />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Popover.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel className="absolute right-0 z-10 mt-3 w-80 transform px-4 sm:px-0">
              <div className="overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5">
                <div className="relative bg-white p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        className="text-xs text-blue-600 hover:text-blue-800"
                        onClick={handleMarkAllAsRead}
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  
                  {loading ? (
                    <div className="py-4 text-center">
                      <div className="animate-spin inline-block w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="py-6 text-center text-sm text-gray-500">
                      <span className="block mb-1">📥</span>
                      No new notifications
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto">
                      {notifications.map((notification) => (
                        <Link
                          key={notification.id}
                          href={notification.link || '#'}
                          className={`
                            block px-3 py-2 hover:bg-gray-50 transition duration-150 ease-in-out rounded-md
                            ${!notification.read ? 'bg-blue-50' : ''}
                          `}
                          onClick={(e) => {
                            if (!notification.read) {
                              handleMarkAsRead(notification.id, e);
                            }
                          }}
                        >
                          <div className="flex items-start">
                            <div className="flex-shrink-0 mt-0.5 mr-2">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${!notification.read ? 'text-blue-900' : 'text-gray-900'}`}>
                                {notification.title}
                              </p>
                              <p className={`text-xs truncate ${!notification.read ? 'text-blue-800' : 'text-gray-500'}`}>
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {notification.createdAt && formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true })}
                              </p>
                            </div>
                            {!notification.read && (
                              <button
                                className="flex-shrink-0 ml-2 text-blue-600 hover:text-blue-800"
                                onClick={(e) => handleMarkAsRead(notification.id, e)}
                              >
                                <CheckCircleIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                  
                  <div className="mt-3 border-t border-gray-200 pt-2">
                    <Link
                      href="/notifications"
                      className="block w-full text-center px-2 py-1 text-xs font-medium text-gray-500 hover:text-gray-700"
                    >
                      View all notifications
                    </Link>
                  </div>
                </div>
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
}