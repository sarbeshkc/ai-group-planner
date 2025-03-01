'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Disclosure, Menu, Transition } from '@headlessui/react';
import { Bars3Icon, XMarkIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useAuth } from '@/components/providers/AuthProvider';
import { signOut } from '@/lib/firebase/auth';

const publicNavigation = [
  { name: 'Home', href: '/' },
];

const privateNavigation = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Groups', href: '/groups' },
  { name: 'Plans', href: '/plans' },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userData, loading } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navigation = user ? [...publicNavigation, ...privateNavigation] : publicNavigation;
  
  return (
    <Disclosure as="nav" className="bg-white shadow-sm">
      {({ open }) => (
        <>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between">
              <div className="flex">
                <div className="flex flex-shrink-0 items-center">
                  <Link href="/" className="text-2xl font-bold text-primary-600">
                    PlanAI
                  </Link>
                </div>
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={clsx(
                        pathname === item.href
                          ? 'border-primary-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                        'inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium'
                      )}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:items-center">
                {!loading && (
                  <>
                    {user ? (
                      <Menu as="div" className="relative ml-3">
                        <div>
                          <Menu.Button className="flex rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                            <span className="sr-only">Open user menu</span>
                            {user.photoURL ? (
                              <img
                                className="h-8 w-8 rounded-full"
                                src={user.photoURL}
                                alt="User profile"
                              />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                                <UserCircleIcon className="h-6 w-6" />
                              </div>
                            )}
                          </Menu.Button>
                        </div>
                        <Transition
                          as={Fragment}
                          enter="transition ease-out duration-200"
                          enterFrom="transform opacity-0 scale-95"
                          enterTo="transform opacity-100 scale-100"
                          leave="transition ease-in duration-75"
                          leaveFrom="transform opacity-100 scale-100"
                          leaveTo="transform opacity-0 scale-95"
                        >
                          <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  className={clsx(
                                    active ? 'bg-gray-100' : '',
                                    'flex w-full px-4 py-2 text-sm text-gray-700'
                                  )}
                                  onClick={() => router.push('/profile')}
                                >
                                  Your Profile
                                </button>
                              )}
                            </Menu.Item>
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  className={clsx(
                                    active ? 'bg-gray-100' : '',
                                    'flex w-full px-4 py-2 text-sm text-gray-700'
                                  )}
                                  onClick={() => router.push('/settings')}
                                >
                                  Settings
                                </button>
                              )}
                            </Menu.Item>
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  className={clsx(
                                    active ? 'bg-gray-100' : '',
                                    'flex w-full px-4 py-2 text-sm text-gray-700'
                                  )}
                                  onClick={handleSignOut}
                                >
                                  Sign out
                                </button>
                              )}
                            </Menu.Item>
                          </Menu.Items>
                        </Transition>
                      </Menu>
                    ) : (
                      <div className="flex space-x-4">
                        <Link
                          href="/login"
                          className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                        >
                          Login
                        </Link>
                        <Link
                          href="/register"
                          className="rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
                        >
                          Register
                        </Link>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="-mr-2 flex items-center sm:hidden">
                <Disclosure.Button className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500">
                  <span className="sr-only">Open main menu</span>
                  {open ? (
                    <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                  ) : (
                    <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                  )}
                </Disclosure.Button>
              </div>
            </div>
          </div>

          <Disclosure.Panel className="sm:hidden">
            <div className="space-y-1 pt-2 pb-3">
              {navigation.map((item) => (
                <Disclosure.Button
                  key={item.name}
                  as={Link}
                  href={item.href}
                  className={clsx(
                    pathname === item.href
                      ? 'bg-primary-50 border-primary-500 text-primary-700'
                      : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800',
                    'block border-l-4 py-2 pl-3 pr-4 text-base font-medium'
                  )}
                >
                  {item.name}
                </Disclosure.Button>
              ))}
            </div>
            <div className="border-t border-gray-200 pt-4 pb-3">
              {!loading && (
                <>
                  {user ? (
                    <>
                      <div className="flex items-center px-4">
                        <div className="flex-shrink-0">
                          {user.photoURL ? (
                            <img
                              className="h-10 w-10 rounded-full"
                              src={user.photoURL}
                              alt="User profile"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                              <UserCircleIcon className="h-8 w-8" />
                            </div>
                          )}
                        </div>
                        <div className="ml-3">
                          <div className="text-base font-medium text-gray-800">
                            {userData?.displayName || user.displayName || 'User'}
                          </div>
                          <div className="text-sm font-medium text-gray-500">
                            {user.email}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 space-y-1">
                        <Disclosure.Button
                          as="button"
                          onClick={() => router.push('/profile')}
                          className="block w-full px-4 py-2 text-left text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                        >
                          Your Profile
                        </Disclosure.Button>
                        <Disclosure.Button
                          as="button"
                          onClick={() => router.push('/settings')}
                          className="block w-full px-4 py-2 text-left text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                        >
                          Settings
                        </Disclosure.Button>
                        <Disclosure.Button
                          as="button"
                          onClick={handleSignOut}
                          className="block w-full px-4 py-2 text-left text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                        >
                          Sign out
                        </Disclosure.Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center px-4">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-primary-400 to-secondary-400"></div>
                        </div>
                        <div className="ml-3">
                          <div className="text-base font-medium text-gray-800">Guest User</div>
                        </div>
                      </div>
                      <div className="mt-3 space-y-1">
                        <Disclosure.Button
                          as={Link}
                          href="/login"
                          className="block px-4 py-2 text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                        >
                          Login
                        </Disclosure.Button>
                        <Disclosure.Button
                          as={Link}
                          href="/register"
                          className="block px-4 py-2 text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                        >
                          Register
                        </Disclosure.Button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
}