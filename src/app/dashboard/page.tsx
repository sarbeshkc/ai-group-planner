// src/app/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import DashboardWidget from '@/components/dashboard/DashboardWidget';
import TasksWidget from '@/components/dashboard/TasksWidget';
import CalendarWidget from '@/components/dashboard/CalendarWidget';
import PlansWidget from '@/components/dashboard/PlansWidget';
import ActivityFeed from '@/components/activity/ActivityFeed';
import ActivityWidget from '@/components/dashboard/ActivityWidget';
import AnalyticsWidget from '@/components/dashboard/AnalyticsWidget';
import UpcomingDeadlinesWidget from '@/components/dashboard/UpcomingDeadlinesWidget';
import { PlusIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

type WidgetType = 'tasks' | 'plans' | 'activity' | 'analytics' | 'deadlines' | 'members' | 'calendar';

interface DashboardConfig {
  widgets: {
    id: string;
    type: WidgetType;
    size: 'small' | 'medium' | 'large';
    position: number;
  }[];
}

export default function DashboardPage() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  
  const [dashboardConfig, setDashboardConfig] = useState<DashboardConfig>({
    widgets: [
      { id: 'tasks', type: 'tasks', size: 'medium', position: 0 },
      { id: 'plans', type: 'plans', size: 'medium', position: 1 },
      { id: 'activity', type: 'activity', size: 'large', position: 2 },
      { id: 'deadlines', type: 'deadlines', size: 'medium', position: 3 },
      { id: 'analytics', type: 'analytics', size: 'large', position: 4 },
    ]
  });
  
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);
  
  // Load dashboard configuration
  useEffect(() => {
    const loadDashboardConfig = async () => {
      if (!user) return;
      
      try {
        // Get user's dashboard config from Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists() && userDoc.data().dashboardConfig) {
          setDashboardConfig(userDoc.data().dashboardConfig);
        }
      } catch (error) {
        console.error('Error loading dashboard config:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadDashboardConfig();
  }, [user]);
  
  // Save dashboard configuration
  const saveDashboardConfig = async () => {
    if (!user) return;
    
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        dashboardConfig: dashboardConfig,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error saving dashboard config:', error);
    }
  };
  
  // Handle drag end for widget reordering
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(dashboardConfig.widgets);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Update positions
    const updatedItems = items.map((item, index) => ({
      ...item,
      position: index
    }));
    
    setDashboardConfig({
      ...dashboardConfig,
      widgets: updatedItems
    });
    
    // Save the updated configuration
    saveDashboardConfig();
  };
  
  // Add a new widget
  const addWidget = (type: WidgetType) => {
    const newWidget = {
      id: `${type}-${Date.now()}`,
      type,
      size: 'medium' as const,
      position: dashboardConfig.widgets.length
    };
    
    setDashboardConfig({
      ...dashboardConfig,
      widgets: [...dashboardConfig.widgets, newWidget]
    });
    
    // Save the updated configuration
    saveDashboardConfig();
  };
  
  // Remove a widget
  const removeWidget = (widgetId: string) => {
    const updatedWidgets = dashboardConfig.widgets.filter(w => w.id !== widgetId);
    
    // Update positions
    const reindexedWidgets = updatedWidgets.map((widget, index) => ({
      ...widget,
      position: index
    }));
    
    setDashboardConfig({
      ...dashboardConfig,
      widgets: reindexedWidgets
    });
    
    // Save the updated configuration
    saveDashboardConfig();
  };
  
  // Change widget size
  const changeWidgetSize = (widgetId: string, size: 'small' | 'medium' | 'large') => {
    const updatedWidgets = dashboardConfig.widgets.map(widget => {
      if (widget.id === widgetId) {
        return { ...widget, size };
      }
      return widget;
    });
    
    setDashboardConfig({
      ...dashboardConfig,
      widgets: updatedWidgets
    });
    
    // Save the updated configuration
    saveDashboardConfig();
  };
  
  // Render the appropriate widget component based on type
  const renderWidget = (widget: DashboardConfig['widgets'][0]) => {
    switch (widget.type) {
      case 'tasks':
        return <TasksWidget size={widget.size} />;
      case 'plans':
        return <PlansWidget size={widget.size} />;
      case 'activity':
        return <ActivityWidget size={widget.size} />;
      case 'analytics':
        return <AnalyticsWidget size={widget.size} />;
      case 'deadlines':
        return <UpcomingDeadlinesWidget size={widget.size} />;
      case 'calendar':
        return <CalendarWidget size={widget.size} />;
      default:
        return <div>Unknown widget type</div>;
    }
  };
  
  if (loading || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!user) {
    return null; // Handled by redirect
  }
  
  // Sort widgets by position
  const sortedWidgets = [...dashboardConfig.widgets].sort((a, b) => a.position - b.position);
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {userData?.displayName || user.displayName}!</p>
        </div>
        
        <div className="flex space-x-4">
          <button
            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={() => setIsConfiguring(!isConfiguring)}
          >
            {isConfiguring ? 'Done' : 'Customize Dashboard'}
          </button>
          
          <button
            className="flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={() => window.location.reload()}
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>
      
      {isConfiguring && (
        <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
          <h3 className="text-lg font-medium text-blue-800 mb-2">Dashboard Customization</h3>
          <p className="text-blue-600 mb-4">Drag and drop widgets to reorder them. You can also add new widgets or resize existing ones.</p>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              className="inline-flex items-center px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              onClick={() => addWidget('tasks')}
            >
              <PlusIcon className="h-4 w-4 mr-1" /> Tasks
            </button>
            <button
              className="inline-flex items-center px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              onClick={() => addWidget('plans')}
            >
              <PlusIcon className="h-4 w-4 mr-1" /> Plans
            </button>
            <button
              className="inline-flex items-center px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              onClick={() => addWidget('activity')}
            >
              <PlusIcon className="h-4 w-4 mr-1" /> Activity
            </button>
            <button
              className="inline-flex items-center px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              onClick={() => addWidget('analytics')}
            >
              <PlusIcon className="h-4 w-4 mr-1" /> Analytics
            </button>
            <button
              className="inline-flex items-center px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              onClick={() => addWidget('deadlines')}
            >
              <PlusIcon className="h-4 w-4 mr-1" /> Deadlines
            </button>
            <button
              className="inline-flex items-center px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              onClick={() => addWidget('calendar')}
            >
              <PlusIcon className="h-4 w-4 mr-1" /> Calendar
            </button>
          </div>
        </div>
      )}
      
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="dashboard" isDropDisabled={!isConfiguring}>
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {sortedWidgets.map((widget, index) => (
                <Draggable
                  key={widget.id}
                  draggableId={widget.id}
                  index={index}
                  isDragDisabled={!isConfiguring}
                >
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`
                        ${widget.size === 'small' ? 'col-span-1' : ''}
                        ${widget.size === 'medium' ? 'col-span-1 md:col-span-1 lg:col-span-1' : ''}
                        ${widget.size === 'large' ? 'col-span-1 md:col-span-2 lg:col-span-2' : ''}
                      `}
                    >
                      <DashboardWidget
                        title={widget.type.charAt(0).toUpperCase() + widget.type.slice(1)}
                        isConfiguring={isConfiguring}
                        dragHandleProps={provided.dragHandleProps}
                        onRemove={() => removeWidget(widget.id)}
                        onResize={(size) => changeWidgetSize(widget.id, size)}
                        size={widget.size}
                      >
                        {renderWidget(widget)}
                      </DashboardWidget>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}