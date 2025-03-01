// src/components/dashboard/CalendarWidget.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import Link from 'next/link';

interface CalendarWidgetProps {
  size: 'small' | 'medium' | 'large';
}

interface CalendarItem {
  id: string;
  title: string;
  date: Date;
  type: 'task' | 'plan';
  url: string;
  priority?: 'high' | 'medium' | 'low';
}

export default function CalendarWidget({ size }: CalendarWidgetProps) {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchCalendarItems = async () => {
      if (!user) return;
      
      try {
        // Define date range for current month
        const startDate = startOfMonth(currentMonth);
        const endDate = endOfMonth(currentMonth);
        
        // Fetch tasks with due dates in this month
        const tasksQuery = query(
          collection(db, 'tasks'),
          where('assignedTo', '==', user.uid),
          where('dueDate', '>=', startDate),
          where('dueDate', '<=', endDate)
        );
        
        const tasksSnapshot = await getDocs(tasksQuery);
        const taskItems: CalendarItem[] = tasksSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title,
            date: data.dueDate.toDate(),
            type: 'task',
            url: `/plans/${data.planId}?task=${doc.id}`,
            priority: data.priority
          };
        });
        
        // Fetch plans with start or end dates in this month
        const plansStartQuery = query(
          collection(db, 'plans'),
          where('startDate', '>=', startDate),
          where('startDate', '<=', endDate)
        );
        
        const plansEndQuery = query(
          collection(db, 'plans'),
          where('endDate', '>=', startDate),
          where('endDate', '<=', endDate)
        );
        
        const [plansStartSnapshot, plansEndSnapshot] = await Promise.all([
          getDocs(plansStartQuery),
          getDocs(plansEndQuery)
        ]);
        
        // Process start dates
        const planStartItems: CalendarItem[] = plansStartSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: `${doc.id}-start`,
            title: `${data.title} (Start)`,
            date: data.startDate.toDate(),
            type: 'plan',
            url: `/plans/${doc.id}`
          };
        });
        
        // Process end dates
        const planEndItems: CalendarItem[] = plansEndSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: `${doc.id}-end`,
            title: `${data.title} (End)`,
            date: data.endDate.toDate(),
            type: 'plan',
            url: `/plans/${doc.id}`
          };
        });
        
        // Combine all items
        setCalendarItems([...taskItems, ...planStartItems, ...planEndItems]);
      } catch (error) {
        console.error('Error fetching calendar items:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCalendarItems();
  }, [user, currentMonth]);
  
  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });
  
  const previousMonth = () => {
    const previous = new Date(currentMonth);
    previous.setMonth(previous.getMonth() - 1);
    setCurrentMonth(previous);
  };
  
  const nextMonth = () => {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + 1);
    setCurrentMonth(next);
  };
  
  const getDayStyles = (day: Date) => {
    const classNames = ['h-10 w-10 flex items-center justify-center rounded-full'];
    
    if (isToday(day)) {
      classNames.push('bg-blue-100 text-blue-800');
    } else {
      classNames.push('text-gray-700 hover:bg-gray-100');
    }
    
    return classNames.join(' ');
  };
  
  const getItemsForDay = (day: Date) => {
    return calendarItems.filter(item => isSameDay(item.date, day));
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="h-full bg-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Calendar</h3>
        
        <div className="flex space-x-2">
          <button
            className="p-1 rounded-md hover:bg-gray-100"
            onClick={previousMonth}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <span className="text-sm font-medium">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            className="p-1 rounded-md hover:bg-gray-100"
            onClick={nextMonth}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="bg-gray-50 px-2 py-2">
            <div className="text-xs font-medium text-gray-500 text-center">{day}</div>
          </div>
        ))}
        
        {days.map(day => {
          const itemsForDay = getItemsForDay(day);
          
          return (
            <div key={day.toString()} className="bg-white px-2 py-2 h-20">
              <div className="text-center">
                <button className={getDayStyles(day)}>
                  {format(day, 'd')}
                </button>
              </div>
              <div className="mt-1 overflow-y-auto h-12">
                {itemsForDay.map(item => (
                  <Link 
                    key={item.id} 
                    href={item.url}
                    className={`block text-xs px-2 py-0.5 mb-0.5 truncate rounded ${
                      item.type === 'task' 
                        ? item.priority === 'high'
                          ? 'bg-red-100 text-red-800'
                          : item.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}