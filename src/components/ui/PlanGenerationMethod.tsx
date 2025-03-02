import React from 'react';
import { SparklesIcon, CogIcon } from '@heroicons/react/24/outline';

interface PlanGenerationMethodProps {
  method: 'ai' | 'rule-based';
  className?: string;
}

export default function PlanGenerationMethod({ method, className = '' }: PlanGenerationMethodProps) {
  return (
    <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${className} ${
      method === 'ai' 
        ? 'bg-blue-100 text-blue-800' 
        : 'bg-gray-100 text-gray-800'
    }`}>
      {method === 'ai' ? (
        <>
          <SparklesIcon className="w-3.5 h-3.5 mr-1" />
          AI-Generated
        </>
      ) : (
        <>
          <CogIcon className="w-3.5 h-3.5 mr-1" />
          Rule-Based
        </>
      )}
    </div>
  );
} 