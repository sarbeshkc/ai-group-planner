import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

// Types for our AI planning system
interface PlanInput {
  groupId: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  objectives: string[];
  createdBy: string;
  participants: number;
  planType: 'project' | 'event' | 'study' | 'other';
}

interface Task {
  title: string;
  description: string;
  assignedTo?: string;
  dueDate: Date;
  priority: 'low' | 'medium' | 'high';
  estimatedHours?: number;
  dependencies?: string[];
}

interface AIGeneratedPlan {
  tasks: Task[];
  roles: string[];
  suggestions: string[];
}

interface AITaskSuggestion {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedHours?: number;
}

// Hugging Face API Service
async function generateAITasks(
    planType: string, 
    objectives: string[], 
    duration: number, 
    participants: number
  ): Promise<AITaskSuggestion[]> {
    // Get API token from environment variable
    const API_TOKEN = process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY;
    
    if (!API_TOKEN) {
      console.warn("Hugging Face API token not found, using fallback rule-based generation");
      return [];
    }
    
    // Create a prompt for the AI
    const prompt = `
      Generate a list of ${Math.min(10, objectives.length * 2)} tasks for a ${planType} plan with the following objectives:
      ${objectives.map(obj => `- ${obj}`).join('\n')}
      
      The plan duration is ${duration} days with ${participants} participants.
      
      For each task, provide:
      1. A short, clear title (maximum 8 words)
      2. A brief description (maximum 20 words)
      3. Priority (high, medium, or low)
      4. Estimated hours to complete (a number between 1 and 40)
      
      Return the results as a JSON array of objects with the format:
      [
        {
          "title": "Task title",
          "description": "Task description",
          "priority": "high/medium/low",
          "estimatedHours": number
        }
      ]
  
      Ensure the JSON is valid with no trailing commas.
    `;
    
    // Model to use (this is a good free model for text generation)
    // Using a smaller model that's more likely to be available without paid access
    const model = "TinyLlama/TinyLlama-1.1B-Chat-v1.0";
    
    // Prepare the API request
    const apiUrl = `https://api-inference.huggingface.co/models/${model}`;
    const requestData = {
      inputs: prompt,
      parameters: {
        max_new_tokens: 1024,
        temperature: 0.7,
        top_p: 0.9,
        do_sample: true
      },
      options: {
        wait_for_model: true
      }
    };
    
    try {
      // Make the API call with a timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error from Hugging Face API:", errorText);
        return [];
      }
      
      const result = await response.json();
      
      // Extract the generated text from the response
      let generatedText = '';
      if (Array.isArray(result) && result.length > 0) {
        generatedText = result[0].generated_text || '';
      } else {
        generatedText = result.generated_text || '';
      }
      
      // Extract the JSON part from the text
      const jsonRegex = /\[\s*\{\s*"title"[\s\S]*\}\s*\]/g;
      const jsonMatch = generatedText.match(jsonRegex);
      
      if (!jsonMatch) {
        console.warn("Could not extract JSON from AI response:", generatedText);
        return [];
      }
      
      try {
        // Parse the JSON
        const jsonText = jsonMatch[0];
        const tasks = JSON.parse(jsonText) as AITaskSuggestion[];
        
        // Validate and filter tasks
        return tasks.filter(task => 
          task.title && 
          task.description && 
          ['high', 'medium', 'low'].includes(task.priority)
        );
      } catch (parseError) {
        console.error("Error parsing JSON from AI response:", parseError);
        return [];
      }
    } catch (error) {
      // Handle network errors, timeouts, or aborted requests
      if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
        console.error("Request to Hugging Face API timed out");
      } else {
        console.error("Error calling Hugging Face API:", error);
      }
      return [];
    }
  }

// Main function to generate AI plan
export async function generatePlan(input: PlanInput): Promise<string> {
  try {
    // Calculate total duration in days
    const totalDays = Math.ceil((input.endDate.getTime() - input.startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Generate the plan structure
    let aiPlan: AIGeneratedPlan;
    let usedAI = false;
    
    // Try to use the Hugging Face API first
    try {
      // Get AI-generated tasks
      const aiTasks = await generateAITasks(
        input.planType,
        input.objectives,
        totalDays,
        input.participants
      );
      
      if (aiTasks && aiTasks.length > 0) {
        // Use AI-generated tasks
        const tasks: Task[] = aiTasks.map(aiTask => ({
          title: aiTask.title,
          description: aiTask.description,
          priority: aiTask.priority,
          dueDate: calculateTaskDueDate(input.startDate, input.endDate, totalDays),
          estimatedHours: aiTask.estimatedHours
        }));
        
        // Generate roles and suggestions using rule-based approach
        const { roles, suggestions } = generateRolesAndSuggestions(input, totalDays);
        
        aiPlan = {
          tasks,
          roles,
          suggestions
        };
        
        usedAI = true;
      } else {
        // Fall back to rule-based generation if AI returned no tasks
        aiPlan = generateRuleBasedPlan(input, totalDays);
      }
    } catch (error) {
      console.warn("Error using AI service, falling back to rule-based planning:", error);
      // Fall back to rule-based generation
      aiPlan = generateRuleBasedPlan(input, totalDays);
    }
    
    // Create the plan in Firestore
    const planRef = await addDoc(collection(db, 'plans'), {
      groupId: input.groupId,
      title: input.title,
      description: input.description,
      startDate: input.startDate,
      endDate: input.endDate,
      objectives: input.objectives,
      createdBy: input.createdBy,
      createdAt: serverTimestamp(),
      status: 'active',
      suggestions: aiPlan.suggestions,
      roles: aiPlan.roles,
      generatedByAI: usedAI,
      planType: input.planType
    });
    
    // Create tasks in Firestore
    for (const task of aiPlan.tasks) {
      await addDoc(collection(db, 'tasks'), {
        planId: planRef.id,
        groupId: input.groupId,
        title: task.title,
        description: task.description,
        priority: task.priority,
        dueDate: task.dueDate,
        assignedTo: task.assignedTo || null,
        estimatedHours: task.estimatedHours || null,
        dependencies: task.dependencies || [],
        status: 'pending',
        createdBy: input.createdBy,
        createdAt: serverTimestamp(),
      });
    }
    
    return planRef.id;
  } catch (error) {
    console.error('Error generating plan:', error);
    throw error;
  }
}

// Helper function to calculate a reasonable due date for a task
function calculateTaskDueDate(startDate: Date, endDate: Date, totalDays: number): Date {
  // Create a range of days between start and end
  const startTime = startDate.getTime();
  const rangeInMs = endDate.getTime() - startTime;
  
  // Randomly distribute tasks throughout the timeline, but avoid the first and last days
  const minOffset = 24 * 60 * 60 * 1000; // At least 1 day after start
  const maxOffset = rangeInMs - minOffset; // At least 1 day before end
  
  const randomOffset = Math.floor(Math.random() * maxOffset) + minOffset;
  return new Date(startTime + randomOffset);
}

// Extract the roles and suggestions generation to a separate function
function generateRolesAndSuggestions(input: PlanInput, totalDays: number): { roles: string[], suggestions: string[] } {
  const roles: string[] = [];
  const suggestions: string[] = [];
  
  // Add plan suggestions based on duration
  if (totalDays < 7) {
    suggestions.push("This is a short timeline. Consider focusing on high-priority objectives only.");
  } else if (totalDays > 30) {
    suggestions.push("Consider breaking this plan into multiple phases for better management.");
  }
  
  // Add suggestions based on number of participants
  if (input.participants < 3) {
    suggestions.push("With a small team, consider assigning multiple roles to each person.");
  } else if (input.participants > 8) {
    suggestions.push("With a large team, consider creating sub-teams with clear responsibilities.");
  }
  
  // Add role suggestions based on plan type and objectives
  if (input.planType === 'project') {
    roles.push('Project Manager', 'Team Lead');
    suggestions.push("Assign a dedicated Project Manager to track progress.");
    
    if (input.objectives.some(obj => obj.toLowerCase().includes('research'))) {
      roles.push('Research Specialist');
    }
    
    if (input.objectives.some(obj => obj.toLowerCase().includes('design'))) {
      roles.push('Designer');
    }
    
    if (input.objectives.some(obj => obj.toLowerCase().includes('develop') || obj.toLowerCase().includes('code'))) {
      roles.push('Developer');
    }
    
    if (input.objectives.some(obj => obj.toLowerCase().includes('test') || obj.toLowerCase().includes('quality'))) {
      roles.push('Quality Assurance');
    }
    
    if (input.objectives.some(obj => obj.toLowerCase().includes('document'))) {
      roles.push('Technical Writer');
    }
  } else if (input.planType === 'event') {
    roles.push('Event Coordinator', 'Logistics Manager');
    suggestions.push("Create a detailed day-of timeline for your event.");
    
    if (input.objectives.some(obj => obj.toLowerCase().includes('catering') || obj.toLowerCase().includes('food'))) {
      roles.push('Catering Coordinator');
    }
    
    if (input.objectives.some(obj => obj.toLowerCase().includes('promotion') || obj.toLowerCase().includes('marketing'))) {
      roles.push('Marketing Specialist');
    }
    
    if (input.objectives.some(obj => obj.toLowerCase().includes('sponsor'))) {
      roles.push('Sponsorship Manager');
    }
    
    if (input.objectives.some(obj => obj.toLowerCase().includes('speaker') || obj.toLowerCase().includes('presentation'))) {
      roles.push('Speaker Coordinator');
    }
  } else if (input.planType === 'study') {
    roles.push('Study Lead', 'Note Taker');
    suggestions.push("Schedule regular check-ins to keep everyone on track with their study goals.");
    
    if (input.objectives.some(obj => obj.toLowerCase().includes('research'))) {
      roles.push('Research Coordinator');
    }
    
    if (input.objectives.some(obj => obj.toLowerCase().includes('present'))) {
      roles.push('Presentation Coordinator');
    }
    
    if (input.objectives.some(obj => obj.toLowerCase().includes('review') || obj.toLowerCase().includes('quiz'))) {
      roles.push('Review Session Leader');
    }
  } else {
    // For 'other' plan types
    roles.push('Team Lead', 'Coordinator');
    suggestions.push("Clearly define roles and responsibilities at the start of your plan.");
  }
  
  return { roles, suggestions };
}

// Rename the original function for clarity
function generateRuleBasedPlan(input: PlanInput, totalDays: number): AIGeneratedPlan {
  const tasks: Task[] = [];
  const { roles, suggestions } = generateRolesAndSuggestions(input, totalDays);
  
  // Generate tasks based on the plan type
  generateTasksBasedOnPlanType(input, tasks, totalDays);
  
  // Add generic tasks that apply to all plan types
  generateGenericTasks(input, tasks);
  
  // Add tasks specifically based on objectives
  generateObjectiveBasedTasks(input, tasks, totalDays);
  
  return {
    tasks,
    roles,
    suggestions
  };
}

// Generate tasks based on the plan type
function generateTasksBasedOnPlanType(input: PlanInput, tasks: Task[], totalDays: number) {
  // Start with a kickoff task
  tasks.push({
    title: 'Kickoff Meeting',
    description: `Initial meeting to discuss ${input.title} plan and assign responsibilities`,
    dueDate: new Date(input.startDate.getTime() + 1 * 24 * 60 * 60 * 1000), // 1 day after start
    priority: 'high',
    estimatedHours: 1
  });
  
  // Add milestone review at the halfway point
  if (totalDays > 10) {
    const halfwayDate = new Date(input.startDate.getTime() + (totalDays / 2) * 24 * 60 * 60 * 1000);
    tasks.push({
      title: 'Milestone Review',
      description: 'Review progress and adjust plan as needed',
      dueDate: halfwayDate,
      priority: 'medium',
      estimatedHours: 1
    });
  }
  
  // Add specific tasks based on plan type
  if (input.planType === 'project') {
    // Project-specific tasks
    tasks.push(
      {
        title: 'Requirements Gathering',
        description: 'Collect and document all project requirements',
        dueDate: new Date(input.startDate.getTime() + 3 * 24 * 60 * 60 * 1000),
        priority: 'high',
        estimatedHours: 4
      },
      {
        title: 'Create Project Timeline',
        description: 'Develop detailed project schedule with milestones',
        dueDate: new Date(input.startDate.getTime() + 5 * 24 * 60 * 60 * 1000),
        priority: 'high',
        estimatedHours: 3,
        dependencies: ['Requirements Gathering']
      },
      {
        title: 'Resource Allocation',
        description: 'Assign team members to specific project tasks',
        dueDate: new Date(input.startDate.getTime() + 6 * 24 * 60 * 60 * 1000),
        priority: 'medium',
        estimatedHours: 2,
        dependencies: ['Create Project Timeline']
      },
      {
        title: 'Risk Assessment',
        description: 'Identify potential risks and mitigation strategies',
        dueDate: new Date(input.startDate.getTime() + 7 * 24 * 60 * 60 * 1000),
        priority: 'medium',
        estimatedHours: 3
      },
      {
        title: 'Progress Reporting Setup',
        description: 'Establish regular progress reporting framework',
        dueDate: new Date(input.startDate.getTime() + 4 * 24 * 60 * 60 * 1000),
        priority: 'low',
        estimatedHours: 2
      }
    );
  } else if (input.planType === 'event') {
    // Event-specific tasks
    tasks.push(
      {
        title: 'Venue Selection',
        description: 'Research and select venue for the event',
        dueDate: new Date(input.startDate.getTime() + 3 * 24 * 60 * 60 * 1000),
        priority: 'high',
        estimatedHours: 4
      },
      {
        title: 'Create Event Budget',
        description: 'Develop detailed budget for all event expenses',
        dueDate: new Date(input.startDate.getTime() + 5 * 24 * 60 * 60 * 1000),
        priority: 'high',
        estimatedHours: 3
      },
      {
        title: 'Vendor Coordination',
        description: 'Contact and book necessary vendors',
        dueDate: new Date(input.startDate.getTime() + (totalDays / 3) * 24 * 60 * 60 * 1000),
        priority: 'medium',
        estimatedHours: 5,
        dependencies: ['Create Event Budget']
      },
      {
        title: 'Marketing & Promotion',
        description: 'Create and execute promotional strategy',
        dueDate: new Date(input.startDate.getTime() + (totalDays / 4) * 24 * 60 * 60 * 1000),
        priority: 'medium',
        estimatedHours: 6
      },
      {
        title: 'Guest List Management',
        description: 'Create and manage guest/attendee list',
        dueDate: new Date(input.startDate.getTime() + (totalDays / 4) * 24 * 60 * 60 * 1000),
        priority: 'medium',
        estimatedHours: 3
      },
      {
        title: 'Event Day Schedule',
        description: 'Create detailed minute-by-minute schedule',
        dueDate: new Date(input.endDate.getTime() - 5 * 24 * 60 * 60 * 1000),
        priority: 'high',
        estimatedHours: 4
      },
      {
        title: 'Final Confirmation',
        description: 'Confirm all details with vendors and participants',
        dueDate: new Date(input.endDate.getTime() - 2 * 24 * 60 * 60 * 1000),
        priority: 'high',
        estimatedHours: 2,
        dependencies: ['Vendor Coordination']
      }
    );
  } else if (input.planType === 'study') {
    // Study-specific tasks
    tasks.push(
      {
        title: 'Define Study Goals',
        description: 'Clearly define learning objectives and goals',
        dueDate: new Date(input.startDate.getTime() + 2 * 24 * 60 * 60 * 1000),
        priority: 'high',
        estimatedHours: 2
      },
      {
        title: 'Create Study Schedule',
        description: 'Develop a regular study schedule for all participants',
        dueDate: new Date(input.startDate.getTime() + 3 * 24 * 60 * 60 * 1000),
        priority: 'high',
        estimatedHours: 2,
        dependencies: ['Define Study Goals']
      },
      {
        title: 'Gather Study Materials',
        description: 'Collect all necessary resources and materials',
        dueDate: new Date(input.startDate.getTime() + 5 * 24 * 60 * 60 * 1000),
        priority: 'medium',
        estimatedHours: 3,
        dependencies: ['Define Study Goals']
      },
      {
        title: 'Create Study Groups',
        description: 'Organize participants into effective study groups',
        dueDate: new Date(input.startDate.getTime() + 4 * 24 * 60 * 60 * 1000),
        priority: 'medium',
        estimatedHours: 1
      },
      {
        title: 'Develop Practice Tests',
        description: 'Create practice questions and tests',
        dueDate: new Date(input.startDate.getTime() + (totalDays / 2) * 24 * 60 * 60 * 1000),
        priority: 'medium',
        estimatedHours: 4
      },
      {
        title: 'Schedule Review Sessions',
        description: 'Plan regular group review sessions',
        dueDate: new Date(input.startDate.getTime() + 7 * 24 * 60 * 60 * 1000),
        priority: 'low',
        estimatedHours: 1
      }
    );
  } else {
    // Generic tasks for 'other' plan types
    tasks.push(
      {
        title: 'Set Clear Objectives',
        description: 'Ensure all participants understand the goals',
        dueDate: new Date(input.startDate.getTime() + 2 * 24 * 60 * 60 * 1000),
        priority: 'high',
        estimatedHours: 2
      },
      {
        title: 'Develop Action Plan',
        description: 'Create detailed action steps for each objective',
        dueDate: new Date(input.startDate.getTime() + 4 * 24 * 60 * 60 * 1000),
        priority: 'high',
        estimatedHours: 3
      },
      {
        title: 'Assign Responsibilities',
        description: 'Clearly define who is responsible for each task',
        dueDate: new Date(input.startDate.getTime() + 5 * 24 * 60 * 60 * 1000),
        priority: 'medium',
        estimatedHours: 2
      },
      {
        title: 'Set Up Communication Plan',
        description: 'Establish how the team will communicate',
        dueDate: new Date(input.startDate.getTime() + 3 * 24 * 60 * 60 * 1000),
        priority: 'medium',
        estimatedHours: 1
      }
    );
  }
}

// Generate additional tasks based on objectives
function generateObjectiveBasedTasks(input: PlanInput, tasks: Task[], totalDays: number) {
  // Add tasks for each objective
  input.objectives.forEach((objective, index) => {
    // Calculate a due date that spaces objectives throughout the timeline
    const objectiveProgress = (index + 1) / input.objectives.length;
    const daysOffset = Math.floor(totalDays * objectiveProgress * 0.7); // Use 70% of the timeline for objectives
    
    const dueDate = new Date(
      input.startDate.getTime() + 
      daysOffset * 24 * 60 * 60 * 1000
    );
    
    // For projects, create implementation tasks
    if (input.planType === 'project') {
      tasks.push({
        title: `Implement: ${objective}`,
        description: `Work on implementing "${objective}"`,
        dueDate,
        priority: 'high',
        estimatedHours: 8,
        dependencies: ['Resource Allocation']
      });
      
      // Add a review task a few days after implementation
      const reviewDate = new Date(dueDate.getTime() + 3 * 24 * 60 * 60 * 1000);
      // Only add if the review date is before the end date
      if (reviewDate < input.endDate) {
        tasks.push({
          title: `Review: ${objective}`,
          description: `Review implementation of "${objective}"`,
          dueDate: reviewDate,
          priority: 'medium',
          estimatedHours: 2,
          dependencies: [`Implement: ${objective}`]
        });
      }
    } 
    // For study groups, create study sessions
    else if (input.planType === 'study') {
      tasks.push({
        title: `Study Session: ${objective}`,
        description: `Group study session focusing on "${objective}"`,
        dueDate,
        priority: 'medium',
        estimatedHours: 2,
        dependencies: ['Create Study Schedule', 'Gather Study Materials']
      });
    }
    // For events, create planning tasks
    else if (input.planType === 'event') {
      tasks.push({
        title: `Plan: ${objective}`,
        description: `Coordinate and plan "${objective}" aspect of the event`,
        dueDate,
        priority: 'medium',
        estimatedHours: 3,
        dependencies: ['Create Event Budget']
      });
    }
    // For other plan types
    else {
      tasks.push({
        title: `Work on: ${objective}`,
        description: `Focus on completing "${objective}"`,
        dueDate,
        priority: 'medium',
        estimatedHours: 4
      });
    }
  });
}

// Add generic tasks that apply to all plan types
function generateGenericTasks(input: PlanInput, tasks: Task[]) {
  // Add a final review meeting near the end
  tasks.push({
    title: 'Final Review Meeting',
    description: `Review outcomes of ${input.title} and discuss next steps`,
    dueDate: new Date(input.endDate.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day before end
    priority: 'high',
    estimatedHours: 2
  });
  
  // Add documentation task
  tasks.push({
    title: 'Complete Documentation',
    description: 'Finalize all documentation and reports',
    dueDate: input.endDate,
    priority: 'medium',
    estimatedHours: 3
  });
  
  // Add feedback collection task
  tasks.push({
    title: 'Collect Feedback',
    description: 'Gather feedback from all participants',
    dueDate: new Date(input.endDate.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days before end
    priority: 'low',
    estimatedHours: 1
  });
}

// Optional: Integration with free AI services
// This function can be expanded later to use external AI services
export async function enhancePlanWithAI(planId: string) {
  // This would connect to a free AI service
  // For now, just returns success without doing anything
  return true;
}