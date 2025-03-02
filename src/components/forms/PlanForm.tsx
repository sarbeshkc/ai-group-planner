'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { useAuth } from '@/components/providers/AuthProvider';
import { generatePlan } from '@/lib/ai/aiPlanner';
import { CalendarIcon, UsersIcon, LightBulbIcon, SparklesIcon, ClockIcon, CogIcon } from '@heroicons/react/24/outline';

interface PlanFormProps {
  groupId: string;
}

export default function PlanForm({ groupId }: PlanFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [objectives, setObjectives] = useState('');
  const [planType, setPlanType] = useState<'project' | 'event' | 'study' | 'other'>('project');
  const [participants, setParticipants] = useState(3);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  const router = useRouter();
  const { user } = useAuth();

  // Determine the plan generation method based on environment variables
  const forceLocalModel = process.env.NEXT_PUBLIC_FORCE_LOCAL_MODEL === 'true';
  const disableExternalAI = process.env.NEXT_PUBLIC_DISABLE_EXTERNAL_AI === 'true';
  const forceAIModels = process.env.NEXT_PUBLIC_FORCE_AI_MODELS === 'true';
  const isAIMethod = forceAIModels ? true : !(forceLocalModel || disableExternalAI);

  // Validate dates
  const isDateValid = () => {
    if (!startDate || !endDate) return false;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return start < end;
  };

  // Count objectives
  const objectiveCount = objectives.split('\n').filter(line => line.trim() !== '').length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to create a plan');
      return;
    }
    
    if (!isDateValid()) {
      setError('End date must be after start date');
      return;
    }
    
    if (objectiveCount === 0) {
      setError('Please add at least one objective');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setAiStatus('loading');
    
    try {
      const planId = await generatePlan({
        groupId,
        title,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        objectives: objectives.split('\n').filter(o => o.trim() !== ''),
        createdBy: user.uid,
        participants,
        planType
      });
      
      setAiStatus('success');
      
      // Slight delay to show success state before redirecting
      setTimeout(() => {
        router.push(`/plans/${planId}`);
      }, 1000);
    } catch (err: any) {
      console.error('Error creating plan:', err);
      setError(err.message || 'Failed to create plan');
      setAiStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Get plan type icon
  const getPlanTypeIcon = () => {
    switch (planType) {
      case 'project':
        return <LightBulbIcon className="w-5 h-5 text-blue-500" />;
      case 'event':
        return <CalendarIcon className="w-5 h-5 text-purple-500" />;
      case 'study':
        return <ClockIcon className="w-5 h-5 text-green-500" />;
      default:
        return <SparklesIcon className="w-5 h-5 text-amber-500" />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center mb-6">
        <div className="mr-3 p-2 bg-blue-50 rounded-full">
          <SparklesIcon className="w-6 h-6 text-blue-500" />
        </div>
        <h2 className="text-2xl font-bold">Create AI-Generated Plan</h2>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-2">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Plan Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter a descriptive title"
              required
            />
          </div>
          
          <div className="col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe the purpose and goals of this plan"
            />
          </div>
          
          <div>
            <label htmlFor="planType" className="block text-sm font-medium text-gray-700 mb-1">
              Plan Type
            </label>
            <div className="relative">
              <select
                id="planType"
                value={planType}
                onChange={(e) => setPlanType(e.target.value as any)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="project">Project Plan</option>
                <option value="event">Event Planning</option>
                <option value="study">Study Group</option>
                <option value="other">Other</option>
              </select>
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                {getPlanTypeIcon()}
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              The AI will optimize tasks based on this plan type
            </p>
          </div>
          
          <div>
            <label htmlFor="participants" className="block text-sm font-medium text-gray-700 mb-1">
              Team Size
            </label>
            <div className="relative">
              <input
                id="participants"
                type="number"
                min="1"
                max="20"
                value={participants}
                onChange={(e) => setParticipants(parseInt(e.target.value) || 1)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <UsersIcon className="w-5 h-5 text-gray-400" />
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              How many people will be working on this plan
            </p>
          </div>
          
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            {startDate && endDate && !isDateValid() && (
              <p className="mt-1 text-xs text-red-500">
                End date must be after start date
              </p>
            )}
          </div>
          
          <div className="col-span-2">
            <label htmlFor="objectives" className="block text-sm font-medium text-gray-700 mb-1">
              Objectives (one per line)
              <span className="ml-2 text-xs font-normal text-gray-500">
                {objectiveCount} objective{objectiveCount !== 1 ? 's' : ''}
              </span>
            </label>
            <textarea
              id="objectives"
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter each objective on a new line&#10;Example: Complete market research&#10;Example: Develop prototype&#10;Example: Create presentation"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              The AI will create specific tasks for each objective
            </p>
          </div>
        </div>
        
        <div className={`p-4 rounded-md border ${isAIMethod ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {isAIMethod ? (
                <SparklesIcon className="h-5 w-5 text-blue-500" />
              ) : (
                <CogIcon className="h-5 w-5 text-gray-500" />
              )}
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                {isAIMethod ? 'AI-Powered Plan Generation' : 'Rule-Based Plan Generation'}
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  {isAIMethod 
                    ? 'Our AI will analyze your inputs to create:' 
                    : 'Our system will organize your plan with:'}
                </p>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  {isAIMethod ? (
                    <>
                      <li>Customized tasks based on your objectives</li>
                      <li>Suggested team roles for optimal collaboration</li>
                      <li>Intelligent task scheduling across your timeline</li>
                      <li>Priority levels and estimated effort for each task</li>
                    </>
                  ) : (
                    <>
                      <li>Standard tasks based on your plan type</li>
                      <li>Common roles for your team structure</li>
                      <li>Evenly distributed tasks across your timeline</li>
                      <li>Default priority levels for each task</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button
            type="submit"
            isLoading={isLoading}
            disabled={isLoading || !isDateValid() || objectiveCount === 0}
            leftIcon={
              aiStatus === 'success' ? 
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg> : 
                isAIMethod ? <SparklesIcon className="h-5 w-5" /> : <CogIcon className="h-5 w-5" />
            }
          >
            {aiStatus === 'loading' ? 'Generating Plan...' : 
             aiStatus === 'success' ? 'Plan Generated!' : 
             aiStatus === 'error' ? 'Try Again' : 
             isAIMethod ? 'Generate AI Plan' : 'Generate Plan'}
          </Button>
        </div>
      </form>
    </div>
  );
}