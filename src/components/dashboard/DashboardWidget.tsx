'use client';

import { ReactNode } from 'react';
import { 
  ArrowsPointingOutIcon, 
  ArrowsPointingInIcon, 
  XMarkIcon 
} from '@heroicons/react/24/outline';

interface DashboardWidgetProps {
  title: string;
  children: ReactNode;
  isConfiguring: boolean;
  dragHandleProps?: any;
  onRemove?: () => void;
  onResize?: (size: 'small' | 'medium' | 'large') => void;
  size: 'small' | 'medium' | 'large';
  className?: string;
}

export default function DashboardWidget({
  title,
  children,
  isConfiguring,
  dragHandleProps,
  onRemove,
  onResize,
  size,
  className = '',
}: DashboardWidgetProps) {
  return (
    <div className={`rounded-lg shadow-sm border border-gray-200 overflow-hidden h-full ${className}`}>
      <div 
        className="bg-white p-4 border-b border-gray-200 flex items-center justify-between"
        {...(isConfiguring ? dragHandleProps : {})}
      >
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        
        {isConfiguring && (
          <div className="flex items-center space-x-2">
            {onResize && (
              <>
                <button
                  onClick={() => onResize('small')}
                  className={`p-1 rounded-md ${size === 'small' ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:text-gray-600'}`}
                  title="Small"
                >
                  <ArrowsPointingInIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onResize('medium')}
                  className={`p-1 rounded-md ${size === 'medium' ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:text-gray-600'}`}
                  title="Medium"
                >
                  <ArrowsPointingInIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => onResize('large')}
                  className={`p-1 rounded-md ${size === 'large' ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:text-gray-600'}`}
                  title="Large"
                >
                  <ArrowsPointingOutIcon className="h-5 w-5" />
                </button>
              </>
            )}
            
            {onRemove && (
              <button
                onClick={onRemove}
                className="p-1 rounded-md text-red-400 hover:text-red-600"
                title="Remove"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
      </div>
      
      <div className="bg-white p-4">
        {children}
      </div>
    </div>
  );
}